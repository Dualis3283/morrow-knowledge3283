import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,castOptions,coverage} from '../web/engine.mjs';

const island=()=>({name:'Island',type_line:'Basic Land — Island',cmc:0,mana_cost:'',oracle_text:'{T}: Add {U}.',produced_mana:['U']});
const game=()=>createGame({deck:Array.from({length:35},island),opponentDeck:[],rounds:8,seed:'crossphase-stage-regression'});
function add(state,name,player=0,oracle='',type_line='Creature — Elf Druid'){
 const id='phase-'+player+'-'+name+'-'+state.players[player].battlefield.length;
 const instance={id,owner:player,controller:player,tapped:false,attacking:false,counters:0,damage:0,enteredTurn:0,card:{name,type_line,mana_cost:'{2}{G}',cmc:3,oracle_text:oracle,power:'2',toughness:'2'}};
 state.players[player].battlefield.push(instance);return instance;
}
const resolveAll=s=>{while(s.stack.length)s=act(s,{type:'resolve'});return s;};
const tokens=(s,name,controller=0)=>s.players[controller].battlefield.filter(x=>x.isToken&&x.card.name===name);

test('Koma and Tendershoot Dryad trigger on each upkeep, create printed token identities and honor token doublers',()=>{
 const g=game();add(g,'Koma, Cosmos Serpent',0,'At the beginning of each upkeep, create a 3/3 blue Serpent creature token named Koma\'s Coil.');
 add(g,'Tendershoot Dryad',0,'At the beginning of each upkeep, create a 1/1 green Saproling creature token.');
 add(g,'Parallel Lives',0,'If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.','Enchantment');
 let s=act(g,{type:'keep'});assert.equal(s.phase,'upkeep');assert.equal(s.stack.length,2);
 s=resolveAll(s);assert.equal(tokens(s,"Koma's Coil").length,2);assert.equal(tokens(s,'Saproling').length,2);
 assert.equal(tokens(s,"Koma's Coil")[0].card.power,'3');assert.equal(tokens(s,'Saproling')[0].card.power,'1');
 s=act(s,{type:'endTurn'}); // opponent upkeep resolves automatically, then next own upkeep is queued
 assert.equal(tokens(s,"Koma's Coil").length,4);assert.equal(tokens(s,'Saproling').length,4);
 assert.equal(s.phase,'upkeep');assert.equal(s.stack.length,2);
});

test('Bennie Bracks only triggers after an actual token creation in that turn, and pauses on the stack',()=>{
 const g=game();add(g,'Bennie Bracks, Zoologist',0,'At the beginning of each end step, if you created a token this turn, draw a card.');
 const bear=add(g,'Sample Bear',0,'','Creature — Bear');
 let s=act(g,{type:'keep'});assert.equal(s.phase,'main');assert.deepEqual(s.tokensCreatedThisTurn,[0,0]);
 s=act(s,{type:'createTokenCopy',targetId:bear.id,count:1});assert.equal(s.tokensCreatedThisTurn[0],1);
 s=act(s,{type:'endTurn'});
 assert.equal(s.phase,'end-step');assert.equal(s.turnStep,'end-step');assert.equal(s.stack.length,1);
 assert.equal(s.stack[0].trigger.adapter,'bennie-end-step');assert.equal(s.players[0].hand.length,7);
 assert.throws(()=>act(s,{type:'endTurn'}),/stack/i);
 s=act(s,{type:'resolve'});
 assert.equal(s.phase,'main','end step resumes automatically once its stack clears');
 assert.equal(s.players[0].hand.length,9,'Bennie drew one and next normal draw occurred');
 assert.deepEqual(s.tokensCreatedThisTurn,[0,0],'new turn resets tracked token provenance');
 s=act(s,{type:'endTurn'});
 assert.equal(s.phase,'main','without new tokens the next end step does not pause');
 assert.equal(s.players[0].hand.length,10);
});

test('Bennie Bracks does not trigger from an existing token without creation on current turn',()=>{
 const g=game();add(g,'Bennie Bracks, Zoologist',0,'At the beginning of each end step, if you created a token this turn, draw a card.');
 const token=add(g,'Soldier',0,'','Token Creature — Soldier');token.isToken=true;
 let s=act(g,{type:'keep'});s=act(s,{type:'endTurn'});
 assert.equal(s.phase,'main');assert.equal(s.players[0].hand.length,8);
 assert.equal(s.stack.length,0);
});

test('two Bennie triggers survive a saved mid-end-step state and do not duplicate on resume',()=>{
 const g=game();add(g,'Bennie Bracks, Zoologist',0,'At the beginning of each end step, if you created a token this turn, draw a card.');
 add(g,'Bennie Bracks, Zoologist',0,'At the beginning of each end step, if you created a token this turn, draw a card.');
 const bear=add(g,'Sample Bear',0,'','Creature — Bear');
 let s=act(g,{type:'keep'});s=act(s,{type:'createTokenCopy',targetId:bear.id,count:1});s=act(s,{type:'endTurn'});
 assert.equal(s.stack.length,2);assert.equal(s.phase,'end-step');
 s=act(s,{type:'resolve'});assert.equal(s.stack.length,1);assert.equal(s.players[0].hand.length,8);
 const saved=JSON.parse(JSON.stringify(s));s=act(saved,{type:'resolve'});
 assert.equal(s.stack.length,0);assert.equal(s.phase,'main');assert.equal(s.players[0].hand.length,10);
 assert.equal(s.turnStepHistory.filter(e=>e.step==='end-step'&&e.player===0).length,1);
});

test('each-end-step trigger resolves during a scripted opponent turn when its controller created tokens in that turn',()=>{
 const g=game();add(g,'Bennie Bracks, Zoologist',0,'At the beginning of each end step, if you created a token this turn, draw a card.');
 add(g,'Tendershoot Dryad',0,'At the beginning of each upkeep, create a 1/1 green Saproling creature token.');
 let s=resolveAll(act(g,{type:'keep'}));assert.equal(tokens(s,'Saproling').length,1);
 s=act(s,{type:'endTurn'});assert.equal(s.phase,'end-step','Bennie triggers on own end step');
 s=act(s,{type:'resolve'}); // opponent upkeep: Dryad creates Saproling; opponent end step: Bennie auto draws
 assert.equal(s.phase,'upkeep');assert.equal(s.activePlayer,0);assert.equal(s.stack.length,1);
 assert.equal(tokens(s,'Saproling').length,2);
 assert.equal(s.players[0].hand.length,9,'two end-step Bennie draws, one on each player turn');
 assert.ok(s.log.some(x=>x.includes('Scripted end-step named triggers resolved automatically')));
});

test('unknown beginning-of-end-step ability is visibly flagged and does not gain an invented effect',()=>{
 const g=game();add(g,'Unimplemented Enchantment',0,'At the beginning of your end step, perform a complex nonstandard choice.','Enchantment');
 let s=act(g,{type:'keep'});s=act(s,{type:'endTurn'});
 assert.ok(s.manualStepEvents.some(x=>x.name==='Unimplemented Enchantment'&&x.step==='end-step'));
 assert.ok(s.warnings.some(x=>x.includes('Manual end-step trigger')&&x.includes('Unimplemented Enchantment')));
});

test('named turn-step ability coverage is partial, not a false claim of complete Oracle support',()=>{
 const cards=['Koma, Cosmos Serpent','Tendershoot Dryad','Bennie Bracks, Zoologist'].map(name=>({name,type_line:'Creature',mana_cost:'{2}{G}',cmc:3,oracle_text:''}));
 const rows=coverage(cards);
 for(const name of cards.map(c=>c.name))assert.ok(rows.some(x=>x.name===name&&x.status==='partial'));
});

test('a paid Stifle can counter an end-step trigger and normal turn progression still resumes',()=>{
 const g=game();add(g,'Bennie Bracks, Zoologist',0,'At the beginning of each end step, if you created a token this turn, draw a card.');
 const bear=add(g,'Sample Bear',0,'','Creature — Bear');
 add(g,'Island',0,'{T}: Add {U}.','Basic Land — Island');
 let s=act(g,{type:'keep'});
 const stifle={id:'stifle-qa',owner:0,controller:0,tapped:false,counters:0,card:{name:'Stifle',type_line:'Instant',mana_cost:'{U}',cmc:1,oracle_text:'Counter target activated or triggered ability.'}};
 s.players[0].hand.push(stifle);
 s=act(s,{type:'createTokenCopy',targetId:bear.id,count:1});
 s=act(s,{type:'endTurn'});
 const triggerId=s.stack[0].id;
 assert.equal(castOptions(s,0,stifle.id).canCast,true,'instant can be cast at paused end step');
 s=act(s,{type:'play',id:stifle.id,targetId:triggerId});
 assert.equal(s.stack.length,2);
 s=act(s,{type:'resolve'});
 assert.equal(s.phase,'main');assert.equal(s.stack.length,0);
 assert.equal(s.players[0].hand.length,8,'Stifle was spent, no Bennie draw, next turn normal draw');
 assert.ok(s.log.some(x=>x.includes('counters Bennie Bracks')));
});

test('named each-upkeep triggers from both players use active-then-nonactive stacking, resolving nonactive first',()=>{
 const g=game();add(g,'Koma, Cosmos Serpent',0);add(g,'Koma, Cosmos Serpent',1);
 let s=act(g,{type:'keep'});
 assert.equal(s.stack.length,2);assert.deepEqual(s.stack.map(x=>x.controller),[0,1]);
 s=act(s,{type:'resolve'});assert.equal(tokens(s,"Koma's Coil",1).length,1);
 assert.equal(tokens(s,"Koma's Coil",0).length,0);
 s=act(s,{type:'resolve'});assert.equal(tokens(s,"Koma's Coil",0).length,1);
});

test('actual attack timing records unimplemented attackers triggers, but no-attack combat skips do not fabricate them',()=>{
 const a=game();const source=add(a,'Attack Trigger Source',0,'Whenever this creature attacks, perform a manual combat step effect.','Creature — Warrior');
 let s=act(a,{type:'keep'});
 s=act(s,{type:'attack',id:source.id});s=act(s,{type:'combat'});
 assert.ok(s.manualStepEvents.some(x=>x.sourceId===source.id&&x.step==='declare-attackers'&&!x.skipped));
 const noAttack=game();add(noAttack,'Attack Trigger Source',0,'Whenever this creature attacks, perform a manual combat step effect.','Creature — Warrior');
 let t=act(noAttack,{type:'keep'});t=act(t,{type:'endTurn'});
 assert.ok(!t.manualStepEvents.some(x=>x.name==='Attack Trigger Source'&&x.step==='declare-attackers'));
 assert.ok(t.turnStepHistory.some(x=>x.step==='declare-attackers'&&x.skipped));
});
