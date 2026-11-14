import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,linkedExiles,castOptions} from '../web/engine.mjs';
const island={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const forest={...island,name:'Forest',type_line:'Basic Land — Forest',oracle_text:'{T}: Add {G}.'};
const scarab={name:'The Scarab God',type_line:'Legendary Creature — God',mana_cost:'{3}{U}{B}',cmc:5,power:'5',toughness:'5',oracle_text:'{2}{U}{B}: Exile target creature card from a graveyard. Create a token that is a copy of it, except it is a 4/4 black Zombie.'};
const source={name:'Imprint Archive',type_line:'Artifact',mana_cost:'{3}',cmc:3,oracle_text:'Imprint — Exile target card. You may cast the exiled card.'};
const artifact={name:'Captured Relic',type_line:'Artifact',mana_cost:'{2}',cmc:2,oracle_text:'This is a test permanent.'};
const spell={name:'Harmonize',type_line:'Sorcery',mana_cost:'{2}{G}{G}',cmc:4,oracle_text:'Draw three cards.'};
const creature={name:'Creature Test',type_line:'Creature — Soldier',mana_cost:'{1}{U}',cmc:2,power:'2',toughness:'2',oracle_text:''};
const inst=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const make=()=>act(createGame({deck:Array(65).fill(island),opponentDeck:Array(65).fill(forest),seed:'manual-mill-linked-exile-2026',rounds:8,onPlay:true}),{type:'keep'});

test('Manual mill uses correct library top order; chooses either player; never counts as drawing',()=>{
 let g=make();const ours=g.players[0],theirs=g.players[1];
 const a=ours.library.slice(0,3).map(x=>x.id),b=theirs.library.slice(0,2).map(x=>x.id);
 const before=JSON.stringify(g);
 g=act(g,{type:'mill',targetPlayer:0,count:3});
 assert.deepEqual(g.players[0].graveyard.slice(-3).map(x=>x.id),a);
 assert.equal(g.players[0].library.some(x=>a.includes(x.id)),false);
 assert.equal(g.stats[0].cardsMilled,3);assert.equal(g.stats[0].cardsDrawn||0,0);
 g=act(g,{type:'mill',targetPlayer:1,count:2});
 assert.deepEqual(g.players[1].graveyard.slice(-2).map(x=>x.id),b);
 assert.equal(g.stats[1].cardsMilled,2);
 assert.deepEqual(JSON.parse(before).players[0].graveyard,[],'snapshot preserved for Undo');
 assert.throws(()=>act(g,{type:'mill',targetPlayer:2,count:3}),/Choose yourself/);
 assert.throws(()=>act(g,{type:'mill',targetPlayer:1,count:100}),/1 to 99/);
});
test('Milling more than the remaining library does not cause decking or reveal hidden hand',()=>{
 let g=make();g.players[1].library=g.players[1].library.slice(0,2);
 g=act(g,{type:'mill',targetPlayer:1,count:20});
 assert.equal(g.players[1].library.length,0);assert.equal(g.players[1].graveyard.length,2);
 assert.equal(g.finished,false);assert.equal(g.stats[1].cardsMilled,2);
 assert(g.warnings.some(x=>/empty library does not itself lose/.test(x)));
 const hand=g.players[1].hand.map(x=>x.id);assert(hand.every(id=>!g.players[1].graveyard.some(x=>x.id===id)));
});
test('Exile a milled card from a graveyard under a named permanent; link survives save, display, and source leaving',()=>{
 let g=make();g.players[0].battlefield.push(inst(source,'archive'));g=act(g,{type:'mill',targetPlayer:1,count:1});
 const victim=g.players[1].graveyard[0];
 g=act(g,{type:'exileLinked',id:victim.id,sourceId:'archive'});
 assert.equal(g.players[1].graveyard.length,0);
 assert.equal(g.players[1].exile[0].owner,1);
 assert.equal(g.players[1].exile[0].exiledBy.sourceName,source.name);
 assert.equal(g.players[1].exile[0].exiledBy.sourceId,'archive');
 assert.deepEqual(linkedExiles(g,'archive').map(x=>x.id),[victim.id]);
 const serialized=JSON.parse(JSON.stringify(g));assert.deepEqual(linkedExiles(serialized,'archive').map(x=>x.id),[victim.id]);
 g=act(g,{type:'move',id:'archive',player:0,zone:'graveyard'});
 assert.equal(linkedExiles(g,'archive').length,1);
});
test('Linked exile can be returned onto battlefield under an elected controller; ownership stays with original player and link is removed',()=>{
 let g=make();g.players[0].battlefield.push(inst(source,'archive'));g.players[1].battlefield.push(inst(creature,'other-soldier',1));
 g=act(g,{type:'exileLinked',id:'other-soldier',sourceId:'archive'});
 g=act(g,{type:'returnLinkedExile',id:'other-soldier',player:0,zone:'battlefield'});
 const placed=g.players[0].battlefield.find(x=>x.id==='other-soldier');
 assert.equal(placed.owner,1);assert.equal(placed.controller,0);
 assert.equal(placed.exiledBy,undefined);assert.deepEqual(linkedExiles(g,'archive'),[]);
 assert(g.log.some(x=>/Manual linked exile return/.test(x)));
});
test('Casting linked card with normal mana payment moves a spell onto the stack and charges sources; unlinked exile cannot be cast',()=>{
 let g=make();g.players[0].battlefield.push(inst(source,'archive'),inst(forest,'g1'),inst(forest,'g2'),inst(forest,'g3'),inst(forest,'g4'));
 g.players[0].graveyard.push(inst(spell,'drawspell'));
 assert.throws(()=>act(g,{type:'castLinkedExile',id:'drawspell',withoutPaying:false}),/explicitly associated with an exile source/);
 g=act(g,{type:'exileLinked',id:'drawspell',sourceId:'archive'});
 assert.equal(castOptions(g,0,'drawspell').canCast,true);
 g=act(g,{type:'castLinkedExile',id:'drawspell',withoutPaying:false});
 assert.equal(g.stack.at(-1).id,'drawspell');assert.equal(g.players[0].battlefield.filter(x=>x.card.name==='Forest'&&x.tapped).length,4);
 assert.equal(g.players[0].exile.find(x=>x.id==='drawspell'),undefined);
 assert.equal(g.stack.at(-1).exiledBy,undefined);
 g=act(g,{type:'resolve'});assert.equal(g.players[0].graveyard.some(x=>x.id==='drawspell'),true);
 assert(g.log.some(x=>/from exile linked to Imprint Archive/.test(x)));
});
test('Free cast is an explicitly logged user override, creates a normal stack object and never pays mana',()=>{
 let g=make();g.players[0].battlefield.push(inst(source,'archive'));g.players[0].graveyard.push(inst(artifact,'relic'));
 g=act(g,{type:'exileLinked',id:'relic',sourceId:'archive'});
 const prev=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'castLinkedExile',id:'relic'}),/either ordinary mana/);
 assert.equal(JSON.stringify(g),prev,'invalid action cannot change source snapshot');
 g=act(g,{type:'castLinkedExile',id:'relic',withoutPaying:true});
 assert.equal(g.stack.at(-1).id,'relic');
 assert(g.log.some(x=>/without paying mana \(explicit manual permission\)/.test(x)));
 assert(g.warnings.some(x=>/requires user verification/.test(x)));
 assert.throws(()=>act(g,{type:'resolve'}),/no complete effect adapter/,'unrecognized card effects must remain manual');
 g=act(g,{type:'move',id:'relic',player:0,zone:'battlefield'});
 assert.equal(g.players[0].battlefield.some(x=>x.id==='relic'),true);
});
test('Exiled but NOT linked cards never gain permission automatically; token and trigger exile links are rejected',()=>{
 let g=make();g.players[0].battlefield.push(inst(source,'archive'));
 g.players[0].exile.push(inst(artifact,'unlinked'));
 assert.equal(castOptions(g,0,'unlinked').canCast,false);
 assert.throws(()=>act(g,{type:'castLinkedExile',id:'unlinked',withoutPaying:true}),/explicitly associated/);
 const token={...inst(creature,'token'),isToken:true};g.players[0].battlefield.push(token);
 assert.throws(()=>act(g,{type:'exileLinked',id:'token',sourceId:'archive'}),/nontoken/);
 assert.throws(()=>act(g,{type:'exileLinked',id:'archive',sourceId:'archive'}),/different permanent/);
});
test('Linked exiled land consumes ordinary land drop; cannot be replayed a second time',()=>{
 let g=make();g.players[0].battlefield.push(inst(source,'archive'));g.players[0].graveyard.push(inst(island,'land'));
 g=act(g,{type:'exileLinked',id:'land',sourceId:'archive'});
 g=act(g,{type:'castLinkedExile',id:'land',withoutPaying:false});
 assert.equal(g.players[0].landPlayed,true);assert(g.players[0].battlefield.some(x=>x.id==='land'));
 g.players[0].exile.push({...inst(island,'land2'),exiledBy:{sourceId:'archive',sourceName:source.name}});
 assert.throws(()=>act(g,{type:'castLinkedExile',id:'land2',withoutPaying:false}),/available land drop/);
});
test('Manual exile targeting a stack spell retains source and preserves source controller',()=>{
 let g=make();g.players[0].battlefield.push(inst(source,'archive'));
 g.stack.push(inst(artifact,'onstack',1));
 g=act(g,{type:'exileLinked',id:'onstack',sourceId:'archive'});
 assert.equal(g.stack.length,0);assert.deepEqual(linkedExiles(g,'archive').map(x=>x.id),['onstack']);
 assert.equal(g.players[1].exile[0].owner,1);
});
