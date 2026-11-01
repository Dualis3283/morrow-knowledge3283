import {demoDecks, resolveDeck, expandDeck, parseDeck} from './cards.mjs';
import {createGame, act, scoreThreat, coverage, simulate} from './engine.mjs';

const $ = (id) => document.getElementById(id);
const STORE = 'morrow-deck-lab-v1';
const defaults = demoDecks.map((deck, index) => ({...deck, id: `sample-${index}`, sample: true}));
let decks = defaults.slice();
let game = null;
let savedGame = null;
let currentDeckNames = ['Your deck', 'Opponent'];
let bottomIds = new Set();
let importResult = null;
let importController = null;
let report = null;
let toastTimer;
let inspected = null;
let appConfig = {};

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
}
function setText(id, value) { $(id).textContent = String(value ?? ''); }
function toast(message) {
  clearTimeout(toastTimer);
  setText('toast', message);
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 6500);
}
function persist(showMessage = false) {
  try {
    localStorage.setItem(STORE, JSON.stringify({version: 1, decks: decks.filter(d => !d.sample), game: game || savedGame, names: currentDeckNames, config: readConfig(), report}));
    if (showMessage) toast('Your table is saved on this device.');
  } catch {
    toast('Device storage is full or unavailable. Your table still works for this session.');
  }
}
function restore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (data?.version !== 1) return;
    if (Array.isArray(data.decks)) decks.push(...data.decks.filter(d => d.id && d.name && Array.isArray(d.entries)));
    if (Array.isArray(data.game?.players) && data.game.players.length === 2) savedGame = data.game;
    if (Array.isArray(data.names)) currentDeckNames = data.names;
    appConfig = data.config || {};
    report = data.report || null;
  } catch { /* A fresh table remains usable when stored data cannot be read. */ }
}
function switchTab(name, focus = false) {
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const selected = tab.dataset.tab === name;
    tab.classList.toggle('active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const id of ['play', 'decks', 'results']) $(`${id}-panel`).hidden = id !== name;
  history.replaceState(null, '', `#${name}`);
  if (focus) { $('main').scrollIntoView({block: 'start'}); }
}
function readConfig() {
  return {deck: $('player-deck').value, opponentDeck: $('opponent-deck').value, seed: $('seed').value || 'morrow-01', rounds: Number($('rounds').value), life: Number($('starting-life').value), onPlay: $('play-order').value === 'play'};
}
function getDeck(id) { return decks.find(d => d.id === id) || decks[0]; }
function mainCount(deck) { return deck.entries.filter(e => e.section !== 'sideboard' && e.section !== 'commander').reduce((s, e) => s + Number(e.quantity || 1), 0); }
function commander(deck) { return deck.entries.find(e => e.section === 'commander')?.card; }
function deckOptions() {
  for (const id of ['player-deck', 'opponent-deck', 'test-deck', 'test-opponent']) {
    const select = $(id);
    const old = select.value;
    select.replaceChildren(...decks.map(deck => {
      const option = element('option', '', `${deck.name}${deck.sample ? ' · sample' : ''}`);
      option.value = deck.id;
      return option;
    }));
    if (decks.some(d => d.id === old)) select.value = old;
    else if (id.includes('opponent') && decks[1]) select.value = decks[1].id;
  }
  setText('deck-count', decks.length);
}
function applyConfig() {
  deckOptions();
  if (appConfig.deck && decks.some(d => d.id === appConfig.deck)) $('player-deck').value = appConfig.deck;
  if (appConfig.opponentDeck && decks.some(d => d.id === appConfig.opponentDeck)) $('opponent-deck').value = appConfig.opponentDeck;
  if (appConfig.seed) $('seed').value = appConfig.seed;
  if ([8, 10, 12].includes(appConfig.rounds)) $('rounds').value = appConfig.rounds;
  if ([20, 40].includes(appConfig.life)) $('starting-life').value = appConfig.life;
  $('play-order').value = appConfig.onPlay === false ? 'draw' : 'play';
  $('test-deck').value = $('player-deck').value;
  $('test-opponent').value = $('opponent-deck').value;
  $('test-rounds').value = $('rounds').value;
  $('test-seed').value = $('seed').value;
  $('resume-button').hidden = !savedGame;
}
function startTable() {
  const config = readConfig();
  const own = getDeck(config.deck), opponent = getDeck(config.opponentDeck);
  const deck = expandDeck(own.entries), opponentDeck = expandDeck(opponent.entries);
  if (deck.length < 7 || opponentDeck.length < 7) { toast('Each deck needs at least seven main-deck cards for an opening hand.'); return; }
  try {
    game = createGame({...config, deck, opponentDeck, commander: commander(own), opponentCommander: commander(opponent)});
    game.uiConfig = {...config};
    for (const [label, source] of [['Your deck', own], ['Opponent deck', opponent]]) {
      if (source.importErrors?.length) game.warnings.push(`${label} was saved as a partial import: ${source.importErrors.length} unresolved line(s) are absent from this table.`);
    }
    currentDeckNames = [own.name, opponent.name];
    bottomIds.clear();
    savedGame = game;
    persist();
    renderGame();
    switchTab('play', true);
  } catch (error) { toast(error.message || 'This table could not be started.'); }
}
function dispatch(action, {close = false} = {}) {
  if (!game) { toast('Start a table first.'); return false; }
  try {
    game = act(game, action);
    savedGame = game;
    persist();
    renderGame();
    if (close) $('card-dialog').close();
    else if (inspected && $('card-dialog').open) {
      const current = lookup(inspected.id);
      if (current) showCard(current.instance, current.player, current.zone);
      else $('card-dialog').close();
    }
    return true;
  } catch (error) { toast(error.message || 'That action is not available right now.'); return false; }
}
function isLand(card) { return /\bLand\b/i.test(card.type_line || ''); }
function isCreature(card) { return /\bCreature\b/i.test(card.type_line || ''); }
function imageUrl(card, large = false) {
  const own = card.image_uris || {};
  const uris = own.small || own.normal || own.large ? own : card.card_faces?.[0]?.image_uris || {};
  const url = large ? (uris.normal || uris.large || uris.small) : (uris.small || uris.normal);
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
}
function cardTile(instance, {player = 0, zone = 'hand', land = false, preview = false, quantity} = {}) {
  const card = instance.card || instance;
  const tile = element('button', `card-tile${land ? ' land-card' : ''}${instance.tapped ? ' tapped' : ''}${instance.attacking ? ' attacking' : ''}${bottomIds.has(instance.id) && zone === 'hand' ? ' selected' : ''}`);
  tile.type = 'button';
  tile.dataset.cardId = instance.id || card.id || '';
  tile.setAttribute('aria-label', `${card.name || 'Unknown card'}${instance.tapped ? ', tapped' : ''}${instance.attacking ? ', attacking' : ''}${zone === 'hand' && bottomIds.has(instance.id) ? ', selected to bottom' : ''}. View card and actions.`);
  const fallback = element('div', 'card-fallback');
  fallback.append(element('span', '', card.name || 'Unknown card'), element('small', '', card.mana_cost || card.type_line || 'Card'));
  tile.append(fallback);
  const url = imageUrl(card);
  if (url) {
    const img = element('img');
    img.src = url;
    img.alt = '';
    img.loading = 'lazy';
    // Lazy images must participate in layout to enter the browser's loading area.
    tile.classList.add('has-card-image');
    img.classList.add('image-loading');
    img.addEventListener('load', () => { img.classList.remove('image-loading'); fallback.hidden = true; });
    img.addEventListener('error', () => { img.remove(); tile.classList.remove('has-card-image'); fallback.hidden = false; });
    tile.append(img);
  }
  tile.append(element('span', 'card-caption', card.name));
  const badges = element('span', 'card-badges');
  if (Number(instance.counters)) badges.append(element('span', 'card-badge', `${Number(instance.counters) > 0 ? '+' : ''}${instance.counters}`));
  if (instance.damage) badges.append(element('span', 'card-badge', `${instance.damage} dmg`));
  if (instance.attacking) badges.append(element('span', 'card-badge', 'ATK'));
  if (quantity > 1) badges.append(element('span', 'card-badge', `×${quantity}`));
  if (badges.childNodes.length) tile.append(badges);
  let pointer = null, suppressUntil = 0;
  if (!preview) {
    tile.addEventListener('pointerdown', event => { pointer = {x: event.clientX, y: event.clientY}; });
    tile.addEventListener('pointercancel', () => { pointer = null; });
    tile.addEventListener('pointerup', event => {
      if (!pointer || !game?.players?.[0]?.kept || player !== 0) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      pointer = null;
      if (zone === 'hand' && dy < -35 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        suppressUntil = Date.now() + 400;
        if (!/\btarget\b/i.test(card.oracle_text || '') && !card.card_faces?.some(face => /\btarget\b/i.test(face.oracle_text || ''))) dispatch({type: 'play', id: instance.id});
        else {
          showCard(instance, player, zone);
          toast('Choose a target, then tap Play card.');
        }
      } else if (zone === 'battlefield' && dx > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        suppressUntil = Date.now() + 400;
        dispatch({type: 'tap', id: instance.id});
      }
    });
  }
  tile.addEventListener('click', () => {
    if (Date.now() < suppressUntil) return;
    if (!preview && zone === 'hand' && player === 0 && game && !game.players[0].kept && game.players[0].mulligans > 0) {
      if (bottomIds.has(instance.id)) bottomIds.delete(instance.id);
      else if (bottomIds.size < Math.min(game.players[0].mulligans, game.players[0].hand.length)) bottomIds.add(instance.id);
      else { toast(`Select exactly ${game.players[0].mulligans} cards to put on the bottom.`); return; }
      renderGame();
    } else showCard(instance, player, preview ? 'preview' : zone);
  });
  return tile;
}
function fillZone(id, instances, player, empty, land = false) {
  $(id).replaceChildren(...instances.map(instance => cardTile(instance, {player, zone: 'battlefield', land})));
  if (!instances.length) $(id).append(element('p', 'empty-zone', empty));
}
function renderGame() {
  if (!game) return;
  $('setup-view').hidden = true;
  $('game-view').hidden = false;
  const [own, opponent] = game.players;
  setText('player-name', currentDeckNames[0] || own.name || 'Your deck');
  setText('opponent-name', currentDeckNames[1] || opponent.name || 'Opponent');
  setText('player-life', own.life);
  setText('opponent-life', opponent.life);
  setText('session-seed', `SEED ${game.seed}`);
  setText('game-title', game.finished ? 'A test, complete.' : 'Your table');
  setText('round-label', `Round ${Math.min(game.round, game.roundLimit || 10)} / ${game.roundLimit || 10}`);
  setText('phase-label', game.finished ? 'Test complete' : (!own.kept ? 'Opening hand' : 'Your turn · main phase'));
  setText('opponent-counts', `${opponent.library.length} in library · ${opponent.hand.length} in hand · ${opponent.graveyard.length} in graveyard`);
  fillZone('opponent-lands', opponent.battlefield.filter(i => isLand(i.card)), 1, 'The first land is still to come.', true);
  fillZone('opponent-field', opponent.battlefield.filter(i => !isLand(i.card)), 1, 'Watch the opponent’s board develop.');
  fillZone('player-lands', own.battlefield.filter(i => isLand(i.card)), 0, 'A foundation for your next play.', true);
  fillZone('player-field', own.battlefield.filter(i => !isLand(i.card)), 0, 'Your next idea goes here.');
  setText('opponent-land-count', opponent.battlefield.filter(i => isLand(i.card)).length);
  setText('player-land-count', `${own.battlefield.filter(i => isLand(i.card)).length} · ${own.landPlayed ? 'LAND PLAYED' : 'LAND DROP AVAILABLE'}`);
  const attackers = own.battlefield.filter(i => i.attacking);
  setText('attack-count', attackers.length ? `${attackers.length} ATTACKER${attackers.length === 1 ? '' : 'S'} SELECTED` : 'TAP A CARD TO INTERACT');
  $('player-hand').replaceChildren(...own.hand.map(instance => cardTile(instance, {player: 0, zone: 'hand'})));
  if (!own.hand.length) $('player-hand').append(element('p', 'empty-zone', 'Your hand is empty.'));
  setText('hand-count', own.hand.length);
  setText('library-count', own.library.length);
  setText('graveyard-count', own.graveyard.length);
  setText('exile-count', own.exile.length);
  setText('command-count', own.command?.length || 0);
  $('mulligan-controls').hidden = own.kept || game.finished;
  $('turn-controls').hidden = !own.kept;
  $('end-turn-button').disabled = game.finished;
  $('combat-button').disabled = game.finished || !attackers.length || game.combatDone;
  $('mulligan-button').disabled = own.mulligans >= 7;
  const bottoms = Math.min(own.mulligans || 0, own.hand.length);
  setText('keep-label', bottoms ? `London mulligan · keep ${own.hand.length - bottoms}` : 'Find your opening hand.');
  setText('bottom-help', bottoms ? `Tap ${bottoms} card${bottoms === 1 ? '' : 's'} to put on the bottom. ${bottomIds.size} selected.` : 'Keep seven, or take a London mulligan.');
  setText('keep-button', bottoms ? `Keep ${own.hand.length - bottoms}` : 'Keep hand');
  $('keep-button').disabled = bottoms !== bottomIds.size;
  setText('hand-help', !own.kept && bottoms ? 'Tap cards to select the ones you will bottom' : 'Tap to inspect · swipe up to prepare a play');
  const stack = game.stack || [];
  setText('stack-count', stack.length);
  $('stack-list').replaceChildren();
  if (!stack.length) $('stack-list').append(element('p', 'stack-empty', 'A moment between spells.'));
  stack.slice().reverse().forEach((instance, index) => {
    const button = element('button', 'stack-card');
    const copy = element('span');
    copy.append(element('b', '', instance.card?.name || 'Spell'), element('small', '', `${index === 0 ? 'TOP OF STACK' : 'WAITING'} · ${instance.controller === 1 ? 'OPPONENT' : 'YOU'}`));
    button.append(element('span', '', stack.length - index), copy);
    button.addEventListener('click', () => showCard(instance, instance.controller || 0, 'stack'));
    $('stack-list').append(button);
  });
  $('resolve-button').disabled = !stack.length || game.finished;
  $('end-turn-button').textContent = game.finished ? 'Test complete' : 'End turn →';
  $('activity-log').replaceChildren(...(game.log || []).slice(-18).reverse().map(item => element('li', '', typeof item === 'string' ? item : JSON.stringify(item))));
  if (game.lastRandom) {
    const r = game.lastRandom;
    setText('random-result', r.kind === 'coin' ? `Coin · ${r.result}` : `d${r.sides || 6} · ${r.result}`);
  } else setText('random-result', 'A small chance of something.');
  setText('game-warnings', [...new Set(game.warnings || [])].slice(-3).join(' '));
}
function lookup(id) {
  if (!game) return null;
  for (let player = 0; player < game.players.length; player++) {
    for (const zone of ['hand', 'battlefield', 'graveyard', 'exile', 'library', 'command']) {
      const instance = (game.players[player][zone] || []).find(i => i.id === id);
      if (instance) return {instance, player, zone};
    }
  }
  const instance = game.stack.find(i => i.id === id);
  return instance ? {instance, player: instance.controller || 0, zone: 'stack'} : null;
}
function actionButton(text, action, options = {}) {
  const button = element('button', `button${options.primary ? ' primary' : ''}`, text);
  button.disabled = Boolean(options.disabled);
  button.addEventListener('click', () => {
    const resolved = typeof action === 'function' ? action() : action;
    if (resolved) dispatch(resolved, {close: options.close !== false});
  });
  return button;
}
function showCard(instance, player = 0, zone = 'preview') {
  inspected = {id: instance.id, player, zone};
  const card = instance.card || instance;
  const content = $('card-dialog-content');
  content.replaceChildren();
  const details = element('div', 'card-details');
  const art = element('div');
  const fallback = element('div', 'inspector-art-fallback', card.name);
  art.append(fallback);
  const url = imageUrl(card, true);
  if (url) {
    const image = element('img', 'inspector-art');
    image.src = url;
    image.alt = `${card.name} card image`;
    image.hidden = true;
    image.addEventListener('load', () => { image.hidden = false; fallback.hidden = true; });
    image.addEventListener('error', () => { image.remove(); fallback.hidden = false; });
    art.append(image);
  }
  const artist = card.artist || card.card_faces?.[0]?.artist;
  art.append(element('p', 'card-artist', artist ? `Illustrated by ${artist} · Scryfall` : 'Card information · Scryfall'));
  const info = element('div');
  info.append(element('h2', '', card.name), element('p', 'card-type', `${card.mana_cost || ''} ${card.type_line || ''}`.trim()));
  const stats = element('div', 'card-stats');
  stats.append(element('span', '', `Mana value ${card.cmc ?? 0}`));
  if (card.power !== undefined) stats.append(element('span', '', `${card.power} / ${card.toughness}`));
  if (zone !== 'preview') stats.append(element('span', '', zone === 'stack' ? 'On the stack' : `${player === 0 ? 'Your' : 'Opponent'} ${zone}`));
  if (instance.counters) stats.append(element('span', '', `${instance.counters} +1/+1 counters`));
  info.append(stats, element('p', 'card-oracle', card.oracle_text || card.card_faces?.map(f => `${f.name}\n${f.oracle_text || ''}`).join('\n\n') || 'No rules text.'));
  if (zone === 'battlefield' && game) {
    const threat = scoreThreat(instance, game.players[player].battlefield);
    info.append(element('p', 'tiny', `Battlefield threat · ${Number(threat.score).toFixed(1)}`));
    const reasons = element('ul', 'threat-reasons');
    for (const reason of threat.reasons || []) reasons.append(element('li', '', reason));
    info.append(reasons);
  }
  details.append(art, info);
  if (card.card_faces?.length > 1) {
    let faceIndex = 0;
    const flip = element('button', 'button wide compact', 'View other face');
    flip.addEventListener('click', () => {
      faceIndex = (faceIndex + 1) % card.card_faces.length;
      const face = card.card_faces[faceIndex];
      const nextUrl = imageUrl({image_uris: face.image_uris}, true);
      const previous = art.querySelector('.inspector-art');
      if (previous) previous.remove();
      fallback.hidden = false;
      fallback.textContent = face.name || card.name;
      if (nextUrl) {
        const faceImage = element('img', 'inspector-art');
        faceImage.src = nextUrl;
        faceImage.alt = `${face.name || card.name} card face`;
        faceImage.hidden = true;
        faceImage.addEventListener('load', () => { faceImage.hidden = false; fallback.hidden = true; });
        faceImage.addEventListener('error', () => { faceImage.remove(); fallback.hidden = false; });
        art.insertBefore(faceImage, art.firstChild);
      }
      info.querySelector('h2').textContent = face.name || card.name;
      info.querySelector('.card-type').textContent = `${face.mana_cost || ''} ${face.type_line || ''}`.trim();
      info.querySelector('.card-oracle').textContent = face.oracle_text || 'No rules text on this face.';
      flip.textContent = `View ${faceIndex === 0 ? 'other' : 'front'} face`;
    });
    art.append(flip, element('p', 'card-artist', 'Face preview only. Transforming or playing a back face requires manual rules handling.'));
  }
  content.append(details);
  if (zone !== 'preview' && game) {
    const actions = element('div', 'card-action-list');
    const ready = game.players[0].kept && !game.finished;
    if (player === 0 && zone === 'hand') {
      let targetSelect;
      if (!isLand(card)) {
        const targetLabel = element('label', '', 'Target, if this spell needs one');
        targetLabel.htmlFor = 'spell-target';
        targetSelect = element('select'); targetSelect.id = 'spell-target';
        const noTarget = element('option', '', 'No target'); noTarget.value = '';
        targetSelect.append(noTarget);
        game.players.forEach((p, pi) => p.battlefield.forEach(i => {
          const option = element('option', '', `${pi === 0 ? 'You' : 'Opponent'} · ${i.card.name}`);
          option.value = i.id; targetSelect.append(option);
        }));
        info.append(targetLabel, targetSelect);
      }
      actions.append(actionButton(isLand(card) ? 'Play land' : 'Play card', () => ({type: 'play', id: instance.id, ...(targetSelect?.value ? {targetId: targetSelect.value} : {})}), {primary: true, disabled: !ready}));
    }
    if (zone === 'command') content.append(element('p', 'tiny', 'Command-zone costs and casting are manual in this version. Use the manual zone move below after paying costs and resolving the commander yourself.'));
    if (zone === 'battlefield') {
      actions.append(actionButton(instance.tapped ? 'Untap card' : 'Tap card', {type: 'tap', id: instance.id}, {disabled: !ready}));
      if (player === 0 && isCreature(card)) actions.append(actionButton(instance.attacking ? 'Remove attacker' : 'Attack with creature', {type: 'attack', id: instance.id}, {primary: true, disabled: !ready}));
      actions.append(actionButton('+1/+1 counter', {type: 'counter', id: instance.id, delta: 1}, {disabled: !ready, close: false}), actionButton('Remove counter', {type: 'counter', id: instance.id, delta: -1}, {disabled: !ready || !instance.counters, close: false}));
    }
    if (zone === 'stack') actions.append(actionButton('Resolve top spell', {type: 'resolve'}, {primary: true, disabled: !ready || game.stack.at(-1)?.id !== instance.id}));
    if (actions.childNodes.length) content.append(actions);
    const manual = element('details', 'manual-tools');
    manual.append(element('summary', '', 'Manual zone move / resolve an unsupported effect'));
    manual.append(element('p', '', 'Use your own rules judgment. This bypasses costs and automatic effect resolution, and is recorded in the turn notes.'));
    const row = element('div', 'manual-move');
    const select = element('select'); select.setAttribute('aria-label', 'Destination zone');
    for (const targetZone of ['battlefield', 'graveyard', 'exile', 'hand', 'library', 'command']) {
      const option = element('option', '', targetZone[0].toUpperCase() + targetZone.slice(1)); option.value = targetZone; select.append(option);
    }
    row.append(select, actionButton('Move card', () => ({type: 'move', id: instance.id, player, zone: select.value}), {disabled: game.finished}));
    manual.append(row);
    content.append(manual);
  }
  if (!$('card-dialog').open) $('card-dialog').showModal();
}
function showPile(zone) {
  if (!game) return;
  setText('pile-title', zone === 'command' ? 'Your command zone' : `Your ${zone}`);
  const cards = game.players[0][zone] || [];
  const container = $('pile-cards');
  container.replaceChildren(...cards.map(instance => {
    const tile = cardTile(instance, {zone, player: 0});
    tile.addEventListener('click', () => $('pile-dialog').close());
    return tile;
  }));
  if (!cards.length) container.append(element('p', 'pile-empty', `No cards in your ${zone} zone.`));
  if (zone === 'library') {
    container.replaceChildren(element('p', 'pile-empty', `${cards.length} cards remain. The library order stays hidden during your test.`));
  }
  $('pile-dialog').showModal();
}
function openCombat() {
  if (!game) return;
  const attackers = game.players[0].battlefield.filter(i => i.attacking);
  const blockers = game.players[1].battlefield.filter(i => isCreature(i.card) && !i.tapped);
  const container = $('combat-assignments'); container.replaceChildren();
  for (const attacker of attackers) {
    const row = element('div', 'combat-row');
    const label = element('label', '', attacker.card.name); label.htmlFor = `block-${attacker.id}`;
    const select = element('select'); select.id = `block-${attacker.id}`; select.dataset.attacker = attacker.id;
    const none = element('option', '', 'Unblocked → opponent'); none.value = ''; select.append(none);
    for (const blocker of blockers) { const option = element('option', '', `${blocker.card.name} · ${blocker.card.power || 0}/${blocker.card.toughness || 0}`); option.value = blocker.id; select.append(option); }
    row.append(label, select); container.append(row);
  }
  $('combat-dialog').showModal();
}
function renderDeckLibrary() {
  $('deck-library').replaceChildren();
  decks.forEach(deck => {
    const entry = element('article', 'deck-entry');
    const copy = element('div');
    const title = element('h3', '', deck.name);
    if (deck.sample) title.append(element('span', 'demo-tag', 'SAMPLE'));
    const commanders = deck.entries.filter(e => e.section === 'commander').reduce((sum, e) => sum + Number(e.quantity || 1), 0);
    copy.append(title, element('div', 'deck-meta', `${mainCount(deck)} main-deck cards · ${deck.entries.filter(e => e.section !== 'sideboard').length} unique${commanders ? ` · ${commanders} commander` : ''}${deck.importErrors?.length ? ` · PARTIAL IMPORT: ${deck.importErrors.length} unresolved` : ''}`));
    const actions = element('div', 'deck-entry-actions');
    const view = element('button', 'button', 'View'); view.addEventListener('click', () => previewDeck(deck));
    const use = element('button', 'button', 'Use deck'); use.addEventListener('click', () => {
      $('player-deck').value = deck.id; $('test-deck').value = deck.id; persist(); switchTab('play', true); toast(`${deck.name} is ready for your next table.`);
    });
    actions.append(view, use);
    if (!deck.sample) {
      const remove = element('button', 'button', 'Remove'); remove.setAttribute('aria-label', `Remove ${deck.name} from this device`);
      remove.addEventListener('click', () => {
        if (!confirm(`Remove “${deck.name}” from this device? Saved table state is kept.`)) return;
        decks = decks.filter(d => d.id !== deck.id); deckOptions(); renderDeckLibrary(); persist();
      });
      actions.append(remove);
    }
    entry.append(copy, actions); $('deck-library').append(entry);
  });
}
function previewDeck(deck) {
  setText('preview-title', deck.name);
  $('preview-cards').replaceChildren(...deck.entries.map(entry => {
    const wrapper = element('div', 'preview-entry');
    wrapper.append(cardTile(entry.card, {preview: true, quantity: entry.quantity}), element('div', 'preview-quantity', `${entry.quantity} × ${entry.section || 'main'}`));
    return wrapper;
  }));
  $('deck-preview').hidden = false;
}
async function loadDatedDeck(which) {
  if (importController) { toast('Finish or cancel the current lookup before loading another list.'); return; }
  const name = which === 'ovika' ? 'Ovika · 1 Nov 2026' : 'Karn · 1 Nov 2026';
  try {
    const response = await fetch(`examples/${which}-2026-11-01.txt`);
    if (!response.ok) throw new Error('The dated fixture could not be loaded.');
    $('deck-text').value = await response.text();
    $('deck-name').value = name;
    importResult = null; $('save-deck-button').hidden = true;
    setText('import-status', 'Dated simulator deck loaded. Find cards on Scryfall to refresh its metadata. Many effects need manual resolution.');
    $('deck-text').focus();
  } catch (error) { toast(error.message); }
}
async function importDeck() {
  if (importController) return;
  const text = $('deck-text').value.trim();
  if (!text) { toast('Paste a deck list first.'); $('deck-text').focus(); return; }
  const parsed = parseDeck(text);
  if (!parsed.entries?.length) { setText('import-status', 'No cards found. Use one card name per line, with an optional quantity.'); return; }
  $('import-errors').replaceChildren();
  $('save-deck-button').hidden = true;
  $('resolve-deck-button').disabled = true;
  $('cancel-import-button').hidden = false;
  importController = new AbortController();
  $('deck-text').readOnly = true;
  $('deck-name').readOnly = true;
  const inputName = $('deck-name').value.trim() || 'Untitled deck';
  setText('import-status', 'Looking up cards on Scryfall…');
  try {
    const resolvedResult = await resolveDeck(text, {signal: importController.signal, onProgress: (progress, total) => {
      if (typeof progress === 'object' && progress !== null) {
        const done = progress.completed ?? progress.done ?? progress.current ?? progress.loaded ?? 0;
        const count = progress.total ?? total ?? parsed.entries.length;
        setText('import-status', `Finding cards · ${done} / ${count}${progress.name ? ` · ${progress.name}` : ''}`);
      } else setText('import-status', `Finding cards · ${progress ?? 0} / ${total ?? parsed.entries.length}`);
    }});
    importResult = {...resolvedResult, inputText: text, inputName};
    const entries = (importResult.entries || []).filter(e => e.card);
    const errors = importResult.errors || [];
    $('import-errors').replaceChildren(...errors.map(error => element('li', '', typeof error === 'string' ? error : error.message || JSON.stringify(error))));
    const count = entries.reduce((sum, entry) => sum + Number(entry.quantity || 1), 0);
    setText('import-status', `${count} cards resolved across ${entries.length} entries.${errors.length ? ' Review the unresolved lines below; only resolved cards can be saved.' : ' Ready to save to your deck library.'}`);
    $('save-deck-button').hidden = !entries.length;
    setText('save-deck-button', errors.length ? `Save ${count} resolved cards only` : 'Save deck to this device');
  } catch (error) {
    importResult = null;
    setText('import-status', error.name === 'AbortError' ? 'Import canceled. Your saved decks are unchanged.' : `Scryfall could not be reached: ${error.message || 'check your connection and try again'}.`);
  } finally {
    importController = null;
    $('deck-text').readOnly = false;
    $('deck-name').readOnly = false;
    $('resolve-deck-button').disabled = false;
    $('cancel-import-button').hidden = true;
  }
}
function saveImportedDeck() {
  if (!importResult) return;
  if (importResult.inputText !== $('deck-text').value.trim() || importResult.inputName !== ($('deck-name').value.trim() || 'Untitled deck')) {
    importResult = null; $('save-deck-button').hidden = true;
    toast('The list changed. Find the cards again before saving this deck.');
    return;
  }
  const entries = importResult.entries.filter(e => e.card);
  if (!entries.length) return;
  const deck = {id: `deck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: importResult.inputName, text: importResult.inputText, entries, importErrors: importResult.errors || [], sample: false};
  decks.push(deck); deckOptions(); renderDeckLibrary();
  $('player-deck').value = deck.id; $('test-deck').value = deck.id;
  persist();
  setText('import-status', `${deck.name} is saved and selected as your deck.`);
  $('save-deck-button').hidden = true;
  importResult = null;
  previewDeck(deck);
  toast('Deck saved. You can start a table whenever you’re ready.');
}
function renderCoverage(rows) {
  const normalized = Array.isArray(rows) ? rows : [];
  const counts = normalized.reduce((totals, row) => { totals[row.status] = (totals[row.status] || 0) + 1; return totals; }, {});
  setText('coverage-summary', `${counts.supported || 0} SUPPORTED · ${counts.partial || 0} PARTIAL · ${counts.manual || 0} MANUAL`);
  $('coverage-list').replaceChildren(...normalized.map(row => {
    const line = element('div', 'coverage-card');
    line.append(element('strong', '', row.name), element('span', `coverage-status ${row.status || 'manual'}`, row.status || 'manual'), element('small', '', row.reason || 'Review this card manually.'));
    return line;
  }));
  if (!normalized.length) $('coverage-list').append(element('p', 'secondary', 'No card coverage information is available.'));
  $('coverage-section').hidden = false;
}
function preflight() {
  const own = getDeck($('test-deck').value), opponent = getDeck($('test-opponent').value);
  const cards = [...expandDeck(own.entries), ...expandDeck(opponent.entries), commander(own), commander(opponent)].filter(Boolean);
  renderCoverage(coverage(cards));
}
function number(value, decimals = 1) { return Number.isFinite(Number(value)) ? Number(value).toFixed(decimals).replace(/\.0$/, '') : '—'; }
function renderReport() {
  if (!report) return;
  const summary = report.summary || {};
  const metrics = [
    ['Your damage', summary.avgDamage], ['Opponent damage', summary.avgOpponentDamage], ['Mulligans taken', summary.avgMulligans], ['Missed land drops', summary.avgMissedLandDrops],
    ['Cards cast', summary.avgCardsCast], ['Lands played', summary.avgLandsPlayed], ['Life remaining', summary.avgLifeRemaining], ['Seeded games', summary.runs ?? 100]
  ];
  $('result-metrics').replaceChildren(...metrics.map(([label, value]) => { const card = element('div', 'metric'); card.append(element('strong', '', number(value)), element('span', '', label)); return card; }));
  $('round-results').replaceChildren(...(report.rounds || []).map(row => {
    const tr = element('tr');
    for (const key of ['round', 'runsObserved', 'damage', 'opponentDamage', 'landsPlayed', 'cardsCast', 'missedLandDrops', 'lifeRemaining']) tr.append(element('td', '', number(row[key])));
    return tr;
  }));
  const notes = Array.isArray(report.notes) ? report.notes : report.notes ? [report.notes] : [];
  $('result-notes').replaceChildren(...notes.map(note => element('p', '', note)));
  const meta = report.uiMeta;
  if (meta) {
    setText('results-title', `${meta.own} · ${meta.rounds} rounds`);
    $('result-notes').prepend(element('p', '', `Base seed ${meta.seed} · ${meta.life} starting life · ${meta.onPlay ? 'you play first' : 'you draw first'} · opponent ${meta.opponent}. Values are means per game, under this scripted policy.`));
  }
  $('results-content').hidden = false;
  if (Array.isArray(report.coverage)) renderCoverage(report.coverage);
  else if (Array.isArray(report.coverage?.player)) renderCoverage([
    ...report.coverage.player.map(row => ({...row, name: `${row.name} · your deck`})),
    ...report.coverage.opponent.map(row => ({...row, name: `${row.name} · opponent`}))
  ]);
  else preflight();
}
async function runTests() {
  const own = getDeck($('test-deck').value), opponent = getDeck($('test-opponent').value);
  const config = readConfig();
  const rounds = Number($('test-rounds').value), seed = $('test-seed').value.trim() || 'morrow-01';
  $('run-test-button').disabled = true;
  setText('test-status', 'Running 100 seeded opening tests on this device…');
  preflight();
  await new Promise(resolve => setTimeout(resolve, 50));
  try {
    report = simulate({deck: expandDeck(own.entries), opponentDeck: expandDeck(opponent.entries), commander: commander(own), opponentCommander: commander(opponent), seed, rounds, life: config.life, onPlay: config.onPlay, runs: 100});
    for (const [label, source] of [['Your deck', own], ['Opponent deck', opponent]]) {
      if (source.importErrors?.length) report.notes.push(`${label} is a partial import: ${source.importErrors.length} unresolved source line(s) are absent. Only its ${mainCount(source)} resolved main-deck cards were tested.`);
    }
    report.uiMeta = {own: own.name, opponent: opponent.name, rounds, seed, life: config.life, onPlay: config.onPlay};
    renderReport(); persist();
    setText('test-status', '100 tests complete. Review coverage alongside the results; damage depends on supported effects and the opponent policy.');
  } catch (error) {
    setText('test-status', `The test could not finish: ${error.message || 'check the selected decks'}.`);
  } finally { $('run-test-button').disabled = false; }
}
async function exportReport() {
  if (!report) return;
  const text = JSON.stringify(report, null, 2);
  const content = $('report-export-content');
  content.value = text;
  $('export-dialog').showModal();
  content.focus();
  content.select();
}

document.querySelectorAll('[data-tab]').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab, true)));
document.querySelector('.tab-bar').addEventListener('keydown', event => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  switchTab(tabs[next].dataset.tab);
  tabs[next].focus();
});
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); switchTab('play', true); });
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
$('about-button').addEventListener('click', () => $('about-dialog').showModal());
$('start-button').addEventListener('click', startTable);
$('resume-button').addEventListener('click', () => { game = savedGame; bottomIds.clear(); renderGame(); switchTab('play', true); });
$('new-table').addEventListener('click', () => { $('setup-view').hidden = false; $('game-view').hidden = true; $('resume-button').hidden = !savedGame; });
$('save-table').addEventListener('click', () => persist(true));
$('import-shortcut').addEventListener('click', () => { switchTab('decks', true); $('deck-text').focus(); });
$('mulligan-button').addEventListener('click', () => { if (dispatch({type: 'mulligan'})) { bottomIds.clear(); renderGame(); } });
$('keep-button').addEventListener('click', () => { if (dispatch({type: 'keep', bottomIds: [...bottomIds]})) { bottomIds.clear(); renderGame(); } });
$('end-turn-button').addEventListener('click', () => dispatch({type: 'endTurn'}));
$('resolve-button').addEventListener('click', () => dispatch({type: 'resolve'}));
$('coin-button').addEventListener('click', () => dispatch({type: 'coin'}));
$('die-button').addEventListener('click', () => dispatch({type: 'die', sides: Number($('die-sides').value)}));
document.querySelectorAll('[data-life-player]').forEach(button => button.addEventListener('click', () => dispatch({type: 'life', player: Number(button.dataset.lifePlayer), delta: Number(button.dataset.lifeDelta)})));
for (const zone of ['command', 'library', 'graveyard', 'exile']) $(`${zone}-button`).addEventListener('click', () => showPile(zone));
$('combat-button').addEventListener('click', openCombat);
$('confirm-combat').addEventListener('click', () => {
  const assignments = [...$('combat-assignments').querySelectorAll('select')].map(select => ({attackerId: select.dataset.attacker, ...(select.value ? {blockerId: select.value} : {})}));
  const blockers = assignments.map(a => a.blockerId).filter(Boolean);
  if (new Set(blockers).size !== blockers.length) { toast('Assign each blocker to only one attacker in this model.'); return; }
  if (dispatch({type: 'combat', assignments})) $('combat-dialog').close();
});
$('resolve-deck-button').addEventListener('click', importDeck);
$('cancel-import-button').addEventListener('click', () => importController?.abort());
$('save-deck-button').addEventListener('click', saveImportedDeck);
for (const id of ['deck-text', 'deck-name']) $(id).addEventListener('input', () => {
  if (!importResult) return;
  importResult = null; $('save-deck-button').hidden = true;
  setText('import-status', 'The deck details changed. Find the cards again before saving this version.');
});
$('close-preview').addEventListener('click', () => { $('deck-preview').hidden = true; });
$('preflight-button').addEventListener('click', preflight);
$('run-test-button').addEventListener('click', runTests);
$('game-sim-button').addEventListener('click', () => {
  const config = game?.uiConfig || readConfig();
  $('test-deck').value = decks.some(deck => deck.id === config.deck) ? config.deck : $('player-deck').value;
  $('test-opponent').value = decks.some(deck => deck.id === config.opponentDeck) ? config.opponentDeck : $('opponent-deck').value;
  $('test-rounds').value = config.rounds;
  $('test-seed').value = config.seed;
  $('starting-life').value = config.life;
  $('play-order').value = config.onPlay ? 'play' : 'draw';
  switchTab('results', true); runTests();
});
$('export-results').addEventListener('click', exportReport);
$('copy-export').addEventListener('click', async () => {
  const field = $('report-export-content');
  field.focus(); field.select();
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(field.value);
    else if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    setText('copy-export-status', 'Report copied to your clipboard.');
  } catch { setText('copy-export-status', 'Long-press the report text, choose Select all, then Copy.'); }
});
for (const id of ['player-deck', 'opponent-deck', 'seed', 'rounds', 'starting-life', 'play-order']) $(id).addEventListener('change', () => persist());
for (const id of ['test-deck', 'test-opponent', 'test-seed', 'test-rounds']) $(id).addEventListener('change', () => {
  if (!report) return;
  $('results-content').hidden = true;
  $('coverage-section').hidden = true;
  report = null;
  setText('test-status', 'Test settings changed. Check coverage or run 100 tests for this configuration.');
  persist();
});
$('card-dialog').addEventListener('close', () => { inspected = null; });

const fixtureTools = element('div', 'fixture-tools');
fixtureTools.append(element('p', 'tiny', 'From your simulator archive · dated 1 November 2026. These lists include effects that need manual resolution.'));
for (const [key, title] of [['ovika', 'Load dated Ovika list'], ['karn', 'Load dated Karn list']]) { const button = element('button', 'text-button', `${title} →`); button.addEventListener('click', () => loadDatedDeck(key)); fixtureTools.append(button); }
$('deck-text').after(fixtureTools);

restore();
applyConfig();
renderDeckLibrary();
if (report) renderReport();
const initialTab = location.hash.slice(1);
switchTab(['play', 'decks', 'results'].includes(initialTab) ? initialTab : 'play');
