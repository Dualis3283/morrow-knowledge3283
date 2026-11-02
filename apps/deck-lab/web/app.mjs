import {demoDecks, resolveDeck, expandDeck, parseDeck} from './cards.mjs';
import {createGame, act, scoreThreat, coverage, upgradeGame, suggestions, castOptions, tapOptions, loyaltyOptions} from './engine.mjs';

const $ = (id) => document.getElementById(id);
const STORE = 'morrow-deck-simulator-web-v1';
const defaults = demoDecks.map((deck, index) => ({...deck, id: `sample-${index}`, sample: true}));
let decks = defaults.slice();
let game = null;
let savedGame = null;
let currentDeckNames = ['Your deck', 'Opponent'];
let bottomIds = new Set();
let importResult = null;
let importController = null;
let importDiagnostics = [];
let importReportStats = {};
let importReportErrors = [];
let report = null;
let toastTimer;
let inspected = null;
let appConfig = {};
let undoHistory = [];
let casting = null;
let activeTest = null;
let nextTestId = 0;

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
    if (Array.isArray(data.game?.players) && data.game.players.length === 2) savedGame = upgradeGame(data.game);
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
    undoHistory=[];
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
    const previous=game;
    game = act(game, action);
    undoHistory.push(previous); if (undoHistory.length > 24) undoHistory.shift();
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
function isCommanderInstance(instance) {
  if (!instance?.id || !game) return false;
  return instance.isCommander === true || game.players.some((player, index) => instance.id === (player.commanderId || `p${index}-commander`));
}
function commanderRecord(player = 0) {
  if (!game) return null;
  const expected = game.players[player].commanderId || `p${player}-commander`;
  const existing = lookup(expected);
  if (existing) return existing;
  for (let owner = 0; owner < game.players.length; owner++) {
    for (const zone of ['command', 'hand', 'battlefield', 'graveyard', 'exile', 'library']) {
      const instance = (game.players[owner][zone] || []).find(card => card.isCommander && (card.owner ?? owner) === player);
      if (instance) return {instance, player: owner, zone};
    }
  }
  const instance = game.stack.find(card => card.isCommander && (card.owner ?? card.controller) === player);
  return instance ? {instance, player: instance.controller ?? player, zone: 'stack'} : null;
}
function commanderTax(instance) { return Math.max(0, Number(instance.commanderCasts) || 0) * 2; }
function printedMana(card) { return card.mana_cost || card.card_faces?.[0]?.mana_cost || '{0}'; }
function renderCommander() {
  const record = commanderRecord(0);
  const container = $('commander-card');
  container.replaceChildren();
  $('commander-return-on-death').checked = game.players[0].returnCommanderOnDeath !== false;
  $('commander-return-on-death').disabled = !record || game.finished;
  if (!record) {
    setText('commander-zone-status', 'No commander set');
    setText('commander-cost', 'Import a Commander section to add one.');
    container.append(element('div', 'commander-empty', 'No commander imported'));
    return;
  }
  const {instance, player, zone} = record;
  const labels = {command:'Command zone', battlefield:'Battlefield', stack:'On the stack', hand:'In your hand', graveyard:'Graveyard', exile:'Exile', library:'In the library'};
  setText('commander-zone-status', labels[zone] || zone);
  setText('commander-cost', `Cost ${printedMana(instance.card)} + {${commanderTax(instance)}} tax`);
  if (zone === 'command') container.append(cardTile(instance, {player: 0, zone: 'command'}));
  else {
    const placeholder = element('button', 'commander-empty', labels[zone] || zone);
    placeholder.type = 'button';
    placeholder.setAttribute('aria-label', `Commander ${instance.card.name}: ${labels[zone] || zone}. View card and actions.`);
    placeholder.append(element('small', '', 'Tap to inspect'));
    placeholder.addEventListener('click', () => showCard(instance, player, zone));
    container.append(placeholder);
  }
}
function manaText(options) { return Object.entries(options || {}).filter(([,n])=>n).map(([c,n])=>`${n}${c}`).join(' + ') || 'none'; }
function openManaChoice(instance) {
  if($('card-dialog').open)$('card-dialog').close();
  const source=tapOptions(game,0,instance.id);
  if(!source || source.tapped) {dispatch({type:'tap',id:instance.id});return;}
  if(source.options.length===1){dispatch({type:'tap',id:instance.id});return;}
  $('mana-choice-title').textContent=`Tap ${instance.card.name} for mana`;
  $('mana-choice-list').replaceChildren(...source.options.map((option,index)=>{
    const pain=source.optionDamage?.[index]||0;
    const button=element('button','button',`Add ${manaText(option)}${pain?` · ${pain} damage to you`:''}${source.activationGeneric?` (costs ${source.activationGeneric} mana)`:''}`);
    button.type='button';button.addEventListener('click',()=>{if(dispatch({type:'tap',id:instance.id,choiceIndex:index}))$('mana-choice-dialog').close();});return button;
  }));
  $('mana-choice-dialog').showModal();
}
function openCastDialog(id,targetId='') {
  if(!game)return;
  const where=lookup(id);
  if(!where || !['hand','command'].includes(where.zone) || where.player!==0)return;
  const quote=castOptions(game,0,id);
  if(quote.land){if($('card-dialog').open)$('card-dialog').close();dispatch({type:'play',id});return;}
  if($('card-dialog').open)$('card-dialog').close();
  casting={id,targetId,selected:new Set(quote.plan?.sourceIds||[]),choices:Object.fromEntries((quote.plan?.steps||[]).map(step=>[step.id,step.index]))};
  $('cast-dialog-title').textContent=`Cast ${quote.cardName} · ${quote.cost || '{0}'}${quote.tax?` + {${quote.tax}} tax`:''}`;
  const sourceBox=$('cast-payment-sources');sourceBox.replaceChildren();
  for(const source of quote.sources){
    const row=element('div','payment-source');
    const label=element('label','payment-source-label');
    const toggle=document.createElement('input');toggle.type='checkbox';toggle.value=source.id;toggle.checked=casting.selected.has(source.id);
    toggle.addEventListener('change',()=>{if(toggle.checked)casting.selected.add(source.id);else casting.selected.delete(source.id);updateCastQuote();});
    label.append(toggle,element('span','',source.name));row.append(label);
    if(source.options.length>1){
      const picker=document.createElement('select');picker.setAttribute('aria-label',`Mana from ${source.name}`);picker.dataset.sourceId=source.id;
      source.options.forEach((choice,i)=>{const pain=source.optionDamage?.[i]||0;const option=element('option','',`${manaText(choice)}${pain?` · ${pain} damage`:''}`);option.value=i;picker.append(option);});
      picker.value=String(casting.choices[source.id]??0);
      picker.addEventListener('change',()=>{casting.choices[source.id]=Number(picker.value);updateCastQuote();});
      row.append(picker);
    }else row.append(element('small','',`${manaText(source.options[0])}${source.optionDamage?.[0]?` · ${source.optionDamage[0]} damage`:''}`));
    if(source.activationGeneric)row.append(element('small','',`Activation costs ${source.activationGeneric} mana`));
    sourceBox.append(row);
  }
  $('cast-dialog').showModal();updateCastQuote();
}
function updateCastQuote(){
  if(!casting || !game)return;
  const quote=castOptions(game,0,casting.id,{sourceIds:[...casting.selected],sourceChoices:casting.choices});
  $('cast-payment-pool').textContent=`Already floating: ${manaText(quote.pool)}. Only checked untapped sources are available. Tap modes can be changed.`;
  $('cast-payment-status').textContent=quote.canCast?`Ready: ${quote.plan.steps.map(step=>`${lookup(step.id)?.instance?.card.name || 'Source'} (${manaText(step.mana)}${step.damage?` · ${step.damage} damage to you`:''})`).join(', ')||'pay from floating pool'}; ${quote.reason}`:quote.reason;
  $('cast-pay-button').disabled=!quote.canCast;
}
function isPlaneswalker(card){return /\bPlaneswalker\b/i.test(card?.type_line||'');}
function cardTile(instance, {player = 0, zone = 'hand', land = false, preview = false, quantity} = {}) {
  const card = instance.card || instance;
  const tile = element('button', `card-tile${land ? ' land-card' : ''}${instance.tapped ? ' tapped' : ''}${instance.attacking ? ' attacking' : ''}${bottomIds.has(instance.id) && zone === 'hand' ? ' selected' : ''}`);
  tile.type = 'button';
  if (isCommanderInstance(instance)) { tile.classList.add('commander-card-tile'); tile.dataset.commander = 'true'; }
  tile.dataset.cardId = instance.id || card.id || '';
  tile.setAttribute('aria-label', `${card.name || 'Unknown card'}${isCommanderInstance(instance) ? ', commander' : ''}${instance.tapped ? ', tapped' : ''}${instance.attacking ? ', attacking' : ''}${zone === 'hand' && bottomIds.has(instance.id) ? ', selected to bottom' : ''}. View card and actions.`);
  if(!preview && player===0 && (zone==='hand' || zone==='command') && game?.players[0]?.kept){
    const quote=castOptions(game,0,instance.id);
    if(quote.canCast){tile.classList.add('castable');tile.setAttribute('aria-description',quote.land?'Land drop available':'Mana available; drag to casting zone or tap for payment choices');}
    if(quote.canCast && !quote.land)tile.title=`Ready to cast ${card.name}; choose mana to pay`;
    if(quote.canCast && quote.land)tile.title=`Land drop available: ${card.name}`;
    tile.draggable=true;
    tile.addEventListener('dragstart',event=>{event.dataTransfer?.setData('text/plain',instance.id);event.dataTransfer.effectAllowed='move';});
  }
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
  if (isCommanderInstance(instance)) badges.append(element('span', 'card-badge commander-badge', 'CMD'));
  if (Number(instance.counters)) badges.append(element('span', 'card-badge', `${Number(instance.counters) > 0 ? '+' : ''}${instance.counters}`));
  if(zone==='battlefield' && isPlaneswalker(card)) badges.append(element('span','card-badge loyalty-badge',`LOY ${instance.loyalty ?? card.loyalty ?? 0}${instance.loyaltyActivatedTurn===game?.turn?' · USED':''}`));
  if (instance.damage) badges.append(element('span', 'card-badge', `${instance.damage} dmg`));
  if (instance.attacking) badges.append(element('span', 'card-badge', 'ATK'));
  if (quantity > 1) badges.append(element('span', 'card-badge', `×${quantity}`));
  if(tile.classList.contains('castable'))badges.append(element('span','card-badge payable-badge',isLand(card)?'LAND':'READY'));
  if (badges.childNodes.length) tile.append(badges);
  let pointer = null, suppressUntil = 0;
  if (!preview) {
    tile.addEventListener('pointerdown', event => { pointer = {x: event.clientX, y: event.clientY}; });
    tile.addEventListener('pointercancel', () => { pointer = null; });
    tile.addEventListener('pointerup', event => {
      if (!pointer || !game?.players?.[0]?.kept || player !== 0) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      pointer = null;
      if ((zone === 'hand' || zone === 'command') && dy < -35 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        suppressUntil = Date.now() + 400;
        if (/\btarget\b/i.test(card.oracle_text || '') || card.card_faces?.some(face => /\btarget\b/i.test(face.oracle_text || ''))) {
          showCard(instance,player,zone);toast('Choose a target, then choose mana payment.');
        } else openCastDialog(instance.id);
      } else if (zone === 'battlefield' && dx > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        suppressUntil = Date.now() + 400;
        openManaChoice(instance);
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
  setText('mana-pool-status',`Floating mana: ${manaText(own.manaPool)} · Highlighted cards have payable costs`);
  setText('hand-count', own.hand.length);
  setText('library-count', own.library.length);
  setText('graveyard-count', own.graveyard.length);
  setText('exile-count', own.exile.length);
  setText('command-count', own.command?.length || 0);
  renderCommander();
  $('mulligan-controls').hidden = own.kept || game.finished;
  $('turn-controls').hidden = !own.kept;
  $('cast-drop-zone').hidden=!own.kept || game.finished;
  const moves=suggestions(game,0);
  const first=moves[0], land=moves.find(move=>move.land);
  $('assisted-play').hidden= !game.players[0].kept || game.finished;
  $('assist-land').disabled=!land;
  $('assist-next').disabled=!first;
  $('assist-main').disabled=!first;
  $('undo-action').disabled=!undoHistory.length;
  setText('assist-preview', first ? `${first.label} · ${first.why}${first.sourceNames.length ? ` · Auto-tap: ${first.sourceNames.join(', ')}` : ''}` : 'No payable supported action. Inspect a card, adjust the table manually or end your turn.');
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
  if (isPlaneswalker(card)) stats.append(element('span','loyalty-status',zone==='battlefield'?`Loyalty ${instance.loyalty ?? card.loyalty ?? '?'} · printed ${card.loyalty ?? '?'}${instance.loyaltyActivatedTurn===game?.turn?' · ability used this turn':''}`:`Printed loyalty ${card.loyalty??'?'}`));
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
    if (player === 0 && (zone === 'hand' || zone === 'command')) {
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
      actions.append(actionButton(zone === 'command' ? 'Play commander' : isLand(card) ? 'Play land' : 'Play card', () => {openCastDialog(instance.id,targetSelect?.value||'');return null;}, {primary: true, disabled: !ready}));
    }
    const isCommander = isCommanderInstance(instance);
    const owner = Number.isInteger(instance.owner) ? instance.owner : player;
    const commanderCoverage = isCommander ? coverage([card])[0] : null;
    if (isCommander) {
      stats.append(element('span', '', `Commander · ${Number(instance.commanderCasts) || 0} command-zone cast(s)`));
      if (zone === 'command') {
        stats.append(element('span', '', `Commander tax +{${commanderTax(instance)}}`));
        info.append(element('p', 'commander-cast-cost', `Cast for ${printedMana(card)} + {${commanderTax(instance)}} generic commander tax.`));
        if (commanderCoverage?.status !== 'supported') content.append(element('p', 'commander-resolution-note', 'Play commander pays the displayed mana and commander tax. Its unsupported abilities remain manual; handle them yourself, then use Resolve commander manually on the stack.'));
      }
      if (zone !== 'command') actions.append(actionButton('Return to command zone', {type: 'move', id: instance.id, player: owner, zone: 'command'}, {disabled: game.finished}));
      if (zone === 'stack' && commanderCoverage?.status !== 'supported' && /Creature|Artifact|Enchantment|Planeswalker|Battle/i.test(card.type_line || card.card_faces?.[0]?.type_line || '')) {
        content.append(element('p', 'commander-resolution-note', 'This cast already paid its casting cost. Resolve the commander’s abilities yourself, then place it on the battlefield.'));
        actions.append(actionButton('Resolve commander manually', {type: 'move', id: instance.id, player: instance.controller ?? player, zone: 'battlefield'}, {primary: true, disabled: !ready}));
      }
    }
    if (zone === 'battlefield') {
      actions.append(actionButton(instance.tapped ? 'Untap card' : tapOptions(game,player,instance.id)?'Tap for mana':'Tap card', () => {if(player===0 && !instance.tapped && tapOptions(game,player,instance.id)){openManaChoice(instance);return null;}return {type:'tap',id:instance.id};}, {disabled: !ready}));
      if (player === 0 && isCreature(card)) actions.append(actionButton(instance.attacking ? 'Remove attacker' : 'Attack with creature', {type: 'attack', id: instance.id}, {primary: true, disabled: !ready}));
      if(isPlaneswalker(card)){
        const options=loyaltyOptions(card);
        info.append(element('p','loyalty-note','Loyalty costs and once-per-turn use are tracked. Apply each loyalty ability’s effect manually; this is not a full Oracle interpreter.'));
        for(const option of options){
          const blocked=player!==game.activePlayer || game.phase!=='main' || game.stack.length>0 || instance.loyaltyActivatedTurn===game.turn || (instance.loyalty??0)+option.delta<0;
          actions.append(actionButton(`Activate ${option.label} loyalty`,{type:'activateLoyalty',id:instance.id,player,delta:option.delta},{disabled:!ready||blocked}));
        }
        actions.append(actionButton('Manual +1 loyalty',{type:'loyaltyAdjust',id:instance.id,delta:1},{disabled:!ready}),actionButton('Manual −1 loyalty',{type:'loyaltyAdjust',id:instance.id,delta:-1},{disabled:!ready||!instance.loyalty}));
      }else{
        actions.append(actionButton('+1/+1 counter', {type: 'counter', id: instance.id, delta: 1}, {disabled: !ready, close: false}), actionButton('Remove counter', {type: 'counter', id: instance.id, delta: -1}, {disabled: !ready || !instance.counters, close: false}));
      }
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
    if (isCommander && zone === 'command') {
      manual.append(element('p', 'commander-override-note', 'Place without casting does not pay mana, run abilities or increase the command-zone cast count. For an ordinary cast with tracked tax, use Play commander.'));
      manual.append(actionButton('Place without casting (manual)', {type:'move', id:instance.id, player:owner, zone:'battlefield'}, {disabled:game.finished}));
    }
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
    if (deck.importErrors?.length || deck.importDiagnostics?.some(row => ['failed', 'error', 'pending'].includes(row.status))) {
      const issues = element('button', 'button', 'Import issues');
      issues.addEventListener('click', () => {
        $('deck-text').value = deck.text || ''; $('deck-name').value = deck.name;
        importResult = null; $('save-deck-button').hidden = true;
        renderImportDiagnostics(deck.importDiagnostics || [], deck.importErrors || [], deck.importStats || {});
        setText('import-status', 'Saved partial import. Review the report, correct names if needed, then retry the lookup.');
        $('import-diagnostics').scrollIntoView({block:'nearest'});
      });
      actions.append(issues);
    }

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
function renderImportDiagnostics(diagnostics = [], errors = [], stats = {}) {
  importDiagnostics = diagnostics.map(row => ({...row}));
  importReportStats = {...stats};
  importReportErrors = [...errors];
  const cardRows = importDiagnostics.filter(row => row.normalizedName && Number(row.quantity) > 0);
  const resolved = cardRows.filter(row => ['resolved', 'cached'].includes(row.status));
  const failed = importDiagnostics.filter(row => ['failed', 'error'].includes(row.status));
  const pending = cardRows.filter(row => !['resolved', 'cached', 'failed', 'error', 'ignored'].includes(row.status));
  const totalCards = cardRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const resolvedCards = resolved.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  $('import-diagnostics').hidden = !importDiagnostics.length && !errors.length;
  setText('import-diagnostics-summary', `${resolvedCards} / ${totalCards} cards resolved · ${failed.length} failed line(s) · ${pending.length} pending line(s).${stats.requestCount !== undefined ? ` ${stats.requestCount} lookup request(s).` : ''}`);
  setText('import-error-summary', `${failed.length} failed · ${pending.length} pending — view affected cards`);
  const issues = [...failed, ...pending];
  $('import-errors').replaceChildren(...issues.map(row => {
    const item = element('li', 'import-issue');
    item.append(element('strong', '', `Line ${row.line} · ${row.requestedName || row.normalizedName || 'Invalid line'}`));
    item.append(element('span', 'import-issue-code', `${row.httpStatus ? `HTTP ${row.httpStatus} · ` : ''}${row.code || (row.status === 'parsed' ? 'not attempted yet' : row.status)}`));
    item.append(element('p', '', row.message || 'This card has not been looked up yet. Retry to continue; resolved cards are cached.'));
    if (row.source) item.append(element('code', 'import-source-line', row.source));
    if (row.normalizedName && row.normalizedName !== row.requestedName) item.append(element('p', 'tiny', `Searched as: ${row.normalizedName}`));
    if (row.normalizedName) {
      const link = element('a', 'text-button', 'Check this name on Scryfall ↗');
      const url = new URL('https://scryfall.com/search'); url.searchParams.set('q', row.normalizedName);
      link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; item.append(link);
    }
    return item;
  }));
  if (!issues.length && errors.length) $('import-errors').append(...errors.map(error => element('li', '', typeof error === 'string' ? error : error.message || JSON.stringify(error))));
  if (!issues.length && !errors.length) $('import-errors').append(element('li', 'import-no-errors', 'No lookup failures.'));
  $('import-error-details').open = !!(issues.length || errors.length);
  $('import-diagnostic-rows').replaceChildren(...importDiagnostics.map(row => {
    const line = element('div', `import-diagnostic-row ${row.status || 'parsed'}`);
    line.append(element('strong', '', `Line ${row.line} · ${row.requestedName || row.normalizedName || row.source || ''}`), element('span', '', row.status || 'parsed'));
    line.append(element('small', '', row.matchedName ? `Matched: ${row.matchedName}` : row.message || row.normalizedName || ''));
    return line;
  }));
}
function showImportReport() {
  setText('export-title', 'Card import report');
  setText('export-intro', 'Copy these per-line lookup results to review the failures or report a problem.');
  $('report-export-content').value = JSON.stringify({createdAt: new Date().toISOString(),stats: importReportStats,errors: importReportErrors,diagnostics: importDiagnostics}, null, 2);
  setText('copy-export-status', 'Copy the report, or select and copy the text.');
  $('export-dialog').showModal();
  $('report-export-content').focus();
}
async function importDeck() {
  if (importController) return;
  const text = $('deck-text').value.trim();
  if (!text) { toast('Paste a deck list first.'); $('deck-text').focus(); return; }
  const parsed = parseDeck(text);
  renderImportDiagnostics(parsed.diagnostics || [], parsed.errors || []);
  if (!parsed.entries?.length) { setText('import-status', 'No valid card lines found. Review the import report below.'); return; }
  $('save-deck-button').hidden = true;
  $('resolve-deck-button').disabled = true;
  $('cancel-import-button').hidden = false;
  importController = new AbortController();
  $('deck-text').readOnly = true;
  $('deck-name').readOnly = true;
  const inputName = $('deck-name').value.trim() || 'Untitled deck';
  setText('import-status', 'Looking up cards in batches…');
  try {
    const resolvedResult = await resolveDeck(text, {resolverEndpoint: '/api/simulator-cards', timeoutMs: 60000, signal: importController.signal, onProgress: progress => {
      if (typeof progress !== 'object' || !progress) return;
      if (Array.isArray(progress.diagnostics)) renderImportDiagnostics(progress.diagnostics, [], {requestCount: progress.requestCount});
      const done = progress.completed ?? 0, total = progress.total ?? parsed.entries.length;
      if (progress.status === 'cooldown') {
        setText('import-status', `Scryfall rate limit: waiting ${progress.remainingSeconds ?? Math.ceil((progress.retryAfterMs || 0) / 1000)} seconds before continuing. Resolved cards are cached; you can cancel.`);
      } else setText('import-status', `${done} / ${total} unique names checked${progress.name ? ` · ${progress.name}` : ''}${progress.requestCount !== undefined ? ` · ${progress.requestCount} request(s)` : ''}`);
    }});
    importResult = {...resolvedResult, inputText: text, inputName};
    const entries = (importResult.entries || []).filter(entry => entry.card);
    const errors = importResult.errors || [];
    renderImportDiagnostics(importResult.diagnostics || [], errors, importResult.stats || {});
    const count = entries.reduce((sum, entry) => sum + Number(entry.quantity || 1), 0);
    const expected = parsed.entries.reduce((sum, entry) => sum + Number(entry.quantity || 1), 0);
    const missing = expected - count;
    setText('import-status', `${count} / ${expected} cards resolved.${importResult.paused ? ' Lookup paused; retry to continue from the cache.' : missing || errors.length ? ' Review the affected lines below before saving a partial deck.' : ' All cards found. Ready to save.'}`);
    $('save-deck-button').hidden = !entries.length;
    setText('save-deck-button', missing || errors.length ? `Save ${count} resolved cards only` : 'Save deck to this device');
    setText('resolve-deck-button', missing || errors.length || importResult.paused ? 'Retry unresolved cards' : 'Find cards on Scryfall');
  } catch (error) {
    importResult = null;
    setText('import-status', error.name === 'AbortError' ? 'Import canceled. The lookup report remains below; retry to use already cached cards.' : `Card lookup failed: ${error.message || 'check the import report and try again'}.`);
    setText('resolve-deck-button', 'Retry card lookup');
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
  const deck = {id: `deck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: importResult.inputName, text: importResult.inputText, entries, importErrors: importResult.errors || [], importDiagnostics: importResult.diagnostics || [], importStats: importResult.stats || {}, sample: false};
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
function setTestBusy(busy) {
  for (const id of ['run-test-button', 'test-deck', 'test-opponent', 'test-seed', 'test-rounds']) $(id).disabled = busy;
  $('cancel-test-button').hidden = !busy;
  $('test-progress').hidden = !busy;
  $('results-panel').setAttribute('aria-busy', String(busy));
}
function runTestInWorker(options) {
  return new Promise((resolve, reject) => {
    const jobId = `deck-test-${++nextTestId}`;
    let worker;
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      worker?.terminate();
      if (activeTest?.jobId === jobId) activeTest = null;
      if (error) reject(error); else resolve(result);
    };
    try {
      worker = new Worker(new URL('./simulation-worker.mjs', import.meta.url), {type: 'module'});
      activeTest = {jobId, cancel: () => finish(new DOMException('Test canceled.', 'AbortError'))};
      worker.addEventListener('message', event => {
        const message = event.data;
        if (message?.jobId !== jobId) return;
        if (message.type === 'progress') {
          const completed = Number(message.completed), total = Number(message.total);
          if (Number.isInteger(completed) && Number.isInteger(total) && completed >= 0 && completed <= total && total > 0) {
            $('test-progress').max = total;
            $('test-progress').value = completed;
            setText('test-status', `Completed ${completed} of ${total} seeded tests in this browser…`);
          }
        } else if (message.type === 'result') finish(null, message.report);
        else if (message.type === 'error') finish(new Error(message.message || 'The test could not finish.'));
      });
      worker.addEventListener('error', () => finish(new Error('The test worker could not start. Use a current browser or try the Android app.')));
      worker.addEventListener('messageerror', () => finish(new Error('The browser could not read the test result.')));
      worker.postMessage({type: 'run', jobId, options});
    } catch (error) { finish(error); }
  });
}
async function runTests() {
  if (activeTest) { toast('A test is already running. Open Results to cancel it.'); return; }
  const own = getDeck($('test-deck').value), opponent = getDeck($('test-opponent').value);
  const config = readConfig();
  const rounds = Number($('test-rounds').value), seed = $('test-seed').value.trim() || 'morrow-01';
  report = null;
  $('results-content').hidden = true;
  setTestBusy(true);
  $('test-progress').value = 0;
  setText('test-status', 'Starting 100 seeded opening tests in this browser…');
  preflight();
  try {
    report = await runTestInWorker({deck: expandDeck(own.entries), opponentDeck: expandDeck(opponent.entries), commander: commander(own), opponentCommander: commander(opponent), seed, rounds, life: config.life, onPlay: config.onPlay, runs: 100});
    for (const [label, source] of [['Your deck', own], ['Opponent deck', opponent]]) {
      if (source.importErrors?.length) report.notes.push(`${label} is a partial import: ${source.importErrors.length} unresolved source line(s) are absent. Only its ${mainCount(source)} resolved main-deck cards were tested.`);
    }
    report.uiMeta = {own: own.name, opponent: opponent.name, rounds, seed, life: config.life, onPlay: config.onPlay};
    renderReport(); persist();
    setText('test-status', '100 tests complete. Review coverage alongside the results; damage depends on supported effects and the opponent policy.');
  } catch (error) {
    report = null;
    persist();
    setText('test-status', error.name === 'AbortError' ? 'Test canceled. No partial results were saved.' : `The test could not finish: ${error.message || 'check the selected decks'}.`);
  } finally { setTestBusy(false); }
}
async function exportReport() {
  setText('export-title', 'Your test report');
  setText('export-intro', 'Copy this JSON to keep a reproducible record of your test.');
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
for(const id of ['cast-drop-zone','player-battlefield-zone','player-land-zone']) {
  const drop=$(id);
  drop.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('text/plain')){event.preventDefault();event.dataTransfer.dropEffect='move';drop.classList.add('casting-over');}});
  drop.addEventListener('dragleave',()=>drop.classList.remove('casting-over'));
  drop.addEventListener('drop',event=>{event.preventDefault();drop.classList.remove('casting-over');const cardId=event.dataTransfer?.getData('text/plain');if(cardId)openCastDialog(cardId);});
}
$('cast-cancel').addEventListener('click',()=>$('cast-dialog').close());
$('cast-pay-button').addEventListener('click',()=>{
  if(!casting)return;
  const action={type:'play',id:casting.id,sourceIds:[...casting.selected],sourceChoices:{...casting.choices},...(casting.targetId?{targetId:casting.targetId}:{})};
  if(dispatch(action)){$('cast-dialog').close();casting=null;}
});
$('end-turn-button').addEventListener('click', () => dispatch({type: 'endTurn'}));
$('assist-land').addEventListener('click', () => dispatch({type:'assist',mode:'land'}));
$('assist-next').addEventListener('click', () => dispatch({type:'assist',mode:'next'}));
$('assist-main').addEventListener('click', () => dispatch({type:'assist',mode:'main'}));
$('undo-action').addEventListener('click', () => { if(!undoHistory.length)return; game=undoHistory.pop(); savedGame=game; persist(); renderGame(); });
$('resolve-button').addEventListener('click', () => dispatch({type: 'resolve'}));
$('coin-button').addEventListener('click', () => dispatch({type: 'coin'}));
$('die-button').addEventListener('click', () => dispatch({type: 'die', sides: Number($('die-sides').value)}));
document.querySelectorAll('[data-life-player]').forEach(button => button.addEventListener('click', () => dispatch({type: 'life', player: Number(button.dataset.lifePlayer), delta: Number(button.dataset.lifeDelta)})));
for (const zone of ['command', 'library', 'graveyard', 'exile']) $(`${zone}-button`).addEventListener('click', () => showPile(zone));
$('combat-button').addEventListener('click', openCombat);
$('commander-return-on-death').addEventListener('change', () => dispatch({type:'commanderReturnPolicy', player:0, enabled:$('commander-return-on-death').checked}));
$('confirm-combat').addEventListener('click', () => {
  const assignments = [...$('combat-assignments').querySelectorAll('select')].map(select => ({attackerId: select.dataset.attacker, ...(select.value ? {blockerId: select.value} : {})}));
  const blockers = assignments.map(a => a.blockerId).filter(Boolean);
  if (new Set(blockers).size !== blockers.length) { toast('Assign each blocker to only one attacker in this model.'); return; }
  if (dispatch({type: 'combat', assignments})) $('combat-dialog').close();
});
$('resolve-deck-button').addEventListener('click', importDeck);
$('cancel-import-button').addEventListener('click', () => importController?.abort());
$('save-deck-button').addEventListener('click', saveImportedDeck);
$('copy-import-report').addEventListener('click', showImportReport);
for (const id of ['deck-text', 'deck-name']) $(id).addEventListener('input', () => {
  if (!importResult) return;
  importResult = null; $('save-deck-button').hidden = true;
  setText('import-status', 'The deck details changed. Find the cards again before saving this version.');
});
$('close-preview').addEventListener('click', () => { $('deck-preview').hidden = true; });
$('preflight-button').addEventListener('click', preflight);
$('run-test-button').addEventListener('click', runTests);
$('cancel-test-button').addEventListener('click', () => activeTest?.cancel());
window.addEventListener('pagehide', () => activeTest?.cancel());
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
fixtureTools.append(element('p', 'tiny', 'Archived example lists · dated 1 November 2026. These lists include effects that need manual resolution.'));
for (const [key, title] of [['ovika', 'Load dated Ovika list'], ['karn', 'Load dated Karn list']]) { const button = element('button', 'text-button', `${title} →`); button.addEventListener('click', () => loadDatedDeck(key)); fixtureTools.append(button); }
$('deck-text').after(fixtureTools);

restore();
applyConfig();
renderDeckLibrary();
if (report) renderReport();
const initialTab = location.hash.slice(1);
switchTab(['play', 'decks', 'results'].includes(initialTab) ? initialTab : 'play');
