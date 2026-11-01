# Shared implementation contract

ES modules, no bundler required. `web/` is copied into the Android application assets.

Card definitions use Scryfall fields: `id`, `name`, `mana_cost`, `cmc`, `type_line`, `oracle_text`, `power`, `toughness`, `keywords`, `colors`, `produced_mana`, `image_uris`, optional `card_faces`.

`web/cards.mjs` exports:
- `parseDeck(text)` -> `{entries:[{name,quantity,section}],errors:[string],diagnostics,warnings}`; sections main/commander/sideboard. Diagnostics preserve source line, requested and normalized names, quantity, section and parsing status.
- `resolveDeck(text,{onProgress,signal,resolverEndpoint,timeoutMs}={})` -> `{entries:[{name,quantity,section,card}],errors:[string],diagnostics,warnings,paused,pauseReason,stats}`. The Android UI selects the fixed official website batch endpoint; direct exact Scryfall GET remains available to library callers. Full card metadata is cached. Failed and pending lookups remain distinct; Retry-After is honored across retries/tabs. Progress includes per-line results and cancellable cooldown countdowns. Stats include weighted requested/resolved card counts, unique names, cache/request counts and resolved section counts.
- `expandDeck(entries)` -> Card[] for main (commander excluded).
- `demoDecks` -> `[{name,text,entries:[{name,quantity,section,card}]}]`, two clearly labeled sample decks with actual supported card metadata, functional offline.

`web/engine.mjs` exports:
- `createGame({deck,opponentDeck,seed='morrow',life=40,rounds=10,onPlay=true})` -> state, opening hands drawn, player 0 awaiting keep, opponent auto-kept.
- `act(state,action)` -> NEW state (throws on invalid action).
- `scoreThreat(instanceOrCard,battlefield=[])` -> `{score,reasons:[string]}` (only supplied battlefield data).
- `coverage(deck)` -> `[{name,status,reason}]`, status supported/partial/manual.
- `simulate({deck,opponentDeck,seed,life,rounds,runs=100,onPlay})` -> `{summary,rounds,coverage,notes}`, serializable; rounds rows and summary property names documented by engine author.

State: `{players:[{name,life,library,hand,battlefield,graveyard,exile,mulligans,kept,landPlayed}],stack,activePlayer,round,turn,phase,log:[string],seed,finished,roundLimit}`. Every zone contains instances `{id,card,tapped,counters,damage,enteredTurn,attacking}`. Stack also contains instances with `controller` (0/1) and optional `targetId`. `counters` is a number of +1/+1 counters. All state JSON serializable.

Actions: `{type:'mulligan'}`, `{type:'keep',bottomIds:[]}`, `{type:'play',id,targetId?}`, `{type:'resolve'}`, `{type:'tap',id}`, `{type:'attack',id}`, `{type:'combat',assignments?:[{attackerId,blockerId?}]}`, `{type:'endTurn'}` (automates opponent turn and returns to player 0), `{type:'life',player,delta}`, `{type:'move',id,player,zone}` (manual override logged), `{type:'counter',id,delta}`, `{type:'coin'}`, `{type:'die',sides}`. Coin/die log result; RNG state stored for repeatability. Actions use player 0 unless player specified. Combat is bounded by supported rules and explicitly labeled.

UI should use accessible buttons, swipe gesture alternatives, safe textContent for imported data; auto run exposes coverage and approximation. Manual 'move' works for unsupported cards. Never claim full MTG rules.
