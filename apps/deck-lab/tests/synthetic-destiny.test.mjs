import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,coverage} from '../web/engine.mjs';
const land={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const bear={name:'Bear',type_line:'Creature — Bear',mana_cost:'{1}{G}',cmc:2,power:'2',toughness:'2',oracle_text:''};
const dragon={name:'Dragon',type_line:'Creature — Dragon',mana_cost:'{4}{R}',cmc:5,power:'5',toughness:'5',oracle_text:''};
const sorcery={name:'Cantrip',type_line:'Sorcery',mana_cost:'{U}',cmc:1,oracle_text:''};
const destiny={name:'Synthetic Destiny',type_line:'Instant',mana_cost:'{4}{U}{U}',cmc:6,oracle_text:'Exile all creatures you control. At the beginning of the next end step, reveal cards from the top of your library until you reveal that many creature cards, put all creature cards revealed this way onto the battlefield, then shuffle the rest of the revealed cards into your library.'};
const i=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const base=()=>act(createGame({deck:Array(75).fill(land),opponentDeck:[],rounds:8,onPlay:true,seed:'synthetic-destiny-0212'}),{type:'keep'});
function ready(creatures=[bear,bear],library=[land,dragon,sorcery,bear,land]){let g=base();g.players[0].hand.push(i(destiny,'destiny'));g.players[0].battlefield.push(...Array.from({length:6},(_,n)=>i(land,`mana-${n}`)),...creatures.map((c,n)=>i(c,`creature-${n}`)));g.players[0].library=library.map((c,n)=>i(c,`top-${n}`));return g;}
function cast(g){g=act(g,{type:'play',id:'destiny'});assert.equal(g.stack.at(-1)?.id,'destiny');return act(g,{type:'resolve'});}
const accept=g=>act(g,{type:'commitLibraryReview',order:g.pendingLibrary.ids.slice(),destinations:{},shuffle:false});
test('Synthetic Destiny pays real 4UU, exiles immediately but reveals only at the next end step',()=>{
 let g=ready();assert.equal(coverage([destiny])[0].status,'partial');
 g=cast(g);assert.equal(g.players[0].battlefield.some(x=>x.id==='creature-0'),false);
 assert.equal(g.players[0].exile.length,2);assert.equal(g.players[0].graveyard.some(x=>x.id==='destiny'),true);
 assert.equal(g.pendingLibrary,undefined);assert.equal(g.delayedEndSteps[0].required,2);
 assert.equal(g.delayedEndSteps[0].createdTurn,g.turn);
 assert.equal(g.players[0].library.length,5);
 assert.equal(g.players[0].battlefield.filter(x=>x.tapped&&x.card.name==='Island').length,6);
 g=act(g,{type:'endTurn'});
 assert.equal(g.pendingLibrary.variant,'synthetic-destiny');assert.deepEqual(g.pendingLibrary.matches,['top-1','top-3']);
 assert.equal(g.players[0].battlefield.some(x=>x.id==='top-1'),false);
 assert.equal(g.players[0].library.length,5);
 assert.equal(g.pendingEndStepResume,'user');
 assert.throws(()=>act(g,{type:'endTurn'}),/Complete the library allocation/);
 g=accept(g);
 assert.equal(g.pendingLibrary,undefined);assert.equal(g.pendingEndStepResume,undefined);assert.equal(g.delayedEndSteps.length,0);
 assert(g.players[0].battlefield.some(x=>x.id==='top-1'));assert(g.players[0].battlefield.some(x=>x.id==='top-3'));
 assert.equal(g.players[0].exile.length,2);assert.equal(g.players[0].library.length,2,'one normal draw at the start of the next turn');
 assert.equal(g.activePlayer,0);assert(g.turn>1,'end-turn resumes after confirmed reveal');
 assert(g.log.some(x=>/delayed end-step trigger/.test(x)));
});
test('Exiled tokens still count toward number of creature-card matches; tokens cease to exist',()=>{
 let g=ready([bear,bear,dragon],[bear,land,dragon,bear,sorcery]);g.players[0].battlefield.push({...i(bear,'token'),isToken:true});
 g=cast(g);assert.equal(g.delayedEndSteps[0].required,4);
 assert.equal(g.players[0].exile.length,3,'three ordinary creatures exiled; token ceased');
 g=act(g,{type:'endTurn'});assert.equal(g.pendingLibrary.matches.length,3,'library only contains three creature cards');
 assert.equal(g.pendingLibrary.ids.length,5);
 g=accept(g);assert.equal(g.players[0].battlefield.filter(x=>x.card.type_line.includes('Creature')).length,3);
});
test('No creatures exiled still causes deferred zero-match reveal and whole-library shuffle',()=>{
 let g=ready([],[land,bear,sorcery]);g=cast(g);
 assert.equal(g.delayedEndSteps[0].required,0);
 g=act(g,{type:'endTurn'});assert.deepEqual(g.pendingLibrary.ids,[]);
 g=accept(g);assert.equal(g.players[0].library.length,2,'next turn starts with a normal draw');assert.equal(g.players[0].exile.length,0);
 assert.equal(g.pendingLibrary,undefined);
});
test('Persisted scheduled trigger and persisted end-step selection survive JSON serialization and do not reveal early',()=>{
 let g=cast(ready());const save1=JSON.parse(JSON.stringify(g));
 assert.equal(save1.pendingLibrary,undefined);assert.equal(save1.delayedEndSteps.length,1);
 g=act(save1,{type:'endTurn'});
 const saved=JSON.parse(JSON.stringify(g));assert.equal(saved.pendingLibrary.variant,'synthetic-destiny');
 const bad={...saved,players:saved.players.map(p=>({...p}))};
 assert.throws(()=>act(saved,{type:'commitLibraryReview',order:[],destinations:{},shuffle:false}),/Choose exactly the revealed cards/);
 g=accept(saved);assert.equal(g.pendingLibrary,undefined);assert.equal(g.delayedEndSteps.length,0);
 assert.equal(g.players[0].exile.length,2);
 assert.equal(bad.pendingLibrary.variant,'synthetic-destiny');
});
test('Multiple delayed Synthetic Destiny effects at one end step resolve serially, no premature turn progression',()=>{
 let g=ready([bear],[land,bear,land,bear,land]);g=cast(g);
 g.delayedEndSteps.push({kind:'synthetic-destiny',sourceId:'copy-2',controller:0,required:1,createdTurn:g.turn});
 g=act(g,{type:'endTurn'});assert.equal(g.pendingLibrary.variant,'synthetic-destiny');
 const firstTurn=g.turn;g=accept(g);assert.equal(g.turn,firstTurn,'second trigger pauses the same turn');assert.equal(g.pendingLibrary.variant,'synthetic-destiny');
 g=accept(g);assert(g.turn>firstTurn);assert.equal(g.pendingLibrary,undefined);
});
test('Opponent end-step delayed reveal is resolved deterministically without exposing opponent hand or pausing indefinitely',()=>{
 let g=base();g.delayedEndSteps=[{kind:'synthetic-destiny',controller:1,sourceId:'opponent-synthetic',required:1,createdTurn:g.turn}];
 g.players[1].library=[i(land,'opp-land',1),i(bear,'opp-bear',1),i(land,'opp-other',1)];
 g=act(g,{type:'endTurn'});
 assert.equal(g.players[1].battlefield.some(x=>x.id==='opp-bear'),true);
 assert.equal(g.delayedEndSteps.length,0);assert.equal(g.pendingLibrary,undefined);
 assert(g.log.some(x=>/Scripted end-step reveal/.test(x)));
});
test('Insufficient mana leaves instant in hand and never creates a delayed trigger',()=>{
 let g=ready();g.players[0].battlefield=g.players[0].battlefield.filter(x=>!x.id.startsWith('mana-')||x.id==='mana-0');const save=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'play',id:'destiny'}),/Not enough usable mana/);
 assert.equal(JSON.stringify(g),save);
});
