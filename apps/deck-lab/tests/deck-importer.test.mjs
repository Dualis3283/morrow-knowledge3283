import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const modulePath = '../web/cards.mjs';
const fresh = () => import(`${modulePath}?importer-test=${Date.now()}-${Math.random()}`);
const noWait = async () => {};
function storage() {
  const values = new Map();
  return {getItem:key => values.get(key) || null, setItem:(key,value) => values.set(key,value)};
}
function card(name, extra={}) {
  return {object:'card', id:`fixture-${name.toLowerCase().replaceAll(' ','-')}`, oracle_id:`oracle-${name}`, name, mana_cost:'{1}{G}', cmc:2, type_line:'Creature — Bear', oracle_text:'', power:'2', toughness:'2', keywords:[], colors:['G'], image_uris:{normal:'https://cards.scryfall.io/normal/front/a/b/fixture.jpg'}, ...extra};
}
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
const failed = (status=404,details='No cards found.') => json({object:'error',code:'not_found',status,details},status);
async function withStore(run) {
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage();
  try { return await run(await fresh()); }
  finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
}
async function withClock(run) {
  const previousNow=Date.now;
  let now=previousNow();
  const waits=[];
  Date.now=()=>now;
  const clock={now:()=>now,waits,sleepImpl:async ms=>{waits.push(ms);now+=Math.max(0,ms);}};
  try{return await run(clock);}finally{Date.now=previousNow;}
}
function diagnosticFor(result,line) { return result.diagnostics.find(item => item.line === line); }

test('accepts common text exports while preserving commander and sideboard boundaries',async()=>{
  const {parseDeck} = await fresh();
  const result=parseDeck('[Commander]\n1x Ovika, Enigma Goliath\nMainboard (99)\n1×Sol Ring (CMM) 396 [Ramp]\n1 x Arcane Signet [ELD:331]\nGrizzly Bears x2\n1 [M10:178] Grizzly Bears\nSideboard (2)\n2 Negate\nCreatures (1)\n1 Llanowar Elves');
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.entries,[
    {name:'Ovika, Enigma Goliath',quantity:1,section:'commander'},
    {name:'Sol Ring',quantity:1,section:'main'},
    {name:'Arcane Signet',quantity:1,section:'main'},
    {name:'Grizzly Bears',quantity:3,section:'main'},
    {name:'Negate',quantity:2,section:'sideboard'},
    {name:'Llanowar Elves',quantity:1,section:'main'}
  ]);
  assert.equal(diagnosticFor(result,4).source,'1×Sol Ring (CMM) 396 [Ramp]');
  assert.equal(diagnosticFor(result,4).normalizedName,'Sol Ring');
  assert.equal(diagnosticFor(result,8).status,'ignored');
});

test('retains split and double-faced names, Unicode punctuation and source line numbers',async()=>{
  const {parseDeck} = await fresh();
  const result=parseDeck('\uFEFFDeck\r1 Archangel Avacyn // Avacyn, the Purifier (SOI) 5\r# Note\r1 Fire // Ice\u20281 Wayfarer’s Bauble\n1\u00a0Island');
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.entries.map(item => item.name),['Archangel Avacyn // Avacyn, the Purifier','Fire // Ice',"Wayfarer's Bauble",'Island']);
  assert.equal(diagnosticFor(result,4).normalizedName,'Fire // Ice');
  assert.equal(diagnosticFor(result,6).normalizedName,'Island');
  assert.equal(diagnosticFor(result,3).status,'ignored');
});

test('ManaBox bracketed type headings are ignored and reset commander scope to main',async()=>{
  const {parseDeck} = await fresh();
  const text='[COMMANDER]\n1 Example Commander\n\n[CREATURES]\n4 Grizzly Bears\n[ARTIFACTS]\n1 Sol Ring\n[ENCHANTMENTS]\n1 Doubling Season\n[INSTANTS]\n2 Giant Growth\n[SORCERIES]\n1 Divination\n[PLANESWALKERS]\n1 Example Planeswalker\n[LANDS]\n4 Forest\n[SIDEBOARD]\n2 Negate\n[MAYBEBOARD]\n1 Example Consideration';
  const parsed=parseDeck(text);
  assert.deepEqual(parsed.errors,[]);
  assert.equal(parsed.entries.find(entry=>entry.name==='Example Commander').section,'commander');
  assert.equal(parsed.entries.filter(entry=>entry.section==='main').reduce((sum,entry)=>sum+entry.quantity,0),14);
  assert.equal(parsed.entries.find(entry=>entry.name==='Negate').section,'sideboard');
  assert.equal(parsed.entries.find(entry=>entry.name==='Example Consideration').section,'sideboard');
  assert.ok(!parsed.entries.some(entry=>/\[|\]/.test(entry.name)));
  assert.equal(parsed.diagnostics.filter(item=>item.status==='ignored' && item.source.startsWith('[')).length,10);
});

test('invalid quantities become line diagnostics instead of malformed card lookups',async()=>{
  const {parseDeck} = await fresh();
  const result=parseDeck('0 Island\n-1 Forest\n1.5 Sol Ring\n251 Mountain\n4 Grizzly Bears');
  assert.equal(result.errors.length,4);
  assert.deepEqual(result.entries,[{name:'Grizzly Bears',quantity:4,section:'main'}]);
  for (let line=1;line<=4;line++) {
    const diagnostic=diagnosticFor(result,line);
    assert.equal(diagnostic.status,'error');
    assert.equal(diagnostic.code,'format_quantity');
    assert.equal(typeof diagnostic.source,'string');
  }
});

test('dated simulator exports retain 99 main cards plus their commander',async()=>{
  const {parseDeck} = await fresh();
  for (const deck of ['ovika','karn']) {
    const text=await readFile(new URL(`../web/examples/${deck}-2026-11-01.txt`,import.meta.url),'utf8');
    const parsed=parseDeck(text);
    assert.deepEqual(parsed.errors,[],`${deck}: ${parsed.errors.join('; ')}`);
    const count=section=>parsed.entries.filter(entry=>entry.section===section).reduce((sum,entry)=>sum+entry.quantity,0);
    assert.equal(count('main'),99,deck);
    assert.equal(count('commander'),1,deck);
    assert.equal(count('sideboard'),0,deck);
  }
});

test('counts unique requests, retains per-line diagnostics and reuses cache across sections',async()=>{
  await withStore(async({resolveDeck,expandDeck})=>{
    const requests=[],progress=[];
    const fetchImpl=async(url,options)=>{ requests.push({url,options}); return json(card(new URL(url).searchParams.get('exact'))); };
    const result=await resolveDeck('Deck\n4 Grizzly Bears (M10) 178\n1 Grizzly Bears\nSideboard\n2 Grizzly Bears',{fetchImpl,sleepImpl:noWait,onProgress:item=>progress.push(item)});
    assert.equal(result.errors.length,0);
    assert.equal(requests.length,1);
    assert.equal(requests[0].options.method,'GET');
    assert.equal(new URL(requests[0].url).searchParams.get('exact'),'Grizzly Bears');
    assert.equal(expandDeck(result.entries).length,5);
    assert.equal(result.stats.requestCount,1);
    for (const line of [2,3,5]) {
      assert.equal(diagnosticFor(result,line).status,'resolved');
      assert.equal(diagnosticFor(result,line).matchedName,'Grizzly Bears');
    }
    assert.ok(progress.some(item=>item.completed===1 && item.diagnostic));
    const cached=await resolveDeck('1 Grizzly Bears',{fetchImpl,sleepImpl:noWait});
    assert.equal(requests.length,1);
    assert.equal(diagnosticFor(cached,1).status,'cached');
    assert.equal(cached.stats.requestCount,0);
  });
});

test('recovers an exact front-face alias via GET search and never takes the first partial match',async()=>{
  await withStore(async({resolveDeck})=>{
    const urls=[];
    const full='Matzalantli, the Great Door // The Core';
    const fetchImpl=async(url,options)=>{
      urls.push(url); assert.equal(options.method,'GET');
      if (new URL(url).pathname === '/cards/named') return failed(404,'No exact card found.');
      return json({object:'list',has_more:false,data:[card('Matzalantli, the Great Door Impostor'),card(full,{layout:'transform',card_faces:[{name:'Matzalantli, the Great Door',type_line:'Legendary Artifact',oracle_text:'',image_uris:{normal:'https://cards.scryfall.io/normal/front/m/a/door.jpg'}},{name:'The Core',type_line:'Legendary Land',oracle_text:''}]})]});
    };
    const result=await resolveDeck('1 Matzalantli, the Great Door',{fetchImpl,sleepImpl:noWait});
    assert.equal(result.errors.length,0);
    assert.equal(result.entries[0].card.name,full);
    assert.equal(result.entries[0].card.card_faces[0].image_uris.normal,'https://cards.scryfall.io/normal/front/m/a/door.jpg');
    assert.equal(urls.length,2);
    assert.equal(new URL(urls[1]).pathname,'/cards/search');
    assert.match(new URL(urls[1]).searchParams.get('q'),/Matzalantli/);
    assert.equal(diagnosticFor(result,1).matchedName,full);
  });
});

test('rejects partial and ambiguous fallback matches with useful line and HTTP diagnostics',async()=>{
  await withStore(async({resolveDeck})=>{
    const partial=await resolveDeck('1 Wrong Name (M10) 178 [Ramp]',{
      sleepImpl:noWait,fetchImpl:async url=>new URL(url).pathname === '/cards/named' ? failed(404,'No matching card.') : json({object:'list',has_more:false,data:[card('Wrong Name Similar Card')]})
    });
    assert.equal(partial.entries.length,0);
    assert.equal(partial.errors.length,1);
    const d=diagnosticFor(partial,1);
    assert.equal(d.code,'lookup_not_found');
    assert.equal(d.normalizedName,'Wrong Name');
    assert.equal(d.source,'1 Wrong Name (M10) 178 [Ramp]');
    assert.equal(d.status,'failed');
    assert.ok(d.httpStatus===404 || d.attempts?.some(attempt=>attempt.httpStatus===404));
    const ambiguous=await resolveDeck('1 Shared Front',{
      sleepImpl:noWait,fetchImpl:async url=>new URL(url).pathname === '/cards/named' ? failed(422,'Ambiguous name.') : json({object:'list',has_more:false,data:[
        card('Shared Front // Back A',{oracle_id:'one',card_faces:[{name:'Shared Front'},{name:'Back A'}]}),
        card('Shared Front // Back B',{oracle_id:'two',card_faces:[{name:'Shared Front'},{name:'Back B'}]})
      ]})
    });
    assert.equal(ambiguous.entries.length,0);
    assert.equal(diagnosticFor(ambiguous,1).code,'ambiguous_match');
  });
});

test('retries transient failures but reports exhausted rate limiting as HTTP 429',async()=>{
  await withStore(async({resolveDeck})=>{
    let calls=0; const waits=[];
    const result=await resolveDeck('1 Retry Bear',{sleepImpl:async ms=>waits.push(ms),fetchImpl:async()=>++calls<3 ? json({object:'error',code:'server_error',details:'Temporary issue'},503) : json(card('Retry Bear'))});
    assert.equal(calls,3);assert.equal(result.entries.length,1);assert.equal(result.errors.length,0);
    calls=0;
    const limited=await resolveDeck('1 Limited Bear',{sleepImpl:async ms=>waits.push(ms),fetchImpl:async()=>{calls++;return json({object:'error',code:'rate_limited',details:'Slow down.'},429,{'Retry-After':'0'});}});
    assert.equal(calls,3);assert.equal(limited.entries.length,0);
    assert.equal(diagnosticFor(limited,1).code,'http_rate_limit');
    assert.equal(diagnosticFor(limited,1).httpStatus,429);
    assert.ok(waits.every(ms=>ms>=0 && ms<=10000));
  });
});

test('distinguishes unknown network failures from real HTTP statuses',async()=>{
  await withStore(async({resolveDeck})=>{
    let calls=0;
    const result=await resolveDeck('1 Network Bear',{sleepImpl:noWait,fetchImpl:async()=>{calls++;throw new TypeError('Failed to fetch');}});
    assert.equal(calls,3);assert.equal(result.entries.length,0);
    const diagnostic=diagnosticFor(result,1);
    assert.equal(diagnostic.code,'network_error');
    assert.ok(diagnostic.httpStatus == null);
    assert.match(diagnostic.message,/network|connect|reach|fetch/i);
    assert.ok(!/HTTP 0/.test(diagnostic.message));
  });
});

test('times out a stalled response body and cancellation never returns a silent partial deck',async()=>{
  await withStore(async({resolveDeck})=>{
    const stalled=await resolveDeck('1 Stalled Bear',{sleepImpl:noWait,timeoutMs:10,fetchImpl:async(_url,{signal})=>({ok:true,status:200,json:()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))})});
    assert.equal(stalled.entries.length,0);assert.equal(diagnosticFor(stalled,1).code,'timeout');
    const controller=new AbortController();let calls=0;
    await assert.rejects(resolveDeck('1 First Bear\n1 Second Bear',{
      signal:controller.signal,sleepImpl:noWait,fetchImpl:async url=>{calls++;return json(card(new URL(url).searchParams.get('exact')));},
      onProgress:event=>{if(event.completed===1 && ['resolved','cached'].includes(event.status)) controller.abort();}
    }),{name:'AbortError'});
    assert.equal(calls,1);
  });
});

test('honors a full 60 second Retry-After header before retrying and exposes a countdown',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const requestTimes=[],progress=[];
    const result=await resolveDeck('1 Cooldown Bear',{
      sleepImpl:clock.sleepImpl,
      onProgress:event=>progress.push(event),
      fetchImpl:async()=>{
        requestTimes.push(clock.now());
        return requestTimes.length===1 ? json({object:'error',code:'rate_limited',details:'Slow down.'},429,{'Retry-After':'60'}) : json(card('Cooldown Bear'));
      }
    });
    assert.equal(result.errors.length,0);
    assert.equal(requestTimes.length,2);
    assert.ok(requestTimes[1]-requestTimes[0]>=60000,'A server 60 second cooldown must not be capped to 10 seconds.');
    const cooldown=progress.filter(event=>event.status==='cooldown');
    assert.ok(cooldown.length>0,'The interface needs cooldown progress while waiting.');
    assert.ok(cooldown.some(event=>Number.isFinite(event.retryAt) && event.remainingSeconds>=59));
    assert.ok(clock.waits.every(ms=>ms>=0 && ms<=1000),'Long waits must be split into cancelable countdown chunks.');
  }));
});

test('honors a 60 second response-body advisory when Retry-After is not exposed',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const requestTimes=[];
    const result=await resolveDeck('1 Advisory Bear',{
      sleepImpl:clock.sleepImpl,
      fetchImpl:async()=>{
        requestTimes.push(clock.now());
        return requestTimes.length===1 ? json({object:'error',code:'rate_limited',details:'You are being rate-limited, try again after 60 seconds. DO NOT IGNORE THIS WARNING.'},429) : json(card('Advisory Bear'));
      }
    });
    assert.equal(result.entries.length,1);
    assert.equal(requestTimes.length,2);
    assert.ok(requestTimes[1]-requestTimes[0]>=60000);
  }));
});

test('defaults to 60 seconds for 429 without an advisory instead of immediately retrying',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const requestTimes=[];
    const result=await resolveDeck('1 Default Cooldown Bear',{
      sleepImpl:clock.sleepImpl,
      fetchImpl:async()=>{
        requestTimes.push(clock.now());
        return requestTimes.length===1 ? json({object:'error',code:'rate_limited',details:'Slow down.'},429) : json(card('Default Cooldown Bear'));
      }
    });
    assert.equal(result.entries.length,1);
    assert.ok(requestTimes[1]-requestTimes[0]>=60000);
  }));
});

test('pauses after repeated 429 responses, marks untouched cards pending and resumes cached successes after persisted cooldown',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const firstRequests=[];
    const text='1 Cached Bear\n1 Limited Bear\n1 Deferred Bear';
    const result=await resolveDeck(text,{
      sleepImpl:clock.sleepImpl,
      fetchImpl:async url=>{
        const name=new URL(url).searchParams.get('exact');firstRequests.push({name,at:clock.now()});
        return name==='Cached Bear' ? json(card(name)) : json({object:'error',code:'rate_limited',details:'Try again after 60 seconds.'},429,{'Retry-After':'60'});
      }
    });
    assert.equal(result.paused,true);
    assert.deepEqual(firstRequests.map(item=>item.name),['Cached Bear','Limited Bear','Limited Bear','Limited Bear']);
    assert.equal(result.stats.requestCount,4);
    assert.equal(diagnosticFor(result,2).code,'http_rate_limit');
    assert.equal(diagnosticFor(result,3).status,'pending');
    assert.equal(diagnosticFor(result,3).code,'lookup_pending');
    assert.ok(!result.errors.some(error=>/Deferred Bear/.test(error)),'An unrequested card is pending, not a card-name failure.');
    const resumed=await fresh();
    const resumedAt=clock.now(),nextRequests=[];
    const next=await resumed.resolveDeck(text,{
      sleepImpl:clock.sleepImpl,
      fetchImpl:async url=>{const name=new URL(url).searchParams.get('exact');nextRequests.push({name,at:clock.now()});return json(card(name));}
    });
    assert.deepEqual(nextRequests.map(item=>item.name),['Limited Bear','Deferred Bear']);
    assert.ok(nextRequests[0].at-resumedAt>=60000,'Reloading the module must retain the active cooldown.');
    assert.equal(diagnosticFor(next,1).status,'cached');
    assert.equal(next.entries.length,3);
    assert.equal(next.errors.length,0);
  }));
});

test('canceling during a cooldown prevents every subsequent request',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const controller=new AbortController();let calls=0,cooling=false;
    await assert.rejects(resolveDeck('1 Cooling Bear\n1 Unrequested Bear',{
      signal:controller.signal,
      onProgress:event=>{if(event.status==='cooldown')cooling=true;},
      sleepImpl:async(ms,signal)=>{
        if(cooling && ms>0){controller.abort();throw new DOMException('Canceled','AbortError');}
        await clock.sleepImpl(ms,signal);
      },
      fetchImpl:async()=>{calls++;return json({object:'error',code:'rate_limited',details:'Try again after 60 seconds.'},429,{'Retry-After':'60'});}
    }),{name:'AbortError'});
    assert.equal(calls,1);
  }));
});

function batchPayload(names) {
  const cards=names.map(name=>card(name));
  return {cards,resolved:names.map((requestedName,index)=>({requestedName,cardId:cards[index].id})),notFound:[],pending:[],rateLimited:false};
}

test('same-origin resolver batches 100 unique names into 75 and 25 POST requests',async()=>{
  await withStore(async({resolveDeck})=>{
    const names=Array.from({length:100},(_,index)=>`Batch Bear ${index+1}`),requests=[];
    const result=await resolveDeck(names.map(name=>`1 ${name}`).join('\n'),{
      resolverEndpoint:'/api/simulator-cards',sleepImpl:noWait,
      fetchImpl:async(url,options)=>{
        const body=JSON.parse(options.body);requests.push({url,options,body});
        return json(batchPayload(body.names));
      }
    });
    assert.equal(result.entries.length,100);
    assert.equal(result.errors.length,0);
    assert.equal(requests.length,2);
    assert.deepEqual(requests.map(request=>request.body.names.length),[75,25]);
    assert.ok(requests.every(request=>request.url==='/api/simulator-cards' && request.options.method==='POST'));
    assert.deepEqual(requests.flatMap(request=>request.body.names),names);
    assert.equal(result.stats.requestCount,2);
  });
});

test('same-origin resolver keeps DFC metadata and per-line not-found diagnostics without dropping other cards',async()=>{
  await withStore(async({resolveDeck})=>{
    const full='Example Door // Example Core';
    const doubleFaced=card(full,{layout:'transform',card_faces:[{name:'Example Door',type_line:'Artifact',oracle_text:'',image_uris:{normal:'https://cards.scryfall.io/normal/front/d/f/door.jpg'}},{name:'Example Core',type_line:'Land',oracle_text:'',image_uris:{normal:'https://cards.scryfall.io/normal/back/d/f/door.jpg'}}]});
    const normal=card('Found Bear');
    const result=await resolveDeck('1 Example Door\n1 Missing Bear\n2 Found Bear',{
      resolverEndpoint:'/api/simulator-cards',sleepImpl:noWait,
      fetchImpl:async()=>json({cards:[doubleFaced,normal],resolved:[{requestedName:'Example Door',cardId:doubleFaced.id},{requestedName:'Found Bear',cardId:normal.id}],notFound:[{name:'Missing Bear',code:'lookup_not_found',details:'No exact card or face-name match.'}],pending:[],rateLimited:false})
    });
    assert.equal(result.entries.length,2);
    assert.equal(result.entries[0].card.name,full);
    assert.equal(result.entries[0].card.card_faces[1].image_uris.normal,'https://cards.scryfall.io/normal/back/d/f/door.jpg');
    assert.equal(result.errors.length,1);
    assert.match(result.errors[0],/Missing Bear/);
    assert.equal(diagnosticFor(result,2).code,'lookup_not_found');
    assert.equal(diagnosticFor(result,2).status,'failed');
    assert.equal(diagnosticFor(result,3).status,'resolved');
    assert.equal(result.stats.resolvedCards,3);
    assert.equal(result.paused,false);
  });
});

test('same-origin resolver reuses earlier direct GET cache and requests only missing names',async()=>{
  await withStore(async({resolveDeck})=>{
    await resolveDeck('1 Cached Bear',{sleepImpl:noWait,fetchImpl:async()=>json(card('Cached Bear'))});
    const bodies=[];
    const result=await resolveDeck('1 Cached Bear\n1 Uncached Bear',{
      resolverEndpoint:'/api/simulator-cards',sleepImpl:noWait,
      fetchImpl:async(url,options)=>{assert.equal(url,'/api/simulator-cards');bodies.push(JSON.parse(options.body));return json(batchPayload(['Uncached Bear']));}
    });
    assert.deepEqual(bodies,[{names:['Uncached Bear']}]);
    assert.equal(diagnosticFor(result,1).status,'cached');
    assert.equal(diagnosticFor(result,2).status,'resolved');
    assert.equal(result.entries.length,2);
  });
});

test('same-origin HTTP 429 retains partial cards and leaves all unrequested cards pending without direct GET fallback',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const requests=[],known=card('Known Bear');
    const result=await resolveDeck('1 Known Bear\n1 Pending Bear\n1 Another Pending Bear',{
      resolverEndpoint:'/api/simulator-cards',sleepImpl:clock.sleepImpl,
      fetchImpl:async(url,options)=>{
        requests.push({url,method:options.method});
        return json({cards:[known],resolved:[{requestedName:'Known Bear',cardId:known.id}],notFound:[],pending:['Pending Bear','Another Pending Bear'],rateLimited:true,retryAfterSeconds:60},429,{'Retry-After':'60'});
      }
    });
    assert.equal(requests.length,1);
    assert.deepEqual(requests,[{url:'/api/simulator-cards',method:'POST'}]);
    assert.equal(result.paused,true);
    assert.equal(result.entries.length,1);
    assert.equal(result.entries[0].name,'Known Bear');
    assert.equal(diagnosticFor(result,1).status,'resolved');
    for(const line of [2,3]){
      assert.equal(diagnosticFor(result,line).status,'pending');
      assert.equal(diagnosticFor(result,line).code,'lookup_pending');
    }
    assert.ok(result.pauseReason.retryAt>=clock.now()+60000);
    assert.ok(!result.errors.some(error=>/No exact.*Pending Bear|Pending Bear.*No exact/i.test(error)));
  }));
});

test('same-origin server failures remain visible and never silently fall back to direct Scryfall GET',async()=>{
  await withStore(async({resolveDeck})=>{
    const requests=[];
    const result=await resolveDeck('1 Unavailable Bear\n1 Waiting Bear',{
      resolverEndpoint:'/api/simulator-cards',sleepImpl:noWait,
      fetchImpl:async(url,options)=>{requests.push({url,method:options.method});return json({error:'Card resolver unavailable.',code:'upstream_error'},502);}
    });
    assert.ok(requests.length>=1 && requests.length<=3);
    assert.ok(requests.every(request=>request.url==='/api/simulator-cards' && request.method==='POST'));
    assert.equal(result.entries.length,0);
    assert.equal(result.paused,true);
    assert.ok(result.errors.some(error=>/502|unavailable/i.test(error)));
  });
});

test('same-origin resolver cannot map a request to a different card name',async()=>{
  await withStore(async({resolveDeck})=>{
    const wrong=card('Similar Bear');
    const result=await resolveDeck('1 Exact Bear',{
      resolverEndpoint:'/api/simulator-cards',sleepImpl:noWait,
      fetchImpl:async()=>json({cards:[wrong],resolved:[{requestedName:'Exact Bear',cardId:wrong.id}],notFound:[],pending:[],rateLimited:false})
    });
    assert.equal(result.entries.length,0);
    assert.equal(result.errors.length,1);
    assert.equal(diagnosticFor(result,1).status,'failed');
  });
});

test('canceling at batch request progress prevents the POST from being sent',async()=>{
  await withStore(async({resolveDeck})=>{
    const controller=new AbortController();let requests=0;
    await assert.rejects(resolveDeck('1 Canceled Bear',{
      resolverEndpoint:'/api/simulator-cards',signal:controller.signal,sleepImpl:noWait,
      onProgress:event=>{if(event.status==='requesting')controller.abort();},
      fetchImpl:async()=>{requests++;return json(batchPayload(['Canceled Bear']));}
    }),{name:'AbortError'});
    assert.equal(requests,0);
  });
});

test('native app can use the official full-metadata resolver endpoint',async()=>{
  await withStore(async({resolveDeck})=>{
    const requests=[];
    const result=await resolveDeck('2 Native Bear',{
      resolverEndpoint:'https://david-walsh.pages.dev/api/simulator-cards',sleepImpl:noWait,
      fetchImpl:async(url,options)=>{requests.push({url,method:options.method,body:JSON.parse(options.body)});return json(batchPayload(['Native Bear']));}
    });
    assert.deepEqual(requests,[{url:'https://david-walsh.pages.dev/api/simulator-cards',method:'POST',body:{names:['Native Bear']}}]);
    assert.equal(result.entries[0].quantity,2);
    assert.equal(result.entries[0].card.oracle_text,'');
    assert.equal(result.entries[0].card.power,'2');
    assert.equal(result.stats.resolvedCards,2);
  });
});

test('native resolver rejects arbitrary external endpoints before sending deck names',async()=>{
  await withStore(async({resolveDeck})=>{
    let requests=0;
    await assert.rejects(resolveDeck('1 Private Bear',{
      resolverEndpoint:'https://example.invalid/api/simulator-cards',sleepImpl:noWait,
      fetchImpl:async()=>{requests++;return json(batchPayload(['Private Bear']));}
    }),/same-origin path or the official Deck Lab endpoint/);
    assert.equal(requests,0);
  });
});

test('a real 404 from the exact face search remains not-found rather than ambiguous',async()=>{
  await withStore(async({resolveDeck})=>{
    const requests=[];
    const result=await resolveDeck('1 Absent Card',{
      sleepImpl:noWait,
      fetchImpl:async url=>{requests.push(url);return failed(404,'No cards found.');}
    });
    assert.equal(requests.length,2);
    assert.equal(new URL(requests[0]).pathname,'/cards/named');
    assert.equal(new URL(requests[1]).pathname,'/cards/search');
    assert.equal(result.entries.length,0);
    assert.equal(diagnosticFor(result,1).code,'lookup_not_found');
    assert.equal(diagnosticFor(result,1).httpStatus,404);
    assert.ok(!result.errors.some(error=>/ambiguous|exceeded.*limit/i.test(error)));
  });
});

test('a background-tab timer jump does not add another stale cooldown wait',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const requests=[],progress=[];let cooling=false,jumped=false;
    const result=await resolveDeck('1 Background Bear',{
      onProgress:event=>{progress.push(event);if(event.status==='cooldown')cooling=true;},
      sleepImpl:async(ms,signal)=>{
        if(cooling&&!jumped&&ms>0){jumped=true;await clock.sleepImpl(120000,signal);}
        else await clock.sleepImpl(ms,signal);
      },
      fetchImpl:async()=>{
        requests.push(clock.now());
        return requests.length===1?json({object:'error',code:'rate_limited',details:'Try again after60seconds.'},429,{'Retry-After':'60'}):json(card('Background Bear'));
      }
    });
    assert.equal(result.entries.length,1);
    assert.equal(requests.length,2);
    assert.ok(requests[1]-requests[0]>=120000);
    assert.ok(requests[1]-requests[0]<121000,'The elapsed real deadline must end the wait immediately after the tab resumes.');
    assert.equal(progress.filter(event=>event.status==='cooldown').length,1);
  }));
});

test('a cooldown extended by another tab is honored before the next request',async()=>{
  await withClock(async clock=>withStore(async({resolveDeck})=>{
    const requests=[],progress=[];let cooling=false,extendedUntil=null;
    const result=await resolveDeck('1 Shared Cooldown Bear',{
      onProgress:event=>{progress.push(event);if(event.status==='cooldown')cooling=true;},
      sleepImpl:async(ms,signal)=>{
        await clock.sleepImpl(ms,signal);
        if(cooling&&extendedUntil===null&&ms>0){
          extendedUntil=clock.now()+10000;
          globalThis.localStorage.setItem('morrow.deck-simulator.cards.v1.cooldown',String(extendedUntil));
        }
      },
      fetchImpl:async()=>{
        requests.push(clock.now());
        return requests.length===1?json({object:'error',code:'rate_limited',details:'Wait2seconds.'},429,{'Retry-After':'2'}):json(card('Shared Cooldown Bear'));
      }
    });
    assert.equal(result.entries.length,1);
    assert.equal(requests.length,2);
    assert.ok(Number.isFinite(extendedUntil));
    assert.ok(requests[1]>=extendedUntil,'The newer shared deadline must replace the original shorter wait.');
    assert.ok(progress.some(event=>event.status==='cooldown'&&event.retryAt===extendedUntil));
  }));
});
