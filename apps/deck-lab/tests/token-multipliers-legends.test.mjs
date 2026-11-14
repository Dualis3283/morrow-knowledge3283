import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,coverage} from '../web/engine.mjs';
const land={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const necro={name:'Necroduality',type_line:'Enchantment',mana_cost:'{3}{U}',cmc:4,oracle_text:'Whenever a nontoken Zombie enters the battlefield under your control, create a token that is a copy of that creature.'};
const parallel={name:'Parallel Lives',type_line:'Enchantment',mana_cost:'{3}{G}',cmc:4,oracle_text:'If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.'};
const doubling={name:'Doubling Season',type_line:'Enchantment',mana_cost:'{4}{G}',cmc:5,oracle_text:'If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead. If an effect would put one or more counters on a permanent you control, it puts twice that many counters on that permanent instead.'};
const process={name:'Anointed Procession',type_line:'Enchantment',mana_cost:'{3}{W}',cmc:4,oracle_text:parallel.oracle_text};
const adrix={name:'Adrix and Nev, Twincasters',type_line:'Legendary Creature — Merfolk Wizard',mana_cost:'{2}{G}{U}',cmc:4,power:'2',toughness:'2',oracle_text:'If one or more tokens would be created under your control, twice that many of those tokens are created instead.'};
const reflections={name:'Reflections of Littjara',type_line:'Enchantment',mana_cost:'{4}{U}',cmc:5,oracle_text:'As this enchantment enters, choose a creature type. Whenever you cast a spell of the chosen type, copy that spell.'};
const zombie={name:'Entry Zombie',type_line:'Creature — Zombie Warrior',mana_cost:'{1}{U}',cmc:2,oracle_text:'',power:'2',toughness:'2'};
const legendary={name:'Legendary Zombie',type_line:'Legendary Creature — Zombie Wizard',mana_cost:'{2}{U}',cmc:3,oracle_text:'',power:'3',toughness:'3'};
const elf={name:'Elvish Creature',type_line:'Creature — Elf',mana_cost:'{2}{G}',cmc:3,oracle_text:'',power:'2',toughness:'2'};
const item=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const table=()=>{let g=act(createGame({deck:Array(65).fill(land),opponentDeck:[],rounds:8,seed:'token-doubler-017'}),{type:'keep'});g.players[0].hand=[];g.players[0].battlefield=[];g.players[1].battlefield=[];return g;};
test('Named token replacement permanents recognized with narrow partial coverage',()=>{
 for(const c of [parallel,doubling,process,adrix])assert.equal(coverage([c])[0].status,'partial');
 assert.equal(coverage([reflections])[0].status,'partial');
});
test('Parallel Lives doubles Necroduality trigger token result; nontoken-only guard prevents recursion',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n'),item(parallel,'p'));g.players[0].hand.push(item(zombie,'z'));
 g=act(g,{type:'move',id:'z',zone:'battlefield',player:0});assert.equal(g.stack.length,1);
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,2);
 assert.equal(g.stack.length,0);
 assert(g.log.some(x=>/Token creation replacement: 1 → 2/.test(x)));
});
test('Two distinct token replacement effects multiply (one→four), without double-applying to extra tokens',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n'),item(parallel,'p'),item(doubling,'d'));g.players[0].hand.push(item(zombie,'z'));
 g=act(g,{type:'move',id:'z',zone:'battlefield',player:0});g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,4);
});
test('Manual source-linked copies get modified by controlled token doublers, not opponent-controlled modifiers',()=>{
 let g=table();g.players[0].battlefield.push(item(zombie,'z'),item(process,'a'));
 g.players[1].battlefield.push(item(parallel,'opp-p',1));
 g=act(g,{type:'createTokenCopy',targetId:'z',count:2,player:0});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,4);
 assert.equal(g.players[1].battlefield.filter(x=>x.isToken).length,0);
});
test('Reflections of Littjara matches selected creature subtype on casting and queues token spell-copy above original',()=>{
 let g=table();g.players[0].battlefield.push(item(reflections,'r'),...Array.from({length:5},(_,n)=>item(land,'land'+n)));
 g.players[0].hand.push(item(zombie,'z'));
 assert.throws(()=>act(g,{type:'chooseReflectionsType',id:'r',chosenType:'Artifact'}),/subtype/);
 g=act(g,{type:'chooseReflectionsType',id:'r',chosenType:'Zombie'});
 g=act(g,{type:'play',id:'z'});
 assert.equal(g.stack.length,2);assert.equal(g.stack[1].trigger.adapter,'reflections-spell-copy');
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,1);
 assert.equal(g.players[0].battlefield.find(x=>x.isToken).spellCopyNotCreated,true);
 assert.equal(g.players[0].battlefield.find(x=>x.isToken).createdBy.sourceId,'r');
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.card.name==='Entry Zombie').length,2);
});
test('Parallel Lives does NOT multiply Reflections of Littjara creature spell copy, because spell-copy token is not created',()=>{
 let g=table();g.players[0].battlefield.push(item(reflections,'r'),item(parallel,'p'),...Array.from({length:5},(_,n)=>item(land,'mana'+n)));
 g.players[0].hand.push(item(zombie,'z'));g=act(g,{type:'chooseReflectionsType',id:'r',chosenType:'Zombie'});
 g=act(g,{type:'play',id:'z'});g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,1);
 assert(!g.log.some(x=>/Token creation replacement: 1 → 2/.test(x)));
});
test('Reflections without selected matching subtype does not copy spell; changing choice blocked',()=>{
 let g=table();g.players[0].battlefield.push(item(reflections,'r'),...Array.from({length:5},(_,n)=>item(land,'mana'+n)));
 g.players[0].hand.push(item(zombie,'e'));g=act(g,{type:'chooseReflectionsType',id:'r',chosenType:'Elf'});
 assert.throws(()=>act(g,{type:'chooseReflectionsType',id:'r',chosenType:'Zombie'}),/already been chosen/);
 g=act(g,{type:'play',id:'e'});assert.equal(g.stack.length,1);
});
test('Two legendary copies under own control produce a serialized legend choice rather than silently deleting a card',()=>{
 let g=table();g.players[0].battlefield.push(item(legendary,'original'));
 g=act(g,{type:'createTokenCopy',targetId:'original'});
 assert.equal(g.pendingLegend.name,'Legendary Zombie');
 assert.equal(g.pendingLegend.ids.length,2);
 const tok=g.players[0].battlefield.find(x=>x.isToken);
 assert.throws(()=>act(g,{type:'endTurn'}),/legend-rule choice/);
 g=JSON.parse(JSON.stringify(g));
 g=act(g,{type:'chooseLegendToKeep',id:tok.id});
 assert.equal(g.pendingLegend,undefined);
 assert.equal(g.players[0].battlefield.length,1);
 assert.equal(g.players[0].battlefield[0].isToken,true);
 assert.equal(g.players[0].graveyard.some(x=>x.id==='original'),true);
});
test('Legend choice can preserve nontoken original, removing token copy entirely',()=>{
 let g=table();g.players[0].battlefield.push(item(legendary,'original'));
 g=act(g,{type:'createTokenCopy',targetId:'original'});
 g=act(g,{type:'chooseLegendToKeep',id:'original'});
 assert.equal(g.players[0].battlefield.length,1);
 assert.equal(g.players[0].graveyard.length,0);
});
test('Opponent legend choice is deterministic and keeps existing nontoken original',()=>{
 let g=table();g.players[1].battlefield.push(item(legendary,'op-leg',1));
 g=act(g,{type:'createTokenCopy',targetId:'op-leg',player:1});
 assert.equal(g.players[1].battlefield.length,1);
 assert.equal(g.players[1].battlefield[0].id,'op-leg');
 assert.equal(g.pendingLegend,undefined);
});
test('Overlarge multiplied token event fails atomically; no partial copies appear',()=>{
 let g=table();g.players[0].battlefield.push(item(zombie,'z'));
 for(let n=0;n<4;n++)g.players[0].battlefield.push(item(parallel,'p'+n));
 const original=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'createTokenCopy',targetId:'z',count:10}),/exceed 128/);
 assert.equal(JSON.stringify(g),original);
});
