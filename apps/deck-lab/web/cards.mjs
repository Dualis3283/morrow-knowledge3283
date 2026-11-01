// Scryfall supplies card data, not executable game rules. GET requests only.
const CACHE_KEY = 'morrow.cards.v1';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const REQUEST_INTERVAL = 130;
const memoryCache = new Map();
let nextRequestAt = 0;
let requestQueue = Promise.resolve();

function abortError() { return new DOMException('Import canceled.', 'AbortError'); }
function assertActive(signal) { if (signal?.aborted) throw abortError(); }
function sleep(ms, signal) {
  assertActive(signal);
  return new Promise((resolve, reject) => {
    const finish = () => { signal?.removeEventListener('abort', cancel); resolve(); };
    const timer = setTimeout(finish, ms);
    const cancel = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); reject(abortError()); };
    signal?.addEventListener('abort', cancel, {once: true});
  });
}
const keyOf = name => name.trim().toLocaleLowerCase('en-US');

function sectionOf(line) {
  const value = line.replace(/^#+\s*/, '').replace(/[:\s]+$/, '').trim().toLowerCase();
  if (/^(deck|main|mainboard|main deck|maindeck|main deck \(\d+\)|deck \(\d+\))$/.test(value)) return 'main';
  if (/^(commander|commanders|command zone)$/.test(value)) return 'commander';
  if (/^(sideboard|side board|maybeboard|maybe board|considering)$/.test(value)) return 'sideboard';
  return null;
}

export function parseDeck(text) {
  const entries = [], errors = [], seen = new Map();
  let section = 'main', total = 0;
  if (typeof text !== 'string') return {entries, errors: ['Deck text must be a string.']};
  if (text.length > 150000) return {entries, errors: ['Deck text is too long (maximum 150,000 characters).']};
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    const heading = sectionOf(line);
    if (heading) { section = heading; continue; }
    if (/^(#|\/\/|;)/.test(line)) continue;
    // Support section prefixes from Cockatrice exports without changing following lines.
    let entrySection = section;
    if (/^SB:\s*/i.test(line)) { entrySection = 'sideboard'; line = line.replace(/^SB:\s*/i, ''); }
    // Inline // is part of double-faced and split card names, never a comment.
    line = line.replace(/\s+#.*$/, '').trim();
    let quantity = 1, name = line;
    const prefix = line.match(/^(\d+)\s*x?\s+(.+)$/i) || line.match(/^(\d+)x\s*(.+)$/i);
    const suffix = line.match(/^(.+?)\s+[x×](\d+)$/i);
    if (prefix) { quantity = Number(prefix[1]); name = prefix[2].trim(); }
    else if (suffix) { quantity = Number(suffix[2]); name = suffix[1].trim(); }
    // MTGA/Arena and Moxfield printing decorations; retain DFC " // " names.
    name = name.replace(/\s+\([A-Za-z0-9]{2,8}\)\s+[A-Za-z0-9★-]+(?:\s+\*[^*]+\*)?\s*$/, '').replace(/\s+\*F\*\s*$/i, '').trim();
    if (!quantity || quantity > 250 || !Number.isSafeInteger(quantity)) { errors.push(`Line ${i + 1}: quantity must be between 1 and 250.`); continue; }
    if (!name || name.length > 200 || /[\u0000-\u001f]/.test(name) || /^\d+\s*$/.test(name)) { errors.push(`Line ${i + 1}: enter a card name.`); continue; }
    if (total + quantity > 1000) { errors.push(`Line ${i + 1}: deck exceeds the 1,000-card import limit.`); continue; }
    total += quantity;
    const key = `${entrySection}:${keyOf(name)}`;
    if (seen.has(key)) seen.get(key).quantity += quantity;
    else { const entry = {name, quantity, section: entrySection}; seen.set(key, entry); entries.push(entry); }
  }
  return {entries, errors};
}

function safeImage(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && ['cards.scryfall.io','api.scryfall.com'].includes(u.hostname) ? u.href : undefined; } catch { return undefined; }
}
function imageUris(uris) {
  return Object.fromEntries(Object.entries(uris || {}).filter(([key,value]) => ['small','normal','large','png','art_crop','border_crop'].includes(key) && safeImage(value)).map(([key,value]) => [key, safeImage(value)]));
}
function normalizeCard(raw) {
  if (!raw || raw.object !== 'card' || typeof raw.name !== 'string' || typeof raw.id !== 'string') throw new Error('Scryfall returned an invalid card response.');
  const card = {id: raw.id, name: raw.name, mana_cost: raw.mana_cost || '', cmc: Number(raw.cmc) || 0, type_line: raw.type_line || '', oracle_text: raw.oracle_text || '', keywords: Array.isArray(raw.keywords) ? raw.keywords : [], colors: raw.colors || [], produced_mana: raw.produced_mana || [], image_uris: imageUris(raw.image_uris), artist: raw.artist || '', scryfall_uri: raw.scryfall_uri || '', fetched_at: Date.now()};
  for (const field of ['oracle_id','power','toughness','loyalty','layout','color_identity']) if (raw[field] !== undefined) card[field] = raw[field];
  if (Array.isArray(raw.card_faces)) card.card_faces = raw.card_faces.map(face => {
    const f = {name: face.name || '', mana_cost: face.mana_cost || '', type_line: face.type_line || '', oracle_text: face.oracle_text || '', image_uris: imageUris(face.image_uris), artist: face.artist || '', colors: face.colors || []};
    for (const field of ['power','toughness','loyalty']) if (face[field] !== undefined) f[field] = face[field];
    return f;
  });
  return card;
}
function readCache(name) {
  const key = keyOf(name);
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const cache = JSON.parse(globalThis.localStorage?.getItem(CACHE_KEY) || '{}');
    const saved = cache[key];
    if (saved?.card?.name && saved.savedAt > Date.now() - CACHE_TTL) { memoryCache.set(key,saved.card); return saved.card; }
  } catch { /* Blocked/quota-exhausted storage must not prevent import. */ }
  return null;
}
function writeCache(name, card) {
  memoryCache.set(keyOf(name),card);
  try {
    const cache = JSON.parse(globalThis.localStorage?.getItem(CACHE_KEY) || '{}');
    cache[keyOf(name)] = {savedAt: Date.now(), card};
    const recent = Object.entries(cache).filter(([,v]) => v.savedAt > Date.now() - CACHE_TTL).sort((a,b) => b[1].savedAt-a[1].savedAt).slice(0,500);
    globalThis.localStorage?.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(recent)));
  } catch { /* Memory cache still works. */ }
}

function queueLookup(name, signal) {
  const work = async () => {
    assertActive(signal);
    const cached = readCache(name);
    if (cached) return {card:cached,cached:true};
    for (let attempt = 0; attempt < 3; attempt++) {
      await sleep(Math.max(0,nextRequestAt - Date.now()),signal);
      assertActive(signal); nextRequestAt = Date.now() + REQUEST_INTERVAL;
      const controller = new AbortController();
      const forward = () => controller.abort();
      signal?.addEventListener('abort',forward,{once:true});
      const timeout = setTimeout(() => controller.abort(),20000);
      let response, rawCard;
      try {
        response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,{method:'GET',headers:{Accept:'application/json'},signal:controller.signal});
        if (response.ok) rawCard = await response.json();
      } catch (error) {
        assertActive(signal);
        if (error.name === 'AbortError') throw new Error('Scryfall request timed out. Try again when connected.');
        throw error;
      } finally { clearTimeout(timeout); signal?.removeEventListener('abort',forward); }
      if (response.status === 429 && attempt < 2) {
        const raw = response.headers?.get('Retry-After');
        const numeric = Number(raw);
        const delay = raw && Number.isFinite(numeric) ? numeric*1000 : Math.max(0, Date.parse(raw || '')-Date.now()) || 1000*(attempt+1);
        await sleep(Math.min(10000,Math.max(130,delay)),signal); continue;
      }
      if (!response.ok) {
        if (response.status === 404) throw new Error('No exact card match. Check the spelling or use the full card name.');
        if (response.status === 429) throw new Error('Scryfall is rate limiting requests; try again shortly.');
        throw new Error(`Scryfall returned HTTP ${response.status}.`);
      }
      const card = normalizeCard(rawCard);
      assertActive(signal); writeCache(name,card); return {card,cached:false};
    }
  };
  const result = requestQueue.then(work,work);
  requestQueue = result.catch(() => {});
  return result;
}

export async function resolveDeck(text,{onProgress,signal} = {}) {
  const parsed = parseDeck(text), entries = [], errors = [...parsed.errors];
  const unique = [...new Set(parsed.entries.map(e => keyOf(e.name)))];
  const resolved = new Map(); let completed = 0;
  for (const key of unique) {
    assertActive(signal);
    const entry = parsed.entries.find(e => keyOf(e.name) === key);
    try { resolved.set(key,await queueLookup(entry.name,signal)); }
    catch (error) { if (error.name === 'AbortError' || signal?.aborted) throw abortError(); errors.push(`${entry.name}: ${error.message || 'Card lookup failed.'}`); }
    completed++;
    onProgress?.({completed,total:unique.length,name:entry.name,cached:resolved.get(key)?.cached || false});
  }
  for (const entry of parsed.entries) {
    const result = resolved.get(keyOf(entry.name));
    if (result) entries.push({...entry, name:result.card.name, card:result.card});
  }
  return {entries,errors};
}

export function expandDeck(entries) {
  if (!Array.isArray(entries)) return [];
  const cards = [];
  for (const entry of entries) {
    if ((entry.section || 'main') !== 'main' || !entry.card) continue;
    const qty = Number(entry.quantity);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 1000 || cards.length + qty > 1000) continue;
    for (let i=0;i<qty;i++) cards.push(entry.card);
  }
  return cards;
}

// Official Scryfall metadata fetched 2026-11-01. Bundled teaching fixtures
// remain playable offline; card images load from Scryfall when connected.
const sampleCards = [
  {
    "id": "2e781bfd-f8cb-4d20-b977-4359f3a21311",
    "name": "Forest",
    "mana_cost": "",
    "cmc": 0.0,
    "type_line": "Basic Land — Forest",
    "oracle_text": "({T}: Add {G}.)",
    "keywords": [],
    "colors": [],
    "produced_mana": [
      "G"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.jpg?1791578317",
      "normal": "https://cards.scryfall.io/normal/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.jpg?1791578317",
      "large": "https://cards.scryfall.io/large/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.jpg?1791578317",
      "png": "https://cards.scryfall.io/png/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.png?1791578317",
      "art_crop": "https://cards.scryfall.io/art_crop/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.jpg?1791578317",
      "border_crop": "https://cards.scryfall.io/border_crop/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.jpg?1791578317",
      "thumb": "https://cards.scryfall.io/thumb/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.webp?1791578317",
      "grid": "https://cards.scryfall.io/grid/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.webp?1791578317",
      "display": "https://cards.scryfall.io/display/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.webp?1791578317",
      "art": "https://cards.scryfall.io/art/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.webp?1791578317",
      "crop": "https://cards.scryfall.io/crop/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.webp?1791578317",
      "jpeg": "https://cards.scryfall.io/normal/front/2/e/2e781bfd-f8cb-4d20-b977-4359f3a21311.jpg?1791578317"
    },
    "artist": "Samuele Bandini",
    "scryfall_uri": "https://scryfall.com/card/mdd/301/forest?utm_source=api",
    "oracle_id": "b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6",
    "layout": "normal",
    "color_identity": [
      "G"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "6a0b230b-d391-4998-a3f7-7b158a0ec2cd",
    "name": "Llanowar Elves",
    "mana_cost": "{G}",
    "cmc": 1.0,
    "type_line": "Creature — Elf Druid",
    "oracle_text": "{T}: Add {G}.",
    "power": "1",
    "toughness": "1",
    "keywords": [],
    "colors": [
      "G"
    ],
    "produced_mana": [
      "G"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.jpg?1783909057",
      "normal": "https://cards.scryfall.io/normal/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.jpg?1783909057",
      "large": "https://cards.scryfall.io/large/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.jpg?1783909057",
      "png": "https://cards.scryfall.io/png/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.png?1783909057",
      "art_crop": "https://cards.scryfall.io/art_crop/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.jpg?1783909057",
      "border_crop": "https://cards.scryfall.io/border_crop/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.jpg?1783909057",
      "thumb": "https://cards.scryfall.io/thumb/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.webp?1783909057",
      "grid": "https://cards.scryfall.io/grid/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.webp?1783909057",
      "display": "https://cards.scryfall.io/display/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.webp?1783909057",
      "art": "https://cards.scryfall.io/art/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.webp?1783909057",
      "crop": "https://cards.scryfall.io/crop/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.webp?1783909057",
      "jpeg": "https://cards.scryfall.io/normal/front/6/a/6a0b230b-d391-4998-a3f7-7b158a0ec2cd.jpg?1783909057"
    },
    "artist": "Kev Walker",
    "scryfall_uri": "https://scryfall.com/card/fdn/227/llanowar-elves?utm_source=api",
    "oracle_id": "68954295-54e3-4303-a6bc-fc4547a4e3a3",
    "layout": "normal",
    "color_identity": [
      "G"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "409f9b88-f03e-40b6-9883-68c14c37c0de",
    "name": "Grizzly Bears",
    "mana_cost": "{1}{G}",
    "cmc": 2.0,
    "type_line": "Creature — Bear",
    "oracle_text": "",
    "power": "2",
    "toughness": "2",
    "keywords": [],
    "colors": [
      "G"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg?1783943001",
      "normal": "https://cards.scryfall.io/normal/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg?1783943001",
      "large": "https://cards.scryfall.io/large/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg?1783943001",
      "png": "https://cards.scryfall.io/png/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.png?1783943001",
      "art_crop": "https://cards.scryfall.io/art_crop/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg?1783943001",
      "border_crop": "https://cards.scryfall.io/border_crop/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg?1783943001",
      "thumb": "https://cards.scryfall.io/thumb/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.webp?1783943001",
      "grid": "https://cards.scryfall.io/grid/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.webp?1783943001",
      "display": "https://cards.scryfall.io/display/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.webp?1783943001",
      "art": "https://cards.scryfall.io/art/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.webp?1783943001",
      "crop": "https://cards.scryfall.io/crop/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.webp?1783943001",
      "jpeg": "https://cards.scryfall.io/normal/front/4/0/409f9b88-f03e-40b6-9883-68c14c37c0de.jpg?1783943001"
    },
    "artist": "D. J. Cleland-Hura",
    "scryfall_uri": "https://scryfall.com/card/10e/268/grizzly-bears?utm_source=api",
    "oracle_id": "14c8f55d-d177-4c25-a931-ebeb9e6062a0",
    "layout": "normal",
    "color_identity": [
      "G"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "e8b67ee8-3189-4426-8b1a-b540267768fd",
    "name": "Centaur Courser",
    "mana_cost": "{2}{G}",
    "cmc": 3.0,
    "type_line": "Creature — Centaur Warrior",
    "oracle_text": "",
    "power": "3",
    "toughness": "3",
    "keywords": [],
    "colors": [
      "G"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.jpg?1783932966",
      "normal": "https://cards.scryfall.io/normal/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.jpg?1783932966",
      "large": "https://cards.scryfall.io/large/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.jpg?1783932966",
      "png": "https://cards.scryfall.io/png/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.png?1783932966",
      "art_crop": "https://cards.scryfall.io/art_crop/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.jpg?1783932966",
      "border_crop": "https://cards.scryfall.io/border_crop/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.jpg?1783932966",
      "thumb": "https://cards.scryfall.io/thumb/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.webp?1783932966",
      "grid": "https://cards.scryfall.io/grid/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.webp?1783932966",
      "display": "https://cards.scryfall.io/display/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.webp?1783932966",
      "art": "https://cards.scryfall.io/art/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.webp?1783932966",
      "crop": "https://cards.scryfall.io/crop/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.webp?1783932966",
      "jpeg": "https://cards.scryfall.io/normal/front/e/8/e8b67ee8-3189-4426-8b1a-b540267768fd.jpg?1783932966"
    },
    "artist": "Vance Kovacs",
    "scryfall_uri": "https://scryfall.com/card/m20/168/centaur-courser?utm_source=api",
    "oracle_id": "2f5bf099-2e01-4e1c-9ebf-0ce0ac66939e",
    "layout": "normal",
    "color_identity": [
      "G"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "8059c52b-5d25-4052-b48a-e9e219a7a546",
    "name": "Colossal Dreadmaw",
    "mana_cost": "{4}{G}{G}",
    "cmc": 6.0,
    "type_line": "Creature — Dinosaur",
    "oracle_text": "Trample (This creature can deal excess combat damage to the player or planeswalker it's attacking.)",
    "power": "6",
    "toughness": "6",
    "keywords": [
      "Trample"
    ],
    "colors": [
      "G"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.jpg?1783930678",
      "normal": "https://cards.scryfall.io/normal/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.jpg?1783930678",
      "large": "https://cards.scryfall.io/large/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.jpg?1783930678",
      "png": "https://cards.scryfall.io/png/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.png?1783930678",
      "art_crop": "https://cards.scryfall.io/art_crop/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.jpg?1783930678",
      "border_crop": "https://cards.scryfall.io/border_crop/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.jpg?1783930678",
      "thumb": "https://cards.scryfall.io/thumb/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.webp?1783930678",
      "grid": "https://cards.scryfall.io/grid/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.webp?1783930678",
      "display": "https://cards.scryfall.io/display/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.webp?1783930678",
      "art": "https://cards.scryfall.io/art/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.webp?1783930678",
      "crop": "https://cards.scryfall.io/crop/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.webp?1783930678",
      "jpeg": "https://cards.scryfall.io/normal/front/8/0/8059c52b-5d25-4052-b48a-e9e219a7a546.jpg?1783930678"
    },
    "artist": "Jesper Ejsing",
    "scryfall_uri": "https://scryfall.com/card/m21/176/colossal-dreadmaw?utm_source=api",
    "oracle_id": "08c7db90-c0cf-4482-b7ee-bb033e5996d2",
    "layout": "normal",
    "color_identity": [
      "G"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "fd1f95bf-48ea-455a-8a6c-0249b11c8900",
    "name": "Giant Growth",
    "mana_cost": "{G}",
    "cmc": 1.0,
    "type_line": "Instant",
    "oracle_text": "Target creature gets +3/+3 until end of turn.",
    "keywords": [],
    "colors": [
      "G"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.jpg?1783902918",
      "normal": "https://cards.scryfall.io/normal/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.jpg?1783902918",
      "large": "https://cards.scryfall.io/large/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.jpg?1783902918",
      "png": "https://cards.scryfall.io/png/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.png?1783902918",
      "art_crop": "https://cards.scryfall.io/art_crop/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.jpg?1783902918",
      "border_crop": "https://cards.scryfall.io/border_crop/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.jpg?1783902918",
      "thumb": "https://cards.scryfall.io/thumb/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.webp?1783902918",
      "grid": "https://cards.scryfall.io/grid/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.webp?1783902918",
      "display": "https://cards.scryfall.io/display/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.webp?1783902918",
      "art": "https://cards.scryfall.io/art/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.webp?1783902918",
      "crop": "https://cards.scryfall.io/crop/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.webp?1783902918",
      "jpeg": "https://cards.scryfall.io/normal/front/f/d/fd1f95bf-48ea-455a-8a6c-0249b11c8900.jpg?1783902918"
    },
    "artist": "Andreia Ugrai",
    "scryfall_uri": "https://scryfall.com/card/msh/167/giant-growth?utm_source=api",
    "oracle_id": "5748ebf1-24e3-499d-ab7c-c2cebd462a24",
    "layout": "normal",
    "color_identity": [
      "G"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "1335d293-3dd2-4f13-bd2c-22181f4528ee",
    "name": "Island",
    "mana_cost": "",
    "cmc": 0.0,
    "type_line": "Basic Land — Island",
    "oracle_text": "({T}: Add {U}.)",
    "keywords": [],
    "colors": [],
    "produced_mana": [
      "U"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.jpg?1791578424",
      "normal": "https://cards.scryfall.io/normal/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.jpg?1791578424",
      "large": "https://cards.scryfall.io/large/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.jpg?1791578424",
      "png": "https://cards.scryfall.io/png/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.png?1791578424",
      "art_crop": "https://cards.scryfall.io/art_crop/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.jpg?1791578424",
      "border_crop": "https://cards.scryfall.io/border_crop/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.jpg?1791578424",
      "thumb": "https://cards.scryfall.io/thumb/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.webp?1791578424",
      "grid": "https://cards.scryfall.io/grid/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.webp?1791578424",
      "display": "https://cards.scryfall.io/display/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.webp?1791578424",
      "art": "https://cards.scryfall.io/art/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.webp?1791578424",
      "crop": "https://cards.scryfall.io/crop/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.webp?1791578424",
      "jpeg": "https://cards.scryfall.io/normal/front/1/3/1335d293-3dd2-4f13-bd2c-22181f4528ee.jpg?1791578424"
    },
    "artist": "Eren Arik",
    "scryfall_uri": "https://scryfall.com/card/mdd/294/island?utm_source=api",
    "oracle_id": "b2c6aa39-2d2a-459c-a555-fb48ba993373",
    "layout": "normal",
    "color_identity": [
      "U"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93",
    "name": "Merfolk of the Pearl Trident",
    "mana_cost": "{U}",
    "cmc": 1.0,
    "type_line": "Creature — Merfolk",
    "oracle_text": "",
    "power": "1",
    "toughness": "1",
    "keywords": [],
    "colors": [
      "U"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.jpg?1783940504",
      "normal": "https://cards.scryfall.io/normal/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.jpg?1783940504",
      "large": "https://cards.scryfall.io/large/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.jpg?1783940504",
      "png": "https://cards.scryfall.io/png/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.png?1783940504",
      "art_crop": "https://cards.scryfall.io/art_crop/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.jpg?1783940504",
      "border_crop": "https://cards.scryfall.io/border_crop/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.jpg?1783940504",
      "thumb": "https://cards.scryfall.io/thumb/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.webp?1783940504",
      "grid": "https://cards.scryfall.io/grid/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.webp?1783940504",
      "display": "https://cards.scryfall.io/display/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.webp?1783940504",
      "art": "https://cards.scryfall.io/art/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.webp?1783940504",
      "crop": "https://cards.scryfall.io/crop/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.webp?1783940504",
      "jpeg": "https://cards.scryfall.io/normal/front/a/3/a360fe4e-c9a6-42fa-a97a-8b5a0c19ef93.jpg?1783940504"
    },
    "artist": "Ray Lago",
    "scryfall_uri": "https://scryfall.com/card/m13/60/merfolk-of-the-pearl-trident?utm_source=api",
    "oracle_id": "218d9277-c179-4de3-9c7f-79b5a6d4fa38",
    "layout": "normal",
    "color_identity": [
      "U"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "5e227a63-abea-494e-9d66-6ff0a3da14ca",
    "name": "Wind Drake",
    "mana_cost": "{2}{U}",
    "cmc": 3.0,
    "type_line": "Creature — Drake",
    "oracle_text": "Flying",
    "power": "2",
    "toughness": "2",
    "keywords": [
      "Flying"
    ],
    "colors": [
      "U"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.jpg?1783937211",
      "normal": "https://cards.scryfall.io/normal/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.jpg?1783937211",
      "large": "https://cards.scryfall.io/large/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.jpg?1783937211",
      "png": "https://cards.scryfall.io/png/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.png?1783937211",
      "art_crop": "https://cards.scryfall.io/art_crop/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.jpg?1783937211",
      "border_crop": "https://cards.scryfall.io/border_crop/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.jpg?1783937211",
      "thumb": "https://cards.scryfall.io/thumb/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.webp?1783937211",
      "grid": "https://cards.scryfall.io/grid/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.webp?1783937211",
      "display": "https://cards.scryfall.io/display/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.webp?1783937211",
      "art": "https://cards.scryfall.io/art/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.webp?1783937211",
      "crop": "https://cards.scryfall.io/crop/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.webp?1783937211",
      "jpeg": "https://cards.scryfall.io/normal/front/5/e/5e227a63-abea-494e-9d66-6ff0a3da14ca.jpg?1783937211"
    },
    "artist": "Todd Lockwood",
    "scryfall_uri": "https://scryfall.com/card/kld/70/wind-drake?utm_source=api",
    "oracle_id": "d6ffdaf0-ac08-4de9-bbce-2eab2f86bcca",
    "layout": "normal",
    "color_identity": [
      "U"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "a27efec0-40c4-48bc-a21a-3af28a6529b5",
    "name": "Air Elemental",
    "mana_cost": "{3}{U}{U}",
    "cmc": 5.0,
    "type_line": "Creature — Elemental",
    "oracle_text": "Flying",
    "power": "4",
    "toughness": "4",
    "keywords": [
      "Flying"
    ],
    "colors": [
      "U"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.jpg?1783933018",
      "normal": "https://cards.scryfall.io/normal/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.jpg?1783933018",
      "large": "https://cards.scryfall.io/large/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.jpg?1783933018",
      "png": "https://cards.scryfall.io/png/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.png?1783933018",
      "art_crop": "https://cards.scryfall.io/art_crop/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.jpg?1783933018",
      "border_crop": "https://cards.scryfall.io/border_crop/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.jpg?1783933018",
      "thumb": "https://cards.scryfall.io/thumb/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.webp?1783933018",
      "grid": "https://cards.scryfall.io/grid/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.webp?1783933018",
      "display": "https://cards.scryfall.io/display/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.webp?1783933018",
      "art": "https://cards.scryfall.io/art/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.webp?1783933018",
      "crop": "https://cards.scryfall.io/crop/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.webp?1783933018",
      "jpeg": "https://cards.scryfall.io/normal/front/a/2/a27efec0-40c4-48bc-a21a-3af28a6529b5.jpg?1783933018"
    },
    "artist": "Tomasz Jedruszek",
    "scryfall_uri": "https://scryfall.com/card/m20/44/air-elemental?utm_source=api",
    "oracle_id": "7744bae4-a8b7-44a5-9b4c-0048ad4cc448",
    "layout": "normal",
    "color_identity": [
      "U"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "cb3b35b8-f321-46d8-a441-6b9a6efa9021",
    "name": "Divination",
    "mana_cost": "{2}{U}",
    "cmc": 3.0,
    "type_line": "Sorcery",
    "oracle_text": "Draw two cards.",
    "keywords": [],
    "colors": [
      "U"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.jpg?1783934590",
      "normal": "https://cards.scryfall.io/normal/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.jpg?1783934590",
      "large": "https://cards.scryfall.io/large/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.jpg?1783934590",
      "png": "https://cards.scryfall.io/png/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.png?1783934590",
      "art_crop": "https://cards.scryfall.io/art_crop/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.jpg?1783934590",
      "border_crop": "https://cards.scryfall.io/border_crop/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.jpg?1783934590",
      "thumb": "https://cards.scryfall.io/thumb/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.webp?1783934590",
      "grid": "https://cards.scryfall.io/grid/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.webp?1783934590",
      "display": "https://cards.scryfall.io/display/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.webp?1783934590",
      "art": "https://cards.scryfall.io/art/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.webp?1783934590",
      "crop": "https://cards.scryfall.io/crop/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.webp?1783934590",
      "jpeg": "https://cards.scryfall.io/normal/front/c/b/cb3b35b8-f321-46d8-a441-6b9a6efa9021.jpg?1783934590"
    },
    "artist": "Willian Murai",
    "scryfall_uri": "https://scryfall.com/card/m19/51/divination?utm_source=api",
    "oracle_id": "273b339c-964b-4a18-8eb5-ceb8abcdfd9e",
    "layout": "normal",
    "color_identity": [
      "U"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  },
  {
    "id": "ddad9f16-52d5-49de-82b0-b1a5294a9c44",
    "name": "Unsummon",
    "mana_cost": "{U}",
    "cmc": 1.0,
    "type_line": "Instant",
    "oracle_text": "Return target creature to its owner's hand.",
    "keywords": [],
    "colors": [
      "U"
    ],
    "image_uris": {
      "small": "https://cards.scryfall.io/small/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.jpg?1789556722",
      "normal": "https://cards.scryfall.io/normal/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.jpg?1789556722",
      "large": "https://cards.scryfall.io/large/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.jpg?1789556722",
      "png": "https://cards.scryfall.io/png/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.png?1789556722",
      "art_crop": "https://cards.scryfall.io/art_crop/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.jpg?1789556722",
      "border_crop": "https://cards.scryfall.io/border_crop/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.jpg?1789556722",
      "thumb": "https://cards.scryfall.io/thumb/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.webp?1789556722",
      "grid": "https://cards.scryfall.io/grid/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.webp?1789556722",
      "display": "https://cards.scryfall.io/display/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.webp?1789556722",
      "art": "https://cards.scryfall.io/art/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.webp?1789556722",
      "crop": "https://cards.scryfall.io/crop/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.webp?1789556722",
      "jpeg": "https://cards.scryfall.io/normal/front/d/d/ddad9f16-52d5-49de-82b0-b1a5294a9c44.jpg?1789556722"
    },
    "artist": "Ioannis Fiore",
    "scryfall_uri": "https://scryfall.com/card/fra/46/unsummon?utm_source=api",
    "oracle_id": "837182db-1bf3-4a2c-bd01-1af9d9873561",
    "layout": "normal",
    "color_identity": [
      "U"
    ],
    "metadata_source": "Scryfall GET /cards/named?exact=…; retrieved 2026-11-01.",
    "fetched_at": 1793534555643
  }
];
const byName = new Map(sampleCards.map(c => [c.name,c]));
function deck(name,text) { return {name,text,entries:parseDeck(text).entries.map(entry => ({...entry,card:byName.get(entry.name)}))}; }
export const demoDecks = [
  deck('Emerald · 60-card teaching sample','40 Forest\n4 Llanowar Elves\n4 Grizzly Bears\n4 Centaur Courser\n4 Colossal Dreadmaw\n4 Giant Growth'),
  deck('Azure · 60-card teaching sample','40 Island\n4 Merfolk of the Pearl Trident\n4 Wind Drake\n4 Air Elemental\n4 Divination\n4 Unsummon')
];
