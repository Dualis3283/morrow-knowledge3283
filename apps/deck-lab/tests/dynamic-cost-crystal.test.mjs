import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,spellCostQuote,coverage} from '../web/engine.mjs';
const island={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const swamp={...island,name:'Swamp',type_line:'Basic Land — Swamp',oracle_text:'{T}: Add {B}.'};
const cloud={name:'Cloud Key',type_line:'Artifact',mana_cost:'{3}',cmc:3,oracle_text:'As this artifact enters, choose artifact, creature, enchantment, instant, or sorcery. Spells you cast of the chosen type cost {1} less to cast.'};
const anvil={name:'Semblance Anvil',type_line:'Artifact',mana_cost:'{3}',cmc:3,oracle_text:'Imprint — When this artifact enters, you may exile a nonland card from your hand. Spells you cast that share a card type with the exiled card cost {2} less to cast.'};
const crystal={name:'The Darkness Crystal',type_line:'Legendary Artifact',mana_cost:'{2}{B}{B}',cmc:4,oracle_text:'Black spells you cast cost {1} less to cast. If a nontoken creature an opponent controls would die, instead exile it and you gain 2 life. {4}{B}{B}, {T}: Put target creature card exiled with The Darkness Crystal onto the battlefield tapped under your control with two additional +1/+1 counters on it.'};
const bear={name:'Bear',type_line:'Creature — Bear',mana_cost:'{3}',cmc:3,power:'2',toughness:'2',oracle_text:''};
const beast={...bear,name:'Beast',type_line:'Artifact Creature — Beast',mana_cost:'{5}',cmc:5};
const sorcery={name:'Sorcery',type_line:'Sorcery',mana_cost:'{4}',cmc:4,oracle_text:'Draw a card.'};
const doom={name:'Murder',type_line:'Instant',mana_cost:'{1}{B}{B}',cmc:3,oracle_text:'Destroy target creature.'};
const card=(c,id,owner=0)=>({id,card:c,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
function table(){const s=act(createGame({deck:Array(65).fill(swamp),opponentDeck:[],seed:'imprint-cloud-crystal-test',rounds:8}),{type:'keep'});s.players[0].hand=[];s.players[0].battlefield=[];s.players[1].battlefield=[];return s;}
test('Cloud Key starts without a choice, then discounts only chosen type, with immutable choice',()=>{
 let s=table();s.players[0].battlefield.push(card(cloud,'ck'));assert.equal(coverage([cloud])[0].status,'partial');assert.equal(spellCostQuote(s,0,bear).reduced,0);
 assert.throws(()=>act(s,{type:'chooseCloudKeyType',id:'ck',chosenType:'Land'}),/choose/i);
 s=act(s,{type:'chooseCloudKeyType',id:'ck',chosenType:'Creature'});
 assert.equal(spellCostQuote(s,0,bear).reduced,1);assert.equal(spellCostQuote(s,0,sorcery).reduced,0);
 assert.equal(spellCostQuote(s,0,beast).reduced,1);
 assert.throws(()=>act(s,{type:'chooseCloudKeyType',id:'ck',chosenType:'Artifact'}),/already chosen/);
 assert.equal(s.players[0].battlefield[0].costChosenType,'Creature');
});
test('Semblance Anvil imprints actual nonland hand card linked to source, matches any shared card type once',()=>{
 let s=table();s.players[0].battlefield.push(card(anvil,'anvil'));s.players[0].hand.push(card(beast,'imprinted'));
 assert.equal(spellCostQuote(s,0,bear).reduced,0);
 s=act(s,{type:'imprintSemblanceAnvil',id:'anvil',cardId:'imprinted'});
 const source=s.players[0].battlefield.find(x=>x.id==='anvil');
 assert.deepEqual(source.imprintCardTypes,['Artifact','Creature']);
 assert.equal(s.players[0].exile.find(x=>x.id==='imprinted').exiledBy.sourceId,'anvil');
 assert.equal(spellCostQuote(s,0,beast).reduced,2,'multiple shared card types still one discount');
 assert.equal(spellCostQuote(s,0,bear).reduced,2);
 assert.equal(spellCostQuote(s,0,sorcery).reduced,0);
 assert.throws(()=>act(s,{type:'imprintSemblanceAnvil',id:'anvil',cardId:'imprinted'}),/unresolved/);
});
test('Anvil cannot imprint lands or later change a declined imprint',()=>{
 let s=table();s.players[0].battlefield.push(card(anvil,'anvil'));s.players[0].hand.push(card(swamp,'land'));
 assert.throws(()=>act(s,{type:'imprintSemblanceAnvil',id:'anvil',cardId:'land'}),/nonland/);
 s=act(s,{type:'declineSemblanceAnvil',id:'anvil'});
 assert.equal(spellCostQuote(s,0,bear).reduced,0);
 assert.throws(()=>act(s,{type:'imprintSemblanceAnvil',id:'anvil',cardId:'land'}),/unresolved/);
});
test('Cloud Key and Anvil stack with existing generic cost reducers',()=>{
 let s=table();s.players[0].battlefield.push(card(cloud,'ck'),card(anvil,'anvil'),card(crystal,'crystal'));
 s.players[0].hand.push(card(beast,'i'));
 s=act(s,{type:'chooseCloudKeyType',id:'ck',chosenType:'Artifact'});
 s=act(s,{type:'imprintSemblanceAnvil',id:'anvil',cardId:'i'});
 const q=spellCostQuote(s,0,{...beast,colors:['B'],mana_cost:'{5}{B}',cmc:6});
 assert.equal(q.reduced,4);assert.equal(q.wanted.generic,1);assert.equal(q.wanted.B,1);
});
test('Crystal replaces non-token opposing creature death; controller gains 2 and card linked in exile',()=>{
 let s=table();s.players[0].battlefield.push(card(crystal,'crystal'));s.players[1].battlefield.push(card(bear,'victim',1));
 s=act(s,{type:'move',id:'victim',player:1,zone:'graveyard'});
 assert.equal(s.players[1].graveyard.length,0);
 assert.equal(s.players[1].exile.length,1);
 assert.equal(s.players[1].exile[0].exiledBy.sourceId,'crystal');
 assert.equal(s.players[0].life,42);
 assert(s.log.some(x=>/replaces death/.test(x)));
});
test('No Crystal replacement for tokens or own creatures, or when crystal absent',()=>{
 let s=table();s.players[0].battlefield.push(card(crystal,'crystal'),card(bear,'mine'));
 s.players[1].battlefield.push({...card(bear,'token',1),isToken:true},card(bear,'opponent',1));
 s=act(s,{type:'move',id:'mine',player:0,zone:'graveyard'});
 assert(s.players[0].graveyard.some(x=>x.id==='mine'));
 s=act(s,{type:'move',id:'token',player:1,zone:'graveyard'});
 assert.equal(s.players[0].life,40);assert(!s.players[1].exile.some(x=>x.id==='token'));
 s=act(s,{type:'move',id:'crystal',player:0,zone:'graveyard'});
 s=act(s,{type:'move',id:'opponent',player:1,zone:'graveyard'});
 assert(s.players[1].graveyard.some(x=>x.id==='opponent'));
});
test('Opposing creature controlled by someone other than owner is exiled in its OWNER exile',()=>{
 let s=table();s.players[0].battlefield.push(card(crystal,'crystal'));
 const stolen=card(bear,'stolen',0);stolen.controller=1;s.players[1].battlefield.push(stolen);
 s=act(s,{type:'move',id:'stolen',player:1,zone:'graveyard'});
 assert.equal(s.players[0].exile[0].id,'stolen');assert.equal(s.players[0].life,42);
});
test('Murder and lethal combat/state checks use Crystal replacement rather than graveyard',()=>{
 let s=table();s.players[0].battlefield.push(card(crystal,'crystal'));
 s.players[1].battlefield.push(card(bear,'victim',1));s.stack=[card(doom,'murder')];s.stack[0].targetId='victim';
 s=act(s,{type:'resolve'});
 assert(s.players[1].exile.some(x=>x.id==='victim'));
 assert(!s.players[1].graveyard.some(x=>x.id==='victim'));
 assert.equal(s.players[0].life,42);
});
test('Crystal activated ability checks source-specific links, actual 4BB payment, taps, +2 counters and entry tapped',()=>{
 let s=table();s.players[0].battlefield.push(card(crystal,'crystal'),...Array.from({length:6},(_,n)=>card(swamp,'s'+n)));
 s.players[1].battlefield.push(card(bear,'victim',1));s=act(s,{type:'move',id:'victim',player:1,zone:'graveyard'});
 const original=JSON.stringify(s);
 assert.throws(()=>act(s,{type:'activateDarknessCrystal',id:'crystal',targetId:'nothere'}),/exact Darkness Crystal/);
 assert.equal(JSON.stringify(s),original);
 s=act(s,{type:'activateDarknessCrystal',id:'crystal',targetId:'victim'});
 const revived=s.players[0].battlefield.find(x=>x.id==='victim');
 assert.equal(revived.counters,2);assert.equal(revived.tapped,true);assert.equal(revived.controller,0);
 assert.equal(s.players[0].battlefield.find(x=>x.id==='crystal').tapped,true);
 assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Swamp'&&x.tapped).length,6);
 assert(!s.players[1].exile.some(x=>x.id==='victim'));
});
test('Crystal activated ability cannot reanimate a different Crystal linked card or ignore required six mana',()=>{
 let s=table();s.players[0].battlefield.push(card(crystal,'c1'),...Array.from({length:5},(_,n)=>card(swamp,'s'+n)));
 s.players[0].hand.push(card(crystal,'c2'));
 s.players[1].battlefield.push(card(bear,'victim',1));
 s=act(s,{type:'move',id:'victim',player:1,zone:'graveyard'});
 s=act(s,{type:'move',id:'c1',player:0,zone:'hand'});
 s=act(s,{type:'move',id:'c2',player:0,zone:'battlefield'});
 assert.throws(()=>act(s,{type:'activateDarknessCrystal',id:'c2',targetId:'victim'}),/exact Darkness Crystal/);
 s=act(s,{type:'move',id:'c2',player:0,zone:'hand'});
 s=act(s,{type:'move',id:'c1',player:0,zone:'battlefield'});
 assert.throws(()=>act(s,{type:'activateDarknessCrystal',id:'c1',targetId:'victim'}),/Pay \{4\}\{B\}\{B\}/);
});
test('Cloud Key chosen type is reset on leaving battlefield and requires new selection after returning',()=>{
 let s=table();s.players[0].battlefield.push(card(cloud,'ck'));s=act(s,{type:'chooseCloudKeyType',id:'ck',chosenType:'Artifact'});
 s=act(s,{type:'move',id:'ck',player:0,zone:'hand'});
 assert.equal(s.players[0].hand.find(x=>x.id==='ck').costChosenType,undefined);
 s=act(s,{type:'move',id:'ck',player:0,zone:'battlefield'});
 assert.equal(spellCostQuote(s,0,beast).reduced,0);
 s=act(s,{type:'chooseCloudKeyType',id:'ck',chosenType:'Creature'});
 assert.equal(spellCostQuote(s,0,bear).reduced,1);
});
test('Crystal-linked exile is not an implicit casting permission even with sufficient mana',()=>{
 let s=table();s.players[0].battlefield.push(card(crystal,'c1'),...Array.from({length:6},(_,n)=>card(swamp,'mana'+n)));
 s.players[1].battlefield.push(card(bear,'victim',1));s=act(s,{type:'move',id:'victim',player:1,zone:'graveyard'});
 assert.throws(()=>act(s,{type:'castLinkedExile',id:'victim',player:0,withoutPaying:true}),/cannot cast/);
 assert(s.players[1].exile.some(x=>x.id==='victim'));
});
