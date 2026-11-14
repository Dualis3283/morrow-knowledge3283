import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,coverage,castOptions} from '../web/engine.mjs';
const land={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const forest={...land,name:'Forest',type_line:'Basic Land — Forest',oracle_text:'{T}: Add {G}.'};
const spell={name:'Ponder',type_line:'Sorcery',mana_cost:'{U}',cmc:1,oracle_text:'Look at the top three cards of your library, then put them back in any order. You may shuffle.\nDraw a card.'};
const preordain={name:'Preordain',type_line:'Sorcery',mana_cost:'{U}',cmc:1,oracle_text:'Scry 2, then draw a card.'};
const creature={name:'Test Creature',type_line:'Creature — Elemental',mana_cost:'{3}',cmc:3,power:'3',toughness:'3',oracle_text:''};
const artifact={name:'Test Artifact',type_line:'Artifact',mana_cost:'{2}',cmc:2,oracle_text:''};
const ins=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
function table(){return act(createGame({deck:Array(55).fill(land),opponentDeck:Array(55).fill(forest),rounds:8,onPlay:true,seed:'review-selection-2026'}),{type:'keep'});}
function configureLibrary(g,cards,player=0){g.players[player].library=cards.map((card,i)=>ins(card,`top-${player}-${i}`,player));return g;}
test('Ponder is explicitly supported: spell resolves to pending look-3, not immediate draw',()=>{
 let g=table();g.players[0].battlefield.push(ins(land,'blue'));g.players[0].hand.push(ins(spell,'ponder'));
 assert.equal(coverage([spell])[0].status,'supported');
 const before=g.players[0].hand.length;
 g=act(g,{type:'play',id:'ponder'});assert.equal(g.stack.length,1);
 g=act(g,{type:'resolve'});
 assert.equal(g.stack.length,0);assert.equal(g.players[0].graveyard.filter(x=>x.id==='ponder').length,1);
 assert.equal(g.pendingLibrary.mode,'ponder');assert.equal(g.pendingLibrary.ids.length,3);
 assert.equal(g.players[0].hand.length,before-1,'cast removes spell but no draw until choosing');
 assert.throws(()=>act(g,{type:'drawCard',player:0,count:1}),/Complete the library allocation/);
 assert.throws(()=>act(g,{type:'endTurn'}),/Complete the library allocation/);
 assert.throws(()=>act(g,{type:'cancelLibraryReview'}),/cannot be cancelled/);
 const ids=g.pendingLibrary.ids;
 g=act(g,{type:'commitLibraryReview',order:[ids[2],ids[0],ids[1]],destinations:{},shuffle:false});
 assert.equal(g.pendingLibrary,undefined);
 assert.equal(g.players[0].hand.at(-1).id,ids[2], 'draws reordered first card');
 assert.deepEqual(g.players[0].library.slice(0,2).map(x=>x.id),[ids[0],ids[1]]);
 assert.equal(g.players[0].graveyard.filter(x=>x.id==='ponder').length,1);
});
test('Ponder shuffle includes reviewed top 3 and is deterministic with identical seed',()=>{
 const play=()=>{let g=table();g.players[0].battlefield.push(ins(land,'blue'));g.players[0].hand.push(ins(spell,'ponder'));g=act(g,{type:'play',id:'ponder'});g=act(g,{type:'resolve'});const ids=g.pendingLibrary.ids;return act(g,{type:'commitLibraryReview',order:ids.slice().reverse(),destinations:{},shuffle:true});};
 const a=play(),b=play();assert.deepEqual(a.players[0].library.map(c=>c.id),b.players[0].library.map(c=>c.id));
 assert.deepEqual(a.players[0].hand.at(-1).id,b.players[0].hand.at(-1).id);
 assert.equal(a.players[0].library.length,55-7-1,'Ponder draws one card after keeping seven opening cards');
});
test('Preordain scry 2 moves chosen cards bottom, keeps rest on top and draws exactly one',()=>{
 let g=table();g.players[0].battlefield.push(ins(land,'u'));g.players[0].hand.push(ins(preordain,'preordain'));
 g=configureLibrary(g,[land,creature,artifact,land]);
 g=act(g,{type:'play',id:'preordain'});g=act(g,{type:'resolve'});
 assert.equal(g.pendingLibrary.mode,'preordain');assert.deepEqual(g.pendingLibrary.ids,['top-0-0','top-0-1']);
 g=act(g,{type:'commitLibraryReview',order:['top-0-1','top-0-0'],destinations:{'top-0-0':'bottom'},shuffle:false});
 assert.equal(g.players[0].hand.at(-1).id,'top-0-1');
 assert.deepEqual(g.players[0].library.map(x=>x.id),['top-0-2','top-0-3','top-0-0']);
 assert(g.log.some(x=>/Preordain: draw exactly one/.test(x)));
});
test('Manual look 3 allocates by ordered IDs to top, hand, bottom, no involuntary shuffles',()=>{
 let g=configureLibrary(table(),[land,creature,artifact,forest]);
 const snapshot=JSON.stringify(g);
 g=act(g,{type:'startLibraryReview',targetPlayer:0,mode:'look',count:3});
 assert.equal(g.players[0].library.length,4,'viewing does not remove cards');
 assert.deepEqual(g.pendingLibrary.ids,['top-0-0','top-0-1','top-0-2']);
 const before=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'commitLibraryReview',order:['top-0-0','top-0-0'],destinations:{},shuffle:false}),/exactly the revealed cards/);
 assert.equal(JSON.stringify(g),before,'invalid allocation cannot mutate snapshot');
 g=act(g,{type:'commitLibraryReview',order:['top-0-2','top-0-1','top-0-0'],destinations:{'top-0-0':'bottom','top-0-1':'hand'},shuffle:false});
 assert.deepEqual(g.players[0].library.map(x=>x.id),['top-0-2','top-0-3','top-0-0']);
 assert.equal(g.players[0].hand.at(-1).id,'top-0-1');assert.equal(g.pendingLibrary,undefined);
 assert.notEqual(JSON.stringify(g),snapshot);
});
test('Manual reveal until first nonland stops at qualifying card, all preceding lands go bottom',()=>{
 let g=configureLibrary(table(),[land,forest,artifact,land,creature],1);
 g=act(g,{type:'startLibraryReview',targetPlayer:1,mode:'reveal-nonland',count:0});
 assert.deepEqual(g.pendingLibrary.ids,['top-1-0','top-1-1','top-1-2']);
 assert.equal(g.pendingLibrary.revealFound,true);
 const prior=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'commitLibraryReview',order:g.pendingLibrary.ids,destinations:{'top-1-0':'hand'},shuffle:false}),/before the first nonland/);
 assert.equal(JSON.stringify(g),prior);
 g=act(g,{type:'commitLibraryReview',order:['top-1-1','top-1-0','top-1-2'],destinations:{'top-1-2':'hand'},shuffle:false});
 assert.deepEqual(g.players[1].library.map(x=>x.id),['top-1-3','top-1-4','top-1-1','top-1-0']);
 assert.equal(g.players[1].hand.at(-1).id,'top-1-2');
});
test('Reveal until nonland with only lands sees all, allocates bottom and never invents a hit',()=>{
 let g=configureLibrary(table(),[land,forest,land]);
 g=act(g,{type:'startLibraryReview',targetPlayer:0,mode:'reveal-nonland'});
 assert.equal(g.pendingLibrary.revealFound,false);assert.equal(g.pendingLibrary.ids.length,3);
 assert.throws(()=>act(g,{type:'commitLibraryReview',order:g.pendingLibrary.ids,destinations:{'top-0-2':'hand'},shuffle:false}),/before the first nonland/);
 g=act(g,{type:'commitLibraryReview',order:g.pendingLibrary.ids.slice().reverse(),destinations:{},shuffle:false});
 assert.deepEqual(g.players[0].library.map(x=>x.id),['top-0-2','top-0-1','top-0-0']);
});
test('Manual library review cancellation has no movement; saved pending choice retains IDs on upgrade',()=>{
 let g=configureLibrary(table(),[land,artifact,forest]);
 const base=JSON.stringify(g);
 g=act(g,{type:'startLibraryReview',targetPlayer:0,mode:'look',count:3});
 const pending=JSON.parse(JSON.stringify(g));
 assert.deepEqual(pending.pendingLibrary.ids,g.pendingLibrary.ids);
 g=act(pending,{type:'cancelLibraryReview'});
 assert.deepEqual(g.players[0].library.map(x=>x.id),JSON.parse(base).players[0].library.map(x=>x.id));
 assert.equal(g.pendingLibrary,undefined);
});
test('Opponent scripted Ponder uses logged, bounded keep-order policy and finishes resolution',()=>{
 let g=table();g.players[1].battlefield.push(ins(land,'opponent-blue',1));g.players[1].hand=[ins(spell,'opponent-ponder',1)];
 // Simulate opponent active turn by advancing via standard endTurn. Reorder library after game start.
 g=act(g,{type:'endTurn'});
 assert.equal(g.players[1].graveyard.some(x=>x.id==='opponent-ponder'),true);
 assert.equal(g.pendingLibrary,undefined);
 assert(g.log.some(x=>/Scripted Ponder: deterministic keep-order/.test(x)));
 assert.equal(g.pendingOpponent,undefined);
});
