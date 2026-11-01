import test from 'node:test';
import assert from 'node:assert/strict';
import {act, createGame, coverage} from '../web/engine.mjs';

const forest = {name:'Forest',type_line:'Basic Land — Forest',mana_cost:'',cmc:0,oracle_text:'',produced_mana:['G']};
const island = {...forest,name:'Island',type_line:'Basic Land — Island',produced_mana:['U']};
const wastes = {...forest,name:'Wastes',type_line:'Basic Land',oracle_text:'{T}: Add {C}.',produced_mana:['C']};
const ovika = {name:'Ovika, Enigma Goliath',type_line:'Legendary Creature — Phyrexian Nightmare',mana_cost:'{5}{U}{U}{R}',cmc:8,power:'6',toughness:'6',oracle_text:'Flying; Ward—{3}, Pay 3 life. Whenever you cast a noncreature spell, create X 1/1 red Phyrexian Goblin creature tokens, where X is the mana value of that spell. They gain haste until end of turn.'};
const divination = {name:'Divination',type_line:'Sorcery',mana_cost:'{2}{U}',cmc:3,oracle_text:'Draw two cards.'};
const bear = {name:'Bear',type_line:'Creature — Bear',mana_cost:'{1}{G}',cmc:2,power:'2',toughness:'2',oracle_text:''};
const physical = (card,id) => ({id,card,owner:0,controller:0,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
function table(active=true) {
  let game = createGame({deck:Array(80).fill(island),commander:ovika,rounds:8});
  game = act(game,{type:'keep'});
  if (active) game = act(game,{type:'move',id:'p0-commander',zone:'battlefield'});
  game.players[0].hand.push(physical(divination,'spell'));
  game.players[0].battlefield.push(...[island,wastes,wastes,forest].map((card,i)=>physical(card,'source-'+i)));
  return game;
}
test('Ovika trigger stacks over a successfully cast noncreature spell and resolves into hasty tokens',()=>{
  const state=table(), prior=JSON.stringify(state);
  const cast=act(state,{type:'play',id:'spell'});
  assert.equal(JSON.stringify(state),prior,'actions do not mutate the prior game');
  assert.equal(cast.stack.length,2);
  assert.ok(cast.log.findIndex(entry=>entry.includes('casts Divination')) < cast.log.findIndex(entry=>entry.includes('Ovika trigger from')), 'provenance log records casting before its triggered interaction');
  assert.equal(cast.stack[0].card.name,'Divination');
  assert.equal(cast.stack[1].trigger.adapter,'ovika-goblins');
  assert.equal(cast.stack[1].trigger.count,3);
  assert.throws(()=>act(cast,{type:'move',id:cast.stack[1].id,zone:'graveyard'}),/trigger/i);
  const triggered=act(cast,{type:'resolve'});
  const goblins=triggered.players[0].battlefield.filter(x=>x.isToken);
  assert.equal(goblins.length,3);
  assert.ok(goblins.every(x=>x.card.power==='1'&&x.temporaryHaste===true));
  assert.equal(triggered.stack.length,1,'original spell remains waiting below its trigger');
  const after=act(triggered,{type:'resolve'});
  assert.equal(after.stack.length,0);
  assert.equal(after.players[0].graveyard.filter(x=>x.card.name==='Divination').length,1);
  const attacking=act(after,{type:'attack',id:goblins[0].id});
  assert.equal(attacking.players[0].battlefield.find(x=>x.id===goblins[0].id).attacking,true,'new tokens can attack through haste');
  const nextTurn=act(attacking,{type:'endTurn'});
  const oldToken=nextTurn.players[0].battlefield.find(x=>x.id===goblins[0].id);
  assert.equal(oldToken?.temporaryHaste,undefined,'Ovika grants haste only until end of turn');
  assert.equal(oldToken?.card.keywords.includes('Haste'),false,'temporary haste must not become printed token text');
});
test('Ovika does not trigger from command zone, from creatures, or from an unaffordable cast',()=>{
  const absent=act(table(false),{type:'play',id:'spell'});
  assert.equal(absent.stack.length,1);
  const creature=table(); creature.players[0].hand.push(physical(bear,'creature'));
  const creatureCast=act(creature,{type:'play',id:'creature'});
  assert.equal(creatureCast.stack.length,1);
  const unaffordable=table(); unaffordable.players[0].battlefield=unaffordable.players[0].battlefield.filter(x=>x.id==='p0-commander');
  assert.throws(()=>act(unaffordable,{type:'play',id:'spell'}),/mana|cost/i);
  assert.equal(unaffordable.stack.length,0);
});
test('created Goblin tokens cease to exist after leaving the battlefield',()=>{
  let game=act(table(),{type:'play',id:'spell'});
  game=act(game,{type:'resolve'});
  const id=game.players[0].battlefield.find(x=>x.isToken).id;
  game=act(game,{type:'move',id,zone:'graveyard'});
  assert.equal(game.players[0].graveyard.some(x=>x.id===id),false);
  assert.equal(game.players[0].battlefield.some(x=>x.id===id),false);
  assert.match(game.log.at(-1),/ceases to exist/i);
});
test('Morrow coverage distinguishes supported interaction from unsupported remainder',()=>{
  const row=coverage([ovika])[0];
  assert.equal(row.status,'partial');
  assert.match(row.reason,/trigger.*supported.*ward.*manual/i);
});

test('Ovika fixture matches official printed mana cost and mana value',()=>{
  assert.equal(ovika.mana_cost,'{5}{U}{U}{R}');
  assert.equal(ovika.cmc,8);
});
