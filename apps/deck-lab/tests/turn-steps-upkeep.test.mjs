import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, coverage } from '../web/engine.mjs';

const land=()=>({name:'Island',type_line:'Basic Land — Island',cmc:0,mana_cost:'',oracle_text:'{T}: Add {U}.',produced_mana:['U']});
const game=()=>createGame({deck:Array.from({length:25},land),opponentDeck:[],rounds:8,seed:'upkeep-qc'});
function add(state, name, player=0, oracle_text='', type_line='Enchantment') {
  const instance={id:'qc-'+player+'-'+name+'-'+state.players[player].battlefield.length,owner:player,controller:player,tapped:false,attacking:false,counters:0,damage:0,enteredTurn:0,card:{name,type_line,mana_cost:'{1}{B}',cmc:2,oracle_text,power:'2',toughness:'2'}};
  state.players[player].battlefield.push(instance);return instance;
}
const resolveAll=(state)=>{let s=state;while(s.stack.length)s=act(s,{type:'resolve'});return s;};
test('Dreadhorde Invasion waits until upkeep resolution, amasses existing Army on successive turns and does not repeat trigger',()=>{
  const initial=game();add(initial,'Dreadhorde Invasion',0,'At the beginning of your upkeep, you lose 1 life and amass Zombies 1.');
  let s=act(initial,{type:'keep'});
  assert.equal(s.phase,'upkeep');assert.equal(s.turnStep,'upkeep');assert.equal(s.stack.length,1);
  assert.equal(s.players[0].life,40);
  s=act(s,{type:'resolve'});
  assert.equal(s.players[0].life,39);
  assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Zombie Army').length,1);
  assert.equal(s.players[0].battlefield.find(x=>x.card.name==='Zombie Army').counters,1);
  assert.equal(s.phase,'main');assert.equal(s.players[0].hand.length,7);
  s=act(s,{type:'endTurn'});
  assert.equal(s.phase,'upkeep');assert.equal(s.stack.length,1);
  s=resolveAll(s);
  assert.equal(s.players[0].life,38);
  assert.equal(s.players[0].battlefield.find(x=>x.card.name==='Zombie Army').counters,2);
  assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Zombie Army').length,1);
  assert.equal(s.players[0].hand.length,8);
});
test('two Dreadhorde Invasions trigger separately in APNAP stack and add two counters to one Army',()=>{
 const initial=game();add(initial,'Dreadhorde Invasion');add(initial,'Dreadhorde Invasion');
 let s=act(initial,{type:'keep'});assert.equal(s.stack.length,2);s=resolveAll(s);
 assert.equal(s.players[0].life,38);assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Zombie Army').length,1);
 assert.equal(s.players[0].battlefield.find(x=>x.card.name==='Zombie Army').counters,2);
});
test('Bitterblossom upkeep token doubles only through a recognized replacement effect',()=>{
 const initial=game();add(initial,'Bitterblossom');add(initial,'Parallel Lives',0,'If an effect would create tokens under your control, it creates twice that many of those tokens instead.');
 let s=resolveAll(act(initial,{type:'keep'}));
 const faeries=s.players[0].battlefield.filter(x=>x.card.name==='Faerie Rogue');
 assert.equal(s.players[0].life,39);assert.equal(faeries.length,2);
 assert.ok(faeries.every(x=>x.card.keywords.includes('flying')));
});
test('Phyrexian Arena upkeep draw precedes ordinary draw, including first-turn skip',()=>{
 const initial=game();add(initial,'Phyrexian Arena',0,'At the beginning of your upkeep, you draw a card and you lose 1 life.');
 let s=act(initial,{type:'keep'});assert.equal(s.players[0].hand.length,7);
 s=resolveAll(s);assert.equal(s.players[0].hand.length,8);assert.equal(s.players[0].life,39);
 s=resolveAll(act(s,{type:'endTurn'}));assert.equal(s.players[0].hand.length,10);assert.equal(s.players[0].life,38);
});
test('Ophiomancer each-upkeep conditional only queues while controller has no Snake',()=>{
 const initial=game();add(initial,'Ophiomancer',0,'At the beginning of each upkeep, if you control no Snakes, create a 1/1 black Snake creature token with deathtouch.','Creature — Human Shaman');
 let s=resolveAll(act(initial,{type:'keep'}));assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Snake').length,1);
 s=act(s,{type:'endTurn'});assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Snake').length,1);
 assert.equal(s.stack.length,0);
});
test('unknown upkeep triggers surface manual evidence instead of silently being called supported',()=>{
 const initial=game();add(initial,'Unknown Clock',0,'At the beginning of your upkeep, do something complex.');
 const s=act(initial,{type:'keep'});
 assert.equal(s.phase,'main');assert.ok(s.warnings.some(x=>x.includes('Unknown Clock')&&x.includes('upkeep')));
 assert.ok(s.manualStepEvents.some(x=>x.name==='Unknown Clock'&&x.step==='upkeep'));
});
test('record each simulated turn step and retain phase-sensitive provenance',()=>{
 let s=act(game(),{type:'keep'});
 s=act(s,{type:'endTurn'});
 const recorded=new Set(s.turnStepHistory.filter(x=>x.player===0).map(x=>x.step));
 for(const step of ['untap','upkeep','draw','precombat-main','beginning-of-combat','declare-attackers','declare-blockers','combat-damage','end-of-combat','postcombat-main','end-step','cleanup'])assert.ok(recorded.has(step),step);
});

test('Assemble the Legion gains one muster counter per upkeep and creates escalating Soldiers',()=>{
 const initial=game();const source=add(initial,'Assemble the Legion',0,'At the beginning of your upkeep, put a muster counter on Assemble the Legion. Then create a 1/1 red and white Soldier creature token for each muster counter on Assemble the Legion.');
 let s=resolveAll(act(initial,{type:'keep'}));
 let card=s.players[0].battlefield.find(x=>x.id===source.id);
 assert.equal(card.musterCounters,1);assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Soldier').length,1);
 s=resolveAll(act(s,{type:'endTurn'}));card=s.players[0].battlefield.find(x=>x.id===source.id);
 assert.equal(card.musterCounters,2);assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Soldier').length,3);
});
test('Ophiomancer triggers on the opponents upkeep when controller has no Snakes',()=>{
 const initial=game();add(initial,'Ophiomancer');
 let s=resolveAll(act(initial,{type:'keep'}));
 const snake=s.players[0].battlefield.find(x=>x.card.name==='Snake');
 s=act(s,{type:'move',id:snake.id,player:0,zone:'graveyard'});
 assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Snake').length,0);
 s=act(s,{type:'endTurn'});
 assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Snake').length,1);
});
test('save and restore pending upkeep triggers without repeating them after resumed draw',()=>{
 const initial=game();add(initial,'Dreadhorde Invasion');
 let s=act(initial,{type:'keep'});
 const before=JSON.parse(JSON.stringify(s));
 s=act(before,{type:'resolve'});
 assert.equal(s.players[0].life,39);
 assert.equal(s.stack.length,0);
 assert.equal(s.phase,'main');
 assert.equal(s.players[0].battlefield.filter(x=>x.card.name==='Zombie Army').length,1);
});
test('unsupported end-step ability records owner, turn and step even when combat is skipped',()=>{
 const initial=game();add(initial,'Unmodelled End Step',0,'At the beginning of your end step, perform an unsupported action.');
 let s=act(initial,{type:'keep'});
 s=act(s,{type:'endTurn'});
 assert.ok(s.manualStepEvents.some(x=>x.name==='Unmodelled End Step'&&x.step==='end-step'&&x.controller===0));
});
