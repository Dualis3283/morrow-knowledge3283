import test from 'node:test';
import assert from 'node:assert/strict';
import {act, createGame, castOptions, tapOptions, coverage, loyaltyOptions} from '../web/engine.mjs';
const land={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const river={name:'Underground River',type_line:'Land',mana_cost:'',cmc:0,oracle_text:'{T}: Add {C}.\n{T}: Add {U} or {B}. This land deals 1 damage to you.',produced_mana:['C','U','B']};
const blue={name:'Test Blue Spell',type_line:'Instant',mana_cost:'{U}',cmc:1,oracle_text:'Unsupported test effect.'};
const black={...blue,name:'Test Black Spell',mana_cost:'{B}'};
const generic={...blue,name:'Test Generic Spell',mana_cost:'{1}'};
const raise={name:'Raise the Alarm',type_line:'Instant',mana_cost:'{1}{W}',cmc:2,oracle_text:'Create two 1/1 white Soldier creature tokens.'};
const dragon={name:'Dragon Fodder',type_line:'Sorcery',mana_cost:'{1}{R}',cmc:2,oracle_text:'Create two 1/1 red Goblin creature tokens.'};
const giant={name:'Unsupported Token Spell',type_line:'Instant',mana_cost:'{2}{G}',cmc:3,oracle_text:'Create an X/X green token with X equal to your life total.'};
const walker={name:'Test Walker',type_line:'Legendary Planeswalker — Test',mana_cost:'{2}{U}',cmc:3,loyalty:'3',oracle_text:'+1: Create a 1/1 white Soldier creature token.\n−2: Draw two cards.\n−5: You get an emblem with an effect.'};
const bolt={name:'Lightning Bolt',type_line:'Instant',mana_cost:'{R}',cmc:1,oracle_text:'Lightning Bolt deals 3 damage to any target.'};
const gatekeeper={name:'Molten Gatekeeper',type_line:'Creature — Phyrexian Goblin',power:'2',toughness:'3',mana_cost:'{2}{R}',cmc:3,oracle_text:'Whenever another creature enters the battlefield under your control, Molten Gatekeeper deals 1 damage to each opponent.'};
const ovika={name:'Ovika, Enigma Goliath',type_line:'Legendary Creature — Phyrexian Nightmare',power:'6',toughness:'6',mana_cost:'{5}{U}{R}',cmc:7,oracle_text:'Whenever you cast a noncreature spell, create X 1/1 red Phyrexian Goblin creature tokens, where X is that spell’s mana value. They gain haste until end of turn.'};
const item=(card,id)=>({id,card,owner:0,controller:0,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const start=()=>act(createGame({deck:Array(75).fill(land),rounds:8,seed:'source-resolution'}),{type:'keep'});

test('Underground River has three modes: colorless free, blue and black each deal one damage',()=>{
 let g=start();g.players[0].battlefield.push(item(river,'river'));
 assert.deepEqual(tapOptions(g,0,'river').options,[{C:1},{U:1},{B:1}]);
 assert.deepEqual(tapOptions(g,0,'river').optionDamage,[0,1,1]);
 assert.equal(coverage([river])[0].status,'supported');
 g=act(g,{type:'tap',id:'river',choiceIndex:0});
 assert.equal(g.players[0].manaPool.C,1);assert.equal(g.players[0].life,40);
 for(const [mode,color] of [[1,'U'],[2,'B']]){
  let h=start();h.players[0].battlefield.push(item(river,'river'));
  h=act(h,{type:'tap',id:'river',choiceIndex:mode});
  assert.equal(h.players[0].manaPool[color],1);assert.equal(h.players[0].life,39);
  assert.equal(h.players[0].manaPool.C,0);
 }
});
test('Underground River automatic casting pays correct damage only for colored mana, and preview does not',()=>{
 for (const [spell,pain,color] of [[blue,1,'U'],[black,1,'B'],[generic,0,'C']]){
  let g=start();g.players[0].battlefield.push(item(river,'river'));g.players[0].hand=[item(spell,'spell')];
  const before=JSON.stringify(g);
  const quote=castOptions(g,0,'spell');
  assert.equal(quote.canCast,true);assert.equal(JSON.stringify(g),before);
  assert.equal(quote.plan.steps[0].damage,pain);
  g=act(g,{type:'play',id:'spell'});
  assert.equal(g.players[0].life,40-pain);
  assert.equal(g.players[0].battlefield[0].tapped,true);
 }
});
test('Raise the Alarm creates two white tokens on resolution, not on cast, and they leave no physical cards in graveyard',()=>{
 let g=start();g.players[0].manaPool={W:1,U:0,B:0,R:0,G:0,C:1};g.players[0].hand=[item(raise,'spell')];
 g=act(g,{type:'play',id:'spell'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,0);
 assert.equal(g.stack[0].card.name,'Raise the Alarm');
 g=act(g,{type:'resolve'});
 const tokens=g.players[0].battlefield.filter(x=>x.isToken);
 assert.equal(tokens.length,2);assert(tokens.every(t=>t.card.power==='1'&&t.card.colors[0]==='W'));
 assert.equal(g.players[0].graveyard.filter(x=>x.card.name==='Raise the Alarm').length,1);
 g=act(g,{type:'move',id:tokens[0].id,player:0,zone:'graveyard'});
 assert.equal(g.players[0].graveyard.filter(x=>x.isToken).length,0);
});
test('A named token spell plus Ovika and Molten Gatekeeper follows stack, order and separate entry triggers',()=>{
 let g=start();g.players[0].manaPool={W:0,U:0,B:0,R:1,G:0,C:1};g.players[0].hand=[item(dragon,'spell')];
 g.players[0].battlefield.push(item(ovika,'ovika'),item(gatekeeper,'gatekeeper'));
 g=act(g,{type:'play',id:'spell'});
 assert.equal(g.stack.length,2,'Ovika trigger above original token spell');
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,2,'Ovika produces 2 first');
 assert.equal(g.stack.filter(x=>x.trigger?.adapter==='gatekeeper-damage').length,2);
 g=act(g,{type:'resolve'});g=act(g,{type:'resolve'});
 assert.equal(g.players[1].life,38);
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,4,'original Dragon Fodder adds 2 more');
 assert.equal(g.stack.length,2,'those token entries make new gatekeeper triggers');
 g=act(g,{type:'resolve'});g=act(g,{type:'resolve'});
 assert.equal(g.players[1].life,36);
});
test('Unknown X or nonconstant token effects stay manual and do not synthesize tokens',()=>{
 let g=start();g.players[0].manaPool={W:0,U:0,B:0,R:0,G:1,C:2};g.players[0].hand=[item(giant,'spell')];
 g=act(g,{type:'play',id:'spell'});
 assert.throws(()=>act(g,{type:'resolve'}),/no complete effect adapter|manual/i);
 assert.equal(g.stack.length,1);
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,0);
});
test('Planeswalkers enter with printed loyalty, can activate one of their listed costs per turn and do not execute invented ability effects',()=>{
 let g=start();g.players[0].manaPool={W:0,U:1,B:0,R:0,G:0,C:2};g.players[0].hand=[item(walker,'walk')];
 assert.deepEqual(loyaltyOptions(walker).map(x=>x.delta),[1,-2,-5]);
 g=act(g,{type:'play',id:'walk'});
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield[0].loyalty,3);
 assert.equal(g.players[0].battlefield[0].counters,0);
 assert.throws(()=>act(g,{type:'counter',id:'walk',delta:1}),/loyalty controls/i);
 g=act(g,{type:'activateLoyalty',id:'walk',delta:1});
 assert.equal(g.players[0].battlefield[0].loyalty,4);
 assert.equal(g.stack.length,1);
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,0,'printed token effect remains manual');
 assert.throws(()=>act(g,{type:'activateLoyalty',id:'walk',delta:-2}),/empty stack/i);
 g=act(g,{type:'resolve'});
 assert.throws(()=>act(g,{type:'activateLoyalty',id:'walk',delta:-2}),/already activated/i);
 g=act(g,{type:'endTurn'});
 g=act(g,{type:'activateLoyalty',id:'walk',delta:-2});
 assert.equal(g.players[0].battlefield[0].loyalty,2);
 g=act(g,{type:'resolve'});
 assert.throws(()=>act(g,{type:'activateLoyalty',id:'walk',delta:-5}),/already activated|Not enough loyalty/i);
});
test('Planeswalker zero-loyalty state-based removal, permanent damage and opponent turn restriction',()=>{
 let g=start();const w=item(walker,'walk');w.loyalty=3;g.players[0].battlefield.push(w);
 assert.throws(()=>act(g,{type:'activateLoyalty',id:'walk',delta:-5}),/Not enough loyalty/i);
 g=act(g,{type:'loyaltyAdjust',id:'walk',delta:-2});assert.equal(g.players[0].battlefield[0].loyalty,1);
 g=act(g,{type:'loyaltyAdjust',id:'walk',delta:-1});
 assert.equal(g.players[0].battlefield.length,0);
 assert.equal(g.players[0].graveyard[0].card.name,'Test Walker');
 let h=start();h.players[1].battlefield.push({...item(walker,'enemy-walk'),owner:1,controller:1,loyalty:3});
 h.players[0].manaPool={W:0,U:0,B:0,R:1,G:0,C:0};h.players[0].hand=[item(bolt,'bolt')];
 h=act(h,{type:'play',id:'bolt',targetId:'enemy-walk'});h=act(h,{type:'resolve'});
 assert.equal(h.players[1].life,40,'damage to planeswalker does not hit opponent');
 assert.equal(h.players[1].battlefield.length,0);
 assert.equal(h.players[1].graveyard[0].card.name,'Test Walker');
});
test('Planeswalker permanent return to battlefield and save migration initialise printed loyalty',()=>{
 let g=start();const w=item(walker,'legacy-walk');g.players[0].battlefield.push(w);
 let next=act(g,{type:'loyaltyAdjust',id:'legacy-walk',delta:1});
 assert.equal(next.players[0].battlefield[0].loyalty,4);
 assert.equal(g.players[0].battlefield[0].loyalty,undefined,'original snapshot stays unchanged');
});
