import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,castOptions,coverage,spellCostQuote} from '../web/engine.mjs';
const land={name:'Swamp',type_line:'Basic Land — Swamp',mana_cost:'',cmc:0,oracle_text:'{T}: Add {B}.'};
const island={...land,name:'Island',type_line:'Basic Land — Island',oracle_text:'{T}: Add {U}.'};
const rock={name:'The Darkness Crystal',type_line:'Legendary Artifact',mana_cost:'{2}{B}{B}',cmc:4,colors:['B'],oracle_text:'Black spells you cast cost {1} less to cast. If a nontoken creature an opponent controls would die, instead exile it and you gain 2 life. {4}{B}{B}, {T}: Put target creature card exiled with The Darkness Crystal onto the battlefield tapped under your control with two additional +1/+1 counters on it.'};
const medallion={name:'Jet Medallion',type_line:'Artifact',mana_cost:'{2}',cmc:2,oracle_text:'Black spells you cast cost {1} less to cast.'};
const inspector={name:'Foundry Inspector',type_line:'Artifact Creature — Construct',mana_cost:'{3}',cmc:3,power:'3',toughness:'2',oracle_text:'Artifact spells you cast cost {1} less to cast.'};
const sculptor={name:'Etherium Sculptor',type_line:'Artifact Creature — Vedalken Artificer',mana_cost:'{1}{U}',cmc:2,power:'1',toughness:'2',oracle_text:'Artifact spells you cast cost {1} less to cast.'};
const black={name:'Black Creature',type_line:'Creature — Human',mana_cost:'{2}{B}{B}',cmc:4,colors:['B'],power:'2',toughness:'2',oracle_text:''};
const plain={name:'Plain Black',type_line:'Sorcery',mana_cost:'{B}{B}',cmc:2,colors:['B'],oracle_text:'Draw one card.'};
const multi={...black,name:'Blue Black',mana_cost:'{3}{U}{B}',cmc:5,colors:['U','B']};
const green={...black,name:'Only Green',mana_cost:'{2}{G}',cmc:3,colors:['G']};
const devoid={...black,name:'Devoid',mana_cost:'{2}{B}',cmc:3,colors:[],oracle_text:'Devoid'};
const artifact={name:'Steel Spell',type_line:'Artifact',mana_cost:'{3}',cmc:3,colors:[],oracle_text:''};
const counter={name:'Counterspell',type_line:'Instant',mana_cost:'{U}{U}',cmc:2,colors:['U'],oracle_text:'Counter target spell.'};
const negate={name:'Negate',type_line:'Instant',mana_cost:'{1}{U}',cmc:2,colors:['U'],oracle_text:'Counter target noncreature spell.'};
const stifle={name:'Stifle',type_line:'Instant',mana_cost:'{U}',cmc:1,colors:['U'],oracle_text:'Counter target activated or triggered ability.'};
const root=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
function table(){let g=act(createGame({deck:Array(65).fill(land),opponentDeck:[],seed:'cost-reduction-014',rounds:8}),{type:'keep'});g.players[0].hand=[];g.players[0].battlefield=[];return g;}
test('The Darkness Crystal named, narrow generic cost reduction is reported as partial',()=>{
 const row=coverage([rock])[0];assert.equal(row.status,'partial');assert.match(row.reason,/cost reduction/i);
});
test('Darkness Crystal reduces one generic of black spells including blue-black, but not colored pips, green, or Devoid',()=>{
 const g=table();g.players[0].battlefield.push(root(rock,'crystal'));
 for(const [card,generic,reduced] of [[black,1,1],[multi,2,1],[plain,0,0],[green,2,0],[devoid,2,0]]){
  const q=spellCostQuote(g,0,card);assert.equal(q.wanted.generic,generic,card.name);assert.equal(q.reduced,reduced,card.name);
 }
 assert.equal(black.cmc,4,'mana value remains printed');
});
test('Two separate reductions stack; do not become mana resources or waive black requirements',()=>{
 let g=table();g.players[0].battlefield.push(root(rock,'crystal'),root(medallion,'medallion'),root(land,'swamp1'));
 const q=spellCostQuote(g,0,black);assert.equal(q.reduced,2);assert.equal(q.wanted.generic,0);assert.equal(q.wanted.B,2);
 g.players[0].hand.push(root(black,'black'));assert.equal(castOptions(g,0,'black').canCast,false);
 g.players[0].battlefield.push(root(land,'swamp2'));
 assert.equal(castOptions(g,0,'black').canCast,true);
 g=act(g,{type:'play',id:'black'});
 assert.equal(g.stack.at(-1).id,'black');assert.equal(g.players[0].battlefield.filter(x=>x.tapped&&x.card.name==='Swamp').length,2);
 assert(g.log.some(x=>/Spell cost reduction/.test(x)));
});
test('Discount applies to commander tax and other generic increases, without changing colored requirements',()=>{
 const g=table();g.players[0].battlefield.push(root(rock,'crystal'));
 const q=spellCostQuote(g,0,plain,2);assert.equal(q.printed.generic,0);assert.equal(q.increase,2);assert.equal(q.reduced,1);assert.equal(q.wanted.generic,1);assert.equal(q.wanted.B,2);
});
test('Tapping Crystal does not turn off static reduction; removing it does',()=>{
 const g=table();const crystal=root(rock,'crystal');crystal.tapped=true;g.players[0].battlefield.push(crystal);
 assert.equal(spellCostQuote(g,0,black).reduced,1);
 g.players[0].battlefield.splice(0,1);
 assert.equal(spellCostQuote(g,0,black).reduced,0);
});
test('Artifact reducers only reduce artifact spells, including zero color artifact, and never generic below zero',()=>{
 const g=table();g.players[0].battlefield.push(root(inspector,'inspector'),root(sculptor,'sculptor'));
 assert.equal(spellCostQuote(g,0,artifact).wanted.generic,1);
 assert.equal(spellCostQuote(g,0,black).reduced,0);
 assert.equal(spellCostQuote(g,0,{...artifact,mana_cost:'{1}',cmc:1}).wanted.generic,0);
});
test('The Darkness Crystal itself must be paid at its printed cost before it can reduce later black spells',()=>{
 let g=table();g.players[0].hand.push(root(rock,'crystal'));
 g.players[0].battlefield.push(root(land,'s1'),root(land,'s2'),root(land,'s3'));
 assert.equal(castOptions(g,0,'crystal').canCast,false);
 g.players[0].battlefield.push(root(land,'s4'));
 assert.equal(castOptions(g,0,'crystal').canCast,true);
 g=act(g,{type:'play',id:'crystal'});assert.equal(g.players[0].battlefield.some(x=>x.id==='crystal'),false);
 g=act(g,{type:'resolve'});assert.equal(g.players[0].battlefield.some(x=>x.id==='crystal'),true);
 assert.equal(spellCostQuote(g,0,black).reduced,1);
});
test('Scripted opponent may counter human spell with legally payable Counterspell on human turn',()=>{
 let g=table();g.players[1].hand=[root(counter,'opp-counter',1)];g.players[1].battlefield=[root(island,'opp-u1',1),root(island,'opp-u2',1)];
 g.stack=[root(black,'my-spell')];g=act(g,{type:'openResponseWindow'});
 g=act(g,{type:'passResponse'});
 assert.deepEqual(g.stack.map(x=>x.id),['my-spell','opp-counter']);
 assert.equal(g.players[1].battlefield.filter(x=>x.tapped).length,2);
 assert.equal(g.responseWindow.priorityPlayer,0);
 assert.equal(g.responseWindow.responses,1);
 g=act(g,{type:'passResponse'});
 assert.equal(g.stack.length,0);assert.equal(g.players[0].graveyard.some(x=>x.id==='my-spell'),true);
 assert.equal(g.players[1].graveyard.some(x=>x.id==='opp-counter'),true);
 assert.equal(g.opponentAudit.counterResponses,1);
});
test('Scripted opponent with insufficient mana never pretends to cast a response',()=>{
 let g=table();g.players[1].hand=[root(counter,'opp-counter',1)];g.players[1].battlefield=[root(island,'opp-u1',1)];g.stack=[root(black,'my-spell')];
 g=act(g,{type:'openResponseWindow'});g=act(g,{type:'passResponse'});
 assert.equal(g.responseWindow,undefined);assert.equal(g.players[1].hand.length,1);assert.equal(g.players[1].battlefield[0].tapped,false);
});
test('Scripted opponent chooses Negate only on noncreature and Stifle only on triggered abilities',()=>{
 let g=table();g.players[1].hand=[root(negate,'opp-negate',1),root(stifle,'opp-stifle',1)];g.players[1].battlefield=[root(island,'u',1),root(island,'v',1)];
 g.stack=[root(black,'creature-spell')];g=act(g,{type:'openResponseWindow'});g=act(g,{type:'passResponse'});
 assert.equal(g.stack.length,0);assert.equal(g.players[1].hand.length,2);
 let h=table();h.players[1].hand=[root(stifle,'opp-stifle',1)];h.players[1].battlefield=[root(island,'u',1)];
 h.stack=[{id:'draw-trigger',kind:'trigger',owner:0,controller:0,card:{name:'Draw Ability',type_line:'Triggered Ability',cmc:0},trigger:{adapter:'cast-draw',count:1}}];
 h=act(h,{type:'openResponseWindow'});h=act(h,{type:'passResponse'});
 assert.equal(h.stack.at(-1).id,'opp-stifle');
 h=act(h,{type:'passResponse'});assert.equal(h.stack.length,0);
});
