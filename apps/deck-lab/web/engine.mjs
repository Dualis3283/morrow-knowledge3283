/** Bounded, deterministic MTG practice engine. No model calls or general Oracle interpreter. */
const COLORS = ['W', 'U', 'B', 'R', 'G', 'C'];
const ZONES = ['library', 'hand', 'battlefield', 'graveyard', 'exile', 'command'];
const COMBAT_KEYWORDS = ['flying', 'reach', 'haste', 'vigilance', 'trample', 'deathtouch', 'lifelink', 'first strike', 'double strike', 'defender', 'indestructible', 'hexproof', 'shroud'];
const BASE_MANA = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G', Wastes: 'C' };
const clone = value => JSON.parse(JSON.stringify(value));
const text = card => String(card?.oracle_text || '');
const type = (card, kind) => String(card?.type_line || '').toLowerCase().includes(kind.toLowerCase());
const cardOf = value => value?.card || value || {};
const named = card => String(card?.name || 'Unnamed card');
const isCreature = value => type(cardOf(value), 'Creature');
function has(value, keyword) {
  if (keyword.toLowerCase() === 'haste' && value?.temporaryHaste === true) return true;
  const card = cardOf(value);
  return (card.keywords || []).some(x => x.toLowerCase() === keyword) || new RegExp(`(?:^|[\\n,;])\\s*${keyword}(?=\\s*(?:[,(.;\\n]|$))`, 'i').test(text(card));
}
function hash(seed) { let n = 2166136261; for (const c of String(seed)) { n ^= c.charCodeAt(0); n = Math.imul(n, 16777619); } return n >>> 0; }
function random(state) { let n = state.rngState += 0x6D2B79F5; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); state.rngState >>>= 0; return ((n ^ n >>> 14) >>> 0) / 4294967296; }
function shuffle(state, cards) { for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(random(state) * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; } return cards; }
function pool() { return Object.fromEntries(COLORS.map(c => [c, 0])); }
function log(state, message) { state.log.push(message); }
function warn(state, message) { if (!state.warnings.includes(message)) state.warnings.push(message); }
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function power(instance) { return Math.max(0, number(instance.card.power) + instance.counters + (instance.tempPower || 0)); }
function toughness(instance) { return number(instance.card.toughness) + instance.counters + (instance.tempToughness || 0); }
function fresh(card, player, index, commander = false) { return { id: `p${player}-${index}`, card: clone(card), owner: player, controller: player, tapped: false, counters: 0, damage: 0, enteredTurn: 0, attacking: false, ...(commander ? {isCommander: true, commanderCasts: 0} : {}) }; }
function mono(color, amount = 1) { return { [color]: amount }; }

function manaSource(card) {
  if (BASE_MANA[named(card)]) return { options: [mono(BASE_MANA[named(card)])] };
  const known = {
    'Sol Ring': { options: [mono('C', 2)] },
    'Thran Dynamo': { options: [mono('C', 3)] },
    'Worn Powerstone': { options: [mono('C', 2)], entersTapped: true },
    'Mind Stone': { options: [mono('C')], partial: true },
    'Thought Vessel': { options: [mono('C')], partial: true },
    'Hedron Archive': { options: [mono('C', 2)], partial: true },
    'Llanowar Elves': { options: [mono('G')] },
    'Elvish Mystic': { options: [mono('G')] },
    'Fyndhorn Elves': { options: [mono('G')] },
  };
  if (known[named(card)]) return known[named(card)];
  // Only unconditional tap abilities, never infer conditional/sacrifice mana from produced_mana.
  let oracle = text(card).replace(/\([^)]*\)/g, '').trim();
  const lines = oracle.split('\n').map(line => line.trim()).filter(Boolean);
  let entersTapped = false;
  if (lines.length === 2 && / enters (?:the battlefield )?tapped\.$/i.test(lines[0])) {
    const subject = lines[0].replace(/ enters (?:the battlefield )?tapped\.$/i, '');
    if ([named(card).toLowerCase(), 'this land', 'this artifact', 'this permanent'].includes(subject.toLowerCase())) { entersTapped = true; oracle = lines[1]; }
  }
  const match = oracle.match(/^\{T\}: Add (.+)\.$/);
  if (match) {
    if (match[1] === 'one mana of any color') return { options: COLORS.filter(color => color !== 'C').map(color => mono(color)), entersTapped };
    const alternatives = match[1].split(/,\s*(?:or\s+)?|\s+or\s+/).filter(Boolean);
    if (alternatives.every(value => /^(?:\{[WUBRGC]\})+$/.test(value))) return {
      options: alternatives.map(value => {
        const option = {};
        for (const token of value.matchAll(/\{([WUBRGC])\}/g)) option[token[1]] = (option[token[1]] || 0) + 1;
        return option;
      }), entersTapped,
    };
  }
  return null;
}
function cost(card) {
  const raw = String(card.mana_cost || '');
  if (!raw && !type(card, 'Land') && number(card.cmc) > 0) return null;
  const symbols = [...raw.matchAll(/\{([^}]+)\}/g)].map(x => x[1]);
  if (symbols.join('') !== raw.replace(/[{}]/g, '')) return null;
  const out = { generic: 0, ...pool() };
  for (const symbol of symbols) {
    if (/^\d+$/.test(symbol)) out.generic += Number(symbol);
    else if (COLORS.includes(symbol)) out[symbol]++;
    else return null;
  }
  return out;
}
const EFFECTS = {
  'Giant Growth': { effect: 'pump', amount: 3, target: 'creature' },
  'Divination': { effect: 'draw', amount: 2 },
  'Harmonize': { effect: 'draw', amount: 3 },
  'Unsummon': { effect: 'bounce', target: 'creature' },
  'Murder': { effect: 'destroy', target: 'creature' },
  'Doom Blade': { effect: 'destroy', target: 'nonblackCreature' },
  'Go for the Throat': { effect: 'destroy', target: 'nonartifactCreature' },
  'Swords to Plowshares': { effect: 'exile', target: 'creature', gainLife: true },
  'Path to Exile': { effect: 'exile', target: 'creature', basicLand: true },
  'Disenchant': { effect: 'destroy', target: 'artifactEnchantment' },
  'Naturalize': { effect: 'destroy', target: 'artifactEnchantment' },
  'Lightning Bolt': { effect: 'burn', amount: 3, target: 'creatureOrPlayer', status: 'partial', reason: 'Creature or opposing-player damage supported; self, planeswalker and battle targets require manual resolution.' },
  'Shock': { effect: 'burn', amount: 2, target: 'creatureOrPlayer', status: 'partial', reason: 'Creature or opposing-player damage supported; self, planeswalker and battle targets require manual resolution.' },
  'Lightning Strike': { effect: 'burn', amount: 3, target: 'creatureOrPlayer', status: 'partial', reason: 'Creature or opposing-player damage supported; self, planeswalker and battle targets require manual resolution.' },
  'Rampant Growth': { effect: 'ramp', amount: 1 },
  'Cultivate': { effect: 'cultivate', amount: 2 },
  "Kodama's Reach": { effect: 'cultivate', amount: 2 },
};
function profile(card) {
  if (!card || !card.name) return { status: 'manual', reason: 'Missing card definition.', auto: false };
  if (card.card_faces?.length || /\b(Planeswalker|Battle|Saga|Aura|Equipment)\b/.test(card.type_line || '')) return { status: 'manual', reason: 'Faces, loyalty, defense, chapters and attachments require manual resolution.', auto: false };
  if (!cost(card)) return { status: 'manual', reason: 'Variable, hybrid, Phyrexian, alternative or missing mana cost requires manual payment.', auto: false };
  if (EFFECTS[card.name]) return { status: 'supported', reason: 'Explicit named effect adapter.', auto: true, ...EFFECTS[card.name] };
  const source = manaSource(card);
  if (source) return { status: source.partial ? 'partial' : 'supported', reason: source.partial ? 'Mana ability supported; other optional abilities are omitted and logged.' : 'Unconditional mana source supported.', auto: true, source };
  if (named(card) === 'Ovika, Enigma Goliath') return { status: 'partial', reason: 'Noncreature-spell cast token trigger is supported in manual table play; ward and other rules remain manual. No automatic commander casting.', auto: false };
  if (type(card, 'Land')) return { status: 'manual', reason: 'Nonbasic land conditions and abilities need manual resolution.', auto: false };
  if (type(card, 'Creature')) {
    if (!/^-?\d+$/.test(String(card.power)) || !/^-?\d+$/.test(String(card.toughness))) return { status: 'manual', reason: 'Variable power or toughness requires manual adjustment.', auto: false };
    let rest = text(card).replace(/\([^)]*\)/g, '').trim();
    for (const keyword of [...COMBAT_KEYWORDS].sort((a, b) => b.length - a.length)) rest = rest.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '');
    if (!rest.replace(/[\s,.;—-]/g, '')) return { status: 'supported', reason: 'Creature statistics and supported combat keywords.', auto: true };
    return { status: 'partial', reason: 'Creature body can be placed manually; Oracle abilities are not automated.', auto: false };
  }
  return { status: 'manual', reason: 'No explicit effect adapter; resolve this card manually.', auto: false };
}
export function coverage(deck = []) {
  const seen = new Set();
  return deck.filter(card => { const name = named(card); if (seen.has(name)) return false; seen.add(name); return true; })
    .map(card => { const { status, reason } = profile(card); return { name: named(card), status, reason }; });
}

/** Explainable priority using only the supplied permanent and battlefield. No hand input. */
export function scoreThreat(value, battlefield = []) {
  const card = cardOf(value), reasons = [];
  const instance = value?.card ? value : { card, counters: 0 };
  let score = 0;
  const add = (amount, reason) => { if (amount > 0) { score += amount; reasons.push(`${reason} +${amount.toFixed(1)}`); } };
  if (isCreature(card)) {
    add(Math.min(power(instance), 20) * 0.6, 'Power');
    if (has(card, 'flying')) add(1, 'Flying');
    if (has(card, 'trample')) add(0.6, 'Trample');
    if (has(card, 'double strike')) add(power(instance) * 0.5, 'Double strike');
    if (has(card, 'deathtouch')) add(1, 'Deathtouch');
    if (has(card, 'lifelink')) add(0.7, 'Lifelink');
    if (number(instance.counters)) add(Math.min(instance.counters * 0.25, 2), 'Visible counters');
  }
  add(Math.min(number(card.cmc), 8) * 0.25, 'Mana value prior');
  if (type(card, 'Legendary')) add(0.5, 'Legendary prior');
  const oracle = text(card).toLowerCase();
  const multiplier = /(?:twice|double|three times|that many plus)/.test(oracle);
  if (multiplier && /counters?/.test(oracle)) {
    add(4, 'Counter multiplier');
    add(Math.min(battlefield.filter(x => number(x.counters) > 0 || /counter/.test(text(cardOf(x)).toLowerCase())).length, 4) * 0.5, 'Battlefield counter synergy');
  }
  if (multiplier && /tokens?/.test(oracle)) {
    add(4, 'Token multiplier');
    add(Math.min(battlefield.filter(x => /creat[^.]*token|token creature/i.test(text(cardOf(x)))).length, 4) * 0.5, 'Battlefield token synergy');
  }
  if (/(whenever|at the beginning|each).*draw|draw.*(whenever|each)/s.test(oracle)) add(2.5, 'Repeatable draw engine');
  if (manaSource(card)) add(1.5, 'Mana engine');
  if (/other.*(?:creatures|you control).*get \+|creatures you control get \+/s.test(oracle)) add(Math.min(battlefield.filter(isCreature).length * 0.5, 3), 'Battlefield anthem synergy');
  if (has(card, 'indestructible') || has(card, 'hexproof')) add(0.5, 'Resilience');
  return { score: Math.round(score * 100) / 100, reasons: reasons.length ? reasons : ['No recognized public threat factors'] };
}
function find(state, id) {
  for (let p = 0; p < 2; p++) for (const zone of ZONES) {
    const index = state.players[p][zone].findIndex(x => x.id === id);
    if (index >= 0) return { instance: state.players[p][zone][index], player: p, zone, index };
  }
  const index = state.stack.findIndex(x => x.id === id);
  return index < 0 ? null : { instance: state.stack[index], player: state.stack[index].controller, zone: 'stack', index };
}
function remove(state, location) { return (location.zone === 'stack' ? state.stack : state.players[location.player][location.zone]).splice(location.index, 1)[0]; }
function moveTo(state, instance, player, zone, {keepCommanderInGraveyard = false} = {}) {
  if (instance.isToken && zone !== 'battlefield') {
    log(state, `${named(instance.card)} token ceases to exist after leaving the battlefield.`);
    return;
  }
  if (instance.isCommander) {
    // Control can change on the battlefield; private zones belong to the owner.
    const owner = instance.owner;
    if (zone !== 'battlefield') player = owner;
    if (zone === 'graveyard' && state.players[owner].returnCommanderOnDeath !== false && !keepCommanderInGraveyard) {
      zone = 'command';
      log(state, `Practice choice: ${named(instance.card)} returns from the graveyard to ${state.players[owner].name}'s command zone (return on death enabled).`);
    }
  }
  instance.controller = player; instance.attacking = false; delete instance.deathtouchDamage;
  if (zone !== 'battlefield') { instance.tapped = false; instance.counters = 0; instance.damage = 0; delete instance.tempPower; delete instance.tempToughness; }
  if (zone === 'battlefield') { instance.enteredTurn = state.turn; instance.damage = 0; }
  state.players[player][zone].push(instance);
}

/** Upgrade older saved tables without changing the caller's snapshot. */
export function upgradeGame(snapshot) {
  const state = clone(snapshot);
  for (const player of state.players) {
    for (const zone of ZONES) if (!Array.isArray(player[zone])) player[zone] = [];
    if (typeof player.returnCommanderOnDeath !== 'boolean') player.returnCommanderOnDeath = true;
  }
  state.stack ||= [];
  state.nextTriggerId ??= 0;
  state.nextTokenId ??= 0;
  const all = [...state.players.flatMap(player => ZONES.flatMap(zone => player[zone])), ...state.stack];
  for (let owner = 0; owner < state.players.length; owner++) {
    const player = state.players[owner], stableId = `p${owner}-commander`;
    const commander = all.find(instance => instance.id === player.commanderId && (instance.owner === owner || instance.id === stableId))
      || all.find(instance => instance.id === stableId)
      || all.find(instance => instance.isCommander && instance.owner === owner);
    player.commanderId = commander?.id || null;
    if (!commander) continue;
    commander.isCommander = true; commander.owner = owner;
    if (!Number.isInteger(commander.commanderCasts) || commander.commanderCasts < 0) commander.commanderCasts = 0;
    const location = find(state, commander.id);
    if (location?.zone === 'command' && location.player !== owner) {
      remove(state, location); commander.controller = owner; state.players[owner].command.push(commander);
    }
  }
  return state;
}
function castingCard(instance) {
  const card = instance.card;
  // Imported DFCs keep their complete identity and manual effect coverage. The
  // ordinary front face supplies casting characteristics, never the back face.
  return instance.isCommander && card.card_faces?.[0] ? {...card, ...card.card_faces[0]} : card;
}
function stat(state, player, key, amount = 1) {
  state.stats[player][key] = (state.stats[player][key] || 0) + amount;
  const row = state.roundStats.find(x => x.round === state.round);
  if (row) row.players[player][key] = (row.players[player][key] || 0) + amount;
}
function draw(state, player, count = 1) {
  for (let i = 0; i < count; i++) {
    const card = state.players[player].library.shift();
    if (!card) { state.finished = true; state.phase = 'finished'; state.finishReason = `${state.players[player].name} attempted to draw from an empty library`; log(state, state.finishReason); break; }
    state.players[player].hand.push(card); stat(state, player, 'cardsDrawn');
  }
}
function recordRound(state) {
  if (!state.roundStats.some(x => x.round === state.round)) state.roundStats.push({ round: state.round, players: [{}, {}] });
}
function sickness(state, instance) { return isCreature(instance) && instance.enteredTurn >= state.turn && !has(instance, 'haste'); }
function beginTurn(state, player) {
  state.activePlayer = player; state.turn++; state.phase = 'main'; state.combatDone = false;
  state.players[player].landPlayed = false; state.players[player].manaPool = pool();
  for (const permanent of state.players[player].battlefield) { permanent.tapped = false; permanent.attacking = false; }
  recordRound(state);
  log(state, `Round ${state.round}: ${state.players[player].name}'s turn.`);
  if (!state.players[player].passive && !(state.round === 1 && player === state.startingPlayer)) draw(state, player);
}
function finishIfLethal(state) {
  if (state.players.some(p => p.life <= 0)) { state.finished = true; state.phase = 'finished'; state.finishReason = 'A life total reached zero'; }
}
function cleanupDead(state) {
  for (let p = 0; p < 2; p++) for (const instance of [...state.players[p].battlefield]) {
    if (!isCreature(instance)) continue;
    if (toughness(instance) <= 0 || (!has(instance, 'indestructible') && (instance.damage >= toughness(instance) || instance.deathtouchDamage))) {
      const location = find(state, instance.id); remove(state, location); log(state, `${named(instance.card)} dies.`);
      moveTo(state, instance, instance.owner ?? p, 'graveyard');
    }
  }
}
function dealToPlayer(state, sourcePlayer, targetPlayer, amount, source = 'Damage') {
  state.players[targetPlayer].life -= amount;
  if (sourcePlayer !== targetPlayer) stat(state, sourcePlayer, 'damageDealt', amount);
  log(state, `${source}: ${amount} damage to ${state.players[targetPlayer].name}.`);
}
function canCover(available, wanted) { return COLORS.every(c => available[c] >= wanted[c]) && COLORS.reduce((sum, c) => sum + available[c] - wanted[c], 0) >= wanted.generic; }
function payment(state, player, card, extraGeneric = 0) {
  const wanted = cost(card); if (!wanted) return null;
  wanted.generic += extraGeneric;
  const sources = state.players[player].battlefield.filter(x => !x.tapped && !sickness(state, x) && manaSource(x.card)).map(x => ({ instance: x, ...manaSource(x.card) }));
  const visited = new Set();
  function search(available, remaining, used) {
    const maximum = { ...available };
    for (const source of remaining) for (const color of COLORS) maximum[color] += Math.max(...source.options.map(option => option[color] || 0));
    if (COLORS.some(color => maximum[color] < wanted[color])) return null;
    const availableTotal = COLORS.reduce((sum, color) => sum + available[color], 0);
    const possibleTotal = availableTotal + remaining.reduce((sum, source) => sum + Math.max(...source.options.map(option => Object.values(option).reduce((total, n) => total + n, 0))), 0);
    if (possibleTotal < wanted.generic + COLORS.reduce((sum, color) => sum + wanted[color], 0)) return null;
    if (canCover(available, wanted)) {
      const left = { ...available };
      for (const color of COLORS) left[color] -= wanted[color];
      let generic = wanted.generic;
      for (const color of ['C', 'W', 'U', 'B', 'R', 'G']) { const spent = Math.min(generic, left[color]); left[color] -= spent; generic -= spent; }
      return { pool: left, sourceIds: used };
    }
    const key = `${remaining.map(x => x.instance.id).join(',')}:${COLORS.map(c => available[c]).join(',')}`;
    if (visited.has(key)) return null; visited.add(key);
    const deficits = COLORS.filter(c => wanted[c] > available[c]).sort((a, b) => remaining.filter(s => s.options.some(o => o[a])).length - remaining.filter(s => s.options.some(o => o[b])).length);
    const need = deficits[0];
    const options = remaining.flatMap((source, index) => source.options.map(option => ({ source, index, option }))).filter(x => !need || x.option[need]);
    // Prefer inflexible sources, preserving flexible sources for other colors.
    options.sort((a, b) => a.source.options.length - b.source.options.length || Object.values(b.option).reduce((s, n) => s + n, 0) - Object.values(a.option).reduce((s, n) => s + n, 0));
    for (const { source, index, option } of options) {
      const next = { ...available }; for (const color of COLORS) next[color] += option[color] || 0;
      const found = search(next, remaining.filter((_, i) => i !== index), [...used, source.instance.id]);
      if (found) return found;
    }
    return null;
  }
  return search({ ...state.players[player].manaPool }, sources, []);
}
function validTarget(state, caster, targetId, descriptor) {
  if (!targetId) return descriptor === 'creatureOrPlayer';
  const target = find(state, targetId);
  if (!target || target.zone !== 'battlefield') return false;
  if (has(target.instance, 'shroud') || (target.player !== caster && has(target.instance, 'hexproof'))) return false;
  const card = target.instance.card;
  if (descriptor === 'artifactEnchantment') return type(card, 'Artifact') || type(card, 'Enchantment');
  if (!isCreature(card)) return false;
  if (descriptor === 'nonblackCreature') return !(card.colors || []).includes('B');
  if (descriptor === 'nonartifactCreature') return !type(card, 'Artifact');
  return true;
}
function play(state, player, id, targetId) {
  if (state.finished || state.phase !== 'main' || state.activePlayer !== player) throw new Error('Cards may be played only during your active main phase.');
  const location = find(state, id);
  if (!location || location.player !== player || !['hand', 'command'].includes(location.zone)) throw new Error('Choose a card in your hand or your commander in the command zone.');
  const instance = location.instance, card = castingCard(instance), adapter = profile(instance.card);
  const commandCast = location.zone === 'command';
  if (commandCast && (!instance.isCommander || instance.owner !== player)) throw new Error('Only your own commander can be cast from your command zone.');
  if (instance.isCommander && !card.mana_cost) throw new Error('This commander has no supported printed mana cost; use manual payment and placement.');
  if (state.stack.length && !type(card, 'Instant')) throw new Error('Only supported instants may be cast while the stack is not empty.');
  if (type(card, 'Land')) {
    if (commandCast) throw new Error('A land cannot be played from the command zone.');
    if (state.stack.length) throw new Error('Resolve the stack before playing a land.');
    if (state.players[player].landPlayed) throw new Error('Only one land drop is supported each turn.');
    if (adapter.status === 'manual') throw new Error(`${named(card)} needs manual placement: ${adapter.reason}`);
    remove(state, location); instance.tapped = !!adapter.source?.entersTapped; moveTo(state, instance, player, 'battlefield');
    state.players[player].landPlayed = true; stat(state, player, 'landsPlayed'); log(state, `${state.players[player].name} plays ${named(card)}.`); return;
  }
  if (adapter.target && !validTarget(state, player, targetId, adapter.target)) throw new Error('Choose a legal battlefield target for this spell.');
  const commanderTax = commandCast ? 2 * instance.commanderCasts : 0;
  const paid = payment(state, player, card, commanderTax);
  if (!paid) throw new Error('Not enough usable mana of the required colors; unsupported costs require a manual move.');
  for (const sourceId of paid.sourceIds) find(state, sourceId).instance.tapped = true;
  state.players[player].manaPool = paid.pool;
  remove(state, location); instance.controller = player; if (targetId) instance.targetId = targetId; else delete instance.targetId;
  if (commandCast) instance.commanderCasts++;
  state.stack.push(instance); stat(state, player, 'cardsCast');
  log(state, `${state.players[player].name} casts ${named(instance.card)}${commandCast ? ` from the command zone (+${commanderTax} generic commander tax; command cast ${instance.commanderCasts})` : ''}${instance.isCommander && instance.card.card_faces?.length ? ` using its front face, ${named(card)}` : ''}${targetId ? ` targeting ${named(find(state, targetId)?.instance.card)}` : ''}.`);
  queueCastInteractions(state, player, card);
  if (adapter.status !== 'supported') warn(state, `${named(card)}: ${adapter.reason}`);
}
// Named, bounded interaction adapter. No Oracle-text execution or hidden-information inference.
function queueCastInteractions(state, player, spell) {
  if (type(spell, 'Creature') || type(spell, 'Land')) return;
  const sources = state.players[player].battlefield.filter(value => named(value.card) === 'Ovika, Enigma Goliath');
  if (!sources.length) return;
  const manaValue = number(spell.cmc);
  if (!Number.isInteger(manaValue) || manaValue < 0 || manaValue > 40 || spell.card_faces?.length || /\{X\}/i.test(String(spell.mana_cost || ''))) {
    warn(state, `Ovika trigger for ${named(spell)} requires manual resolution: unknown or unsupported mana value.`);
    return;
  }
  for (const source of sources) {
    const id = `p${player}-trigger-${state.nextTriggerId++}`;
    state.stack.push({id, owner: player, controller: player, kind: 'trigger', sourceId: source.id,
      card: {name: 'Ovika: create Phyrexian Goblins', type_line: 'Triggered Ability', cmc: 0, oracle_text: 'Create X 1/1 red Phyrexian Goblin tokens with haste, where X is the triggering spell mana value.'},
      trigger: {adapter: 'ovika-goblins', count: manaValue}});
    log(state, `Ovika trigger from ${source.id}: ${named(spell)} mana value ${manaValue}; resolve the trigger above the spell.`);
  }
}
function resolveInteraction(state, instance) {
  if (instance?.trigger?.adapter !== 'ovika-goblins') return false;
  state.stack.pop();
  const controller = instance.controller, count = instance.trigger.count;
  const tokenCard = {name: 'Phyrexian Goblin', type_line: 'Token Creature — Phyrexian Goblin', cmc: 0,
    mana_cost: '', oracle_text: '', keywords: [], colors: ['R'], power: '1', toughness: '1'};
  for (let i = 0; i < count; i++) {
    const token = fresh(tokenCard, controller, `ovika-token-${state.nextTokenId++}`);
    token.isToken = true;
    token.temporaryHaste = true; // Ovika grants haste only until the end of this turn.
    moveTo(state, token, controller, 'battlefield');
  }
  log(state, `Ovika trigger resolves: ${count} 1/1 red Phyrexian Goblin token(s) with haste.`);
  return true;
}
function searchBasic(state, player, destination) {
  const library = state.players[player].library;
  const index = library.findIndex(x => type(x.card, 'Basic') && type(x.card, 'Land'));
  if (index < 0) return null;
  const instance = library.splice(index, 1)[0]; instance.tapped = destination === 'battlefield'; moveTo(state, instance, player, destination); return instance;
}
function resolve(state) {
  const instance = state.stack.at(-1); if (!instance) throw new Error('The stack is empty.');
  if (resolveInteraction(state, instance)) return;
  const adapter = profile(instance.card), player = instance.controller;
  if (adapter.status === 'manual' || (instance.isCommander && !adapter.auto)) throw new Error(`${named(instance.card)} has no complete effect adapter. Use a manual move after resolving its effects yourself.`);
  state.stack.pop();
  if (adapter.target && !validTarget(state, player, instance.targetId, adapter.target)) {
    moveTo(state, instance, instance.owner, 'graveyard'); log(state, `${named(instance.card)} has no legal target and does not resolve.`); return;
  }
  const target = instance.targetId ? find(state, instance.targetId) : null;
  if (type(instance.card, 'Creature') || type(instance.card, 'Artifact') || type(instance.card, 'Enchantment')) {
    instance.tapped = !!adapter.source?.entersTapped; moveTo(state, instance, player, 'battlefield');
    if (adapter.status === 'partial') { const message = `${named(instance.card)} enters; unimplemented Oracle abilities are not applied.`; log(state, message); warn(state, message); }
  } else {
    switch (adapter.effect) {
      case 'draw': draw(state, player, adapter.amount); break;
      case 'pump': target.instance.tempPower = (target.instance.tempPower || 0) + adapter.amount; target.instance.tempToughness = (target.instance.tempToughness || 0) + adapter.amount; break;
      case 'bounce': remove(state, target); moveTo(state, target.instance, target.instance.owner, 'hand'); break;
      case 'destroy':
        if (has(target.instance, 'indestructible')) log(state, `${named(target.instance.card)} is indestructible.`);
        else { remove(state, target); moveTo(state, target.instance, target.instance.owner, 'graveyard'); }
        break;
      case 'exile': {
        const gain = power(target.instance), owner = target.instance.owner, controller = target.player;
        remove(state, target); moveTo(state, target.instance, owner, 'exile');
        if (adapter.gainLife) state.players[controller].life += gain;
        if (adapter.basicLand) { searchBasic(state, controller, 'battlefield'); shuffle(state, state.players[controller].library); }
        break;
      }
      case 'burn':
        if (target) target.instance.damage += adapter.amount;
        else dealToPlayer(state, player, 1 - player, adapter.amount, named(instance.card));
        break;
      case 'ramp': searchBasic(state, player, 'battlefield'); shuffle(state, state.players[player].library); break;
      case 'cultivate': searchBasic(state, player, 'battlefield'); searchBasic(state, player, 'hand'); shuffle(state, state.players[player].library); break;
      default: throw new Error('This effect requires manual resolution.');
    }
    moveTo(state, instance, instance.owner, 'graveyard');
  }
  log(state, `${named(instance.card)} resolves.`); cleanupDead(state); finishIfLethal(state);
}
function canAttack(state, instance) { return isCreature(instance) && !instance.tapped && !sickness(state, instance) && !has(instance, 'defender'); }
function canBlock(attacker, blocker) { return isCreature(blocker) && !blocker.tapped && (!has(attacker, 'flying') || has(blocker, 'flying') || has(blocker, 'reach')); }
function attack(state, player, id) {
  if (state.stack.length) throw new Error('Resolve the stack before declaring attackers.');
  if (state.combatDone) throw new Error('Only one combat is supported each turn.');
  const location = find(state, id);
  if (!location || location.zone !== 'battlefield' || location.player !== player) throw new Error('Choose your battlefield creature.');
  const instance = location.instance;
  if (instance.attacking) { instance.attacking = false; return; }
  if (!canAttack(state, instance)) throw new Error('This creature cannot attack: check tapped status, defender and summoning sickness.');
  instance.attacking = true;
}
function autoBlocks(state, player, attackers) {
  const available = state.players[1 - player].battlefield.filter(x => isCreature(x) && !x.tapped), assignments = [];
  for (const attacker of [...attackers].sort((a, b) => scoreThreat(b).score - scoreThreat(a).score)) {
    const options = available.filter(b => canBlock(attacker, b));
    // Deterministic one-blocker policy: favorable trades, otherwise chump only near lethal.
    const chosen = options.sort((a, b) => (Number(power(b) >= toughness(attacker) || has(b, 'deathtouch')) - Number(power(a) >= toughness(attacker) || has(a, 'deathtouch'))) || power(a) - power(b))
      .find(b => power(b) >= toughness(attacker) || has(b, 'deathtouch') || toughness(b) > power(attacker) || state.players[1 - player].life <= power(attacker) + 3);
    if (chosen) { assignments.push({ attackerId: attacker.id, blockerId: chosen.id }); available.splice(available.indexOf(chosen), 1); }
  }
  return assignments;
}
function combat(state, player, assignments) {
  if (state.stack.length) throw new Error('Resolve the stack before combat.');
  if (state.combatDone) throw new Error('Combat has already resolved this turn.');
  const attackers = state.players[player].battlefield.filter(x => x.attacking);
  if (!attackers.length) throw new Error('Declare at least one attacker.');
  assignments ??= autoBlocks(state, player, attackers);
  const blocks = new Map(), used = new Set();
  for (const assignment of assignments) {
    const attacker = attackers.find(x => x.id === assignment.attackerId);
    if (!attacker || blocks.has(attacker.id)) throw new Error('Invalid or duplicate attacker assignment.');
    if (!assignment.blockerId) { blocks.set(attacker.id, null); continue; }
    const blocker = state.players[1 - player].battlefield.find(x => x.id === assignment.blockerId);
    if (!blocker || used.has(blocker.id) || !canBlock(attacker, blocker)) throw new Error('Invalid blocker: each untapped legal creature can block one attacker.');
    blocks.set(attacker.id, blocker); used.add(blocker.id);
  }
  for (const attacker of attackers) if (!has(attacker, 'vigilance')) attacker.tapped = true;
  const strike = (instance, first) => first ? has(instance, 'first strike') || has(instance, 'double strike') : !has(instance, 'first strike') || has(instance, 'double strike');
  const damageCreature = (source, target, amount) => { target.damage += amount; if (amount && has(source, 'deathtouch')) target.deathtouchDamage = true; if (has(source, 'lifelink')) state.players[source.controller].life += amount; };
  const damagePlayer = (source, amount) => { if (amount <= 0) return; dealToPlayer(state, player, 1 - player, amount, named(source.card)); if (has(source, 'lifelink')) state.players[player].life += amount; };
  for (const first of [true, false]) {
    for (const attacker of attackers) {
      if (!find(state, attacker.id) || find(state, attacker.id).zone !== 'battlefield') continue;
      const originalBlocker = blocks.get(attacker.id), blockerLocation = originalBlocker && find(state, originalBlocker.id);
      const blocker = blockerLocation?.zone === 'battlefield' ? originalBlocker : null;
      if (strike(attacker, first)) {
        if (!originalBlocker) damagePlayer(attacker, power(attacker));
        else if (blocker) {
          const lethal = has(attacker, 'deathtouch') ? 1 : Math.max(0, toughness(blocker) - blocker.damage);
          const assigned = has(attacker, 'trample') ? Math.min(power(attacker), lethal) : power(attacker);
          damageCreature(attacker, blocker, assigned);
          if (has(attacker, 'trample')) damagePlayer(attacker, power(attacker) - assigned);
        } else if (has(attacker, 'trample')) damagePlayer(attacker, power(attacker));
      }
      if (blocker && strike(blocker, first)) damageCreature(blocker, attacker, power(blocker));
    }
    cleanupDead(state);
  }
  for (const attacker of attackers) attacker.attacking = false;
  state.combatDone = true; log(state, 'Bounded combat resolved (one blocker per attacker; supported keywords only).'); finishIfLethal(state);
}
function bottomChoice(player) {
  const candidates = [...player.hand]; const bottom = [];
  while (bottom.length < Math.min(player.mulligans, player.hand.length)) {
    const lands = candidates.filter(x => type(x.card, 'Land')).length;
    candidates.sort((a, b) => {
      const rank = x => type(x.card, 'Land') ? (lands > 3 ? 20 : -10) : number(x.card.cmc);
      return rank(b) - rank(a);
    });
    bottom.push(candidates.shift().id);
  }
  return bottom;
}
function keep(state, player, bottomIds = []) {
  const p = state.players[player];
  if (p.kept) throw new Error('This hand has already been kept.');
  if (new Set(bottomIds).size !== bottomIds.length || bottomIds.length !== Math.min(p.mulligans, p.hand.length) || bottomIds.some(id => !p.hand.some(x => x.id === id))) throw new Error(`Choose exactly ${Math.min(p.mulligans, p.hand.length)} distinct hand cards to put on the bottom.`);
  for (const id of bottomIds) { const index = p.hand.findIndex(x => x.id === id); p.library.push(p.hand.splice(index, 1)[0]); }
  p.kept = true; log(state, `${p.name} keeps ${p.hand.length} cards after ${p.mulligans} London mulligan(s).`);
}
function mulligan(state, player) {
  const p = state.players[player];
  if (p.kept || state.phase !== 'opening') throw new Error('Mulligans are available only before keeping your opening hand.');
  if (p.mulligans >= 7) throw new Error('Seven counted mulligans is the supported maximum.');
  p.library.push(...p.hand); p.hand = []; shuffle(state, p.library); p.hand = p.library.splice(0, 7); p.mulligans++; log(state, `${p.name} takes London mulligan ${p.mulligans}; redraws seven.`);
}
function autoKeep(state, player) {
  const p = state.players[player];
  while (p.mulligans < 2 && (p.hand.filter(x => type(x.card, 'Land')).length < 2 || p.hand.filter(x => type(x.card, 'Land')).length > 5)) mulligan(state, player);
  keep(state, player, bottomChoice(p));
}
function targetFor(state, player, adapter) {
  const side = adapter.effect === 'pump' ? player : 1 - player;
  const candidates = state.players[side].battlefield.filter(x => validTarget(state, player, x.id, adapter.target));
  if (adapter.effect === 'pump') return candidates.filter(x => canAttack(state, x)).sort((a, b) => power(b) - power(a))[0];
  return candidates.sort((a, b) => scoreThreat(b, state.players[side].battlefield).score - scoreThreat(a, state.players[side].battlefield).score)[0];
}
function autoTurn(state, player) {
  if (state.finished) return;
  const p = state.players[player];
  const land = p.hand.find(x => type(x.card, 'Land') && profile(x.card).auto);
  if (land && !p.landPlayed) play(state, player, land.id);
  for (let limit = 0; limit < 30 && !state.finished; limit++) {
    const choices = p.hand.filter(x => !type(x.card, 'Land')).map(instance => {
      const adapter = profile(instance.card); if (!adapter.auto || !payment(state, player, instance.card)) return null;
      const target = adapter.target ? targetFor(state, player, adapter) : null;
      if (adapter.target && !target && adapter.target !== 'creatureOrPlayer') return null;
      if (adapter.effect === 'destroy' && target && has(target, 'indestructible')) return null;
      const priority = adapter.source ? (state.round <= 5 ? 90 : 20) : adapter.effect === 'draw' ? 60 : ['destroy', 'exile', 'bounce'].includes(adapter.effect) ? 50 + scoreThreat(target, state.players[1 - player].battlefield).score : adapter.effect === 'pump' ? 10 : adapter.effect === 'ramp' || adapter.effect === 'cultivate' ? 85 : isCreature(instance) ? 30 + number(instance.card.cmc) : 15;
      return { instance, adapter, target, priority };
    }).filter(Boolean).sort((a, b) => b.priority - a.priority);
    if (!choices.length) break;
    const choice = choices[0];
    if (choice.target && choice.adapter.effect !== 'pump') { const scored = scoreThreat(choice.target, state.players[1 - player].battlefield); log(state, `Public battlefield target: ${named(choice.target.card)}, threat ${scored.score} (${scored.reasons.join('; ')}).`); }
    play(state, player, choice.instance.id, choice.target?.id); resolve(state);
  }
  if (state.finished) return;
  for (const instance of p.battlefield) if (canAttack(state, instance)) instance.attacking = true;
  if (p.battlefield.some(x => x.attacking)) combat(state, player);
}
function endCurrent(state) {
  const p = state.players[state.activePlayer];
  if (!p.landPlayed) stat(state, state.activePlayer, 'missedLandDrops');
  p.manaPool = pool();
  for (const player of state.players) for (const instance of player.battlefield) { instance.damage = 0; instance.attacking = false; delete instance.tempPower; delete instance.tempToughness; delete instance.deathtouchDamage; delete instance.temporaryHaste; }
  const row = state.roundStats.find(x => x.round === state.round);
  if (row) for (let i = 0; i < 2; i++) row.players[i].lifeRemaining = state.players[i].life;
}
function finishRound(state) {
  if (state.round >= state.roundLimit) { state.finished = true; state.phase = 'finished'; state.finishReason = 'Round limit reached'; log(state, `${state.roundLimit}-round test complete.`); return false; }
  state.round++; return true;
}
function endTurn(state) {
  if (state.phase !== 'main' || state.activePlayer !== 0) throw new Error('Keep an opening hand before ending your turn.');
  if (state.stack.length) throw new Error('Resolve or manually move every stack card before ending the turn.');
  endCurrent(state);
  if (state.startingPlayer === 0) {
    beginTurn(state, 1); autoTurn(state, 1); endCurrent(state);
    if (state.finished || !finishRound(state)) return;
    beginTurn(state, 0);
  } else {
    if (!finishRound(state)) return;
    beginTurn(state, 1); autoTurn(state, 1); endCurrent(state);
    if (!state.finished) beginTurn(state, 0);
  }
}
function startKeptGame(state) {
  if (state.startingPlayer === 1) { beginTurn(state, 1); autoTurn(state, 1); endCurrent(state); }
  if (!state.finished) beginTurn(state, 0);
}

export function createGame({ deck = [], opponentDeck = [], commander = null, opponentCommander = null, seed = 'morrow', life = 40, rounds = 10, onPlay = true } = {}) {
  if (!Array.isArray(deck) || !Array.isArray(opponentDeck)) throw new Error('Decks must be arrays of card definitions.');
  if (!Number.isInteger(rounds) || rounds < 8 || rounds > 12) throw new Error('Choose 8 to 12 rounds.');
  if (!Number.isFinite(life) || life <= 0) throw new Error('Starting life must be positive.');
  const state = {
    players: [deck, opponentDeck].map((cards, p) => ({ name: p ? 'Scripted opponent' : 'You', life, library: cards.map((card, i) => fresh(card, p, i)), hand: [], battlefield: [], graveyard: [], exile: [], command: [commander, opponentCommander][p] ? [fresh([commander, opponentCommander][p], p, 'commander', true)] : [], commanderId: [commander, opponentCommander][p] ? `p${p}-commander` : null, returnCommanderOnDeath: true, passive: p === 1 && !cards.length, mulligans: 0, kept: false, landPlayed: false, manaPool: pool() })),
    stack: [], activePlayer: 0, round: 1, turn: 0, phase: 'opening', log: [], seed: String(seed), rngState: hash(seed), finished: false, roundLimit: rounds, startingPlayer: onPlay ? 0 : 1, combatDone: false,
    stats: [{}, {}], roundStats: [], warnings: [], lastRandom: null, nextTriggerId: 0, nextTokenId: 0,
  };
  for (const p of state.players) { shuffle(state, p.library); p.hand = p.library.splice(0, 7); }
  if (opponentDeck.length) autoKeep(state, 1); else { state.players[1].kept = true; warn(state, 'Opponent has no deck: passive goldfish practice; no opposing draws or actions.'); }
  for (const row of [...coverage(deck), ...coverage(opponentDeck)]) if (row.status !== 'supported') warn(state, `${row.name}: ${row.reason}`);
  log(state, 'Bounded deck test: manual commander casting pays ordinary front-face costs plus commander tax. Return on death defaults to an owner-controlled practice choice. No automatic commander casting, commander damage, general triggered abilities, general priority, general replacement effects or multiplayer rules. Ovika token cast triggers have a narrowly supported manual-table adapter; other triggers remain manual.');
  return state;
}
function apply(state, action) {
  if (!action || !action.type) throw new Error('Choose an action.');
  const player = action.player ?? 0;
  if (![0, 1].includes(player)) throw new Error('Player must be 0 or 1.');
  const activeTypes = ['play', 'attack', 'combat', 'endTurn', 'resolve'];
  if (state.finished && activeTypes.includes(action.type)) throw new Error('This test is finished. Start a new test to continue.');
  switch (action.type) {
    case 'mulligan': mulligan(state, 0); break;
    case 'keep':
      if (state.phase !== 'opening') throw new Error('Opening hand already kept.');
      keep(state, 0, action.bottomIds || []); startKeptGame(state); break;
    case 'play': play(state, player, action.id, action.targetId); break;
    case 'resolve': resolve(state); break;
    case 'tap': {
      const location = find(state, action.id);
      if (!location || location.zone !== 'battlefield') throw new Error('Choose a battlefield card.');
      const instance = location.instance, source = manaSource(instance.card);
      if (!instance.tapped && source && sickness(state, instance)) throw new Error('A summoning-sick creature cannot activate its tap mana ability.');
      instance.tapped = !instance.tapped;
      if (source) for (const [color, amount] of Object.entries(source.options[0])) state.players[location.player].manaPool[color] = Math.max(0, state.players[location.player].manaPool[color] + (instance.tapped ? amount : -amount));
      log(state, `${named(instance.card)} ${instance.tapped ? 'tapped' : 'manually untapped (manual override)'}${source ? '; known mana pool adjusted (default color)' : ''}.`); break;
    }
    case 'attack':
      if (state.phase !== 'main' || state.activePlayer !== player) throw new Error('Declare attackers during your turn.');
      attack(state, player, action.id); break;
    case 'combat':
      if (state.phase !== 'main' || state.activePlayer !== player) throw new Error('Resolve combat during your turn.');
      combat(state, player, action.assignments); break;
    case 'endTurn': endTurn(state); break;
    case 'life':
      if (!Number.isFinite(action.delta)) throw new Error('Life change must be a number.');
      state.players[player].life += action.delta; log(state, `${state.players[player].name}: life ${action.delta >= 0 ? '+' : ''}${action.delta}, now ${state.players[player].life}.`); break;
    case 'counter': {
      const location = find(state, action.id);
      if (!location || location.zone !== 'battlefield' || !Number.isInteger(action.delta) || location.instance.counters + action.delta < 0) throw new Error('Choose a battlefield card and a valid +1/+1 counter change.');
      location.instance.counters += action.delta; log(state, `${named(location.instance.card)}: ${location.instance.counters} +1/+1 counter(s).`); cleanupDead(state); break;
    }
    case 'move': {
      if (!ZONES.includes(action.zone)) throw new Error('Choose a supported destination zone.');
      const location = find(state, action.id); if (!location) throw new Error('Card not found.');
      if (location.instance.kind === 'trigger') throw new Error('Resolve the triggered ability from the stack instead of moving it to a card zone.');
      const instance = remove(state, location); moveTo(state, instance, player, action.zone, {keepCommanderInGraveyard: action.keepCommanderInGraveyard === true});
      const destination = find(state, instance.id);
      log(state, destination ? `Manual override: ${named(instance.card)} moved from ${location.zone} to ${state.players[destination.player].name}'s ${destination.zone}; effects and costs are user-resolved.` : `Manual override: ${named(instance.card)} leaves ${location.zone} and ceases to exist; effects and costs are user-resolved.`); break;
    }
    case 'commanderReturnPolicy':
      if (typeof action.enabled !== 'boolean') throw new Error('Choose whether to return the commander on death.');
      state.players[player].returnCommanderOnDeath = action.enabled;
      log(state, `${state.players[player].name}: return commander on death ${action.enabled ? 'enabled (default practice choice)' : 'disabled; keep it in the graveyard'}.`); break;
    case 'coin': { const result = random(state) < 0.5 ? 'Heads' : 'Tails'; state.lastRandom = { kind: 'coin', result }; log(state, `Coin flip: ${result}.`); break; }
    case 'die': {
      if (!Number.isInteger(action.sides) || action.sides < 2 || action.sides > 1000) throw new Error('A die must have 2 to 1000 sides.');
      const result = Math.floor(random(state) * action.sides) + 1; state.lastRandom = { kind: 'die', sides: action.sides, result }; log(state, `d${action.sides}: ${result}.`); break;
    }
    default: throw new Error('Unknown action.');
  }
  return state;
}
export function act(state, action) { return apply(upgradeGame(state), action); }

export function simulate({ deck = [], opponentDeck = [], commander = null, opponentCommander = null, seed = 'morrow', life = 40, rounds = 10, runs = 100, onPlay = true, onProgress } = {}) {
  if (!Number.isInteger(rounds) || rounds < 8 || rounds > 12) throw new Error('Choose 8 to 12 rounds.');
  if (!Number.isInteger(runs) || runs < 1 || runs > 1000) throw new Error('Choose 1 to 1000 simulation runs.');
  if (!deck.length || !opponentDeck.length) throw new Error('Both decks are required for automatic simulation.');
  const sums = { damage: 0, opponentDamage: 0, mulligans: 0, missedLandDrops: 0, cardsCast: 0, landsPlayed: 0, lifeRemaining: 0, lethalRuns: 0, completedRounds: 0 };
  const rows = Array.from({ length: rounds }, (_, i) => ({ round: i + 1, damage: 0, opponentDamage: 0, landsPlayed: 0, cardsCast: 0, missedLandDrops: 0, lifeRemaining: 0, runsObserved: 0 }));
  const combined = [...coverage(deck), ...coverage(opponentDeck)];
  const skippedCards = [...new Set([...deck, ...opponentDeck].filter(card => !profile(card).auto).map(named))];
  const notes = [
    'Bounded deterministic policy, not a complete Magic rules engine or competitive win-rate estimate.',
    'London mulligan policy keeps 2–5 lands, attempts at most two mulligans, and bottoms excess lands or expensive cards; no free mulligan.',
    'First player skips the first draw. Each round includes one turn per player. One legal land drop and one combat per turn.',
    'Runs stop at lethal damage, a failed draw from an empty library, or the round limit. Summary means include every run; per-round means include only runs reaching that round (runsObserved), so later rounds may reflect survivors.',
    'Targets use public battlefield threat factors only. Opposing hands and libraries never influence threat ranking.',
    'Combat supports one blocker per attacker, numeric power/toughness and listed keywords. Manual practice supports commander casting, tax and an owner-controlled return-on-death choice; scripted runs do not cast commanders. Commander damage, triggered abilities, multiplayer, alternate costs and general stack-response decisions are not automated.',
    'Search effects choose the first basic land; optional search is always accepted. Automated players cast immediately, with no reserved mana or bluffing.',
    ...(skippedCards.length ? [`Not automated; cards remain in hand: ${skippedCards.join(', ')}.`] : []),
    ...combined.filter(x => x.status === 'partial' && profile([...deck, ...opponentDeck].find(c => c.name === x.name)).auto).map(x => `${x.name}: ${x.reason}`),
  ];
  for (let run = 0; run < runs; run++) {
    const state = createGame({ deck, opponentDeck, commander, opponentCommander, seed: `${seed}:${run}`, life, rounds, onPlay });
    autoKeep(state, 0); startKeptGame(state);
    while (!state.finished) { autoTurn(state, 0); if (!state.finished) endTurn(state); }
    const own = state.stats[0], opposing = state.stats[1];
    sums.damage += own.damageDealt || 0; sums.opponentDamage += opposing.damageDealt || 0; sums.mulligans += state.players[0].mulligans;
    sums.missedLandDrops += own.missedLandDrops || 0; sums.cardsCast += own.cardsCast || 0; sums.landsPlayed += own.landsPlayed || 0; sums.lifeRemaining += state.players[0].life;
    sums.lethalRuns += Number(state.players.some(p => p.life <= 0)); sums.completedRounds += state.round;
    for (const record of state.roundStats) {
      const row = rows[record.round - 1], ownRound = record.players[0], enemyRound = record.players[1]; row.runsObserved++;
      row.damage += ownRound.damageDealt || 0; row.opponentDamage += enemyRound.damageDealt || 0; row.landsPlayed += ownRound.landsPlayed || 0; row.cardsCast += ownRound.cardsCast || 0; row.missedLandDrops += ownRound.missedLandDrops || 0; row.lifeRemaining += ownRound.lifeRemaining ?? state.players[0].life;
    }
    if (typeof onProgress === 'function') onProgress({completed: run + 1, total: runs});
  }
  const average = n => Math.round(n / runs * 1000) / 1000;
  return {
    summary: { runs, seed: String(seed), roundLimit: rounds, avgDamage: average(sums.damage), avgOpponentDamage: average(sums.opponentDamage), avgMulligans: average(sums.mulligans), avgMissedLandDrops: average(sums.missedLandDrops), avgCardsCast: average(sums.cardsCast), avgLandsPlayed: average(sums.landsPlayed), avgLifeRemaining: average(sums.lifeRemaining), avgRoundsReached: average(sums.completedRounds), lethalRuns: sums.lethalRuns },
    rounds: rows.map(row => ({ ...row, ...Object.fromEntries(['damage', 'opponentDamage', 'landsPlayed', 'cardsCast', 'missedLandDrops', 'lifeRemaining'].map(key => [key, row.runsObserved ? Math.round(row[key] / row.runsObserved * 1000) / 1000 : 0])) })),
    coverage: { player: coverage(deck), opponent: coverage(opponentDeck), skippedCards }, notes: [...new Set(notes)],
  };
}
