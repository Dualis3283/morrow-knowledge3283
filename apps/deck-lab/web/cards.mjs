// Scryfall supplies card data, not executable game rules. GET requests only.
const CACHE_KEY = 'morrow.deck-simulator.cards.v1';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const REQUEST_INTERVAL = 250;
const COOLDOWN_KEY = `${CACHE_KEY}.cooldown`;
const memoryCache = new Map();
let nextRequestAt = 0;
let requestQueue = Promise.resolve();
let cooldownUntil = 0;

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
const cleanName = name => String(name || '').normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s*\/\/\s*/g, ' // ').replace(/\s+/g, ' ').trim();
const keyOf = name => cleanName(name).normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en-US');

function sectionOf(line) {
  const value = line.replace(/^(?:#+|\/\/)\s*/, '').trim().replace(/^\[([^\]]+)\]$/, '$1').replace(/\s*[:\-–—]?\s*(?:\(\s*\d+\s*\)|\[\s*\d+\s*\]|:\s*\d+)\s*$/, '').replace(/[:\s]+$/, '').trim().toLowerCase();
  if (/^(deck|main|mainboard|main board|main deck|maindeck)$/.test(value)) return 'main';
  if (/^(commander|commanders|command zone)$/.test(value)) return 'commander';
  if (/^(sideboard|side board|maybeboard|maybe board|considering|companion|companions)$/.test(value)) return 'sideboard';
  // Type headings are part of the main library, not names to send to Scryfall.
  if (/^(creatures?|lands?|basic lands?|nonbasic lands?|artifacts?|enchantments?|instants?|sorcery|sorceries|planeswalkers?|battles?|spells?|noncreature spells?|other)$/.test(value)) return 'main';
  return null;
}

function csvCells(line, delimiter = ',') {
  const cells = []; let cell = '', quoted = false;
  for (let i=0;i<line.length;i++) {
    const ch = line[i];
    if (ch === '"') { if (quoted && line[i+1] === '"') {cell += '"'; i++;} else quoted = !quoted; }
    else if (ch === delimiter && !quoted) {cells.push(cell.trim()); cell = '';}
    else cell += ch;
  }
  if (quoted) return null;
  cells.push(cell.trim()); return cells;
}

export function parseDeck(text) {
  const entries = [], errors = [], diagnostics = [], warnings = [], seen = new Map();
  let section = 'main', total = 0, csv = null;
  if (typeof text !== 'string' || text.length > 150000) {
    const message = typeof text !== 'string' ? 'Deck text must be a string.' : 'Deck text is too long (maximum 150,000 characters).';
    return {entries,errors:[message],diagnostics:[{line:0,source:'',status:'error',code:'format_input',message}],warnings};
  }
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|[\n\r\u2028\u2029]/);
  for (let i = 0; i < lines.length; i++) {
    const source = lines[i];
    let line = source.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/[\u00A0\u202F]/g, ' ').trim();
    if (!line) continue;
    const diagnostic = {line:i+1,source,requestedName:'',normalizedName:'',quantity:0,section,status:'ignored',code:'format_comment',message:'Comment or section heading; no card request.'};
    diagnostics.push(diagnostic);
    if (/^```/.test(line)) continue;
    const heading = sectionOf(line);
    if (heading) { section = heading; Object.assign(diagnostic,{section,status:'ignored',code:'format_section',message:`${section} section.`}); continue; }
    if (/^(#|\/\/|;)/.test(line)) continue;
    // CSV/TSV is accepted only with an explicit name + quantity header; this
    // avoids misreading a comma within a Magic card's name as a column break.
    if (!csv) {
      for (const delimiter of [',','\t']) {
        const columns = csvCells(line,delimiter)?.map(s => s.toLowerCase());
        const nameIndex = columns?.findIndex(s => /^(name|card|card name)$/.test(s));
        const quantityIndex = columns?.findIndex(s => /^(quantity|qty|count|amount)$/.test(s));
        if (nameIndex >= 0 && quantityIndex >= 0) {
          csv = {delimiter,nameIndex,quantityIndex,sectionIndex:columns.findIndex(s => /^(board|section|zone)$/.test(s))};
          Object.assign(diagnostic,{code:'format_header',message:'CSV/TSV column headings.'}); break;
        }
      }
      if (csv) continue;
    }
    let entrySection = section, quantity = 1, name = line;
    if (csv) {
      const cells = csvCells(line,csv.delimiter);
      if (!cells || cells[csv.nameIndex] === undefined || cells[csv.quantityIndex] === undefined) {
        const message = `Line ${i+1}: CSV/TSV row is missing a name or quantity column.`;
        errors.push(message); Object.assign(diagnostic,{status:'error',code:'format_columns',message}); continue;
      }
      name = cells[csv.nameIndex]; quantity = Number(cells[csv.quantityIndex]);
      entrySection = sectionOf(cells[csv.sectionIndex] || '') || section;
    } else {
      line = line.replace(/^(?:[-•]\s+|\*\s+)(?=\d)/, '');
      if (/^(?:SB|SIDEBOARD):\s*/i.test(line)) { entrySection = 'sideboard'; line = line.replace(/^(?:SB|SIDEBOARD):\s*/i, ''); }
      if (/^(?:CMDR|COMMANDER):\s*/i.test(line)) { entrySection = 'commander'; line = line.replace(/^(?:CMDR|COMMANDER):\s*/i, ''); }
      if (/(?:\[\s*Commander\s*\]|\*(?:CMDR|Commander)\*|#\s*!?Commander\b)/i.test(line)) entrySection = 'commander';
      // Never remove // inside a split/transform card's name.
      line = line.replace(/\s+#.*$/, '').trim();
      const prefix = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i) || line.match(/^(\d+)[x×]\s*(.+)$/i) || line.match(/^[x×]\s*(\d+)\s+(.+)$/i);
      const suffix = line.match(/^(.+?)\s+[x×]\s*(\d+)$/i);
      if (prefix) {quantity=Number(prefix[1]);name=prefix[2].trim();}
      else if (suffix) {quantity=Number(suffix[2]);name=suffix[1].trim();}
      else if (/^(?:-\d|\d+[.,/]\d)/.test(line)) quantity = NaN;
      else name = line;
    }
    const requestedName = name;
    // Common Archidekt/Moxfield tags and Cockatrice printing prefixes.
    // Metadata is removed by syntax only; no fuzzy name substitution is used.
    name = name.replace(/^\[[A-Za-z0-9]{2,8}(?::[^\]]+)?\]\s*/, '');
    for (let pass=0;pass<4;pass++) {
      const before = name;
      name = name.replace(/\s+\[[^\]\r\n]*\]\s*$/, '').replace(/\s+\^[^^\r\n]*\^\s*$/, '').replace(/\s+\*(?:F|E|ETCHED|FOIL|CMDR|COMMANDER)\*\s*$/i, '').replace(/\s+\((?:foil|etched|nonfoil)\)\s*$/i, '');
      name = name.replace(/\s+\([A-Za-z0-9]{2,8}\)\s*[0-9][A-Za-z0-9★†-]*\s*$/, '');
      if (name === before) break;
    }
    name = cleanName(name);
    Object.assign(diagnostic,{requestedName,normalizedName:name,name,quantity,section:entrySection,status:'parsed',code:'format_ok',message:'Ready for exact card lookup.'});
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 250) {
      const message=`Line ${i+1}: quantity must be an integer between 1 and 250.`;
      errors.push(message);Object.assign(diagnostic,{status:'error',code:'format_quantity',message});continue;
    }
    if (!name || name.length > 200 || /[\u0000-\u001f]/.test(name) || /^\d+\s*$/.test(name)) {
      const message=`Line ${i+1}: enter a card name (maximum 200 characters).`;
      errors.push(message);Object.assign(diagnostic,{status:'error',code:'format_name',message});continue;
    }
    if (total+quantity > 1000) {
      const message=`Line ${i+1}: deck exceeds the 1,000-card import limit.`;
      errors.push(message);Object.assign(diagnostic,{status:'error',code:'format_limit',message});continue;
    }
    total += quantity;
    const key=`${entrySection}:${keyOf(name)}`;
    if (seen.has(key)) seen.get(key).quantity += quantity;
    else {const entry={name,quantity,section:entrySection};seen.set(key,entry);entries.push(entry);}
  }
  const commanderCount = entries.filter(e=>e.section==='commander').reduce((sum,e)=>sum+e.quantity,0);
  if (commanderCount > 2) warnings.push(`${commanderCount} cards are in the Commander section. Add a Deck/Mainboard heading before the library cards if needed; commander and sideboard cards are not shuffled into the library.`);
  return {entries,errors,diagnostics,warnings};
}

function safeImage(value) {
  try {const u=new URL(value);return u.protocol==='https:' && ['cards.scryfall.io','api.scryfall.com'].includes(u.hostname)?u.href:undefined;}catch{return undefined;}
}
function imageUris(uris) {
  return Object.fromEntries(Object.entries(uris||{}).filter(([key,value])=>['small','normal','large','png','art_crop','border_crop'].includes(key)&&safeImage(value)).map(([key,value])=>[key,safeImage(value)]));
}
function normalizeCard(raw) {
  if (!raw || raw.object!=='card' || typeof raw.name!=='string' || typeof raw.id!=='string') throw lookupError('Scryfall returned an invalid card response.',{code:'invalid_response'});
  const card={id:raw.id,name:raw.name,mana_cost:raw.mana_cost||'',cmc:Number(raw.cmc)||0,type_line:raw.type_line||'',oracle_text:raw.oracle_text||'',keywords:Array.isArray(raw.keywords)?raw.keywords:[],colors:raw.colors||[],produced_mana:raw.produced_mana||[],image_uris:imageUris(raw.image_uris),artist:raw.artist||'',scryfall_uri:raw.scryfall_uri||'',fetched_at:Date.now()};
  for(const field of ['oracle_id','power','toughness','loyalty','layout','color_identity']) if(raw[field]!==undefined)card[field]=raw[field];
  if(Array.isArray(raw.card_faces))card.card_faces=raw.card_faces.map(face=>{
    const f={name:face.name||'',mana_cost:face.mana_cost||'',type_line:face.type_line||'',oracle_text:face.oracle_text||'',image_uris:imageUris(face.image_uris),artist:face.artist||'',colors:face.colors||[]};
    for(const field of ['power','toughness','loyalty'])if(face[field]!==undefined)f[field]=face[field];return f;
  });
  return card;
}
function cardAliases(card) {return new Set([card?.name,...(card?.card_faces||[]).map(face=>face.name),...String(card?.name||'').split(/\s*\/\/\s*/)].filter(Boolean).map(keyOf));}
function readCache(name) {
  const key=keyOf(name);let saved=memoryCache.get(key);
  if(!saved)try{saved=JSON.parse(globalThis.localStorage?.getItem(CACHE_KEY)||'{}')[key];}catch{}
  if(saved?.card?.name&&saved.savedAt>Date.now()-CACHE_TTL&&cardAliases(saved.card).has(key)){memoryCache.set(key,saved);return saved.card;}
  return null;
}
function writeCache(name,card) {
  const keys=[keyOf(name),keyOf(card.name)],saved={savedAt:Date.now(),card};
  for(const key of keys)memoryCache.set(key,saved);
  try{
    const cache=JSON.parse(globalThis.localStorage?.getItem(CACHE_KEY)||'{}');
    for(const key of keys)cache[key]=saved;
    const recent=Object.entries(cache).filter(([,v])=>v.savedAt>Date.now()-CACHE_TTL).sort((a,b)=>b[1].savedAt-a[1].savedAt).slice(0,500);
    globalThis.localStorage?.setItem(CACHE_KEY,JSON.stringify(Object.fromEntries(recent)));
  }catch{}
}
function lookupError(message,fields={}){return Object.assign(new Error(message),{code:'lookup_error',retryable:false,...fields});}
function retryDelay(response,attempt){
  const value=response?.headers?.get?.('Retry-After');const numeric=Number(value);
  const delay=value&&Number.isFinite(numeric)?numeric*1000:Math.max(0,Date.parse(value||'')-Date.now())||500*attempt;
  return Math.min(10000,Math.max(REQUEST_INTERVAL,delay));
}
function rateLimitDelay(response,payload){
  const raw=response?.headers?.get?.('Retry-After');
  const numeric=raw!==null&&raw!==undefined&&raw!==''?Number(raw):NaN;
  const headerDelay=Number.isFinite(numeric)?Math.max(0,numeric*1000):Math.max(0,Date.parse(raw||'')-Date.now())||0;
  const advice=String(payload?.details||payload?.message||'').match(/(?:after|wait(?:\s+for)?|in)\s+(\d+(?:\.\d+)?)\s*(milliseconds?|ms|seconds?|secs?|s\b|minutes?|mins?)/i);
  const units=advice?.[2]||'';
  const bodyDelay=advice?Number(advice[1])*(/^m(?:in)/i.test(units)?60000:/^(?:ms|milli)/i.test(units)?1:1000):0;
  // Some browsers cannot read Retry-After because it is not CORS-exposed. The
  // Scryfall error body still carries its full cooldown. Never cap that advice.
  const numericBody=Number(payload?.retryAfterSeconds)*1000||Number(payload?.retryAfterMs)||0;
  const knownAdvice=Number.isFinite(numeric)||headerDelay>0||Boolean(advice)||numericBody>0;
  return Math.max(REQUEST_INTERVAL,headerDelay,bodyDelay,numericBody,knownAdvice?0:60000);
}
function readCooldown(){
  try{cooldownUntil=Math.max(cooldownUntil,Number(globalThis.localStorage?.getItem(COOLDOWN_KEY))||0);}catch{}
  return cooldownUntil;
}
function scheduleCooldown(delay){
  cooldownUntil=Math.max(readCooldown(),Date.now()+delay);
  try{globalThis.localStorage?.setItem(COOLDOWN_KEY,String(cooldownUntil));}catch{}
  return cooldownUntil;
}
async function waitForCooldown(context){
  // Real timers use the current deadline and wall clock on every iteration.
  // Injected sleeps can advance a virtual clock (or resolve immediately in
  // tests); account for their requested delay without hiding real time jumps.
  const virtualSleep=context.sleepImpl!==sleep;
  let accountedNow=Date.now();
  for(;;){
    assertActive(context.signal);
    const until=readCooldown(),now=Date.now();
    accountedNow=virtualSleep?Math.max(accountedNow,now):now;
    const remaining=Math.max(0,until-accountedNow);
    if(remaining===0){
      // Another tab may have extended the stored deadline while this timer was
      // asleep. Re-read it before clearing or allowing the next request.
      if(readCooldown()>until)continue;
      cooldownUntil=0;
      try{globalThis.localStorage?.setItem(COOLDOWN_KEY,'0');}catch{}
      return;
    }
    context.emit('cooldown',{httpStatus:429,code:'http_rate_limit',retryable:true,retryAt:until,retryAfterMs:remaining,remainingSeconds:Math.ceil(remaining/1000),message:`Scryfall requested a cooldown. Retrying in ${Math.ceil(remaining/1000)} seconds; resolved cards remain cached.`});
    const step=Math.min(1000,remaining);
    await context.sleepImpl(step,context.signal);
    if(virtualSleep)accountedNow=Math.max(Date.now(),accountedNow+step);
  }
}
async function requestJson(url,context,endpoint) {
  for(let attempt=1;attempt<=3;attempt++){
    assertActive(context.signal);
    await waitForCooldown(context);
    await context.sleepImpl(Math.max(0,nextRequestAt-Date.now()),context.signal);
    assertActive(context.signal);nextRequestAt=Date.now()+REQUEST_INTERVAL;
    const record={endpoint,url,attempt,httpStatus:null,status:'requesting'};
    context.attempts.push(record);context.requestCount++;
    context.emit('requesting',{attempt,endpoint,httpStatus:null,message:`Exact ${endpoint} lookup, request ${context.requestCount}.`});
    assertActive(context.signal);
    const controller=new AbortController();let timedOut=false;
    const forward=()=>controller.abort();context.signal?.addEventListener('abort',forward,{once:true});
    const timer=setTimeout(()=>{timedOut=true;controller.abort();},context.timeoutMs);
    let response,payload,error;
    try{
      response=await context.fetchImpl(url,{method:'GET',headers:{Accept:'application/json'},signal:controller.signal});
      record.httpStatus=response.status;
      try{payload=await response.json();}catch(cause){if(controller.signal.aborted||cause.name==='AbortError')throw cause;if(response.ok)throw lookupError('Scryfall returned unreadable JSON.',{code:'invalid_response',httpStatus:response.status});}
      assertActive(context.signal);
    }catch(cause){
      assertActive(context.signal);
      error=cause.code==='invalid_response'?cause:lookupError(timedOut?`Card lookup timed out after ${context.timeoutMs/1000} seconds.`:'The browser could not reach Scryfall. Check connectivity, content blockers or browser network access.',{code:timedOut?'timeout':'network_error',httpStatus:response?.status??null,retryable:true,details:timedOut?'Request or response body exceeded its time limit.':String(cause.message||'Network request failed.')});
    }finally{clearTimeout(timer);context.signal?.removeEventListener('abort',forward);}
    if(!error&&!response.ok){
      const status=response.status,apiCode=payload?.code||'',details=payload?.details||'';
      const message=status===404?'No exact card or face-name match was found.':status===429?'Scryfall is rate limiting card requests.':`Scryfall returned HTTP ${status}.`;
      error=lookupError(details?`${message} ${details}`:message,{code:status===404?'lookup_not_found':status===429?'http_rate_limit':'http_error',httpStatus:status,apiCode,details,retryable:status===429||status>=500});
      if(status===429){error.retryAfterMs=rateLimitDelay(response,payload);error.retryAt=scheduleCooldown(error.retryAfterMs);}
    }
    if(!error){record.status='resolved';return {payload,httpStatus:response.status};}
    Object.assign(record,{status:'failed',code:error.code,message:error.message,apiCode:error.apiCode||''});
    if(error.retryable&&attempt<3){context.emit('retrying',{attempt,endpoint,httpStatus:error.httpStatus,code:error.code,message:error.message,retryable:true,retryAfterMs:error.retryAfterMs,retryAt:error.retryAt});if(error.httpStatus!==429)await context.sleepImpl(retryDelay(response,attempt),context.signal);continue;}
    throw error;
  }
}
async function lookupCard(name,context){
  const cached=readCache(name);if(cached)return {card:cached,cached:true,match:'cache',httpStatus:null};
  let namedFailure;
  try{
    const result=await requestJson(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,context,'named');
    const card=normalizeCard(result.payload);
    if(!cardAliases(card).has(keyOf(name)))throw lookupError(`Scryfall returned ${card.name}, which does not exactly match the requested name or a card face.`,{code:'ambiguous_match',httpStatus:result.httpStatus});
    writeCache(name,card);return {card,cached:false,match:'exact',httpStatus:result.httpStatus};
  }catch(error){if(context.signal?.aborted)throw abortError();if(![404,422].includes(error.httpStatus))throw error;namedFailure=error;}
  // Exact face names sometimes fail /named. Search is only a discovery step:
  // choose a result only when its full name or an individual face equals input.
  const escaped=name.replaceAll('\\','\\\\').replaceAll('"','\\"');
  let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(`name:"${escaped}"`)}&unique=cards`,pages=0;
  const matches=new Map();let lastStatus=namedFailure.httpStatus;
  while(url&&pages<5){
    let result;
    try{result=await requestJson(url,context,'face-search');}catch(error){if(error.httpStatus===404){url=null;break;}throw error;}
    lastStatus=result.httpStatus;pages++;
    if(!Array.isArray(result.payload?.data))throw lookupError('Scryfall returned an invalid search response.',{code:'invalid_response',httpStatus:lastStatus});
    for(const raw of result.payload.data)if(cardAliases(raw).has(keyOf(name))){const card=normalizeCard(raw);matches.set(card.oracle_id||keyOf(card.name),card);}
    const next=result.payload.has_more&&result.payload.next_page;
    if(next){let parsed;try{parsed=new URL(next);}catch{throw lookupError('Scryfall returned an invalid search continuation.',{code:'invalid_response',httpStatus:lastStatus});}if(parsed.protocol!=='https:'||parsed.hostname!=='api.scryfall.com')throw lookupError('Scryfall returned an invalid search continuation.',{code:'invalid_response',httpStatus:lastStatus});url=parsed.href;}else url=null;
  }
  if(url)throw lookupError('Exact face search exceeded its result limit; enter the full double-faced card name.',{code:'ambiguous_match',httpStatus:lastStatus});
  if(matches.size>1)throw lookupError('More than one card has that exact face name; enter the full double-faced card name.',{code:'ambiguous_match',httpStatus:lastStatus});
  if(matches.size===1){const card=[...matches.values()][0];writeCache(name,card);return {card,cached:false,match:'exact-face',httpStatus:lastStatus};}
  throw lookupError('No exact card or face-name match. Check spelling and remove export annotations; no fuzzy replacement was selected.',{code:'lookup_not_found',httpStatus:namedFailure.httpStatus,apiCode:namedFailure.apiCode,details:namedFailure.details||'',retryable:false});
}

async function resolveBatchDeck(parsed,{resolverEndpoint,onProgress,signal,fetchImpl,sleepImpl,timeoutMs}){
  if(typeof resolverEndpoint!=='string'||!((resolverEndpoint.startsWith('/')&&!resolverEndpoint.startsWith('//'))||resolverEndpoint==='https://david-walsh.pages.dev/api/simulator-cards'))throw new Error('Card resolver must be a same-origin path or the official Deck Lab endpoint.');
  const diagnostics=parsed.diagnostics.map(d=>({...d})),errors=[...parsed.errors],resolved=new Map();
  const unique=[...new Set(parsed.entries.map(e=>keyOf(e.name)))],startedAt=Date.now();
  let completed=0,requestCount=0,upstreamRequestCount=0,cacheHits=0,paused=false,pauseReason=null;
  const related=key=>diagnostics.filter(d=>keyOf(d.normalizedName)===key&&d.status!=='ignored'&&d.status!=='error');
  const update=(key,fields)=>{for(const d of related(key))Object.assign(d,fields);};
  const emit=(name,status,fields={})=>onProgress?.({completed,total:unique.length,name,status,diagnostic:related(keyOf(name))[0],diagnostics:diagnostics.map(d=>({...d})),requestCount,...fields});
  const waiting=[];
  for(const key of unique){
    assertActive(signal);const entry=parsed.entries.find(e=>keyOf(e.name)===key),card=readCache(entry.name);
    if(card){resolved.set(key,card);cacheHits++;completed++;update(key,{status:'cached',code:'lookup_cached',message:'Loaded from the card-data cache.',matchedName:card.name,httpStatus:null,cached:true,retryable:false,attempts:[]});emit(entry.name,'cached');}
    else waiting.push(key);
  }
  for(let offset=0;offset<waiting.length;offset+=75){
    assertActive(signal);
    const keys=waiting.slice(offset,offset+75),names=keys.map(key=>parsed.entries.find(e=>keyOf(e.name)===key).name);
    const context={signal,sleepImpl,emit:(status,fields)=>emit(names[0],status,fields)};
    let response,payload,problem;
    const work=async()=>{
      await waitForCooldown(context);assertActive(signal);
      await sleepImpl(Math.max(0,nextRequestAt-Date.now()),signal);assertActive(signal);nextRequestAt=Date.now()+REQUEST_INTERVAL;
      requestCount++;emit(names[0],'requesting',{message:`Looking up ${names.length} names in a single card-data request.`,batchSize:names.length});assertActive(signal);
      const controller=new AbortController();let timedOut=false;
      const forward=()=>controller.abort();signal?.addEventListener('abort',forward,{once:true});
      const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
      try{
        response=await fetchImpl(resolverEndpoint,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({names}),signal:controller.signal});
        try{payload=await response.json();}catch(cause){if(controller.signal.aborted||cause.name==='AbortError')throw cause;throw lookupError('The card resolver returned unreadable JSON.',{code:'invalid_response',httpStatus:response.status});}
      }catch(cause){assertActive(signal);problem=cause.code==='invalid_response'?cause:lookupError(timedOut?'The card-data request timed out. Retry to resume from cached cards.':'The browser could not reach the card-data resolver. Retry to resume from cached cards.',{code:timedOut?'timeout':'network_error',httpStatus:null,retryable:true,details:String(cause.message||'Network request failed.')});}
      finally{clearTimeout(timer);signal?.removeEventListener('abort',forward);}
    };
    const task=requestQueue.then(work,work);requestQueue=task.catch(()=>{});await task;assertActive(signal);
    const httpStatus=response?.status??null;
    const upstreamDiagnostic=Array.isArray(payload?.diagnostics)?payload.diagnostics.at(-1):null;
    const providerMessage=payload?.details||payload?.message||(typeof payload?.error==='string'?payload.error:'')||upstreamDiagnostic?.details||'';
    if(!problem&&response?.ok&&(!payload||!Array.isArray(payload.cards)))problem=lookupError('The card resolver returned an invalid response. Retry to resume from cached cards.',{code:'invalid_response',httpStatus,retryable:true});
    upstreamRequestCount+=Number(payload?.upstreamRequestCount)||0;
    const rawCards=Array.isArray(payload?.cards)?payload.cards:[],mappings=Array.isArray(payload?.resolved)?payload.resolved:[];
    const missing=Array.isArray(payload?.notFound)?payload.notFound:[],serverPending=new Set((Array.isArray(payload?.pending)?payload.pending:[]).map(item=>keyOf(typeof item==='string'?item:item.name)));
    for(const key of keys){
      const name=names[keys.indexOf(key)],mapping=mappings.find(m=>keyOf(m.requestedName)===key);
      const candidates=rawCards.filter(raw=>(!mapping||raw.id===mapping.cardId)&&cardAliases(raw).has(key));
      if(mapping&&rawCards.some(raw=>raw.id===mapping.cardId)&&candidates.length===0){
        const message='The card-data service returned a different name. That card was rejected; no fuzzy replacement was selected.';
        completed++;update(key,{status:'failed',code:'ambiguous_match',message,httpStatus,matchedName:'',retryable:false});errors.push(`${name}: ${message}`);emit(name,'failed');continue;
      }
      const distinct=new Map(candidates.map(raw=>[raw.oracle_id||keyOf(raw.name),raw]));
      if(distinct.size===1){
        try{const card=normalizeCard([...distinct.values()][0]);writeCache(name,card);resolved.set(key,card);completed++;update(key,{status:'resolved',code:'lookup_ok',message:'Resolved by the card-data service using an exact card or face name.',matchedName:card.name,httpStatus,cached:false,retryable:false,attempts:[{endpoint:'batch',attempt:1,httpStatus,status:'resolved'}]});emit(name,'resolved');continue;}
        catch(cause){problem=cause;}
      }
      if(distinct.size>1){const message='More than one card has that exact face name; enter the full double-faced card name.';completed++;update(key,{status:'failed',code:'ambiguous_match',message,httpStatus,matchedName:'',retryable:false});errors.push(`${name}: ${message}`);emit(name,'failed');continue;}
      const notFound=missing.find(item=>keyOf(item.name)===key);
      if(notFound&&!serverPending.has(key)){
        const message=notFound.details||notFound.message||'No exact card or face-name match. Check the spelling; no fuzzy replacement was selected.';
        completed++;update(key,{status:'failed',code:'lookup_not_found',apiCode:notFound.code||'not_found',message,details:message,httpStatus,matchedName:'',retryable:false,attempts:[{endpoint:'batch',attempt:1,httpStatus,status:'failed'}]});
        const lines=related(key).map(d=>d.line).join(', ');errors.push(`Line${related(key).length===1?'':'s'} ${lines} · ${name}: ${message}`);emit(name,'failed');
      }
    }
    if(response?.status===429||payload?.rateLimited){
      const retryAfterMs=rateLimitDelay(response,payload),retryAt=scheduleCooldown(retryAfterMs);
      problem=lookupError(providerMessage||'Scryfall requested a cooldown. Retry after the countdown; resolved cards are cached.',{code:'http_rate_limit',apiCode:upstreamDiagnostic?.code||'',httpStatus:429,retryable:true,retryAfterMs,retryAt});
    }else if(!problem&&response&&!response.ok)problem=lookupError(providerMessage||`The card resolver returned HTTP ${httpStatus}.`,{code:'http_error',apiCode:upstreamDiagnostic?.code||'',httpStatus,retryable:httpStatus>=500});
    const incomplete=keys.some(key=>!resolved.has(key)&&related(key).some(d=>d.status==='parsed'));
    if(problem||incomplete){
      paused=true;pauseReason={code:problem?.code||'resolver_incomplete',apiCode:problem?.apiCode||upstreamDiagnostic?.code||'',message:problem?.message||providerMessage||'Some names are pending. Retry to resume from cached cards.',httpStatus:problem?.httpStatus??httpStatus,retryAt:problem?.retryAt||null,retryAfterMs:problem?.retryAfterMs||0};
      errors.push(pauseReason.message);
      for(const d of diagnostics)if(d.status==='parsed')Object.assign(d,{status:'pending',code:'lookup_pending',apiCode:pauseReason.apiCode,message:`Not resolved: this import paused. ${pauseReason.message} This is not a card-not-found result.`,details:pauseReason.message,httpStatus:pauseReason.httpStatus,retryable:true,retryAt:pauseReason.retryAt});
      emit(names[0],'paused',pauseReason);break;
    }
  }
  const entries=[];for(const entry of parsed.entries){const card=resolved.get(keyOf(entry.name));if(card)entries.push({...entry,name:card.name,card});}
  const expectedCards=parsed.entries.reduce((sum,e)=>sum+e.quantity,0),resolvedCards=entries.reduce((sum,e)=>sum+e.quantity,0),pendingUnique=new Set(diagnostics.filter(d=>d.status==='pending').map(d=>keyOf(d.normalizedName))).size;
  return {entries,errors,diagnostics,warnings:parsed.warnings,paused,pauseReason,stats:{requestCount,upstreamRequestCount,cacheHits,parsedUnique:unique.length,resolvedUnique:resolved.size,failedUnique:completed-resolved.size,pendingUnique,expectedCards,resolvedCards,unresolvedCards:expectedCards-resolvedCards,formatErrors:parsed.diagnostics.filter(d=>d.status==='error').length,durationMs:Date.now()-startedAt,sections:Object.fromEntries(['main','commander','sideboard'].map(section=>[section,entries.filter(e=>e.section===section).reduce((sum,e)=>sum+e.quantity,0)]))}};
}

export async function resolveDeck(text,{onProgress,signal,fetchImpl=(...args)=>globalThis.fetch(...args),sleepImpl=sleep,timeoutMs=20000,resolverEndpoint=null}={}){
  const parsed=parseDeck(text);timeoutMs=Math.min(60000,Math.max(10,Number(timeoutMs)||20000));
  if(resolverEndpoint)return resolveBatchDeck(parsed,{resolverEndpoint,onProgress,signal,fetchImpl,sleepImpl,timeoutMs});
  const entries=[],errors=[...parsed.errors],diagnostics=parsed.diagnostics.map(d=>({...d}));
  const unique=[...new Set(parsed.entries.map(e=>keyOf(e.name)))],resolved=new Map();let completed=0,requestCount=0,cacheHits=0,paused=false,pauseReason=null;
  const startedAt=Date.now();timeoutMs=Math.min(60000,Math.max(10,Number(timeoutMs)||20000));
  for(const key of unique){
    assertActive(signal);
    const entry=parsed.entries.find(e=>keyOf(e.name)===key),related=diagnostics.filter(d=>d.status==='parsed'&&keyOf(d.normalizedName)===key);
    const context={signal,fetchImpl,sleepImpl,timeoutMs,attempts:[],requestCount:0,emit(status,fields={}){
      const diagnostic={...related[0],status,...fields,attempts:this.attempts.map(a=>({...a}))};
      onProgress?.({completed,total:unique.length,name:entry.name,status,diagnostic,diagnostics,requestCount:requestCount+this.requestCount,...fields});
    }};
    let result,error;
    const work=()=>lookupCard(entry.name,context);
    const task=requestQueue.then(work,work);requestQueue=task.catch(()=>{});
    try{result=await task;resolved.set(key,result);if(result.cached)cacheHits++;}
    catch(cause){if(cause.name==='AbortError'||signal?.aborted)throw abortError();error=cause;const numbers=related.map(d=>d.line).join(', ');errors.push(`Line${related.length===1?'':'s'} ${numbers} · ${entry.name}: ${cause.message||'Card lookup failed.'}`);}
    requestCount+=context.requestCount;completed++;
    for(const diagnostic of related)Object.assign(diagnostic,{status:error?'failed':result.cached?'cached':'resolved',code:error?.code||(result.match==='exact-face'?'lookup_face_match':result.cached?'lookup_cached':'lookup_ok'),message:error?.message||(result.match==='exact-face'?'Resolved using an exactly matching card face.':result.cached?'Loaded from the card-data cache.':'Resolved using an exact card name.'),httpStatus:error?.httpStatus??result?.httpStatus??null,apiCode:error?.apiCode||'',details:error?.details||'',matchedName:result?.card.name||'',retryable:error?.retryable||false,retryAfterMs:error?.retryAfterMs,retryAt:error?.retryAt,cached:result?.cached||false,attempts:context.attempts.map(a=>({...a}))});
    onProgress?.({completed,total:unique.length,name:entry.name,status:error?'failed':result.cached?'cached':'resolved',diagnostic:related[0],diagnostics:diagnostics.map(d=>({...d})),requestCount,cached:result?.cached||false});
    if(error&&['http_rate_limit','network_error','timeout'].includes(error.code)){
      paused=true;pauseReason={code:error.code,message:error.message,retryAt:error.retryAt||null,retryAfterMs:error.retryAfterMs||0};
      for(const diagnostic of diagnostics)if(diagnostic.status==='parsed')Object.assign(diagnostic,{status:'pending',code:'lookup_pending',message:'Not requested: this import paused after a connection or rate-limit problem. Retry the list to resume from cached cards.',retryable:true,httpStatus:null});
      onProgress?.({completed,total:unique.length,name:entry.name,status:'paused',diagnostic:related[0],diagnostics:diagnostics.map(d=>({...d})),requestCount,...pauseReason});break;
    }
  }
  for(const entry of parsed.entries){const result=resolved.get(keyOf(entry.name));if(result)entries.push({...entry,name:result.card.name,card:result.card});}
  const expectedCards=parsed.entries.reduce((sum,e)=>sum+e.quantity,0),resolvedCards=entries.reduce((sum,e)=>sum+e.quantity,0);
  const pendingUnique=new Set(diagnostics.filter(d=>d.status==='pending').map(d=>keyOf(d.normalizedName))).size;
  return {entries,errors,diagnostics,warnings:parsed.warnings,paused,pauseReason,stats:{requestCount,cacheHits,parsedUnique:unique.length,resolvedUnique:resolved.size,failedUnique:completed-resolved.size,pendingUnique,expectedCards,resolvedCards,unresolvedCards:expectedCards-resolvedCards,formatErrors:parsed.diagnostics.filter(d=>d.status==='error').length,durationMs:Date.now()-startedAt,sections:Object.fromEntries(['main','commander','sideboard'].map(section=>[section,entries.filter(e=>e.section===section).reduce((sum,e)=>sum+e.quantity,0)]))}};
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
