import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, scoreThreat, coverage, simulate } from '../web/engine.mjs';

const forest = { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '({T}: Add {G}.)', cmc: 0, produced_mana: ['G'] };
const island = { name: 'Island', type_line: 'Basic Land — Island', oracle_text: '({T}: Add {U}.)', cmc: 0, produced_mana: ['U'] };
const bear = { name: 'Grizzly Bears', type_line: 'Creature — Bear', oracle_text: '', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '2', keywords: [], colors: ['G'] };
const elf = { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', mana_cost: '{G}', cmc: 1, power: '1', toughness: '1', keywords: [], colors: ['G'] };
const ring = { name: 'Sol Ring', type_line: 'Artifact', oracle_text: '{T}: Add {C}{C}.', mana_cost: '{1}', cmc: 1, colors: [] };
const growth = { name: 'Giant Growth', type_line: 'Instant', oracle_text: 'Target creature gets +3/+3 until end of turn.', mana_cost: '{G}', cmc: 1 };
const divination = { name: 'Divination', type_line: 'Sorcery', oracle_text: 'Draw two cards.', mana_cost: '{2}{U}', cmc: 3 };
const deck = [...Array(24).fill(forest), ...Array(36).fill(bear)];
function instance(card, id, controller = 0, enteredTurn = 0) { return { id, card, owner: controller, controller, tapped: false, counters: 0, damage: 0, enteredTurn, attacking: false }; }
function fixture({ hand = [], battlefield = [], enemy = [], life = 40 } = {}) {
  let state = createGame({ deck, seed: 'fixture', life }); state = act(state, { type: 'keep' });
  state.players[0].hand = hand.map((card, i) => instance(card, `h${i}`));
  state.players[0].battlefield = battlefield.map((card, i) => instance(card, `b${i}`));
  state.players[1].battlefield = enemy.map((card, i) => instance(card, `e${i}`, 1));
  return state;
}
function totalCards(state, player) { return ['hand', 'library', 'battlefield', 'graveyard', 'exile', 'command'].reduce((n, zone) => n + state.players[player][zone].length, 0) + state.stack.filter(x => x.owner === player).length; }

test('seeded shuffle, coins and dice are reproducible and actions never mutate input', () => {
  const first = createGame({ deck, opponentDeck: deck, seed: 'repeat' });
  assert.deepEqual(first, createGame({ deck, opponentDeck: deck, seed: 'repeat' }));
  assert.notDeepEqual(first.players[0].hand.map(x => x.id), createGame({ deck, seed: 'different' }).players[0].hand.map(x => x.id));
  const before = JSON.stringify(first);
  const coin = act(first, { type: 'coin' });
  assert.equal(JSON.stringify(first), before);
  assert.deepEqual(coin, act(first, { type: 'coin' }));
  assert(['Heads', 'Tails'].includes(coin.lastRandom.result));
  const die = act(coin, { type: 'die', sides: 20 });
  assert(die.lastRandom.result >= 1 && die.lastRandom.result <= 20);
  assert.deepEqual(die, act(act(first, { type: 'coin' }), { type: 'die', sides: 20 }));
  assert.throws(() => act(first, { type: 'die', sides: 1 }));
});

test('London mulligans redraw seven, then bottom exactly the counted mulligans without losing cards', () => {
  let state = createGame({ deck, seed: 'London' });
  state = act(state, { type: 'mulligan' }); state = act(state, { type: 'mulligan' });
  assert.equal(state.players[0].hand.length, 7);
  assert.equal(totalCards(state, 0), 60);
  const before = JSON.stringify(state);
  assert.throws(() => act(state, { type: 'keep', bottomIds: [state.players[0].hand[0].id] }), /exactly 2/);
  assert.equal(JSON.stringify(state), before);
  const ids = state.players[0].hand.slice(0, 2).map(x => x.id);
  state = act(state, { type: 'keep', bottomIds: ids });
  assert.equal(state.players[0].hand.length, 5);
  assert.deepEqual(state.players[0].library.slice(-2).map(x => x.id), ids);
  assert.equal(totalCards(state, 0), 60);
  assert.throws(() => act(state, { type: 'mulligan' }), /before keeping/);
});

test('first player skips first draw; second player draws; eight complete rounds have eight land opportunities', () => {
  let first = createGame({ deck, seed: 'first', rounds: 8 });
  first = act(first, { type: 'keep' }); assert.equal(first.players[0].hand.length, 7);
  let second = createGame({ deck, seed: 'second', rounds: 8, onPlay: false });
  second = act(second, { type: 'keep' }); assert.equal(second.players[0].hand.length, 8);
  while (!first.finished) first = act(first, { type: 'endTurn' });
  assert.equal(first.round, 8); assert.equal(first.stats[0].missedLandDrops, 8); assert.equal(first.roundStats.length, 8);
  assert.equal(first.players[0].hand.length, 14);
  assert.throws(() => createGame({ deck, rounds: 13 }), /8 to 12/);
});

test('zero mana cannot cast a costed spell, colored costs are enforced and only one land can be played', () => {
  let state = fixture({ hand: [bear, forest, forest, divination] });
  assert.throws(() => act(state, { type: 'play', id: 'h0' }), /Not enough/);
  state = act(state, { type: 'play', id: 'h1' });
  assert.throws(() => act(state, { type: 'play', id: 'h2' }), /one land/);
  assert.throws(() => act(state, { type: 'play', id: 'h0' }), /Not enough/);
  let colored = fixture({ hand: [divination], battlefield: [forest, forest, forest] });
  assert.throws(() => act(colored, { type: 'play', id: 'h0' }), /required colors/);
});

test('mana sources tap once, excess colorless mana persists and summoning-sick elves cannot pay', () => {
  let state = fixture({ hand: [bear], battlefield: [forest, ring] });
  state = act(state, { type: 'play', id: 'h0' });
  assert.equal(state.players[0].manaPool.C, 1);
  assert(state.players[0].battlefield.every(x => x.tapped));
  assert.equal(state.stack.length, 1); state = act(state, { type: 'resolve' });
  assert.equal(state.players[0].battlefield.length, 3);
  assert.throws(() => act(state, { type: 'attack', id: 'h0' }), /summoning sickness/);
  let sick = fixture({ hand: [bear], battlefield: [forest, elf] }); sick.players[0].battlefield[1].enteredTurn = sick.turn;
  assert.throws(() => act(sick, { type: 'play', id: 'h0' }), /Not enough/);
  assert.throws(() => act(sick, { type: 'tap', id: 'b1' }), /summoning-sick/);
});

test('manual tap supplies known mana, while manual untap is logged as an override', () => {
  let state = fixture({ hand: [elf], battlefield: [forest] });
  state = act(state, { type: 'tap', id: 'b0' }); assert.equal(state.players[0].manaPool.G, 1);
  state = act(state, { type: 'play', id: 'h0' }); assert.equal(state.players[0].manaPool.G, 0);
  assert.throws(()=>act(state,{type:'tap',id:'b0'}),/already spent|Undo/i);
  assert.equal(state.players[0].battlefield[0].tapped,true,'spent mana cannot be reclaimed by manual untap');
});

test('Giant Growth modifies combat damage and expires at end of turn', () => {
  let state = fixture({ hand: [growth], battlefield: [forest, bear] });
  state = act(state, { type: 'play', id: 'h0', targetId: 'b1' }); state = act(state, { type: 'resolve' });
  state = act(state, { type: 'attack', id: 'b1' }); state = act(state, { type: 'combat', assignments: [] });
  assert.equal(state.players[1].life, 35); assert.equal(state.stats[0].damageDealt, 5);
  assert.throws(() => act(state, { type: 'combat' }), /already resolved/);
  state = act(state, { type: 'endTurn' });
  assert.equal(state.players[0].battlefield.find(x => x.id === 'b1').tempPower, undefined);
});

test('flying requires a flying or reach blocker and trample assigns only lethal damage to blocker', () => {
  const flyer = { ...bear, name: 'Test Flyer', oracle_text: 'Flying', keywords: ['Flying'] };
  let state = fixture({ battlefield: [flyer], enemy: [bear] }); state = act(state, { type: 'attack', id: 'b0' });
  assert.throws(() => act(state, { type: 'combat', assignments: [{ attackerId: 'b0', blockerId: 'e0' }] }), /Invalid blocker/);
  state = act(state, { type: 'combat', assignments: [] }); assert.equal(state.players[1].life, 38);
  const trampler = { ...bear, name: 'Test Trampler', oracle_text: 'Trample', keywords: ['Trample'], power: '6', toughness: '6' };
  state = fixture({ battlefield: [trampler], enemy: [bear] }); state = act(state, { type: 'attack', id: 'b0' });
  state = act(state, { type: 'combat', assignments: [{ attackerId: 'b0', blockerId: 'e0' }] });
  assert.equal(state.players[1].life, 36); assert.equal(state.players[1].graveyard.length, 1); assert.equal(state.players[0].battlefield[0].damage, 2);
});

test('first strike removes blocker before regular damage, double strike hits twice and lifelink gains life', () => {
  const striker = { ...bear, name: 'First Striker', oracle_text: 'First strike', keywords: ['First strike'] };
  let state = fixture({ battlefield: [striker], enemy: [bear] }); state = act(state, { type: 'attack', id: 'b0' });
  state = act(state, { type: 'combat', assignments: [{ attackerId: 'b0', blockerId: 'e0' }] });
  assert.equal(state.players[0].battlefield.length, 1); assert.equal(state.players[0].battlefield[0].damage, 0);
  const double = { ...bear, name: 'Double Lifelink', oracle_text: 'Double strike, lifelink', keywords: ['Double strike', 'Lifelink'] };
  state = fixture({ battlefield: [double] }); state = act(state, { type: 'attack', id: 'b0' }); state = act(state, { type: 'combat', assignments: [] });
  assert.equal(state.players[1].life, 36); assert.equal(state.players[0].life, 44);
});

test('unsupported effects stay pending until an explicit manual move and command zones preserve commanders', () => {
  const unknown = { name: 'Unimplemented Ritual', type_line: 'Sorcery', mana_cost: '{G}', cmc: 1, oracle_text: 'Do something not modeled.' };
  let state = fixture({ hand: [unknown], battlefield: [forest] });
  assert.equal(coverage([unknown])[0].status, 'manual');
  state = act(state, { type: 'play', id: 'h0' }); const before = JSON.stringify(state);
  assert.throws(() => act(state, { type: 'resolve' }), /manual move/); assert.equal(JSON.stringify(state), before);
  assert.throws(() => act(state, { type: 'endTurn' }), /stack/);
  state = act(state, { type: 'move', id: 'h0', player: 0, zone: 'graveyard' }); assert.equal(state.stack.length, 0);
  assert(state.log.at(-1).includes('Manual override'));
  state = createGame({ deck, commander: { ...bear, name: 'Test Commander', type_line: 'Legendary Creature — Bear' } });
  assert.equal(state.players[0].command.length, 1); assert.equal(totalCards(state, 0), 61);
  state = act(state, { type: 'move', id: 'p0-commander', player: 0, zone: 'battlefield' }); assert.equal(state.players[0].battlefield.length, 1);
});

test('threat scoring explains public synergy and treats legendary and mana value as small priors', () => {
  const multiplier = { name: 'Counter Engine', type_line: 'Legendary Enchantment', cmc: 4, oracle_text: 'If one or more counters would be put on a permanent you control, twice that many of those counters are put on that permanent instead.' };
  const plain = scoreThreat(bear), legend = scoreThreat({ ...bear, type_line: 'Legendary Creature — Bear' });
  assert(Math.abs(legend.score - plain.score - 0.5) < 1e-9);
  const alone = scoreThreat(multiplier), synergy = scoreThreat(multiplier, [{ ...instance(bear, 'visible'), counters: 3 }]);
  assert(synergy.score > alone.score); assert(synergy.reasons.some(x => x.includes('Counter multiplier'))); assert(synergy.reasons.some(x => x.includes('synergy')));
});

test('simulation is reproducible, reports skipped effects, keeps land counts bounded and observes all requested rounds', () => {
  const unknown = { name: 'Unknown Engine', type_line: 'Enchantment', mana_cost: '{G}', cmc: 1, oracle_text: 'An unsupported ability.' };
  const options = { deck: [...Array(24).fill(forest), ...Array(30).fill(bear), ...Array(6).fill(unknown)], opponentDeck: deck, seed: 'simulation', rounds: 8, runs: 6 };
  const result = simulate(options); assert.deepEqual(result, simulate(options));
  assert.equal(result.rounds.length, 8); assert.equal(result.summary.runs, 6); assert(result.summary.avgLandsPlayed <= 8);
  assert(result.coverage.skippedCards.includes('Unknown Engine')); assert(result.notes.some(x => x.includes('remain in hand')));
  assert(result.rounds.every(x => x.landsPlayed <= 1));
  assert(result.summary.avgCardsCast > 0); assert(result.rounds.every(x => x.runsObserved === 6));
});

test('unconditional flexible mana assigns scarce colors correctly and conditional produced_mana is not treated as free mana', () => {
  const dual = { name: 'Simple dual source', type_line: 'Land', cmc: 0, oracle_text: '{T}: Add {G} or {U}.', produced_mana: ['G', 'U'] };
  const multicolor = { ...bear, name: 'Two-color creature', mana_cost: '{G}{U}', cmc: 2 };
  let state = fixture({ hand: [multicolor], battlefield: [dual, forest] });
  state = act(state, { type: 'play', id: 'h0' });
  assert.equal(state.stack.length, 1); assert(state.players[0].battlefield.every(x => x.tapped));
  const conditional = { name: 'Conditional source', type_line: 'Land', cmc: 0, oracle_text: '{T}: Add one mana of any color that a land an opponent controls could produce.', produced_mana: ['W', 'U', 'B', 'R', 'G'] };
  assert.equal(coverage([conditional])[0].status, 'partial');
  state = fixture({ hand: [bear], battlefield: [conditional, conditional] });
  assert.throws(() => act(state, { type: 'play', id: 'h0' }), /Not enough/);
});

test('simple enters-tapped dual lands cannot produce mana on the turn they enter', () => {
  const guildgate = { name: 'Izzet Guildgate', type_line: 'Land — Gate', cmc: 0, oracle_text: 'Izzet Guildgate enters tapped.\n{T}: Add {U} or {R}.' };
  const blue = { name: 'Blue one drop', type_line: 'Creature', oracle_text: '', mana_cost: '{U}', cmc: 1, power: '1', toughness: '1' };
  let state = fixture({ hand: [guildgate, blue] });
  assert.equal(coverage([guildgate])[0].status, 'supported');
  state = act(state, { type: 'play', id: 'h0' }); assert.equal(state.players[0].battlefield[0].tapped, true);
  assert.throws(() => act(state, { type: 'play', id: 'h1' }), /Not enough/);
  state = act(state, { type: 'endTurn' }); state = act(state, { type: 'play', id: 'h1' }); assert.equal(state.stack.length, 1);
});
