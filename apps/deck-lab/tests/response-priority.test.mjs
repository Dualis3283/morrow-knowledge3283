import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,castOptions,coverage,upgradeGame} from '../web/engine.mjs';
const blue={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const creature={name:'Enemy Bear',type_line:'Creature — Bear',mana_cost:'{1}{G}',cmc:2,power:'2',toughness:'2',oracle_text:''};
const counter={name:'Counterspell',type_line:'Instant',mana_cost:'{U}{U}',cmc:2,oracle_text:'Counter target spell.'};
const negate={name:'Negate',type_line:'Instant',mana_cost:'{1}{U}',cmc:2,oracle_text:'Counter target noncreature spell.'};
const stifle={name:'Stifle',type_line:'Instant',mana_cost:'{U}',cmc:1,oracle_text:'Counter target activated or triggered ability.'};
const disallow={name:'Disallow',type_line:'Instant',mana_cost:'{1}{U}{U}',cmc:3,oracle_text:'Counter target spell, activated ability, or triggered ability.'};
const divination={name:'Divination',type_line:'Sorcery',mana_cost:'{2}{U}',cmc:3,oracle_text:'Draw two cards.'};
const whirlwind={name:'Whirlwind of Thought',type_line:'Enchantment',mana_cost:'{1}{U}{R}{W}',cmc:4,oracle_text:'Whenever you cast a noncreature spell, draw a card.'};
const i=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
function table(){const g=act(createGame({deck:Array(60).fill(blue),opponentDeck:[],seed:'priority-response-013',rounds:8}),{type:'keep'});g.players[0].battlefield.push(i(blue,'u0'),i(blue,'u1'),i(blue,'u2'),i(blue,'u3'));return g;}
test('Counterspell, Negate, Stifle and Disallow recognized as typed stack-target effects',()=>{
 for(const c of [counter,negate,stifle,disallow])assert.equal(coverage([c])[0].status,'supported');
});
test('Respond to spell with paid Counterspell: pass priority assumes opponent pass and counters spell before resolution',()=>{
 let g=table();g.stack.push(i(divination,'opponent-spell',1));g.players[0].hand.push(i(counter,'counter'));
 g=act(g,{type:'openResponseWindow'});assert.equal(g.responseWindow.priorityPlayer,0);
 assert.equal(castOptions(g,0,'counter').canCast,true);
 assert.throws(()=>act(g,{type:'resolve'}),/Pass priority/);
 g=act(g,{type:'play',id:'counter',targetId:'opponent-spell'});
 assert.deepEqual(g.stack.map(x=>x.id),['opponent-spell','counter']);
 assert.equal(g.players[0].battlefield.filter(x=>x.tapped).length,2);
 g=act(g,{type:'passResponse'});
 assert.equal(g.stack.length,0);assert.equal(g.responseWindow,undefined);
 assert.equal(g.players[1].graveyard.some(x=>x.id==='opponent-spell'),true);
 assert.equal(g.players[0].graveyard.some(x=>x.id==='counter'),true);
 assert(g.log.some(x=>/scripted opponent passes/.test(x)));
});
test('Counterspell targeting nonspell triggered ability rejected without mutating the game',()=>{
 let g=table();g.stack.push({id:'trigger',kind:'trigger',owner:1,controller:1,card:{name:'Triggered draw',type_line:'Triggered Ability',cmc:0},trigger:{adapter:'cast-draw',count:1}});
 g.players[0].hand.push(i(counter,'counter'));const old=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'play',id:'counter',targetId:'trigger'}),/legal battlefield target/);
 assert.equal(JSON.stringify(g),old);
});
test('Negate cannot counter creature spell but can counter a noncreature',()=>{
 let g=table();g.stack.push(i(creature,'creature',1));g.players[0].hand.push(i(negate,'negate'));
 assert.throws(()=>act(g,{type:'play',id:'negate',targetId:'creature'}),/legal battlefield target/);
 g.stack.push(i(divination,'spell',1));g=act(g,{type:'play',id:'negate',targetId:'spell'});
 g=act(g,{type:'resolve'});
 assert.deepEqual(g.stack.map(x=>x.id),['creature']);
 assert.equal(g.players[1].graveyard.some(x=>x.id==='spell'),true);
});
test('Stifle counters a recognized triggered ability on the stack, not an underlying spell',()=>{
 let g=table();g.stack.push(i(divination,'base-spell',1),{id:'trigger',kind:'trigger',owner:1,controller:1,card:{name:'Card draw trigger',type_line:'Triggered Ability',cmc:0},trigger:{adapter:'cast-draw',count:1}});
 g.players[0].hand.push(i(stifle,'stifle'));g=act(g,{type:'openResponseWindow'});
 g=act(g,{type:'play',id:'stifle',targetId:'trigger'});g=act(g,{type:'passResponse'});
 assert.deepEqual(g.stack.map(x=>x.id),['base-spell']);
 assert.equal(g.responseWindow?.priorityPlayer,0);
 assert.equal(g.players[1].graveyard.some(x=>x.id==='trigger'),false,'ability ceases to exist, not graveyard');
 g=act(g,{type:'passResponse'});assert.equal(g.stack.length,0);
});
test('Disallow targets abilities and spells and leaves source permanent untouched',()=>{
 let g=table();g.stack.push({id:'ability',kind:'trigger',owner:1,controller:1,sourceId:'source',card:{name:'Source — Cast Trigger',type_line:'Triggered Ability',cmc:0},trigger:{adapter:'cast-draw',count:1}});
 g.players[0].hand.push(i(disallow,'disallow'));g=act(g,{type:'play',id:'disallow',targetId:'ability'});g=act(g,{type:'resolve'});
 assert.equal(g.stack.length,0);assert(g.log.some(x=>/counters Source — Cast Trigger/.test(x)));
});
test('Casting instant in response queues known cast trigger above it; response passes resolve trigger first',()=>{
 let g=table();g.players[0].battlefield.push(i(whirlwind,'whirlwind'));g.stack.push(i(divination,'opponent-spell',1));g.players[0].hand.push(i(counter,'counter'));
 g=act(g,{type:'openResponseWindow'});g=act(g,{type:'play',id:'counter',targetId:'opponent-spell'});
 assert.equal(g.stack.length,3);assert.equal(g.stack.at(-1).kind,'trigger');
 const before=g.players[0].hand.length;
 g=act(g,{type:'passResponse'});assert.equal(g.stack.length,2);assert.equal(g.players[0].hand.length,before+1);
 assert.equal(g.responseWindow?.priorityPlayer,0);
 g=act(g,{type:'passResponse'});assert.equal(g.stack.length,0);
});
test('Save and restore active response window, then close to use quick resolution shortcut',()=>{
 let g=table();g.stack.push(i(divination,'spell',1));g=act(g,{type:'openResponseWindow'});
 const saved=upgradeGame(JSON.parse(JSON.stringify(g)));
 assert.equal(saved.responseWindow.priorityPlayer,0);
 g=act(saved,{type:'closeResponseWindow'});assert.equal(g.responseWindow,undefined);
 g=act(g,{type:'resolve'});assert.equal(g.stack.length,0);
 assert(g.log.some(x=>/Quick Resolve: implicitly assumes both players pass/.test(x)));
});
test('Opening response window is denied with empty stack, and end turn is blocked while responses are open',()=>{
 let g=table();assert.throws(()=>act(g,{type:'openResponseWindow'}),/nonempty|unresolved stack/);
 g.stack.push(i(divination,'spell',1));g=act(g,{type:'openResponseWindow'});
 assert.throws(()=>act(g,{type:'endTurn'}),/Close the response window/);
});
const ovika={name:'Ovika, Enigma Goliath',type_line:'Legendary Creature — Phyrexian Nightmare',mana_cost:'{5}{U}{R}',cmc:7,power:'6',toughness:'6',oracle_text:'Whenever you cast a noncreature spell, create X 1/1 red Phyrexian Goblin creature tokens, where X is that spell’s mana value.'};
test('Two same-cast triggers have a shared batch ID and can be ordered before resolution',()=>{
 let g=table();g.players[0].battlefield.push(i(ovika,'ovika'),i(whirlwind,'whirlwind'));
 g.players[0].hand.push(i(divination,'drawspell'));
 g=act(g,{type:'play',id:'drawspell'});
 assert.equal(g.stack.length,3);
 const first=g.stack[1],last=g.stack[2];
 assert.equal(first.trigger.batchId,last.trigger.batchId);
 assert.equal(g.stack.at(-1).id,last.id);
 g=act(g,{type:'promoteCastTrigger',id:first.id});
 assert.equal(g.stack.at(-1).id,first.id);
 assert(g.log.some(x=>/Trigger order changed/.test(x)));
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.card.name==='Phyrexian Goblin').length,3);
 assert.equal(g.stack.at(-1).id,last.id);
});
test('Reordering trigger from other player or a different batch rejected with no state mutation',()=>{
 let g=table();g.players[0].battlefield.push(i(ovika,'ovika'),i(whirlwind,'whirlwind'));
 g.players[0].hand.push(i(divination,'drawspell'));
 g=act(g,{type:'play',id:'drawspell'});
 const first=g.stack[1],second=g.stack[2];const saved=JSON.stringify(g);
 g.stack[1].trigger.batchId=9999;
 const snapshot=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'promoteCastTrigger',id:first.id}),/same cast event/);
 assert.equal(JSON.stringify(g),snapshot);
 g.stack[1].trigger.batchId=second.trigger.batchId;g.stack[1].controller=1;
 assert.throws(()=>act(g,{type:'promoteCastTrigger',id:first.id}),/same cast event/);
 assert.notEqual(saved,JSON.stringify(g));
});
