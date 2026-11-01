import test from 'node:test';
import assert from 'node:assert/strict';
import { act, coverage, createGame, scoreThreat, simulate } from '../web/engine.mjs';

// Independent rule fixtures: deliberately small definitions, not imported deck recommendations.
const forest = { name: 'Forest', mana_cost: '', cmc: 0, type_line: 'Basic Land — Forest', oracle_text: '', produced_mana: ['G'], colors: [], keywords: [] };
const wastes = { ...forest, name: 'Wastes', type_line: 'Basic Land', oracle_text: '{T}: Add {C}.', produced_mana: ['C'] };
const ring = { name: 'Sol Ring', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '{T}: Add {C}{C}.', keywords: [], colors: [] };
const creature = (name, mana_cost = '{G}', power = 2, toughness = 2, keywords = []) => ({ name, mana_cost, cmc: 1, type_line: 'Creature — Test', oracle_text: keywords.join(', '), power: String(power), toughness: String(toughness), keywords, colors: mana_cost.includes('G') ? ['G'] : [] });
const zones = ['library', 'hand', 'battlefield', 'graveyard', 'exile', 'command'];
function allCards(state, player) { return zones.flatMap(zone => state.players[player][zone] || []); }
function ids(state) { return [...state.players.flatMap((_, player) => allCards(state, player)), ...state.stack].map(card => card.id).sort(); }
function opening(cards = [], opposing = [], options = {}) {
  return createGame({ deck: [...cards, ...Array(40).fill(forest)], opponentDeck: [...opposing, ...Array(40).fill(forest)], seed: 'independent-review', rounds: 8, ...options });
}
function table(cards = [], opposing = [], options = {}) { return act(opening(cards, opposing, options), { type: 'keep' }); }
function move(state, name, zone, player = 0) {
  const instance = allCards(state, player).find(card => card.card.name === name && !(state.players[player][zone] || []).some(x => x.id === card.id))
    || allCards(state, player).find(card => card.card.name === name);
  assert.ok(instance, `Fixture ${name} exists`);
  return [act(state, { type: 'move', id: instance.id, player, zone }), instance.id];
}

test('London mulligans preserve every physical card and bottom exactly the counted mulligans', () => {
  let state = opening();
  const originalIds = ids(state);
  state = act(state, { type: 'mulligan' });
  state = act(state, { type: 'mulligan' });
  assert.equal(state.players[0].hand.length, 7);
  assert.equal(state.players[0].mulligans, 2);
  assert.throws(() => act(state, { type: 'keep', bottomIds: [state.players[0].hand[0].id] }), /exactly/i);
  const bottomIds = state.players[0].hand.slice(0, 2).map(card => card.id);
  state = act(state, { type: 'keep', bottomIds });
  assert.equal(state.players[0].hand.length, 5);
  assert.deepEqual(state.players[0].library.slice(-2).map(card => card.id), bottomIds);
  assert.deepEqual(ids(state), originalIds);
  assert.equal(new Set(ids(state)).size, originalIds.length);
  assert.throws(() => act(state, { type: 'mulligan' }), /opening|keeping/i);
});

test('first-turn draw follows play order and copied state actions do not mutate their input', () => {
  const first = opening([], [], { onPlay: true });
  const snapshot = JSON.stringify(first);
  assert.equal(act(first, { type: 'keep' }).players[0].hand.length, 7);
  assert.equal(JSON.stringify(first), snapshot);
  assert.equal(table([], [], { onPlay: false }).players[0].hand.length, 8);
});

test('ordinary land plays have a one-per-turn limit independent of manual controls', () => {
  let state = table();
  const lands = state.players[0].hand.slice(0, 2);
  state = act(state, { type: 'play', id: lands[0].id });
  assert.throws(() => act(state, { type: 'play', id: lands[1].id }), /one land/i);
  state = act(state, { type: 'endTurn' });
  state = act(state, { type: 'play', id: lands[1].id });
  assert.equal(state.players[0].battlefield.length, 2);
});

test('colored mana cannot pay an explicit colorless requirement and a real colorless source can', () => {
  const body = creature('Colorless cost fixture', '{C}');
  let state = table([body, wastes]);
  let spellId;
  [state, spellId] = move(state, body.name, 'hand');
  [state] = move(state, 'Forest', 'battlefield');
  assert.throws(() => act(state, { type: 'play', id: spellId }), /mana|required colors/i);
  [state] = move(state, 'Wastes', 'battlefield');
  state = act(state, { type: 'play', id: spellId });
  assert.equal(state.stack[0].id, spellId);
  assert.equal(state.players[0].battlefield.find(x => x.card.name === 'Wastes').tapped, true);
  assert.equal(state.players[0].battlefield.find(x => x.card.name === 'Forest').tapped, false);
});

test('a two-mana source and its floating remainder pay two costs once, without reusing a tapped source', () => {
  const bodies = ['First', 'Second', 'Third'].map(name => creature(`${name} generic fixture`, '{1}'));
  let state = table([ring, ...bodies]);
  const castIds = [];
  [state] = move(state, ring.name, 'battlefield');
  for (const body of bodies) {
    let id; [state, id] = move(state, body.name, 'hand'); castIds.push(id);
  }
  const beforeIds = ids(state);
  state = act(state, { type: 'play', id: castIds[0] });
  assert.equal(state.players[0].manaPool.C, 1);
  assert.equal(state.players[0].battlefield.some(x => x.id === castIds[0]), false);
  state = act(state, { type: 'resolve' });
  state = act(state, { type: 'play', id: castIds[1] });
  assert.equal(state.players[0].manaPool.C, 0);
  state = act(state, { type: 'resolve' });
  assert.throws(() => act(state, { type: 'play', id: castIds[2] }), /mana|required colors/i);
  assert.deepEqual(ids(state), beforeIds);
});

test('ordinary creatures cannot be cast in response to a nonempty stack', () => {
  const a = creature('First response fixture');
  const b = creature('Second response fixture');
  let state = table([a, b]);
  let aId, bId;
  [state, aId] = move(state, a.name, 'hand');
  [state, bId] = move(state, b.name, 'hand');
  [state] = move(state, 'Forest', 'battlefield');
  [state] = move(state, 'Forest', 'battlefield');
  state = act(state, { type: 'play', id: aId });
  assert.throws(() => act(state, { type: 'play', id: bId }), /stack|instant/i);
  assert.throws(() => act(state, { type: 'endTurn' }), /stack/i);
});

test('newly resolved creatures wait for a later controller turn before attacking', () => {
  const body = creature('Summoning fixture');
  let state = table([body]); let id;
  [state, id] = move(state, body.name, 'hand');
  [state] = move(state, 'Forest', 'battlefield');
  state = act(state, { type: 'play', id });
  state = act(state, { type: 'resolve' });
  assert.throws(() => act(state, { type: 'attack', id }), /summoning sickness|cannot attack/i);
  state = act(state, { type: 'endTurn' });
  state = act(state, { type: 'attack', id });
  assert.equal(state.players[0].battlefield.find(x => x.id === id).attacking, true);
});

test('first strike removes a normal blocker before that blocker can deal normal combat damage', () => {
  const attacker = creature('First strike fixture', '{G}', 2, 2, ['First strike']);
  const blocker = creature('Normal blocker fixture', '{G}', 2, 2);
  let state = table([attacker], [blocker]); let aId, bId;
  [state, aId] = move(state, attacker.name, 'battlefield');
  state = act(state, { type: 'endTurn' });
  [state, bId] = move(state, blocker.name, 'battlefield', 1);
  state = act(state, { type: 'attack', id: aId });
  state = act(state, { type: 'combat', assignments: [{ attackerId: aId, blockerId: bId }] });
  assert.equal(state.players[1].graveyard.some(x => x.id === bId), true);
  assert.equal(state.players[0].battlefield.find(x => x.id === aId).damage, 0);
});

test('double strike and trample carry damage through a blocker removed in the first damage step', () => {
  const attacker = creature('Double strike trample fixture', '{G}', 3, 3, ['Double strike', 'Trample']);
  const blocker = creature('Double strike blocker fixture', '{G}', 2, 2);
  let state = table([attacker], [blocker]); let aId, bId;
  [state, aId] = move(state, attacker.name, 'battlefield');
  state = act(state, { type: 'endTurn' });
  [state, bId] = move(state, blocker.name, 'battlefield', 1);
  const beforeLife = state.players[1].life;
  state = act(state, { type: 'attack', id: aId });
  state = act(state, { type: 'combat', assignments: [{ attackerId: aId, blockerId: bId }] });
  assert.equal(state.players[1].life, beforeLife - 4);
  assert.equal(state.players[1].graveyard.some(x => x.id === bId), true);
});

test('a creature returning from the graveyard does not retain deathtouch damage from its previous existence', () => {
  const attacker = creature('Returning fixture', '{G}', 2, 2);
  const blocker = creature('Deathtouch fixture', '{G}', 1, 3, ['Deathtouch']);
  let state = table([attacker], [blocker]); let aId, bId;
  [state, aId] = move(state, attacker.name, 'battlefield');
  state = act(state, { type: 'endTurn' });
  [state, bId] = move(state, blocker.name, 'battlefield', 1);
  state = act(state, { type: 'attack', id: aId });
  state = act(state, { type: 'combat', assignments: [{ attackerId: aId, blockerId: bId }] });
  assert.equal(state.players[0].graveyard.some(x => x.id === aId), true);
  state = act(state, { type: 'move', id: aId, zone: 'battlefield' });
  state = act(state, { type: 'counter', id: aId, delta: 1 });
  assert.equal(state.players[0].battlefield.some(x => x.id === aId), true);
});

test('8, 10 and 12 round limits give both players their full bounded turns and repeat exactly', () => {
  for (const rounds of [8, 10, 12]) {
    const options = { deck: Array(40).fill(forest), opponentDeck: Array(40).fill(forest), seed: `round-review-${rounds}`, rounds, runs: 2 };
    for (const onPlay of [true, false]) {
      const report = simulate({ ...options, onPlay });
      assert.deepEqual(report, simulate({ ...options, onPlay }));
      assert.equal(report.summary.avgRoundsReached, rounds);
      assert.equal(report.summary.avgLandsPlayed, rounds);
      assert.equal(report.rounds.length, rounds);
      assert.ok(report.rounds.every(row => row.runsObserved === 2));
    }
  }
});

test('unknown triggers stay outside automation and threat reasons use only supplied public cards', () => {
  const unknown = { ...creature('Unimplemented draw fixture'), oracle_text: 'Whenever another creature enters, draw a card.' };
  assert.notEqual(coverage([unknown])[0].status, 'supported');
  const report = simulate({ deck: [...Array(25).fill(forest), ...Array(15).fill(unknown)], opponentDeck: Array(40).fill(forest), rounds: 8, runs: 2 });
  assert.equal(report.summary.avgCardsCast, 0);
  assert.ok(report.coverage.skippedCards.includes(unknown.name));
  const engine = { name: 'Counter multiplier fixture', type_line: 'Legendary Enchantment', cmc: 4, oracle_text: 'If one or more counters would be put on a permanent you control, twice that many are put on it instead.' };
  const publicBoard = [{ card: creature('Visible counter fixture'), counters: 2 }];
  const score = scoreThreat(engine, publicBoard);
  assert.ok(score.reasons.some(reason => /Counter multiplier/i.test(reason)));
  assert.deepEqual(score, scoreThreat(engine, structuredClone(publicBoard)));
});
