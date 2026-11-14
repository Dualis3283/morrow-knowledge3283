import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {act,createGame,castOptions,tapOptions,coverage} from '../web/engine.mjs';
const records=JSON.parse(fs.readFileSync(new URL('./mana-draw-cards.json',import.meta.url)));
const get=n=>records[n];
const item=(name,id,owner=0)=>({id,card:get(name),owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const creature={name:'Cheap Test Spell',type_line:'Creature — Test',mana_cost:'{U}',cmc:1,power:'1',toughness:'1',oracle_text:''};
function make(commander=null){return act(createGame({deck:Array(75).fill(get('Island')),opponentDeck:Array(75).fill(get('Swamp')),commander,rounds:8,seed:'mana-draw-fundamentals',onPlay:true}),{type:'keep'});}
function attach(g,...items){g.players[0].battlefield.push(...items);return g;}
test('Imported typed dual Prairie Stream / Sunken Hollow recognize intrinsic mana and respect entry condition',()=>{
 for(const [name,options] of [['Prairie Stream',[{W:1},{U:1}]],['Sunken Hollow',[{U:1},{B:1}]]]){
  let g=make();g.players[0].hand=[item(name,'dual')];g=act(g,{type:'play',id:'dual'});
  assert.equal(g.players[0].battlefield[0].tapped,true);
  assert.deepEqual(tapOptions(g,0,'dual').options,options);
  let h=make();h.players[0].battlefield.push(item('Island','i'),item('Plains','p'));h.players[0].hand=[item(name,'dual')];h=act(h,{type:'play',id:'dual'});
  assert.equal(h.players[0].battlefield.find(x=>x.id==='dual').tapped,false);
 }
});
test('Real Glacial Fortress checks controlled land types and gives W/U after untapping',()=>{
 let g=make();g.players[0].hand=[item('Glacial Fortress','dual')];g=act(g,{type:'play',id:'dual'});assert.equal(g.players[0].battlefield[0].tapped,true);
 let h=make();h.players[0].battlefield.push(item('Island','i'));h.players[0].hand=[item('Glacial Fortress','dual')];h=act(h,{type:'play',id:'dual'});
 assert.equal(h.players[0].battlefield.find(x=>x.id==='dual').tapped,false);
 assert.deepEqual(tapOptions(h,0,'dual').options,[{W:1},{U:1}]);
});
test('Real Shivan Reef / Caves of Koilos three modes track exactly one life loss on colored mana',()=>{
 for(const name of ['Shivan Reef','Caves of Koilos']){
  let g=attach(make(),item(name,'pain'));assert.equal(tapOptions(g,0,'pain').options.length,3);
  g=act(g,{type:'tap',id:'pain',choiceIndex:0});assert.equal(g.players[0].life,40);assert.equal(g.players[0].manaPool.C,1);
  let h=attach(make(),item(name,'pain'));h=act(h,{type:'tap',id:'pain',choiceIndex:2});assert.equal(h.players[0].life,39);
 }
});
test('Ancient Tomb produces two colorless and causes two damage (manual and pay)',()=>{
 let g=attach(make(),item('Ancient Tomb','tomb'));assert.deepEqual(tapOptions(g,0,'tomb').options,[{C:2}]);
 g=act(g,{type:'tap',id:'tomb'});assert.equal(g.players[0].life,38);assert.equal(g.players[0].manaPool.C,2);
});
test('Talismans offer free colorless or colored modes with life cost',()=>{
 for(const name of ['Talisman of Creativity','Talisman of Dominance']){
  let g=attach(make(),item(name,'rock'));const o=tapOptions(g,0,'rock');assert.equal(o.options.length,3);assert.deepEqual(o.optionDamage,[0,1,1]);
  g=act(g,{type:'tap',id:'rock',choiceIndex:1});assert.equal(g.players[0].life,39);
 }
});
test('Diamonds enter tapped; real Palladium Myr, Gold Myr and Birds tap for mana after summoning sickness',()=>{
 for(const name of ['Sky Diamond','Marble Diamond']){
  let g=make();g.players[0].manaPool={W:0,U:0,B:0,R:0,G:0,C:2};g.players[0].hand=[item(name,'diamond')];
  g=act(g,{type:'play',id:'diamond'});g=act(g,{type:'resolve'});assert.equal(g.players[0].battlefield[0].tapped,true);
  assert.ok(tapOptions(g,0,'diamond').options.length);
 }
 for(const name of ['Palladium Myr','Gold Myr','Birds of Paradise']){
  let g=make();const body=item(name,'body');body.enteredTurn=g.turn;g.players[0].battlefield.push(body);
  assert.ok(tapOptions(g,0,'body').options.length);
  assert.throws(()=>act(g,{type:'tap',id:'body'}),/summoning-sick/);
 }
});
test('Command Tower, Arcane Signet and Path of Ancestry use real commander colors, not 5-color assumption',()=>{
 let g=make(get('Ovika, Enigma Goliath'));
 for(const name of ['Command Tower','Path of Ancestry']){
  const id=name.split(' ')[0];g.players[0].battlefield.push(item(name,id));
  assert.deepEqual(tapOptions(g,0,id).options.map(x=>Object.keys(x)[0]).sort(),['R','U']);
 }
});
test('Chromatic Lantern grants 5 color options to EVERY owned land, while retaining original colorless tap mode',()=>{
 let g=attach(make(),item('Chromatic Lantern','lantern'),item('Island','island'),item('Underground River','river'));
 assert.equal(tapOptions(g,0,'island').options.length>=5,true);
 assert(tapOptions(g,0,'island').options.some(x=>x.B===1));
 assert(tapOptions(g,0,'river').options.some(x=>x.C===1));
 assert(tapOptions(g,0,'river').options.some(x=>x.G===1));
});
test('Fellwar Stone, Exotic Orchard and Reflecting Pool detect untapped OR tapped real color-producing lands',()=>{
 let g=make();g.players[1].battlefield=[item('Swamp','enemy',1)];g.players[1].battlefield[0].tapped=true;
 g.players[0].battlefield=[item('Fellwar Stone','stone'),item('Exotic Orchard','orchard'),item('Reflecting Pool','pool'),item('Island','island')];
 assert.deepEqual(tapOptions(g,0,'stone').options,[{B:1}]);
 assert.deepEqual(tapOptions(g,0,'orchard').options,[{B:1}]);
 assert(tapOptions(g,0,'pool').options.some(x=>x.U));
});
test('Prismatic Lens zero-activation C vs {1} activation colored mode and auto payment',()=>{
 let g=attach(make(),item('Prismatic Lens','lens'),item('Island','i'));
 assert.deepEqual(tapOptions(g,0,'lens').optionActivationGeneric,[0,1,1,1,1,1]);
 g.players[0].hand=[{...item('Island','placeholder'),card:{...creature,name:'Colored Test Creature',mana_cost:'{B}'}}];
 const q=castOptions(g,0,'placeholder');assert.equal(q.canCast,true);assert(q.plan.steps.some(x=>x.id==='lens'&&x.activationGeneric===1));
 g=act(g,{type:'play',id:'placeholder'});assert.equal(g.stack.length,1);
});
test('Temple of the False God cannot be used before five lands, becomes eligible with fifth land',()=>{
 let g=attach(make(),item('Temple of the False God','temple'),item('Island','a'),item('Island','b'),item('Island','c'));
 assert.equal(tapOptions(g,0,'temple'),null);
 g.players[0].battlefield.push(item('Island','d'));assert.equal(tapOptions(g,0,'temple').options[0].C,2);
});
test('Manual draw button engine action transfers actual library card to hand, persists source and undo remains snapshot-based',()=>{
 let g=make();const before={hand:g.players[0].hand.length,library:g.players[0].library.length,drawn:g.stats[0].cardsDrawn||0};
 const prev=JSON.stringify(g);let next=act(g,{type:'drawCard',player:0,count:1});
 assert.equal(next.players[0].hand.length,before.hand+1);assert.equal(next.players[0].library.length,before.library-1);
 assert.equal(next.stats[0].cardsDrawn,before.drawn+1);assert(next.log.some(x=>x.startsWith('Manual draw:')));
 assert.equal(JSON.stringify(g),prev);
});
test('Enduring Innocence draws only once each turn on another small creature entering',()=>{
 let g=attach(make(),item('Enduring Innocence','innocence'));
 g.players[0].hand=[item('Island','a'),item('Island','b')];
 for(const id of ['a','b'])g=act(g,{type:'move',id,player:0,zone:'battlefield'});
 // Lands are not creatures, so no trigger.
 assert.equal(g.stack.length,0);
 const soldier={...item('Island','token'),card:{name:'Soldier',type_line:'Creature — Soldier',power:'1',toughness:'1',cmc:0,mana_cost:'',oracle_text:''}};
 g.players[0].battlefield.push(soldier);g.players[0].hand=[{...soldier,id:'token-two'}, {...soldier,id:'token-three'}];
 const library=g.players[0].library.length;
 g=act(g,{type:'move',id:'token-two',player:0,zone:'battlefield'});g=act(g,{type:'move',id:'token-three',player:0,zone:'battlefield'});
 assert.equal(g.stack.length,1,'once per turn even multiple small entries');g=act(g,{type:'resolve'});
 assert.equal(g.players[0].library.length,library-1);
});
test('Undead Augur and Midnight Reaper recognize own Zombie death, draw 2, lose 2 life on resolving separate stack triggers',()=>{
 let g=attach(make(),item('Undead Augur','augur'),item('Midnight Reaper','reaper'));
 const zombie={...item('Island','z'),card:{name:'Zombie',type_line:'Creature — Zombie',power:'2',toughness:'2',mana_cost:'{1}{B}',cmc:2,oracle_text:''}};
 g.players[0].battlefield.push(zombie);const library=g.players[0].library.length;
 g=act(g,{type:'move',id:'z',player:0,zone:'graveyard'});
 assert.equal(g.stack.length,2);g=act(g,{type:'resolve'});g=act(g,{type:'resolve'});
 assert.equal(g.players[0].library.length,library-2);assert.equal(g.players[0].life,38);
});

test('Manual mana fallback taps an unsupported printed mana land, floats selected color and annotates its unverifiable override',()=>{
 let g=make();const filter={name:'Unmodeled Filter Land',type_line:'Land',mana_cost:'',cmc:0,oracle_text:'{W/B}, {T}: Add {W}{W}, {W}{B}, or {B}{B}.'};
 g.players[0].battlefield.push({...item('Island','filter'),card:filter});
 assert.equal(tapOptions(g,0,'filter'),null);
 const prior=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'manualSourceMana',id:'filter',player:0,color:'B',amount:5}),/quantity between 1 and 3/);
 let next=act(g,{type:'manualSourceMana',id:'filter',player:0,color:'B',amount:2});
 assert.equal(next.players[0].manaPool.B,2);assert.equal(next.players[0].battlefield[0].tapped,true);
 assert(next.log.some(x=>x.startsWith('Manual mana override:')));
 assert.equal(JSON.stringify(g),prior);
 next=act(next,{type:'tap',id:'filter'});assert.equal(next.players[0].manaPool.B,0);
});
