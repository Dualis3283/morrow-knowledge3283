import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDeck,expandDeck,demoDecks} from '../web/cards.mjs';

test('parses quantity syntaxes, sections, comments and Arena printing suffixes', () => {
  const parsed = parseDeck('\uFEFFCommander\r\n1 Ovika, Enigma Goliath\r\n\nDeck\n4x Grizzly Bears (M10) 178\n2xGrizzly Bears\nIsland x8\n# comment\n// comment\nSideboard:\n2 Negate\nMainboard\n1 Air Elemental *F*\nSB: 1 Divination');
  assert.deepEqual(parsed.errors,[]);
  assert.deepEqual(parsed.entries,[
    {name:'Ovika, Enigma Goliath',quantity:1,section:'commander'},
    {name:'Grizzly Bears',quantity:6,section:'main'},
    {name:'Island',quantity:8,section:'main'},
    {name:'Negate',quantity:2,section:'sideboard'},
    {name:'Air Elemental',quantity:1,section:'main'},
    {name:'Divination',quantity:1,section:'sideboard'}
  ]);
});

test('preserves both names of double-faced and split cards', () => {
  const parsed = parseDeck('1 Archangel Avacyn // Avacyn, the Purifier\nFire // Ice\n2 Wear // Tear (DGM) 135 # foil');
  assert.equal(parsed.entries[0].name,'Archangel Avacyn // Avacyn, the Purifier');
  assert.equal(parsed.entries[1].name,'Fire // Ice');
  assert.equal(parsed.entries[2].name,'Wear // Tear');
});

test('rejects invalid quantities and limits expansion without including other zones', () => {
  assert.equal(parseDeck('0 Island\n251 Forest').errors.length,2);
  const a = {name:'Forest'}, b = {name:'Commander'};
  assert.deepEqual(expandDeck([{card:a,quantity:3,section:'main'},{card:b,quantity:1,section:'commander'},{card:b,quantity:3,section:'sideboard'},{card:a,quantity:0}]),[a,a,a]);
});

test('offline teaching decks contain 60 cards and respect four-copy limits except basics', () => {
  assert.equal(demoDecks.length,2);
  for (const deck of demoDecks) {
    assert.equal(expandDeck(deck.entries).length,60);
    assert.match(deck.name,/sample/);
    for (const entry of deck.entries) {
      assert.ok(entry.card && entry.card.name === entry.name);
      if (!entry.card.type_line.includes('Basic Land')) assert.ok(entry.quantity <= 4);
    }
  }
});

function storage() {
  const values = new Map();
  return {getItem:key => values.get(key)||null,setItem:(key,value) => values.set(key,value),removeItem:key => values.delete(key)};
}
function card(name,extra={}) {
  return {object:'card',id:name.toLowerCase().replaceAll(' ','-'),name,cmc:2,type_line:'Creature — Bear',mana_cost:'{1}{G}',oracle_text:'',power:'2',toughness:'2',keywords:[],image_uris:{normal:'https://cards.scryfall.io/normal/front/a/b/test.jpg'},...extra};
}
async function fresh() { return import(`../web/cards.mjs?test=${Date.now()}-${Math.random()}`); }

test('uses exact GET, reports individual errors and caches all sections by name', async () => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = storage();
  let calls = [];
  globalThis.fetch = async (url,options) => {
    calls.push({url,options});
    const name = new URL(url).searchParams.get('exact');
    return {ok:name !== 'Missing Card',status:name === 'Missing Card'?404:200,json:async()=>card(name)};
  };
  try {
    const {resolveDeck} = await fresh();
    const progress=[];
    const resolved = await resolveDeck('4 Test Bear\nSideboard\n1 Test Bear\n1 Missing Card',{onProgress:p=>progress.push(p)});
    assert.equal(calls.length,2);
    assert.equal(calls[0].options.method,'GET');
    assert.equal(new URL(calls[0].url).searchParams.get('exact'),'Test Bear');
    assert.equal(resolved.entries.length,2);
    assert.equal(resolved.errors.length,1);
    assert.match(resolved.errors[0],/Missing Card: No exact card match/);
    assert.deepEqual(progress.map(p=>p.completed),[1,2]);
    await resolveDeck('2 Test Bear');
    assert.equal(calls.length,2);
    assert.match(globalThis.localStorage.getItem('morrow.cards.v1'),/Test Bear/);
  } finally { globalThis.fetch = oldFetch; globalThis.localStorage = oldStorage; }
});

test('keeps face-specific images and artist credits while discarding unsafe images', async () => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = storage();
  globalThis.fetch = async () => ({ok:true,status:200,json:async()=>card('Two Faces',{
    image_uris:{normal:'javascript:bad'},artist:'A. Artist',card_faces:[{name:'Front',type_line:'Creature — Bear',mana_cost:'{G}',power:'2',toughness:'2',artist:'B. Artist',oracle_text:'Vigilance',image_uris:{normal:'https://cards.scryfall.io/normal/front/f/a/face.jpg'}}]
  })});
  try {
    const {resolveDeck} = await fresh();
    const result = await resolveDeck('Two Faces');
    const c = result.entries[0].card;
    assert.equal(c.artist,'A. Artist'); assert.deepEqual(c.image_uris,{});
    assert.equal(c.card_faces[0].artist,'B. Artist');
    assert.equal(c.card_faces[0].image_uris.normal,'https://cards.scryfall.io/normal/front/f/a/face.jpg');
  } finally {globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;}
});

test('honors cancellation and retries bounded 429 responses',async()=>{
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = storage(); let count=0;
  globalThis.fetch = async()=>++count === 1 ? {ok:false,status:429,headers:{get:()=> '0'}} : {ok:true,status:200,json:async()=>card('Retry Bear')};
  try {
    const {resolveDeck} = await fresh();
    const result=await resolveDeck('Retry Bear');
    assert.equal(count,2);assert.equal(result.entries.length,1);
    const controller=new AbortController();controller.abort();
    await assert.rejects(resolveDeck('Unrequested Bear',{signal:controller.signal}),{name:'AbortError'});
    assert.equal(count,2);
  } finally {globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;}
});
