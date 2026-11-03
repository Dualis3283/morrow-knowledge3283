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

function manaSource(card, state = null, player = 0, depth = 0) {
  if (!card) return null;
  const name=named(card), oracle=text(card);
  const commanderColors=()=>{
    const leader=[...ZONES.flatMap(zone=>state?.players?.[player]?.[zone]||[]),...(state?.stack||[])].find(x=>x.isCommander&&x.owner===player);
    const colors=leader?.card?.color_identity||[];
    if(colors.length)return colors.filter(c=>COLORS.includes(c)&&c!=='C');
    // Safe fallback only to printed colored mana symbols on the commander, not its desired spell.
    const printing=leader?.card?.card_faces?.map(x=>x.mana_cost).join('')||leader?.card?.mana_cost||'';
    return [...new Set([...printing.matchAll(/\{([WUBRG])\}/g)].map(x=>x[1]))];
  };
  const allColors=()=>['W','U','B','R','G'].map(c=>mono(c));
  if(type(card,'Land')&&depth===0&&state?.players?.[player]?.battlefield?.some(x=>named(x.card)==='Chromatic Lantern')) {
    const original=manaSource(card,null,player,1);
    const baseOptions=original?.options||[];
    return {options:[...baseOptions,...allColors()],optionDamage:[...(original?.optionDamage||baseOptions.map(()=>0)),0,0,0,0,0],partial:true};
  }
  const explicit={
    'Sol Ring':{options:[mono('C',2)]},'Thran Dynamo':{options:[mono('C',3)]},
    'Mind Stone':{options:[mono('C')],partial:true},'Thought Vessel':{options:[mono('C')],partial:true},
    'Hedron Archive':{options:[mono('C',2)],partial:true},'Worn Powerstone':{options:[mono('C',2)],entersTapped:true},
    'Meticulous Commons':{options:[mono('W'),mono('B')],entryCondition:'controlPlaneswalker'},
    'Underground River':{options:[mono('C'),mono('U'),mono('B')],optionDamage:[0,1,1]},
    'Temple of the False God':{options:[mono('C',2)],requiresLands:5},
    'Ancient Tomb':{options:[mono('C',2)],optionDamage:[2]},
    'Pristine Talisman':{options:[mono('C')],optionLifeGain:[1]},
    'Prismatic Lens':{options:[mono('C'),...allColors()],optionActivationGeneric:[0,1,1,1,1,1],partial:true},
    'Birds of Paradise':{options:allColors()},
    'Llanowar Elves':{options:[mono('G')]},'Elvish Mystic':{options:[mono('G')]},
    'Fyndhorn Elves':{options:[mono('G')]},'Palladium Myr':{options:[mono('C',2)]},
    'Myr Convert':{options:allColors(),optionDamage:[2,2,2,2,2]},
    'Gilded Lotus':{options:['W','U','B','R','G'].map(c=>mono(c,3))},
    'Chromatic Lantern':{options:allColors(),partial:true},
    'Cultivator\'s Caravan':{options:allColors(),partial:true},
    'Phial of Galadriel':{options:allColors(),partial:true},
    'Decanter of Endless Water':{options:allColors(),partial:true},
    'Command Tower':{options:commanderColors().map(c=>mono(c))},
    'Path of Ancestry':{options:commanderColors().map(c=>mono(c)),entersTapped:true,partial:true},
  };
  const signets={Azorius:'WU',Boros:'WR',Dimir:'UB',Golgari:'BG',Gruul:'RG',Izzet:'UR',Orzhov:'WB',Rakdos:'BR',Selesnya:'WG',Simic:'UG'};
  const matchSignet=name.match(/^([A-Za-z]+) Signet$/);
  if(matchSignet&&signets[matchSignet[1]])return {options:[Object.fromEntries([...signets[matchSignet[1]]].map(c=>[c,1]))],activationGeneric:1};
  if(name==='Arcane Signet'||name==="Commander's Sphere"){
    const options=commanderColors().map(c=>mono(c));
    return options.length?{options,partial:name!== 'Arcane Signet'}:null;
  }
  if(name==='Temple of the False God'&&state&&state.players[player].battlefield.filter(x=>type(x.card,'Land')).length<5)return null;
  if(explicit[name])return explicit[name];
  // Colorless or coloured pain sources: printed options are distinct and the coloured choice costs 1 life.
  const talisman=name.match(/^Talisman of (Creativity|Dominance|Indulgence|Progress|Resilience|Conviction)$/);
  const talismanColors={Creativity:'UR',Dominance:'UB',Indulgence:'BR',Progress:'WU',Resilience:'BG',Conviction:'WR'};
  if(talisman){const colors=[...talismanColors[talisman[1]]];return {options:[mono('C'),...colors.map(c=>mono(c))],optionDamage:[0,1,1]};}
  const pain=oracle.match(/^\{T\}: Add \{C\}\.\s*\n\{T\}: Add \{([WUBRG])\} or \{([WUBRG])\}\. (?:This land|This artifact) deals 1 damage to you\./);
  if(pain)return {options:[mono('C'),mono(pain[1]),mono(pain[2])],optionDamage:[0,1,1]};
  // The named "could produce" cycle is bounded to immediate, printed or intrinsic land options.
  if(depth<1&&state?.players?.length){
    if(['Fellwar Stone','Exotic Orchard','Reflecting Pool'].includes(name)){
      const other=name!=='Reflecting Pool',index=other?1-player:player;
      const colors=new Set();
      for(const permanent of state.players[index]?.battlefield||[]){
        if(!type(permanent.card,'Land')||(!other&&permanent.card===card))continue;
        const src=manaSource(permanent.card,null,index,depth+1);
        for(const option of src?.options||[])for(const color of Object.keys(option))if(color!=='C')colors.add(color);
      }
      // Reflecting Pool also produces colorless when a printed land could.
      if(!other)for(const permanent of state.players[index]?.battlefield||[]){
        if(!type(permanent.card,'Land'))continue;
        if(manaSource(permanent.card,null,index,depth+1)?.options?.some(x=>x.C))colors.add('C');
      }
      const options=[...colors].map(c=>mono(c));return options.length?{options,partial:true}:null;
    }
  }
  // Native basic land types always grant intrinsic mana regardless of other Oracle abilities.
  if(BASE_MANA[name])return {options:[mono(BASE_MANA[name])]};
  if(type(card,'Land')&&card.type_line?.includes('—')){
    const subtype=card.type_line.split('—').slice(1).join(' ');
    const options=Object.entries(BASE_MANA).filter(([land])=>subtype.split(/\s+/).includes(land)).map(([,c])=>mono(c));
    if(options.length)return {options};
  }
  // Chromatic Lantern grants this additional mana ability to EVERY land you control.
  // Parse each standalone, unconditional tap ability, not the whole multi-line Oracle field.
  const modes=[];const damage=[];const lifeGain=[];let entersTapped=/\b(?:this land|this artifact|this permanent) enters tapped\./i.test(oracle);
  for(const line of oracle.split('\n')){
    const activation=line.trim().match(/^\{T\}: Add (.+?)\.(.*)$/i);
    if(!activation)continue;
    const addition=activation[1].trim(),following=activation[2]||'';
    let options=[];
    if(addition==='one mana of any color')options=allColors();
    else if(addition==='two mana of any one color')options=['W','U','B','R','G'].map(c=>mono(c,2));
    else if(addition==='three mana of any one color')options=['W','U','B','R','G'].map(c=>mono(c,3));
    else {
      const variants=addition.split(/\s+or\s+|,\s*(?:or\s+)?/);
      if(variants.every(v=>/^(?:\{[WUBRGC]\})+$/.test(v)))options=variants.map(v=>{
        const out={};for(const m of v.matchAll(/\{([WUBRGC])\}/g))out[m[1]]=(out[m[1]]||0)+1;return out;
      });
    }
    if(!options.length)continue;
    if(/\b(?:spend this mana only|activate only if)\b/i.test(following))continue;
    const d=/(?:deals? (\d+) damage to you|Pay (\d+) life)/i.exec(following);
    const g=/You gain (\d+) life/i.exec(following);
    for(const option of options){modes.push(option);damage.push(d?Number(d[1]||d[2]):0);lifeGain.push(g?Number(g[1]):0);}
  }
  return modes.length?{options:modes,optionDamage:damage,optionLifeGain:lifeGain,entersTapped,partial:oracle.trim().split('\n').some(line=>{const l=line.trim();return !(/^\{T\}: Add .+\./.test(l)||/^(?:This land|This artifact|[A-Za-z '’,-]+) enters tapped\.$/.test(l));})}:null;
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
// Audited static spell-cost reducers; this is not freeform Oracle text execution.
// Each entry reduces GENERIC cost only, after commander tax / cost increases.
const STATIC_COST_REDUCERS={
  'The Darkness Crystal':{kind:'black',generic:1},
  'Jet Medallion':{kind:'black',generic:1},
  'Pearl Medallion':{kind:'white',generic:1},
  'Sapphire Medallion':{kind:'blue',generic:1},
  'Ruby Medallion':{kind:'red',generic:1},
  'Emerald Medallion':{kind:'green',generic:1},
  'Foundry Inspector':{kind:'artifact',generic:1},
  'Etherium Sculptor':{kind:'artifact',generic:1},
  "Jhoira's Familiar":{kind:'historic',generic:1},
  'Ugin, the Ineffable':{kind:'colorless',generic:2}
};
const SPELL_COLORS={white:'W',blue:'U',black:'B',red:'R',green:'G'};
function spellColors(card){
  // Scryfall colors, when provided, are authoritative (Devoid is colorless).
  if(Array.isArray(card.colors))return new Set(card.colors);
  if(card.color_indicator?.length)return new Set(card.color_indicator);
  return new Set([...String(card.mana_cost||'').matchAll(/\{([^}]+)\}/g)]
    .flatMap(([,symbol])=>symbol.split('/')).filter(c=>['W','U','B','R','G'].includes(c)));
}
function applicableReduction(card,kind){
  const colors=spellColors(card);
  if(SPELL_COLORS[kind])return colors.has(SPELL_COLORS[kind]);
  if(kind==='colorless')return colors.size===0;
  if(kind==='artifact')return type(card,'Artifact');
  return kind==='historic'&&(type(card,'Legendary')||type(card,'Artifact')||type(card,'Saga'));
}
const CHOSEN_CARD_TYPES=['Artifact','Creature','Enchantment','Instant','Sorcery'];
const STANDARD_CARD_TYPES=['Artifact','Battle','Creature','Enchantment','Instant','Kindred','Planeswalker','Sorcery'];
function cardTypes(card){
  const line=String(card.type_line||'').split('—')[0];
  return new Set(STANDARD_CARD_TYPES.filter(t=>line.split(/[^A-Za-z]+/).some(word=>word.toLowerCase()===t.toLowerCase())));
}
function dynamicReduction(source,spell){
  if(named(source.card)==='Cloud Key'&&CHOSEN_CARD_TYPES.includes(source.costChosenType))
    return cardTypes(spell).has(source.costChosenType)?1:0;
  if(named(source.card)==='Semblance Anvil'&&source.imprintCardTypes?.length)
    return source.imprintCardTypes.some(t=>cardTypes(spell).has(t))?2:0;
  return 0;
}
export function spellCostQuote(state,player,card,extraGeneric=0,{isSpell=true}={}){
  const printed=cost(card);
  if(!printed)return null;
  const increase=Math.max(0,Number(extraGeneric)||0),raw=printed.generic+increase;
  const modifiers=[];
  if(isSpell)for(const source of state.players[player].battlefield){
    const rule=STATIC_COST_REDUCERS[named(source.card)];
    if(rule&&applicableReduction(card,rule.kind))modifiers.push({sourceId:source.id,sourceName:named(source.card),generic:rule.generic});
    const dynamic=dynamicReduction(source,card);
    if(dynamic)modifiers.push({sourceId:source.id,sourceName:named(source.card),generic:dynamic});
  }
  const reduced=Math.min(raw,modifiers.reduce((sum,m)=>sum+m.generic,0));
  return {printed:{...printed},increase,reduced,modifiers,wanted:{...printed,generic:raw-reduced}};
}
const EFFECTS = {
  'Raise the Alarm': {effect:'tokens',count:2,token:{name:'Soldier',type_line:'Token Creature — Soldier',power:'1',toughness:'1',colors:['W']}},
  'Dragon Fodder': {effect:'tokens',count:2,token:{name:'Goblin',type_line:'Token Creature — Goblin',power:'1',toughness:'1',colors:['R']}},
  "Krenko's Command": {effect:'tokens',count:2,token:{name:'Goblin',type_line:'Token Creature — Goblin',power:'1',toughness:'1',colors:['R']}},
  'Hordeling Outburst': {effect:'tokens',count:3,token:{name:'Goblin',type_line:'Token Creature — Goblin',power:'1',toughness:'1',colors:['R']}},
  'Midnight Haunting': {effect:'tokens',count:2,token:{name:'Spirit',type_line:'Token Creature — Spirit',power:'1',toughness:'1',colors:['W'],keywords:['flying']}},
  'Giant Growth': { effect: 'pump', amount: 3, target: 'creature' },
  'Divination': { effect: 'draw', amount: 2 },
  'Ponder': {effect:'ponder',status:'supported'},
  'Preordain': {effect:'preordain',status:'supported'},
  'Mass Polymorph': {effect:'mass-polymorph',status:'partial'},
  'Counterspell': {effect:'counter-stack',target:'spell'},
  'Negate': {effect:'counter-stack',target:'noncreatureSpell'},
  'Stifle': {effect:'counter-stack',target:'stackAbility'},
  'Disallow': {effect:'counter-stack',target:'spellOrAbility'},
  'Synthetic Destiny': {effect:'synthetic-destiny',status:'partial',auto:false},
  'Harmonize': { effect: 'draw', amount: 3 },
  "Night's Whisper": {effect:'drawLoseLife',amount:2,lifeLoss:2},
  'Think Twice': {effect:'draw',amount:1,status:'partial',reason:'Normal cast draws one card; Flashback casting and exile remain manual.'},
  'Unsummon': { effect: 'bounce', target: 'creature' },
  'Murder': { effect: 'destroy', target: 'creature' },
  'Doom Blade': { effect: 'destroy', target: 'nonblackCreature' },
  'Go for the Throat': { effect: 'destroy', target: 'nonartifactCreature' },
  'Swords to Plowshares': { effect: 'exile', target: 'creature', gainLife: true },
  'Path to Exile': { effect: 'exile', target: 'creature', basicLand: true },
  'Disenchant': { effect: 'destroy', target: 'artifactEnchantment' },
  'Naturalize': { effect: 'destroy', target: 'artifactEnchantment' },
  'Lightning Bolt': { effect: 'burn', amount: 3, target: 'creatureOrPlayer', status: 'partial', reason: 'Creature, planeswalker and opposing-player damage supported; self and battle targets require manual resolution.' },
  'Shock': { effect: 'burn', amount: 2, target: 'creatureOrPlayer', status: 'partial', reason: 'Creature, planeswalker and opposing-player damage supported; self and battle targets require manual resolution.' },
  'Lightning Strike': { effect: 'burn', amount: 3, target: 'creatureOrPlayer', status: 'partial', reason: 'Creature, planeswalker and opposing-player damage supported; self and battle targets require manual resolution.' },
  'Rampant Growth': { effect: 'ramp', amount: 1 },
  'Cultivate': { effect: 'cultivate', amount: 2 },
  "Kodama's Reach": { effect: 'cultivate', amount: 2 },
};
function profile(card) {
  if (!card || !card.name) return { status: 'manual', reason: 'Missing card definition.', auto: false };
  if (['Swiftfoot Boots','Lightning Greaves','Shadowspear','Whispersilk Cloak'].includes(named(card))) return {status:'partial',reason:'Equipment may be cast and creates an artifact permanent; attaching, equipping, granted keywords and combat effects are manual.',auto:true};
  if (card.card_faces?.length || /\b(Battle|Saga|Aura|Equipment)\b/.test(card.type_line || '')) return { status: 'manual', reason: 'Faces, defense, chapters and attachments require manual resolution.', auto: false };
  if (type(card,'Planeswalker')) return {status:'partial',reason:'Printed loyalty and one ability activation per turn tracked; loyalty ability effects and planeswalker combat require manual adjudication.',auto:false,planeswalker:true};
  if (!cost(card)) return { status: 'manual', reason: 'Variable, hybrid, Phyrexian, alternative or missing mana cost requires manual payment.', auto: false };
  if(EFFECTS[card.name])return {...EFFECTS[card.name],status:EFFECTS[card.name].status||'supported',reason:EFFECTS[card.name].status==='partial'?'Named reveal; other ETB replacements remain manual.':'Explicit named effect adapter.',auto:EFFECTS[card.name].effect!=='mass-polymorph'};
  const source = manaSource(card);
  if (source) return { status: source.partial ? 'partial' : 'supported', reason: source.partial ? 'Mana ability supported; other optional abilities are omitted and logged.' : 'Unconditional mana source supported.', auto: true, source };
  if(['Parallel Lives','Anointed Procession','Adrix and Nev, Twincasters','Mondrak, Glory Dominus'].includes(named(card)))
    return {status:'partial',auto:true,reason:'Named token-creation replacement doubles tokens controlled by this player; other Oracle abilities and competing replacement ordering remain manual.'};
  if(named(card)==='Doubling Season')
    return {status:'partial',auto:true,reason:'Token doubling is supported; its counter-adding replacement is NOT automatically modeled.'};
  if(named(card)==='Reflections of Littjara')
    return {status:'partial',auto:true,reason:'Choose a creature subtype; casting matching creature spells queues a spell-copy trigger. Noncreature kindred spell copies remain manual.'};
  if(named(card)==='Dreadhorde Invasion')return {status:'partial',auto:true,reason:'Upkeep life loss and amass Zombies 1 supported. Multiple Army choices, counter replacements and attacking Zombie lifelink need manual review.'};
  if(named(card)==='Bitterblossom')return {status:'partial',auto:true,reason:'Your-upkeep life loss and flying Faerie Rogue token supported.'};
  if(named(card)==='Phyrexian Arena')return {status:'partial',auto:true,reason:'Your-upkeep draw one and lose one life supported.'};
  if(named(card)==='Ophiomancer')return {status:'partial',auto:true,reason:'Each-upkeep conditional Snake token creation supported; other effects are not inferred.'};
  if(named(card)==='Assemble the Legion')return {status:'partial',auto:true,reason:'Your-upkeep muster counters and Soldier tokens supported; counter replacement effects remain manual.'};
  if(named(card)==='Necroduality')return {status:'partial',auto:true,reason:'Non-token Zombie entering under your control queues one copy trigger per Necroduality; supported copyable card attributes only. Complex copied/as-enters abilities, legend rule and replacement layers remain manual.'};
  if(named(card)==='Proteus Staff')return {status:'partial',auto:false,reason:'Manual {2}{U}, tap and target with first-creature reveal; response timing not simulated.'};
  if(named(card)==='Empty the Laboratory')return {status:'manual',auto:false,reason:'X payment must be confirmed manually; Zombie sacrifice and reveal are supported from stack.'};
  if(['Cloud Key','Semblance Anvil'].includes(named(card)))return {status:'partial',auto:true,reason:'Type choice or imprint must be explicitly assigned on battlefield before reducing eligible spells; other effects not modeled.'};
  if(STATIC_COST_REDUCERS[named(card)])return {status:'partial',auto:true,reason:`Static spell cost reduction supported (${STATIC_COST_REDUCERS[named(card)].generic} generic per eligible spell). Other abilities and continuous effects on this card are not automated.`};
  if (named(card) === 'Fellwar Stone') return {status:'partial',reason:'Dynamic opponent-land colors evaluated at play time; other conditional effects are not inferred.',auto:true};
  if (named(card) === 'Arcane Signet') return {status:'partial',reason:'Mana colors follow your commander identity; supported with a valid commander.',auto:true};
  if (named(card) === "Commander's Sphere") return {status:'partial',reason:'Commander identity mana supported; sacrifice draw mode is manual.',auto:true};
  if (named(card) === 'Enduring Innocence') return {status:'partial',reason:'Other friendly creature with power at most 2 entering triggers draw once per turn; dying/rebirth layer not automated.',auto:true};
  if (named(card) === 'Undead Augur') return {status:'partial',reason:'Own Zombie death draws one and loses one life; other death abilities manual.',auto:true};
  if (named(card) === 'Midnight Reaper') return {status:'partial',reason:'Own nontoken creature death causes draw one and self damage one; other effects manual.',auto:true};
  if (named(card) === 'Sai, Master Thopterist') return {status:'partial',reason:'Artifact-spell Thopter cast trigger automated; sacrifice-two-artifacts draw ability manual.',auto:true};
  if (named(card) === 'Sram, Senior Edificer') return {status:'partial',reason:'Aura, Equipment and Vehicle spell-cast draw trigger automated.',auto:true};
  if (named(card) === 'Etherium Spinner') return {status:'partial',reason:'Mana-value-four-or-more cast trigger creates Thopters; other effects manual.',auto:true};
  if (named(card) === 'Whirlwind of Thought') return {status:'partial',reason:'Noncreature spell-cast card-draw trigger automated.',auto:true};
  if (named(card) === 'Shorikai, Genesis Engine') return {status:'partial',reason:'Printed {1},{T} draw-two/discard-one/Pilot activation is available; crew and other Vehicle interactions manual.',auto:true};
  if (named(card) === 'Ovika, Enigma Goliath') return { status: 'partial', reason: 'Cast-trigger Goblins and commander casting supported; ward, alternative effects and opponent decisions are not modeled.', auto: true };
  if (named(card) === 'Third Path Iconoclast') return { status: 'partial', reason: 'Cast-trigger Soldier tokens supported; other interactions may need manual review.', auto: true };
  if (named(card) === 'Molten Gatekeeper') return { status: 'partial', reason: 'Other friendly creature entry triggers 1 damage to opponent; unearth is manual.', auto: true };
  if (type(card, 'Land')) return { status: 'partial', reason: 'Land drop supported; unrecognized mana abilities or entry choices stay manual and are not inferred.', auto: false };
  if (type(card, 'Creature')) {
    if (!/^-?\d+$/.test(String(card.power)) || !/^-?\d+$/.test(String(card.toughness))) return { status: 'manual', reason: 'Variable power or toughness requires manual adjustment.', auto: false };
    let rest = text(card).replace(/\([^)]*\)/g, '').trim();
    for (const keyword of [...COMBAT_KEYWORDS].sort((a, b) => b.length - a.length)) rest = rest.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '');
    if (!rest.replace(/[\s,.;—-]/g, '')) return { status: 'supported', reason: 'Creature statistics and supported combat keywords.', auto: true };
    return { status: 'partial', reason: 'Creature body can be placed manually; Oracle abilities are not automated.', auto: false };
  }
  return { status: 'manual', reason: 'No explicit effect adapter; resolve this card manually.', auto: false };
}
export function loyaltyOptions(card) {
  if (!type(card,'Planeswalker')) return [];
  return text(card).split('\n').map(line=>line.match(/^\s*([+\-−]?\d+)\s*:\s*(.+)$/))
    .filter(Boolean).map(match=>({delta:Number(match[1].replace('−','-')),label:match[1],effect:match[2]}));
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
  if(zone!=='battlefield'&&named(instance.card)==='Reflections of Littjara')delete instance.chosenCreatureType;
  if(zone!=='battlefield'&&['Cloud Key','Semblance Anvil'].includes(named(instance.card))){delete instance.costChosenType;delete instance.imprintResolved;delete instance.imprintCardTypes;delete instance.imprintCardId;}
  if (zone !== 'exile') delete instance.exiledBy;
  instance.controller = player; instance.attacking = false; delete instance.deathtouchDamage;
  if (zone !== 'battlefield') { delete instance.musterCounters; instance.tapped = false; instance.counters = 0; instance.damage = 0; delete instance.tempPower; delete instance.tempToughness; delete instance.loyalty; delete instance.loyaltyActivatedTurn; }
  if (zone === 'battlefield') {
    instance.enteredTurn = state.turn; instance.damage = 0;
    if (type(instance.card,'Planeswalker') && !Number.isInteger(instance.loyalty)) {
      instance.loyalty = Math.max(0,Math.trunc(number(instance.card.loyalty)));
      delete instance.loyaltyActivatedTurn;
    }
  }
  state.players[player][zone].push(instance);
  if (zone === 'battlefield' && isCreature(instance)) queueCreatureEntryInteractions(state, player, instance);
}

function legendGroups(state,player){
  const groups=new Map();
  for(const permanent of state.players[player].battlefield){
    if(!/\bLegendary\b/.test(String(permanent.card.type_line||'')))continue;
    const key=named(permanent.card);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(permanent);
  }
  return [...groups].filter(([,members])=>members.length>1).map(([name,members])=>({name,ids:members.map(x=>x.id)}));
}
function refreshLegendChoice(state){
  for(const player of [0,1]){
    const groups=legendGroups(state,player);
    if(!groups.length)continue;
    const group=groups[0];
    if(player===1){
      const pick=group.ids.map(id=>find(state,id).instance).sort((a,b)=>Number(a.isToken)-Number(b.isToken)||a.id.localeCompare(b.id))[0];
      for(const id of group.ids.filter(x=>x!==pick.id)){
        const where=find(state,id),permanent=remove(state,where);departureToGraveyard(state,permanent,player);
      }
      log(state,`Legend rule (scripted opponent): keeps ${group.name} (${pick.id}); deterministic non-token/ID selection, no human choice.`);
      return refreshLegendChoice(state);
    }
    state.pendingLegend={player,name:group.name,ids:group.ids,createdTurn:state.turn};
    log(state,`Legend rule: choose which ${group.name} you keep; other copies are put into their owners' graveyards (tokens cease to exist).`);
    return;
  }
  delete state.pendingLegend;
}
/** Upgrade older saved tables without changing the caller's snapshot. */
export function upgradeGame(snapshot) {
  const state = clone(snapshot);
  for (const player of state.players) {
    for (const zone of ZONES) if (!Array.isArray(player[zone])) player[zone] = [];
    if (typeof player.returnCommanderOnDeath !== 'boolean') player.returnCommanderOnDeath = true;
  }
  state.stack ||= [];
  if(state.responseWindow&&!state.stack.length)delete state.responseWindow;
  if(state.responseWindow&&!Number.isInteger(state.responseWindow.responses))state.responseWindow.responses=0;
  state.nextTriggerId ??= 0;
  state.nextTokenId ??= 0;
  state.nextTriggerBatchId ??= 0;
  state.turnStep ??= state.phase === 'main' ? 'precombat-main' : state.phase;
  state.turnStepHistory ||= [];
  state.manualStepEvents ||= [];
  state.opponentAudit ||= {turns:0,actions:0,casts:0,activatedAbilities:0,triggerResolutions:0,unknownHandCount:0,halted:false,publicActions:[]};
  if(state.pendingChoice && state.pendingChoice.player!==0 && state.pendingChoice.player!==1)delete state.pendingChoice;
  for (const player of state.players) for (const permanent of player.battlefield) {
    if (type(permanent.card,'Planeswalker') && !Number.isInteger(permanent.loyalty))
      permanent.loyalty = Math.max(0,Math.trunc(number(permanent.card.loyalty)));
  }
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
// Bounded turn-step audit, not a complete timing/priority rules engine.
export const TURN_STEPS=Object.freeze(['untap','upkeep','draw','precombat-main','beginning-of-combat','declare-attackers','declare-blockers','first-strike-damage','combat-damage','end-of-combat','postcombat-main','end-step','cleanup']);
const STEP_ORACLE_PATTERNS={
  upkeep:/\bat the beginning of (?:your|each|an opponent(?:'s)?|each opponent(?:'s)?) upkeep\b/i,
  draw:/\bat the beginning of (?:your|each) draw step\b/i,
  'precombat-main':/\bat the beginning of (?:your|each) (?:precombat )?main phase\b/i,
  'beginning-of-combat':/\bat the beginning of (?:combat on your turn|each combat|combat)\b/i,
  'end-of-combat':/\bat the beginning of (?:the )?end of combat\b/i,
  'end-step':/\bat the beginning of (?:your|each|the next|each opponent(?:'s)?) end step\b/i,
};
const SUPPORTED_UPKEEP=new Set(['Dreadhorde Invasion','Bitterblossom','Phyrexian Arena','Ophiomancer','Assemble the Legion']);
function enterTurnStep(state,step,{skipped=false}={}){
  if(!TURN_STEPS.includes(step))throw new Error('Unknown turn step: '+step);
  state.turnStep=step;
  state.turnStepHistory ||= [];
  state.turnStepHistory.push({turn:state.turn,player:state.activePlayer,step,skipped});
  if(state.turnStepHistory.length>160)state.turnStepHistory.splice(0,state.turnStepHistory.length-160);
  log(state,'Turn step: '+step+(skipped?' (bypassed by bounded practice engine)':'')+'.');
  // Even a simplified/bypassed combat stage must flag unhandled printed triggers.
  const pattern=STEP_ORACLE_PATTERNS[step];
  if(pattern)for(let controller=0;controller<state.players.length;controller++)for(const source of state.players[controller].battlefield){
    const oracle=String(source.card.oracle_text||'');
    if(!pattern.test(oracle))continue;
    if(step==='upkeep'&&SUPPORTED_UPKEEP.has(named(source.card)))continue;
    const opponentOnly=/\b(?:each|an) opponent(?:'s)?\b/i.test(oracle);
    const anyPlayer=/\bat the beginning of each\b/i.test(oracle);
    if(opponentOnly?controller===state.activePlayer:(!anyPlayer&&controller!==state.activePlayer))continue;
    const event={turn:state.turn,step,controller,sourceId:source.id,name:named(source.card),status:'manual'};
    state.manualStepEvents ||= [];state.manualStepEvents.push(event);
    if(state.manualStepEvents.length>80)state.manualStepEvents.shift();
    warn(state,'Manual '+step+' trigger: '+event.name+' ('+event.sourceId+') has no audited handler. Resolve its printed text yourself; no effect was inferred.');
  }
  if(step==='upkeep'&&!skipped)queueUpkeepTriggers(state);
}
function sickness(state, instance) { return isCreature(instance) && instance.enteredTurn >= state.turn && !has(instance, 'haste'); }
function finishUpkeepIfReady(state){
  if(state.finished||state.phase!=='upkeep'||state.stack.length||state.pendingChoice||state.pendingLibrary)return;
  enterTurnStep(state,'draw');
  if(!state.players[state.activePlayer].passive && !(state.round===1 && state.activePlayer===state.startingPlayer))draw(state,state.activePlayer);
  if(state.finished)return;
  state.phase='main';enterTurnStep(state,'precombat-main');
}
function beginTurn(state, player) {
  state.activePlayer = player; state.turn++; state.phase = 'upkeep'; state.combatDone = false;
  state.players[player].landPlayed = false; state.players[player].manaPool = pool();
  for (const permanent of state.players[player].battlefield) { permanent.tapped = false; permanent.attacking = false; delete permanent.manualMana; }
  recordRound(state);
  log(state,'Round '+state.round+': '+state.players[player].name+' turn.');
  enterTurnStep(state,'untap');enterTurnStep(state,'upkeep');
  finishUpkeepIfReady(state);
}
function finishIfLethal(state) {
  if (state.players.some(p => p.life <= 0)) { state.finished = true; state.phase = 'finished'; state.finishReason = 'A life total reached zero'; }
}
function cleanupDead(state) {
  for (let p = 0; p < 2; p++) for (const instance of [...state.players[p].battlefield]) {
    if (type(instance.card,'Planeswalker')) {
      if ((instance.loyalty ?? 0) <= 0) {
        const location=find(state,instance.id);remove(state,location);
        log(state,`${named(instance.card)} leaves the battlefield at zero loyalty.`);
        moveTo(state,instance,instance.owner ?? p,'graveyard');
      }
      continue;
    }
    if (!isCreature(instance)) continue;
    if (toughness(instance) <= 0 || (!has(instance, 'indestructible') && (instance.damage >= toughness(instance) || instance.deathtouchDamage))) {
      const location = find(state, instance.id); remove(state, location);
      departureToGraveyard(state,instance,p);
    }
  }
}
function dealToPlayer(state, sourcePlayer, targetPlayer, amount, source = 'Damage') {
  state.players[targetPlayer].life -= amount;
  if (sourcePlayer !== targetPlayer) stat(state, sourcePlayer, 'damageDealt', amount);
  log(state, `${source}: ${amount} damage to ${state.players[targetPlayer].name}.`);
}
function canCover(available, wanted) { return COLORS.every(c => available[c] >= wanted[c]) && COLORS.reduce((sum, c) => sum + available[c] - wanted[c], 0) >= wanted.generic; }
function manaPoolValue(available) { return COLORS.reduce((sum,c)=>sum+(available[c]||0),0); }
function spendPool(available, wanted) {
  if (!canCover(available,wanted)) return null;
  const left={...available};
  for(const c of COLORS) left[c]-=wanted[c]||0;
  let generic=wanted.generic;
  for(const c of ['C','W','U','B','R','G']) {const n=Math.min(left[c],generic);left[c]-=n;generic-=n;}
  return left;
}
function payment(state, player, card, extraGeneric=0, filter=null, {isSpell=true}={}) {
  const quote=spellCostQuote(state,player,card,extraGeneric,{isSpell});if(!quote)return null;
  const wanted=quote.wanted;
  const constraints=filter?.sourceIds ? new Set(filter.sourceIds) : null;
  const available=state.players[player].battlefield.filter(x=>!x.tapped && !sickness(state,x))
    .map(x=>({instance:x,...(manaSource(x.card,state,player)||{})}))
    .filter(x=>x.options?.length && (!constraints || constraints.has(x.instance.id)));
  const choiceFilter=filter?.sourceChoices || {};
  const sources=available.map(x=>({...x, options:x.options.map((mana,i)=>({mana,index:i,activationGeneric:x.optionActivationGeneric?.[i]??x.activationGeneric??0})).filter(option=>choiceFilter[x.instance.id]===undefined || option.index===Number(choiceFilter[x.instance.id]))})).filter(x=>x.options.length);
  const visited=new Set();
  function search(pending, remaining, steps) {
    if (canCover(pending,wanted)) return {pool:spendPool(pending,wanted),sourceIds:steps.map(x=>x.id),steps};
    const total=manaPoolValue(pending)+remaining.reduce((n,x)=>n+Math.max(...x.options.map(o=>manaPoolValue(o.mana))),0);
    if (total<wanted.generic+COLORS.reduce((n,c)=>n+wanted[c],0)) return null;
    for(const color of COLORS) if(pending[color]+remaining.reduce((n,x)=>n+Math.max(...x.options.map(o=>o.mana[color]||0)),0)<wanted[color]) return null;
    const key=remaining.map(x=>x.instance.id).join('|')+':'+COLORS.map(c=>pending[c]).join(',');
    if(visited.has(key))return null;visited.add(key);
    const missing=COLORS.filter(c=>wanted[c]>pending[c]);
    const options=remaining.flatMap((x,index)=>x.options.map(({mana,index:optionIndex})=>({x,index,mana,optionIndex})))
      .filter(({x,mana,optionIndex})=>!((x.optionActivationGeneric?.[optionIndex]??x.activationGeneric??0) && manaPoolValue(pending)<(x.optionActivationGeneric?.[optionIndex]??x.activationGeneric??0)) && (!missing.length || missing.some(c=>mana[c]) || remaining.some(source=>source.options.some(o=>o.activationGeneric>0 && missing.some(c=>o.mana[c])))));
    options.sort((a,b)=>a.x.options.length-b.x.options.length || manaPoolValue(b.mana)-manaPoolValue(a.mana));
    for(const {x,index,mana,optionIndex} of options){
      const next={...pending};
      const activationGeneric=x.optionActivationGeneric?.[optionIndex]??x.activationGeneric??0;
      if(activationGeneric){
        let activation=activationGeneric;
        for(const c of ['C','W','U','B','R','G']){const n=Math.min(activation,next[c]);next[c]-=n;activation-=n;}
        if(activation)continue;
      }
      for(const c of COLORS)next[c]+=(mana[c]||0);
      const result=search(next,remaining.filter((_,i)=>i!==index),[...steps,{id:x.instance.id,index:optionIndex,mana,activationGeneric,damage:x.optionDamage?.[optionIndex]||0,lifeGain:x.optionLifeGain?.[optionIndex]||0}]);
      if(result)return result;
    }
    return null;
  }
  return search({...state.players[player].manaPool},sources,[]);
}
/** Uncommitted quote used by hand highlight and cast-payment dialog. */
export function castOptions(state,player,id,filter=null) {
  const where=find(state,id);
  if(!where || !(['hand','command'].includes(where.zone)&&where.player===player || where.zone==='exile'&&where.instance.exiledBy))return {canCast:false,reason:'Card is not in a castable hand, command or explicitly linked exile zone.',sources:[],pool:pool()};
  if(where.zone==='exile'&&where.instance.exiledBy?.sourceName==='The Darkness Crystal')return {canCast:false,reason:'The Darkness Crystal does not grant casting permission; activate the specific source instead.',sources:[],pool:{...state.players[player].manaPool}};
  const card=castingCard(where.instance),land=type(card,'Land');
  const ready=(state.phase==='main'||state.phase==='upkeep'&&type(card,'Instant')) && state.activePlayer===player && !state.finished && (!state.responseWindow||state.responseWindow.priorityPlayer===player);
  const stackBlocked=(state.stack.length||state.phase==='upkeep') && (!type(card,'Instant') || land);
  const tax=where.zone==='command' ? 2*(where.instance.commanderCasts||0):0;
  const sources=state.players[player].battlefield.filter(x=>!x.tapped && !sickness(state,x))
    .map(x=>({id:x.id,name:named(x.card),...manaSource(x.card,state,player)})).filter(x=>x.options?.length);
  const costQuote=land?null:spellCostQuote(state,player,card,tax);
  const plan=land ? null : payment(state,player,card,tax,filter);
  const canCast=ready && !stackBlocked && (land ? !state.players[player].landPlayed : Boolean(plan));
  const reason=!ready?'Keep your hand; casting happens on your turn.':stackBlocked?'Resolve the stack before casting this card.':land?(state.players[player].landPlayed?'Land drop already used.':'Land drop ready.') : !cost(card)?'Unsupported casting cost needs manual handling.':plan?'Mana available. Review sources and confirm.':'Not enough payable mana. Tap a rock or land to float mana, or adjust your selection.';
  return {canCast,reason,land,tax,costQuote,linkedExile:where.zone==='exile'?{...where.instance.exiledBy}:null,cost:card.mana_cost||'',pool:{...state.players[player].manaPool},sources,plan,cardName:named(card)};
}
/** Safe, explicit mana modes for the tap-card interface. */
export function tapOptions(state,player,id){
 const x=find(state,id);if(!x || x.player!==player || x.zone!=='battlefield')return null;
 const source=manaSource(x.instance.card,state,player);
 return source?.options?.length?{tapped:x.instance.tapped,activationGeneric:source.activationGeneric||0,optionActivationGeneric:source.optionActivationGeneric||[],options:source.options,optionDamage:source.optionDamage||[],optionLifeGain:source.optionLifeGain||[]}:null;
}
function entersTapped(card, adapter, state = null, player = 0) {
  const oracle=text(card), own=state?.players?.[player]?.battlefield||[];
  if(adapter.source?.entryCondition==='controlPlaneswalker')return !own.some(p=>type(p.card,'Planeswalker'));
  // Typed duals that inspect basic land count or one of the named basic land types.
  if(/enters tapped unless you control two or more basic lands/i.test(oracle))
    return own.filter(x=>type(x.card,'Basic')&&type(x.card,'Land')).length<2;
  const check=oracle.match(/enters tapped unless you control an? (Plains|Island|Swamp|Mountain|Forest) or an? (Plains|Island|Swamp|Mountain|Forest)/i);
  if(check)return !own.some(x=>{
    const land=x.card;return type(land,'Land')&&[check[1],check[2]].some(name=>named(land)===name||(land.type_line||'').split('—').slice(1).join(' ').split(/\s+/).includes(name));
  });
  if(/enters tapped unless/i.test(oracle))return true;
  if(/\benters (?:the battlefield )?tapped\b/i.test(oracle))return true;
  return Boolean(adapter.source?.entersTapped);
}
function validTarget(state, caster, targetId, descriptor) {
  if(['spell','noncreatureSpell','stackAbility','spellOrAbility'].includes(descriptor)){
    const found=state.stack.find(x=>x.id===targetId);
    if(!found)return false;
    const ability=found.kind==='trigger'||found.kind==='activated';
    if(descriptor==='stackAbility')return ability;
    if(descriptor==='spell')return !ability;
    if(descriptor==='noncreatureSpell')return !ability&&!isCreature(found);
    return true;
  }
  if (!targetId) return descriptor === 'creatureOrPlayer';
  const target = find(state, targetId);
  if (!target || target.zone !== 'battlefield') return false;
  if (has(target.instance, 'shroud') || (target.player !== caster && has(target.instance, 'hexproof'))) return false;
  const card = target.instance.card;
  if (descriptor === 'artifactEnchantment') return type(card, 'Artifact') || type(card, 'Enchantment');
  if (descriptor === 'creatureOrPlayer' && type(card,'Planeswalker')) return true;
  if (!isCreature(card)) return false;
  if (descriptor === 'nonblackCreature') return !(card.colors || []).includes('B');
  if (descriptor === 'nonartifactCreature') return !type(card, 'Artifact');
  return true;
}
function play(state, player, id, targetId, argumentsPayment=null, {fromLinkedExile=false, withoutPaying=false}={}) {
  const responder=player===1&&state.activePlayer===0&&state.phase==='main'&&state.responseWindow?.priorityPlayer===1;
  const upkeepInstant=state.phase==='upkeep'&&state.activePlayer===player;
  if (state.finished || (state.phase !== 'main' && !upkeepInstant) || (state.activePlayer !== player && !responder)) throw new Error('Casting on the other player turn is currently permitted only for scripted instant responses in a response window.');
  if(state.responseWindow&&state.responseWindow.priorityPlayer!==player)throw new Error('This player does not currently have priority.');
  const location = find(state, id);
  if (!location || (!fromLinkedExile && (location.player !== player || !['hand','command'].includes(location.zone))))
    throw new Error('Choose a card in your hand, command zone, or explicitly linked exile.');
  if (fromLinkedExile && (location.zone!=='exile' || !location.instance.exiledBy))
    throw new Error('This card is not in an explicitly linked exile zone. Unlinked exiled cards have no cast permission.');
  if(fromLinkedExile&&location.instance.exiledBy?.sourceName==='The Darkness Crystal')throw new Error('The Darkness Crystal cannot cast its exiled cards; use its paid tap activation.');
  if (withoutPaying && !fromLinkedExile)throw new Error('A free cast requires a manually linked exiled card.');
  const instance = location.instance, card = castingCard(instance), adapter = profile(instance.card);
  if(upkeepInstant&&!type(card,'Instant'))throw new Error('Only instants are supported during upkeep; resolve the upkeep stack before your main phase.');
  const commandCast = location.zone === 'command';
  if (commandCast && (!instance.isCommander || instance.owner !== player)) throw new Error('Only your own commander can be cast from your command zone.');
  if (instance.isCommander && !card.mana_cost) throw new Error('This commander has no supported printed mana cost; use manual payment and placement.');
  if (state.stack.length && !type(card, 'Instant')) throw new Error('Only supported instants may be cast while the stack is not empty.');
  if(responder&&(!type(card,'Instant')||!['Counterspell','Negate','Stifle','Disallow'].includes(named(card))))throw new Error('Scripted opponent responses only support named, cost-paid counterspells.');
  if (type(card, 'Land')) {
    if (fromLinkedExile && !state.players[player].landPlayed && !state.stack.length) {
      // Permission to play a land from exile is explicitly adjudicated by the user.
      const source=instance.exiledBy;remove(state,location);
      instance.tapped=entersTapped(card,adapter,state,player);moveTo(state,instance,player,'battlefield');
      state.players[player].landPlayed=true;stat(state,player,'landsPlayed');
      log(state,`Manual linked exile land play: ${named(card)} from under ${source.sourceName} (${source.sourceId})${instance.tapped?' tapped':''}. User verified play permission and land-drop rules.`);
      warn(state,'Playing a linked exiled land is manual permission, not automatic Oracle interpretation.');return;
    }
    if(fromLinkedExile)throw new Error('Linked exiled land requires an available land drop and an empty stack.');
    if (commandCast) throw new Error('A land cannot be played from the command zone.');
    if (state.stack.length) throw new Error('Resolve the stack before playing a land.');
    if (state.players[player].landPlayed) throw new Error('Only one land drop is supported each turn.');
    // Playing a land never requires resolving its activated mana text. Unknown abilities remain inert.
    remove(state, location); instance.tapped = entersTapped(card, adapter, state, player); moveTo(state, instance, player, 'battlefield');
    state.players[player].landPlayed = true; stat(state, player, 'landsPlayed'); log(state, `${state.players[player].name} plays ${named(card)}${instance.tapped ? ' tapped' : ''}.`);
    if (!manaSource(card)) warn(state, `${named(card)} land played; unmodeled mana/activation abilities require manual intervention.`);
    if (!adapter.source?.entryCondition && /\b(?:unless|you may pay|you may reveal)\b/i.test(text(card)) && /enters/i.test(text(card))) warn(state, `${named(card)} enters tapped conservatively; optional entry cost or condition not automated.`);
    return;
  }
  if (adapter.target && !validTarget(state, player, targetId, adapter.target)) throw new Error('Choose a legal battlefield target for this spell.');
  const commanderTax = commandCast ? 2 * instance.commanderCasts : 0;
  const quote=spellCostQuote(state,player,card,commanderTax);
  const paid = withoutPaying ? {steps:[],pool:{...state.players[player].manaPool}} : payment(state, player, card, commanderTax, argumentsPayment);
  if (!paid) throw new Error('Not enough usable mana of the required colors; unsupported costs require a manual move.');
  const exileSource=fromLinkedExile ? {...instance.exiledBy} : null;
  for (const step of paid.steps) {
    const source=find(state,step.id)?.instance;
    if(!source || source.tapped) throw new Error('Chosen mana source became unavailable.');
    source.tapped=true;
    if(step.damage) {state.players[player].life-=step.damage;log(state,`${named(source.card)} deals ${step.damage} damage to ${state.players[player].name} for colored mana.`);}
    if(step.lifeGain){state.players[player].life+=step.lifeGain;log(state,`${named(source.card)} gains ${step.lifeGain} life as a mana ability resolves.`);}
    log(state,`Mana payment: tap ${named(source.card)} for ${Object.entries(step.mana).map(([c,n])=>`${n}${c}`).join(' + ')}${step.activationGeneric?` after paying ${step.activationGeneric} generic to activate`:''}.`);
  }
  state.players[player].manaPool = paid.pool;
  if(!withoutPaying&&quote?.reduced)log(state,`Spell cost reduction: ${named(card)} has ${quote.increase} added generic, reduced by ${quote.reduced} generic (${quote.modifiers.map(m=>m.sourceName).join(', ')}); pay ${quote.wanted.generic} generic plus printed colored requirements. Printed mana value unchanged.`);
  remove(state, location); if(fromLinkedExile)delete instance.exiledBy; instance.controller = player; if (targetId) instance.targetId = targetId; else delete instance.targetId;
  if (commandCast) instance.commanderCasts++;
  state.stack.push(instance); stat(state, player, 'cardsCast');
  if(state.responseWindow){state.responseWindow.priorityPlayer=player;state.responseWindow.passes=0;log(state,'Response window: casting a spell resets consecutive passes; its cast triggers are placed above it.');}
  log(state, `${state.players[player].name} casts ${named(instance.card)}${exileSource?` from exile linked to ${exileSource.sourceName} (${exileSource.sourceId})${withoutPaying?' without paying mana (explicit manual permission)':' using normal mana payment (manual casting permission)'}`:''}${commandCast ? ` from the command zone (+${commanderTax} generic commander tax; command cast ${instance.commanderCasts})` : ''}${instance.isCommander && instance.card.card_faces?.length ? ` using its front face, ${named(card)}` : ''}${targetId ? ` targeting ${named(find(state, targetId)?.instance.card)}` : ''}.`);
  queueCastInteractions(state, player, card);
  finishIfLethal(state);
  if(fromLinkedExile)warn(state,`Casting ${named(card)} from exile requires user verification of ${exileSource.sourceName}'s permission, restrictions and any alternate costs; not inferred by the simulator.`);
  if (adapter.status !== 'supported') warn(state, `${named(card)}: ${adapter.reason}`);
}
// Named, bounded interaction adapter. No Oracle-text execution or hidden-information inference.
function pushInteraction(state, controller, source, adapter, count, batchId=null) {
  state.stack.push({id:`p${controller}-trigger-${state.nextTriggerId++}`,owner:controller,controller,
    kind:'trigger',sourceId:source.id,card:{name:`${named(source.card)} — ${adapter}`,type_line:'Triggered Ability',cmc:0,oracle_text:'Named supported trigger; see activity log.'},
    trigger:{adapter,count,batchId}});
}
// Registered upkeep adapters are deliberately named and audited, not inferred from arbitrary Oracle text.
function queueUpkeepTriggers(state){
 const batchId=state.nextTriggerBatchId++;
 for(const controller of [state.activePlayer,1-state.activePlayer])for(const source of state.players[controller].battlefield){
  const name=named(source.card), own=controller===state.activePlayer;
  let adapter=null;
  if(own&&name==='Dreadhorde Invasion')adapter='dreadhorde-upkeep';
  else if(own&&name==='Bitterblossom')adapter='bitterblossom-upkeep';
  else if(own&&name==='Phyrexian Arena')adapter='arena-upkeep';
  else if(own&&name==='Assemble the Legion')adapter='assemble-upkeep';
  else if(name==='Ophiomancer'&&!state.players[controller].battlefield.some(x=>isCreature(x)&&/\bSnake\b/i.test(String(x.card.type_line||''))))adapter='ophiomancer-upkeep';
  if(!adapter)continue;
  pushInteraction(state,controller,source,adapter,1,batchId);
  log(state,'Upkeep trigger queued: '+name+' ('+source.id+'), controller '+controller+'.');
 }
}
function queueCastInteractions(state, player, spell) {
  if (type(spell,'Land')) return;
  const batchId=state.nextTriggerBatchId++; 
  for(const source of state.players[player].battlefield.filter(x=>named(x.card)==='Reflections of Littjara'&&x.chosenCreatureType)){
    const subtype=String(spell.type_line||'').split('—').slice(1).join(' ').split(/[^A-Za-z]+/).filter(Boolean);
    if(!subtype.some(t=>t.toLowerCase()===source.chosenCreatureType.toLowerCase()))continue;
    if(!type(spell,'Creature')){warn(state,'Reflections of Littjara: noncreature kindred spell copy requires manual stack adjudication.');continue;}
    state.stack.push({id:`p${player}-trigger-${state.nextTriggerId++}`,kind:'trigger',owner:player,controller:player,sourceId:source.id,
      card:{name:`Reflections of Littjara — copy ${named(spell)}`,type_line:'Triggered Ability',cmc:0},
      trigger:{adapter:'reflections-spell-copy',sourceId:source.id,sourceName:named(source.card),copyCard:clone(spell),copiedFromId:state.stack.findLast(x=>x.controller===player&&named(x.card)===named(spell)&&x.kind!=='trigger')?.id||null,copiedFromName:named(spell),batchId}});
    log(state,`Reflections of Littjara (${source.id}) triggers on casting ${named(spell)} with chosen type ${source.chosenCreatureType}; copy of creature spell queued above original.`);
  }
  const sources = state.players[player].battlefield.filter(x => ['Ovika, Enigma Goliath','Third Path Iconoclast','Sai, Master Thopterist','Sram, Senior Edificer','Etherium Spinner','Whirlwind of Thought'].includes(named(x.card)));
  for (const source of sources) {
    const sourceName=named(source.card);
    const isArtifact=type(spell,'Artifact'),isNoncreature=!type(spell,'Creature');
    const isQualifiedSram = type(spell,'Aura') || type(spell,'Equipment') || type(spell,'Vehicle');
    if (sourceName === 'Sai, Master Thopterist' && isArtifact || sourceName === 'Etherium Spinner' && Number(spell.cmc)>=4 && !/\{[XYZ]\}/.test(String(spell.mana_cost||''))) {
      pushInteraction(state,player,source,'thopter-token',1,batchId);
      log(state,`${sourceName} trigger: create one 1/1 flying Thopter artifact creature on resolution.`);continue;
    }
    if (sourceName === 'Sram, Senior Edificer' && isQualifiedSram || sourceName === 'Whirlwind of Thought' && isNoncreature) {
      pushInteraction(state,player,source,'cast-draw',1,batchId);
      log(state,`${sourceName} trigger: draw one card on resolution.`);continue;
    }
    if (!isNoncreature)continue;
    if (named(source.card) === 'Third Path Iconoclast') {
      pushInteraction(state,player,source,'iconoclast-soldier',1,batchId);
      log(state,`Third Path Iconoclast trigger: one 1/1 colorless Soldier artifact creature on resolving.`);
      continue;
    }
    const manaValue = Number(spell.cmc);
    if (!Number.isInteger(manaValue) || manaValue < 0 || manaValue > 40 || spell.card_faces?.length || /\{X\}/i.test(String(spell.mana_cost || ''))) {
      warn(state,`Ovika trigger for ${named(spell)} requires manual X/face mana-value resolution.`); continue;
    }
    pushInteraction(state,player,source,'ovika-goblins',manaValue,batchId);
    log(state,`Ovika trigger from ${source.id}: ${named(spell)} mana value ${manaValue}; trigger placed above spell.`);
  }
}
// Copyable printed card attributes, not transient permanent state. This is a bounded
// token-copy model: characteristic-defining/continuous layers and some copied DFC faces
// remain manual; every token records its source for independent inspection.
const TOKEN_DOUBLE_NAMES=new Set(['Parallel Lives','Anointed Procession','Adrix and Nev, Twincasters','Mondrak, Glory Dominus','Doubling Season']);
function tokenCount(state,player,base,{notCreated=false}={}){
  let amount=base;
  const sources=[];
  if(!notCreated)for(const source of state.players[player].battlefield){
    if(TOKEN_DOUBLE_NAMES.has(named(source.card))){amount*=2;sources.push(`${named(source.card)} (${source.id})`);}
    if(amount>128)throw new Error('Token creation would exceed 128 tokens. Resolve or manually adjudicate the complete replacement event; no partial tokens created.');
  }
  if(amount>128)throw new Error('This bounded engine permits at most 128 tokens in one event.');
  if(sources.length)log(state,`Token creation replacement: ${base} → ${amount} token(s) for ${state.players[player].name} from ${sources.join(', ')}.`);
  return amount;
}
function createTokenCopy(state,player,copyCard,origin={},source=null,mode='manual',options={}){
  const card=clone(copyCard);
  const token=fresh(card,player,`copy-token-${state.nextTokenId++}`);
  token.isToken=true;
  token.copiedFrom={id:origin.id||null,name:origin.name||named(card)};
  token.createdBy=source?{sourceId:source.id,sourceName:source.name,mode}:{sourceId:null,sourceName:'Manual token copy',mode};
  if(options.notCreated)token.spellCopyNotCreated=true;
  token.tapped=false;
  moveTo(state,token,player,'battlefield');
  log(state,`${mode==='automatic'?'Token-copy trigger':'Manual token copy'}: ${named(card)} token ${token.id} enters for ${state.players[player].name}${source?` from ${source.name} (${source.id})`:''}; copied from ${token.copiedFrom.name} (${token.copiedFrom.id||'snapshot'}), without inherited counters/tapped state.`);
  if(card.card_faces?.length||/enters (?:the battlefield )?(?:tapped|with)|as .* enters/i.test(String(card.oracle_text||'')))
    warn(state,`${named(card)} token copy: verify printed as-enters, ETB replacement/choice or double-faced copy details manually.`);
  return token;
}
function queueCreatureEntryInteractions(state, controller, entering) {
  // Necroduality checks the arriving permanent itself, not its owner. Tokens do
  // not qualify; snapshot printed characteristics now for last-known-information
  // resolution even if this creature leaves before the trigger resolves.
  if(!entering.isToken&&isCreature(entering)&&/\bZombie\b/.test(String(entering.card.type_line||'').split('—').slice(1).join(' '))){
    for(const source of state.players[controller].battlefield.filter(x=>x.id!==entering.id&&named(x.card)==='Necroduality')){
      const triggerId=`p${controller}-trigger-${state.nextTriggerId++}`;
      state.stack.push({id:triggerId,kind:'trigger',sourceId:source.id,owner:controller,controller,
        card:{name:`Necroduality — copy ${named(entering.card)}`,type_line:'Triggered Ability',cmc:0,oracle_text:'Create a token copy of the nontoken Zombie that entered.'},
        trigger:{adapter:'necroduality-copy',copyCard:clone(entering.card),copiedFromId:entering.id,copiedFromName:named(entering.card),sourceId:source.id,sourceName:named(source.card)}});
      log(state,`Necroduality (${source.id}) trigger placed on stack when nontoken Zombie ${named(entering.card)} (${entering.id}) enters. Resolve or counter the trigger; no token created yet.`);
    }
  }
  // Enduring Innocence only triggers once each turn, even when many small tokens enter.
  if(power(entering)<=2){
    for(const source of state.players[controller].battlefield.filter(x=>x.id!==entering.id&&named(x.card)==='Enduring Innocence')){
      if(source.enduringDrawTriggeredTurn===state.turn)continue;
      source.enduringDrawTriggeredTurn=state.turn;
      pushInteraction(state,controller,source,'death-draw',1);
      log(state,'Enduring Innocence: another creature of power 2 or less entered; draw one card on resolution (once this turn).');
    }
  }
  const sources = state.players[controller].battlefield.filter(x => x.id !== entering.id && named(x.card) === 'Molten Gatekeeper');
  for (const source of sources) {
    pushInteraction(state,controller,source,'gatekeeper-damage',1);
    log(state,`Molten Gatekeeper trigger: ${named(entering.card)} entered under your control; 1 damage to opponent on resolution.`);
  }
}
function departureToGraveyard(state,instance,controller,{keepCommanderInGraveyard=false}={}){
  const crystal=state.players[1-controller].battlefield.find(x=>named(x.card)==='The Darkness Crystal');
  if(isCreature(instance)&&!instance.isToken&&crystal){
    // Exiling instead of dying suppresses death triggers.
    const owner=instance.owner;
    instance.exiledBy={sourceId:crystal.id,sourceName:'The Darkness Crystal',sourceOwner:crystal.controller,exileTurn:state.turn};
    moveTo(state,instance,owner,'exile');
    state.players[crystal.controller].life+=2;
    log(state,`The Darkness Crystal (${crystal.id}) replaces death: ${named(instance.card)} exiled from opposing controller's battlefield; ${state.players[crystal.controller].name} gains 2 life. No death trigger.`);
    return 'exile';
  }
  if(isCreature(instance))queueDeathDrawInteractions(state,controller,instance);
  moveTo(state,instance,instance.owner,'graveyard',{keepCommanderInGraveyard});
  return 'graveyard';
}
function queueDeathDrawInteractions(state, controller, leaving) {
  if(!isCreature(leaving))return;
  const sources=[...state.players[controller].battlefield];
  if(!sources.some(x=>x.id===leaving.id))sources.push(leaving);
  for(const source of sources){
    const name=named(source.card);
    const zombie=(String(leaving.card.type_line||'').split('—').slice(1).join(' ').split(/\s+/).includes('Zombie'));
    if(name==='Undead Augur'&&zombie){pushInteraction(state,controller,source,'death-draw-life',1);log(state,'Undead Augur: Zombie died; draw one and lose 1 life on resolution.');}
    if(name==='Midnight Reaper'&&!leaving.isToken){pushInteraction(state,controller,source,'death-draw-damage',1);log(state,'Midnight Reaper: nontoken creature died; draw one and take 1 damage on resolution.');}
  }
}
function resolveInteraction(state, instance) {
  const trigger = instance?.trigger;
  if (trigger?.adapter === 'loyalty-manual') {
    state.stack.pop();
    log(state,`${named(instance.card)} leaves the stack. The loyalty ability's printed effect must have been applied manually.`);
    return true;
  }
  if(['dreadhorde-upkeep','bitterblossom-upkeep','arena-upkeep','ophiomancer-upkeep','assemble-upkeep'].includes(trigger?.adapter)){
    const controller=instance.controller, name=named(instance.card).split(' — ')[0];
    state.stack.pop();
    if(controller===1)state.opponentAudit.triggerResolutions++;
    const token=(card,amount)=>{
      const count=tokenCount(state,controller,amount);
      for(let i=0;i<count;i++){const creature=fresh(card,controller,'upkeep-token-'+state.nextTokenId++);
        creature.isToken=true;moveTo(state,creature,controller,'battlefield');}
      return count;
    };
    if(trigger.adapter==='dreadhorde-upkeep'){
      state.players[controller].life-=1;
      let armies=state.players[controller].battlefield.filter(x=>isCreature(x)&&/\bArmy\b/i.test(String(x.card.type_line||'')));
      if(!armies.length){
        token({name:'Zombie Army',type_line:'Token Creature — Zombie Army',colors:['B'],power:'0',toughness:'0',cmc:0,mana_cost:'',oracle_text:'',keywords:[]},1);
        armies=state.players[controller].battlefield.filter(x=>isCreature(x)&&/\bArmy\b/i.test(String(x.card.type_line||'')));
      }
      if(armies.length>1)warn(state,'Dreadhorde Invasion: multiple Army choices exist; first Army selected deterministically. This is not a verified strategic choice.');
      if(armies.length){armies[0].counters+=1;log(state,'Dreadhorde Invasion: lose 1 life and amass Zombies 1 on '+armies[0].id+'.');}
      else warn(state,'Dreadhorde Invasion: Army creation could not be completed; check replacement effects manually.');
    }else if(trigger.adapter==='bitterblossom-upkeep'){
      state.players[controller].life-=1;
      const made=token({name:'Faerie Rogue',type_line:'Token Creature — Faerie Rogue',colors:['B'],power:'1',toughness:'1',cmc:0,mana_cost:'',oracle_text:'Flying',keywords:['flying']},1);
      log(state,'Bitterblossom upkeep: lose 1 life; create '+made+' flying Faerie Rogue token(s).');
    }else if(trigger.adapter==='arena-upkeep'){
      draw(state,controller,1);state.players[controller].life-=1;
      log(state,'Phyrexian Arena upkeep: draw 1, lose 1 life.');
    }else if(trigger.adapter==='ophiomancer-upkeep'){
      if(!state.players[controller].battlefield.some(x=>isCreature(x)&&/\bSnake\b/i.test(String(x.card.type_line||'')))){
        const made=token({name:'Snake',type_line:'Token Creature — Snake',colors:['B'],power:'1',toughness:'1',cmc:0,mana_cost:'',oracle_text:'Deathtouch',keywords:['deathtouch']},1);
        log(state,'Ophiomancer upkeep: create '+made+' deathtouch Snake token(s).');
      }else log(state,'Ophiomancer intervening-if recheck: Snake already controlled; no token.');
    }else if(trigger.adapter==='assemble-upkeep'){
      const source=find(state,instance.sourceId);
      if(source?.zone==='battlefield'&&source.instance.controller===controller){
        source.instance.musterCounters=(source.instance.musterCounters||0)+1;
        const made=token({name:'Soldier',type_line:'Token Creature — Soldier',colors:['R','W'],power:'1',toughness:'1',cmc:0,mana_cost:'',oracle_text:'',keywords:[]},source.instance.musterCounters);
        log(state,'Assemble the Legion: muster '+source.instance.musterCounters+'; create '+made+' Soldier token(s).');
      }else log(state,'Assemble the Legion left the battlefield before upkeep resolution; no muster counter added.');
    }
    cleanupDead(state);finishIfLethal(state);
    return true;
  }
  if(trigger?.adapter==='reflections-spell-copy'){
    state.stack.pop();
    createTokenCopy(state,instance.controller,trigger.copyCard,
      {id:trigger.copiedFromId,name:trigger.copiedFromName},
      {id:trigger.sourceId,name:trigger.sourceName},'spell-copy',{notCreated:true});
    log(state,'Reflections of Littjara: resolving a copy of a creature permanent spell creates a token permanent, but does NOT create tokens for doubling effects.');
    return true;
  }
  if(trigger?.adapter==='necroduality-copy'){
    state.stack.pop();
    const n=tokenCount(state,instance.controller,1);
    for(let i=0;i<n;i++)createTokenCopy(state,instance.controller,trigger.copyCard,
      {id:trigger.copiedFromId,name:trigger.copiedFromName},
      {id:trigger.sourceId,name:trigger.sourceName},'automatic');
    if(instance.controller===1)state.opponentAudit.triggerResolutions++;
    return true;
  }
  if (!['ovika-goblins','iconoclast-soldier','gatekeeper-damage','thopter-token','cast-draw','shorikai-activate','death-draw','death-draw-life','death-draw-damage'].includes(trigger?.adapter)) return false;
  state.stack.pop();
  const controller = instance.controller, count = trigger.count;
  if (controller===1) state.opponentAudit.triggerResolutions++;
  if(['death-draw','death-draw-life','death-draw-damage'].includes(trigger.adapter)){
    draw(state,controller,1);
    if(trigger.adapter!=='death-draw'){state.players[controller].life-=1;log(state,`${named(instance.card)}: controller loses 1 life from death trigger.`);finishIfLethal(state);}
    log(state,`${named(instance.card)} resolves: draw one card.`);
    return true;
  }
  if (trigger.adapter === 'cast-draw') {
    draw(state,controller,1);log(state,`${named(instance.card)} resolves: ${state.players[controller].name} draws one card.`);return true;
  }
  if (trigger.adapter === 'shorikai-activate') {
    draw(state,controller,2);
    if(controller===1){
      const pick=chooseOpponentDiscard(state.players[controller].hand);
      if(pick){const location=find(state,pick.id);remove(state,location);moveTo(state,pick,controller,'graveyard');log(state,'Scripted opponent discards one card following its documented deterministic discard policy.');}
      makePilot(state,controller);
    }else{
      state.pendingChoice={kind:'shorikai-discard',player:0,sourceId:trigger.sourceId};
      log(state,'Shorikai draws two. Choose a card from your hand to discard before the Pilot is created.');
    }
    return true;
  }
  if (trigger.adapter === 'gatekeeper-damage') {
    dealToPlayer(state,controller,1-controller,1,'Molten Gatekeeper');
    finishIfLethal(state); return true;
  }
  const goblin = trigger.adapter === 'ovika-goblins', thopter=trigger.adapter==='thopter-token';
  const tokenCard = thopter ? {name:'Thopter',type_line:'Token Artifact Creature — Thopter',cmc:0,mana_cost:'',oracle_text:'Flying',keywords:['flying'],colors:[],power:'1',toughness:'1'} : goblin
    ? {name:'Phyrexian Goblin',type_line:'Token Creature — Phyrexian Goblin',cmc:0,mana_cost:'',oracle_text:'',keywords:[],colors:['R'],power:'1',toughness:'1'}
    : {name:'Soldier',type_line:'Token Artifact Creature — Soldier',cmc:0,mana_cost:'',oracle_text:'',keywords:[],colors:[],power:'1',toughness:'1'};
  const total=tokenCount(state,controller,count);
  for (let i=0;i<total;i++) {
    const token=fresh(tokenCard,controller,`interaction-token-${state.nextTokenId++}`);
    token.isToken=true;
    if (goblin) token.temporaryHaste=true;
    moveTo(state,token,controller,'battlefield');
  }
  log(state,`${thopter?'Artifact cast':goblin?'Ovika':'Third Path Iconoclast'} trigger resolves: ${total} ${named(tokenCard)} token(s)${goblin?' with haste until end of turn':''}.`);
  return true;
}
function searchBasic(state, player, destination) {
  const library = state.players[player].library;
  const index = library.findIndex(x => type(x.card, 'Basic') && type(x.card, 'Land'));
  if (index < 0) return null;
  const instance = library.splice(index, 1)[0]; instance.tapped = destination === 'battlefield'; moveTo(state, instance, player, destination); return instance;
}
// A pending library review stores only the visible IDs. Do not mutate library or reveal
// other cards until the explicit allocation is accepted. This survives JSON save/reload.
function startLibraryReview(state,player,mode,count=3,sourceName='Manual review') {
  if(state.pendingLibrary||state.pendingChoice)throw new Error('Complete the pending selection first.');
  if(![0,1].includes(player)||!['look','ponder','preordain','reveal-nonland'].includes(mode))throw new Error('Unsupported library review mode.');
  if(mode==='look'&&(!Number.isInteger(count)||count<1||count>10))throw new Error('Look at between 1 and 10 cards.');
  const cards=state.players[player].library;
  const selected=mode==='reveal-nonland'?(()=>{const out=[];for(const item of cards){out.push(item);if(!type(item.card,'Land'))break;}return out;})()
    : cards.slice(0,mode==='ponder'?3:mode==='preordain'?2:count);
  const ids=selected.map(x=>x.id);
  state.pendingLibrary={mode,player,sourceName,ids,topOrder:ids.slice(),revealFound:mode==='reveal-nonland'&&selected.length>0&&!type(selected.at(-1).card,'Land'),createdTurn:state.turn};
  log(state,`${sourceName}: ${mode==='reveal-nonland'?`reveal ${ids.length} card(s) until first nonland or end`: `look at top ${ids.length} card(s)`}; awaiting ordered allocation.`);
}
function qualifies(instance,predicate){
  if(!isCreature(instance))return false;
  return predicate==='creature'||(predicate==='zombie'&&/\bZombie\b/.test(String(instance.card.type_line||'').split('—').slice(1).join(' ')));
}
function startMatchReview(state,player,variant,required,sourceName){
  if(state.pendingLibrary||!['proteus','mass-polymorph','empty-lab','synthetic-destiny'].includes(variant)||!Number.isInteger(required)||required<0||required>1000000)throw new Error('Invalid or overlapping reveal.');
  const typeName=variant==='empty-lab'?'zombie':'creature',seen=[];let matches=0;
  if(required)for(const card of state.players[player].library){seen.push(card);if(qualifies(card,typeName)&&++matches>=required)break;}
  state.pendingLibrary={mode:'matching-reveal',variant,player,sourceName,required,ids:seen.map(x=>x.id),matches:seen.filter(x=>qualifies(x,typeName)).map(x=>x.id),createdTurn:state.turn};
  log(state,`${sourceName}: revealed ${seen.length} card(s) looking for ${required} ${typeName} match(es); found ${matches}. Awaiting confirmation.`);
}
function commitLibraryReview(state,action){
  const pending=state.pendingLibrary;if(!pending)throw new Error('No library selection is awaiting allocation.');
  const actual=state.players[pending.player],original=pending.ids,order=action.order;
  if(!Array.isArray(order)||order.length!==original.length||new Set(order).size!==order.length||order.some(id=>!original.includes(id)))
    throw new Error('Choose exactly the revealed cards, each once, in your preferred order.');
  if(actual.library.slice(0,original.length).map(x=>x.id).join('|')!==original.join('|'))throw new Error('Library changed during selection; undo and reopen.');
  if(pending.mode==='matching-reveal'){
    if(action.shuffle!==false||Object.keys(action.destinations||{}).length)throw new Error('This card has fixed destinations, not arbitrary allocations.');
    const hits=new Set(pending.matches),byId=new Map(actual.library.slice(0,original.length).map(x=>[x.id,x]));
    const predicate=pending.variant==='empty-lab'?'zombie':'creature';
    for(const id of order)if(hits.has(id)!==qualifies(byId.get(id),predicate))throw new Error('Invalid match classification.');
    const taken=actual.library.splice(0,original.length),lookup=new Map(taken.map(x=>[x.id,x]));
    const hitCards=order.filter(id=>hits.has(id)).map(id=>lookup.get(id));
    const rest=order.filter(id=>!hits.has(id)).map(id=>lookup.get(id));
    for(const card of hitCards)moveTo(state,card,pending.player,'battlefield');
    actual.library.push(...rest);
    if(['mass-polymorph','synthetic-destiny'].includes(pending.variant))shuffle(state,actual.library);
    if(pending.variant==='empty-lab'){
      actual.library.splice(actual.library.length-rest.length,rest.length);
      shuffle(state,rest);actual.library.push(...rest);
    }
    delete state.pendingLibrary;
    log(state,`${pending.sourceName}: ${hitCards.length} matched creature(s) entered together; ${rest.length} others ${['mass-polymorph','synthetic-destiny'].includes(pending.variant)?'shuffled into the library':pending.variant==='proteus'?'placed on bottom in selected order':'randomized on the bottom'}.`);
    if(hitCards.length)warn(state,'Simultaneous entry was recorded; complex ETB and replacement effects still require manual handling.');
    if(pending.variant==='synthetic-destiny'&&state.pendingEndStepResume==='user'){
      delete state.pendingEndStepResume;
      log(state,'Synthetic Destiny delayed end-step trigger has resolved; continuing the turn-end procedure.');
      endTurn(state);
    }
    return;
  }
  if(typeof action.shuffle!=='boolean')throw new Error('Choose whether to shuffle.');
  if(action.shuffle&&pending.mode!=='ponder'&&pending.mode!=='look')throw new Error('Shuffling is supported only when explicitly chosen for a manual look or Ponder.');
  const destinations=action.destinations||{};
  if(!destinations||typeof destinations!=='object'||Array.isArray(destinations))throw new Error('Choose a valid destination for each card.');
  if(Object.keys(destinations).some(id=>!original.includes(id)))throw new Error('An unknown card was included in the allocation.');
  const permitted=pending.mode==='ponder'?['top']:pending.mode==='preordain'?['top','bottom']:
    pending.mode==='reveal-nonland'?['top','bottom','hand','graveyard','exile','battlefield']:['top','bottom','hand','graveyard','exile','battlefield'];
  const destinationFor=id=>destinations[id]|| (pending.mode==='reveal-nonland'?'bottom':'top');
  for(const id of order){
    const dest=destinationFor(id);if(!permitted.includes(dest))throw new Error(`Destination ${dest} is not valid for this review.`);
    if(pending.mode==='reveal-nonland'){
      const isHit=id===original.at(-1)&&pending.revealFound;
      if(!isHit&&dest!=='bottom')throw new Error('Cards before the first nonland must be placed on the bottom in this bounded reveal workflow.');
    }
    if(dest==='battlefield'){
      const card=actual.library.find(x=>x.id===id)?.card;
      if(!card || !/(Creature|Artifact|Enchantment|Planeswalker|Battle|Land)/i.test(card.type_line||card.card_faces?.[0]?.type_line||''))
        throw new Error('Only permanent cards can be manually placed onto the battlefield.');
    }
  }
  // The player can only select one hit in reveal mode; all other cards go bottom.
  const taken=actual.library.splice(0,original.length);const byId=new Map(taken.map(c=>[c.id,c]));
  const top=[],bottom=[],transferred=[];
  for(const id of order){
    const instance=byId.get(id),dest=destinationFor(id);
    if(dest==='top')top.push(instance);
    else if(dest==='bottom')bottom.push(instance);
    else {moveTo(state,instance,pending.player,dest);transferred.push(`${named(instance.card)} → ${dest}`);}
  }
  actual.library.unshift(...top);actual.library.push(...bottom);
  if(action.shuffle)shuffle(state,actual.library);
  delete state.pendingLibrary;
  log(state,`${pending.sourceName}: allocated ${order.length} card(s): ${top.length} top, ${bottom.length} bottom${transferred.length?`, ${transferred.join('; ')}`:''}${action.shuffle?'; shuffled library':''}.`);
  if(pending.mode==='ponder'||pending.mode==='preordain'){
    draw(state,pending.player,1);
    log(state,`${pending.sourceName}: draw exactly one card after ${action.shuffle?'shuffling':'arranging'} the library.`);
  }
  if(pending.mode==='look'||pending.mode==='reveal-nonland')warn(state,'Manually allocated library cards are not a verified card-specific spell or replacement effect.');
}
function resolve(state) {
  const instance = state.stack.at(-1); if (!instance) throw new Error('The stack is empty.');
  if (resolveInteraction(state, instance)) {finishUpkeepIfReady(state);return;}
  const adapter = profile(instance.card), player = instance.controller;
  if (adapter.status === 'manual' || (instance.isCommander && !adapter.auto && !adapter.planeswalker)) throw new Error(`${named(instance.card)} has no complete effect adapter. Use a manual move after resolving its effects yourself.`);
  state.stack.pop();
  if (adapter.target && !validTarget(state, player, instance.targetId, adapter.target)) {
    moveTo(state, instance, instance.owner, 'graveyard'); log(state, `${named(instance.card)} has no legal target and does not resolve.`); return;
  }
  const target = instance.targetId ? find(state, instance.targetId) : null;
  if (type(instance.card, 'Creature') || type(instance.card, 'Artifact') || type(instance.card, 'Enchantment') || type(instance.card, 'Planeswalker')) {
    instance.tapped = !!adapter.source?.entersTapped; moveTo(state, instance, player, 'battlefield');
    if (adapter.status === 'partial') { const message = `${named(instance.card)} enters; unimplemented Oracle abilities are not applied.`; log(state, message); warn(state, message); }
  } else {
    switch (adapter.effect) {
      case 'counter-stack': {
        const original=state.stack.find(x=>x.id===instance.targetId);
        if(!original||!validTarget(state,player,original.id,adapter.target)){
          log(state,`${named(instance.card)}: target is no longer legal; it fails to counter anything.`);
          break;
        }
        state.stack.splice(state.stack.indexOf(original),1);
        if(original.kind==='trigger'||original.kind==='activated')
          log(state,`${named(instance.card)} counters ${named(original.card)} (ability ceases to exist).`);
        else{
          moveTo(state,original,original.owner,'graveyard');
          log(state,`${named(instance.card)} counters ${named(original.card)}; spell put into owner's graveyard. Command-zone choice may apply manually.`);
        }
        break;
      }
      case 'tokens': {
        const count=adapter.count;
        if (!Number.isInteger(count)||count<0||count>40) throw new Error('Unsupported token count.');
        const total=tokenCount(state,player,count);
        for(let n=0;n<total;n++){
          const token=fresh({...adapter.token,cmc:0,mana_cost:'',oracle_text:'',keywords:adapter.token.keywords||[]},player,`spell-token-${state.nextTokenId++}`);
          token.isToken=true;moveTo(state,token,player,'battlefield');
        }
        log(state,`${named(instance.card)} creates ${count} ${adapter.token.name} token(s).`);
        break;
      }
      case 'synthetic-destiny': {
        const creatures=state.players[player].battlefield.filter(x=>isCreature(x));
        const count=creatures.length;
        for(const victim of creatures){const loc=find(state,victim.id);if(loc){remove(state,loc);moveTo(state,victim,victim.owner,'exile');}}
        state.delayedEndSteps ||= [];
        state.delayedEndSteps.push({kind:'synthetic-destiny',sourceId:instance.id,controller:player,required:count,createdTurn:state.turn});
        log(state,`Synthetic Destiny: exiled ${count} creature(s); next end-step trigger scheduled. Exiled tokens counted, commander exile choice requires manual review.`);
        break;
      }
      case 'mass-polymorph': {
        const creatures=state.players[player].battlefield.filter(x=>isCreature(x));
        const count=creatures.length;
        for(const victim of creatures){const loc=find(state,victim.id);if(loc){remove(state,loc);moveTo(state,victim,victim.owner,'exile');}}
        startMatchReview(state,player,'mass-polymorph',count,'Mass Polymorph');
        log(state,`Mass Polymorph: exiled ${count} creatures. Commander zone choices and ETB replacements remain manual.`);
        break;
      }
      case 'ponder':
      case 'preordain': {
        const mode=adapter.effect;
        startLibraryReview(state,player,mode,mode==='ponder'?3:2,named(instance.card));
        if(player===1){
          // Deterministic, visible opponent heuristic: retain printed library order;
          // Preordain bottoms land surplus, not a claim of strategic optimality.
          const choice=state.pendingLibrary;
          const destinations={};
          if(mode==='preordain' && state.players[player].hand.filter(x=>type(x.card,'Land')).length>=4)
            for(const id of choice.ids){const card=state.players[player].library.find(x=>x.id===id);if(card&&type(card.card,'Land'))destinations[id]='bottom';}
          commitLibraryReview(state,{order:choice.ids.slice(),destinations,shuffle:false});
          log(state,`Scripted ${named(instance.card)}: deterministic keep-order${Object.keys(destinations).length?' / bottom surplus lands':''} policy; not an optimal hidden-information claim.`);
        }
        break;
      }
      case 'draw': draw(state, player, adapter.amount); break;
      case 'drawLoseLife': draw(state,player,adapter.amount);state.players[player].life-=adapter.lifeLoss;log(state,`${named(instance.card)}: draw ${adapter.amount}, lose ${adapter.lifeLoss} life.`);break;
      case 'pump': target.instance.tempPower = (target.instance.tempPower || 0) + adapter.amount; target.instance.tempToughness = (target.instance.tempToughness || 0) + adapter.amount; break;
      case 'bounce': remove(state, target); moveTo(state, target.instance, target.instance.owner, 'hand'); break;
      case 'destroy':
        if (has(target.instance, 'indestructible')) log(state, `${named(target.instance.card)} is indestructible.`);
        else {const controller=target.player;remove(state,target);departureToGraveyard(state,target.instance,controller);}
        break;
      case 'exile': {
        const gain = power(target.instance), owner = target.instance.owner, controller = target.player;
        remove(state, target); moveTo(state, target.instance, owner, 'exile');
        if (adapter.gainLife) state.players[controller].life += gain;
        if (adapter.basicLand) { searchBasic(state, controller, 'battlefield'); shuffle(state, state.players[controller].library); }
        break;
      }
      case 'burn':
        if (target && type(target.instance.card,'Planeswalker')) {
          target.instance.loyalty = Math.max(0,(target.instance.loyalty||0)-adapter.amount);
          log(state,`${named(instance.card)} deals ${adapter.amount} damage to ${named(target.instance.card)}, reducing loyalty to ${target.instance.loyalty}.`);
        } else if (target) target.instance.damage += adapter.amount;
        else dealToPlayer(state, player, 1 - player, adapter.amount, named(instance.card));
        break;
      case 'ramp': searchBasic(state, player, 'battlefield'); shuffle(state, state.players[player].library); break;
      case 'cultivate': searchBasic(state, player, 'battlefield'); searchBasic(state, player, 'hand'); shuffle(state, state.players[player].library); break;
      default: throw new Error('This effect requires manual resolution.');
    }
    moveTo(state, instance, instance.owner, 'graveyard');
  }
  log(state, `${named(instance.card)} resolves.`); cleanupDead(state); finishIfLethal(state); finishUpkeepIfReady(state);
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
  enterTurnStep(state,'beginning-of-combat');enterTurnStep(state,'declare-attackers');
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
  enterTurnStep(state,'declare-blockers');
  for (const attacker of attackers) if (!has(attacker, 'vigilance')) attacker.tapped = true;
  const strike = (instance, first) => first ? has(instance, 'first strike') || has(instance, 'double strike') : !has(instance, 'first strike') || has(instance, 'double strike');
  const damageCreature = (source, target, amount) => { target.damage += amount; if (amount && has(source, 'deathtouch')) target.deathtouchDamage = true; if (has(source, 'lifelink')) state.players[source.controller].life += amount; };
  const damagePlayer = (source, amount) => { if (amount <= 0) return; dealToPlayer(state, player, 1 - player, amount, named(source.card)); if (has(source, 'lifelink')) state.players[player].life += amount; };
  for (const first of [true, false]) {
    enterTurnStep(state,first?'first-strike-damage':'combat-damage');
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
  state.combatDone = true;enterTurnStep(state,'end-of-combat');enterTurnStep(state,'postcombat-main');log(state, 'Bounded combat resolved (one blocker per attacker; supported keywords only).'); finishIfLethal(state);
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
// Public, inspectable suggestions. Both automated practice and the manual UI use this
// same decision path. Never invent a cost, target, or hidden card effect.
export function suggestions(state, player=0) {
  if(state.phase==='upkeep'&&state.activePlayer===player&&!state.finished){
    const top=state.stack.at(-1);
    return top?.kind==='trigger'&&['dreadhorde-upkeep','bitterblossom-upkeep','arena-upkeep','ophiomancer-upkeep','assemble-upkeep'].includes(top.trigger?.adapter)
      ? [{type:'resolve',label:'Resolve '+named(top.card),why:'Upkeep triggers resolve before the normal draw step.',sourceNames:[]}] : [];
  }
  if (state.phase !== 'main' || state.activePlayer !== player || state.finished) return [];
  const p=state.players[player];
  if (state.pendingChoice||state.pendingLibrary) return [];
  if (state.stack.length) {
    const top=state.stack.at(-1), adapter=profile(top.card);
    if ((top.kind === 'trigger' && top.trigger?.adapter!=='loyalty-manual') || (adapter.auto && adapter.status !== 'manual'))
      return [{type:'resolve',label:`Resolve ${named(top.card)}`,why:'Top of the stack must resolve before continuing.',sourceNames:[]}];
    return [];
  }
  const actions=[];
  if (!p.landPlayed) {
    const lands=p.hand.filter(x=>type(x.card,'Land'));
    lands.sort((a,b)=>Number(Boolean(manaSource(b.card)))-Number(Boolean(manaSource(a.card))) || Number(entersTapped(b.card,profile(b.card),state,player))-Number(entersTapped(a.card,profile(a.card),state,player)));
    for (const instance of lands) actions.push({type:'play',id:instance.id,label:`Play ${named(instance.card)}`,why:`Normal land drop${manaSource(instance.card)?'; mana source recognized':'; mana ability may require manual input'}.`,sourceNames:[],land:true});
  }
  // Scripted commanders are never free-cast: exact printed mana plus commander tax required.
  const candidates=[...p.hand,...p.command.filter(x=>x.isCommander && ['Ovika, Enigma Goliath','Shorikai, Genesis Engine'].includes(named(x.card)) && profile(x.card).auto)];
  for(const instance of candidates) {
    const adapter=profile(instance.card);
    if (type(instance.card,'Land') || !adapter.auto) continue;
    const card=castingCard(instance);
    const tax=instance.isCommander ? instance.commanderCasts*2 : 0;
    const paid=payment(state,player,card,tax);
    if(!paid) continue;
    const target=adapter.target ? targetFor(state,player,adapter) : null;
    if(adapter.target && !target && adapter.target!=='creatureOrPlayer') continue;
    if(adapter.effect==='destroy' && target && has(target,'indestructible')) continue;
    const sourceNames=paid.sourceIds.map(id=>named(find(state,id).instance.card));
    const priority=instance.isCommander ? 100 : adapter.source ? (state.round<=5 ? 90 : 20) : adapter.effect==='draw' ? 60 : ['destroy','exile','bounce'].includes(adapter.effect) ? 50 : ['ramp','cultivate'].includes(adapter.effect) ? 85 : isCreature(instance) ? 30+number(card.cmc) : 15;
    actions.push({type:'play',id:instance.id,targetId:target?.id,label:`Cast ${named(instance.card)}`,why:`Known cost${tax?` + ${tax} commander tax`:''}; ${adapter.status==='partial'?'partial rules support':'recognized effect'}.`,sourceNames,priority});
  }
  // Shorikai's single activation needs one mana; use the normal payment planner for it.
  const shorikai=p.battlefield.find(x=>named(x.card)==='Shorikai, Genesis Engine'&&!x.tapped);
  if(shorikai){
    const others=p.battlefield.filter(x=>x.id!==shorikai.id).map(x=>x.id);
    if(payment(state,player,{name:'Shorikai activation',type_line:'Instant',mana_cost:'{1}',cmc:1},0,{sourceIds:others}))
      actions.push({type:'activateShorikai',id:shorikai.id,label:'Activate Shorikai — draw 2, discard 1, create Pilot',why:'Audited activated ability; discard is a deterministic opponent heuristic or player choice.',sourceNames:[],priority:25});
  }
  return [...actions.filter(x=>x.land).slice(0,1),...actions.filter(x=>!x.land).sort((a,b)=>b.priority-a.priority)];
}
function chooseOpponentDiscard(hand) {
  // Bounded practice heuristic: keep cheap playable cards; no unobserved strategic claims.
  return [...hand].sort((a,b)=>number(b.card.cmc)-number(a.card.cmc) || named(a.card).localeCompare(named(b.card)))[0] || null;
}
function makePilot(state,player) {
  const total=tokenCount(state,player,1);
  for(let n=0;n<total;n++){
  const token=fresh({name:'Pilot',type_line:'Token Creature — Pilot',power:'1',toughness:'1',cmc:0,mana_cost:'',colors:[],keywords:[],oracle_text:'This token crews Vehicles as though its power were 2 greater.'},player,`pilot-token-${state.nextTokenId++}`);
  token.isToken=true;moveTo(state,token,player,'battlefield');
  }
  log(state,`${state.players[player].name} creates Pilot token(s); enhanced crewing is not automated.`);
}
function activateShorikai(state,player,id) {
  if(state.phase!=='main'||state.activePlayer!==player||state.stack.length||state.pendingChoice)throw new Error('Activate Shorikai during your active main phase with an empty stack.');
  const permanent=find(state,id);
  if(!permanent||permanent.zone!=='battlefield'||permanent.player!==player||named(permanent.instance.card)!=='Shorikai, Genesis Engine'||permanent.instance.tapped)
    throw new Error('Select your untapped Shorikai on the battlefield.');
  const fakeCost={name:'Shorikai activation cost',type_line:'Instant',mana_cost:'{1}',cmc:1};
  const paid=payment(state,player,fakeCost,0,{sourceIds:state.players[player].battlefield.filter(x=>x.id!==id).map(x=>x.id)},{isSpell:false});
  if(!paid)throw new Error('Shorikai requires one mana before tapping.');
  for(const step of paid.steps){
    const source=find(state,step.id)?.instance;if(!source||source.tapped)throw new Error('Shorikai payment source unavailable.');
    source.tapped=true;if(step.damage){state.players[player].life-=step.damage;log(state,`${named(source.card)} deals ${step.damage} damage for Shorikai activation.`);}
  }
  state.players[player].manaPool=paid.pool;permanent.instance.tapped=true;
  pushInteraction(state,player,permanent.instance,'shorikai-activate',1);
  log(state,`${state.players[player].name} activates Shorikai: pay {1}, tap; draw two, discard one, create Pilot on resolution.`);
  if(player===1)state.opponentAudit.activatedAbilities++;
  finishIfLethal(state);
}
export function opponentDiagnostics(state,{revealHand=false}={}) {
  const a=state.opponentAudit||{},p=state.players[1];
  const unsupported=p.hand.filter(x=>!type(x.card,'Land')&&!profile(x.card).auto);
  return {turns:a.turns||0,actions:a.actions||0,casts:a.casts||0,activatedAbilities:a.activatedAbilities||0,triggerResolutions:a.triggerResolutions||0,
    unknownHandCount:unsupported.length,halted:Boolean(a.halted),publicActions:(a.publicActions||[]).slice(-20),
    ...(revealHand||state.finished?{unsupportedCards:unsupported.map(x=>({name:named(x.card),reason:profile(x.card).reason}))}:{})};
}
function assistedStep(state,player,mode='next') {
  const choices=suggestions(state,player);
  const choice=mode==='land' ? choices.find(x=>x.land) : choices[0];
  if (!choice) return false;
  if (choice.type==='resolve') resolve(state);
  else if(choice.type==='activateShorikai')activateShorikai(state,player,choice.id);
  else play(state,player,choice.id,choice.targetId);
  return true;
}
function autoTurn(state,player) {
  if(state.finished) return true;
  const audit=state.opponentAudit;
  if(!state.pendingOpponent)audit.turns++;
  for(let count=0;count<35 && !state.finished;count++) {
    const next=suggestions(state,player)[0];if(!next)break;
    if(!assistedStep(state,player))break;
    audit.actions++;
    if(next.type==='play'&&!next.land)audit.casts++;
    if((audit.publicActions||[]).length>=100)audit.publicActions.shift();
    audit.publicActions.push({turn:state.turn,kind:next.type,label:next.label});
  }
  audit.unknownHandCount=state.players[player].hand.filter(x=>!type(x.card,'Land')&&!profile(x.card).auto).length;
  if(state.stack.length||state.pendingChoice||state.pendingLibrary) {
    audit.halted=true;state.pendingOpponent={reason:'Unsupported stack or choice requires manual resolution.'};
    warn(state,'Scripted opponent paused on an unresolved effect; inspect and adjudicate before continuing.');
    return false;
  }
  audit.halted=false;delete state.pendingOpponent;
  if(state.finished) return true;
  const p=state.players[player];
  for(const x of p.battlefield) if(canAttack(state,x)) x.attacking=true;
  if(p.battlefield.some(x=>x.attacking))combat(state,player);
  log(state,`Scripted opponent turn: ${audit.actions} cumulative recognized actions; ${audit.unknownHandCount} hand card(s) still require manual coverage (card identities kept hidden).`);
  return true;
}
function endCurrent(state) {
  if(state.turnStep!=='end-step'){
    if(!state.combatDone){
      for(const step of ['beginning-of-combat','declare-attackers','declare-blockers','first-strike-damage','combat-damage','end-of-combat','postcombat-main'])
        enterTurnStep(state,step,{skipped:true});
    }
    enterTurnStep(state,'end-step');
  }
  while((state.delayedEndSteps||[]).some(x=>x.createdTurn<=state.turn)){
    const index=state.delayedEndSteps.findIndex(x=>x.createdTurn<=state.turn),event=state.delayedEndSteps.splice(index,1)[0];
    startMatchReview(state,event.controller,'synthetic-destiny',event.required,'Synthetic Destiny · next end step');
    log(state,`Synthetic Destiny delayed trigger from ${event.sourceId} resolves at beginning of this end step. No cards were revealed before this step.`);
    if(state.activePlayer===0&&event.controller===0){state.pendingEndStepResume='user';return false;}
    if(event.controller===0)warn(state,'Human-controlled delayed reveal at opponent end step uses deterministic allocation because interactive opponent end-step priority is not modeled.');
    const pending=state.pendingLibrary;
    commitLibraryReview(state,{order:pending.ids.slice(),destinations:{},shuffle:false});
    log(state,'Scripted end-step reveal: deterministic recorded order and mandatory library shuffle, no speculative strategic selection.');
  }
  const p = state.players[state.activePlayer];
  if (!p.landPlayed) stat(state, state.activePlayer, 'missedLandDrops');
  p.manaPool = pool();
  for (const player of state.players) for (const instance of player.battlefield) { instance.damage = 0; instance.attacking = false; delete instance.tempPower; delete instance.tempToughness; delete instance.deathtouchDamage; delete instance.temporaryHaste; delete instance.manualMana; }
  const row = state.roundStats.find(x => x.round === state.round);
  if (row) for (let i = 0; i < 2; i++) row.players[i].lifeRemaining = state.players[i].life;
  enterTurnStep(state,'cleanup');
  return true;
}
function finishRound(state) {
  if (state.round >= state.roundLimit) { state.finished = true; state.phase = 'finished'; state.finishReason = 'Round limit reached'; log(state, `${state.roundLimit}-round test complete.`); return false; }
  state.round++; return true;
}
function endTurn(state) {
  if (state.phase !== 'main' || state.activePlayer !== 0) throw new Error('Keep an opening hand before ending your turn.');
  if (state.stack.length||state.responseWindow) throw new Error('Close the response window and resolve stack objects before ending the turn.');
  if(!endCurrent(state))return;
  if (state.startingPlayer === 0) {
    beginTurn(state, 1); if(!autoTurn(state, 1))return; endCurrent(state);
    if (state.finished || !finishRound(state)) return;
    beginTurn(state, 0);
  } else {
    if (!finishRound(state)) return;
    beginTurn(state, 1); if(!autoTurn(state, 1))return; endCurrent(state);
    if (!state.finished) beginTurn(state, 0);
  }
}
function startKeptGame(state) {
  if (state.startingPlayer === 1) { beginTurn(state, 1); if(!autoTurn(state,1))return; endCurrent(state); }
  if (!state.finished) beginTurn(state, 0);
}

export function createGame({ deck = [], opponentDeck = [], commander = null, opponentCommander = null, seed = 'morrow', life = 40, rounds = 10, onPlay = true } = {}) {
  if (!Array.isArray(deck) || !Array.isArray(opponentDeck)) throw new Error('Decks must be arrays of card definitions.');
  if (!Number.isInteger(rounds) || rounds < 8 || rounds > 12) throw new Error('Choose 8 to 12 rounds.');
  if (!Number.isFinite(life) || life <= 0) throw new Error('Starting life must be positive.');
  const state = {
    players: [deck, opponentDeck].map((cards, p) => ({ name: p ? 'Scripted opponent' : 'You', life, library: cards.map((card, i) => fresh(card, p, i)), hand: [], battlefield: [], graveyard: [], exile: [], command: [commander, opponentCommander][p] ? [fresh([commander, opponentCommander][p], p, 'commander', true)] : [], commanderId: [commander, opponentCommander][p] ? `p${p}-commander` : null, returnCommanderOnDeath: true, passive: p === 1 && !cards.length, mulligans: 0, kept: false, landPlayed: false, manaPool: pool() })),
    stack: [], activePlayer: 0, round: 1, turn: 0, phase: 'opening', turnStep:'opening', turnStepHistory:[],manualStepEvents:[], log: [], seed: String(seed), rngState: hash(seed), finished: false, roundLimit: rounds, startingPlayer: onPlay ? 0 : 1, combatDone: false,
    stats: [{}, {}], roundStats: [], warnings: [], lastRandom: null, nextTriggerId: 0, nextTokenId: 0, nextTriggerBatchId: 0, opponentAudit:{turns:0,actions:0,casts:0,activatedAbilities:0,triggerResolutions:0,unknownHandCount:0,halted:false,publicActions:[]},
  };
  for (const p of state.players) { shuffle(state, p.library); p.hand = p.library.splice(0, 7); }
  if (opponentDeck.length) autoKeep(state, 1); else { state.players[1].kept = true; warn(state, 'Opponent has no deck: passive goldfish practice; no opposing draws or actions.'); }
  for (const row of [...coverage(deck), ...coverage(opponentDeck)]) if (row.status !== 'supported') warn(state, `${row.name}: ${row.reason}`);
  log(state, 'Bounded practice engine: named Ovika, Iconoclast, Gatekeeper, Sai, Sram, Etherium Spinner, Whirlwind and Shorikai interactions are audited; other abilities and all hidden decision policies are incomplete. This is not an accurate game win-rate predictor.');
  return state;
}
/** Face-up exile card associations; no automatic Oracle permission is inferred. */
export function linkedExiles(state, sourceId=null) {
  return state.players.flatMap((p,owner)=>p.exile.filter(x=>x.exiledBy && (sourceId===null||x.exiledBy.sourceId===sourceId))
    .map(x=>({id:x.id,name:named(x.card),owner,sourceId:x.exiledBy.sourceId,sourceName:x.exiledBy.sourceName})));
}
// Public, narrowly bounded opponent reaction: no fabricated responses or free casts.
// No hidden hand identities are revealed unless one is actually cast.
function scriptedCounterResponse(state){
  const window=state.responseWindow;
  if(!window||window.priorityPlayer!==1)return false;
  window.responses ??= 0;
  if(window.responses>=2)return false;
  const top=state.stack.at(-1);
  if(!top||top.controller!==0)return false;
  const names=['Stifle','Negate','Counterspell','Disallow'];
  const candidates=state.players[1].hand.filter(x=>names.includes(named(x.card)))
    .sort((a,b)=>names.indexOf(named(a.card))-names.indexOf(named(b.card))||a.id.localeCompare(b.id));
  for(const card of candidates){
    const adapter=profile(card.card);
    if(!validTarget(state,1,top.id,adapter.target)||!payment(state,1,card.card))continue;
    // The cast itself performs the same normal payment and target validation as a human cast.
    play(state,1,card.id,top.id);
    state.responseWindow.responses++;
    state.responseWindow.priorityPlayer=0;
    state.responseWindow.passes=0;
    state.opponentAudit.counterResponses=(state.opponentAudit.counterResponses||0)+1;
    log(state,`Scripted opponent responds with ${named(card.card)} targeting ${named(top.card)}. Paid from available mana; human regains priority. This is a fixed priority policy.`);
    return true;
  }
  return false;
}
function apply(state, action) {
  if(state.pendingLegend&&action.type!=='chooseLegendToKeep')throw new Error('Complete the pending legend-rule choice before any other action.');
  if (!action || !action.type) throw new Error('Choose an action.');
  const player = action.player ?? 0;
  if (![0, 1].includes(player)) throw new Error('Player must be 0 or 1.');
  if(state.pendingLibrary&&!['commitLibraryReview','cancelLibraryReview'].includes(action.type))throw new Error('Complete the library allocation before taking another action.');
  const activeTypes = ['play', 'attack', 'combat', 'endTurn', 'resolve'];
  if (state.finished && activeTypes.includes(action.type)) throw new Error('This test is finished. Start a new test to continue.');
  switch (action.type) {
    case 'mulligan': mulligan(state, 0); break;
    case 'keep':
      if (state.phase !== 'opening') throw new Error('Opening hand already kept.');
      keep(state, 0, action.bottomIds || []); startKeptGame(state); break;
    case 'chooseLegendToKeep': {
      const choice=state.pendingLegend;
      if(!choice||choice.player!==player||!choice.ids.includes(action.id))throw new Error('Choose one of the conflicting legendary permanents to keep.');
      for(const id of choice.ids.filter(x=>x!==action.id)){
        const where=find(state,id);
        if(!where||where.zone!=='battlefield'||where.player!==choice.player)continue;
        const lost=remove(state,where);
        departureToGraveyard(state,lost,choice.player);
      }
      log(state,`Legend rule: ${state.players[player].name} keeps ${choice.name} (${action.id}).`);
      delete state.pendingLegend;
      break;
    }
    case 'chooseReflectionsType': {
      const where=find(state,action.id);
      if(!where||where.zone!=='battlefield'||where.player!==player||named(where.instance.card)!=='Reflections of Littjara')throw new Error('Choose Reflections of Littjara on your battlefield.');
      if(where.instance.chosenCreatureType)throw new Error('Reflections creature type has already been chosen.');
      if(typeof action.chosenType!=='string'||!(/^[A-Za-z][A-Za-z -]{0,35}$/.test(action.chosenType)))throw new Error('Specify a valid creature subtype such as Zombie or Merfolk.');
      const chosen=action.chosenType.trim();
      if(['Creature','Artifact','Enchantment','Land','Planeswalker','Instant','Sorcery','Legendary','Token'].includes(chosen))throw new Error('Choose a creature subtype, not a card type or supertype.');
      where.instance.chosenCreatureType=chosen;
      log(state,`Reflections of Littjara (${where.instance.id}) chooses ${chosen}. Casting a matching creature spell queues a spell-copy trigger.`);
      break;
    }
    case 'chooseCloudKeyType': {
      const source=find(state,action.id);
      if(!source||source.zone!=='battlefield'||source.player!==player||named(source.instance.card)!=='Cloud Key')throw new Error('Choose a Cloud Key you control.');
      if(source.instance.costChosenType)throw new Error('Cloud Key type already chosen; it cannot be changed.');
      if(!CHOSEN_CARD_TYPES.includes(action.chosenType))throw new Error('Choose artifact, creature, enchantment, instant or sorcery.');
      source.instance.costChosenType=action.chosenType;
      log(state,`Cloud Key (${source.instance.id}) choice recorded: ${action.chosenType}. That type's spells cost {1} less to cast.`);
      break;
    }
    case 'imprintSemblanceAnvil': {
      const source=find(state,action.id),candidate=find(state,action.cardId);
      if(!source||source.zone!=='battlefield'||source.player!==player||named(source.instance.card)!=='Semblance Anvil'||source.instance.imprintResolved)throw new Error('Choose an unresolved Semblance Anvil imprint.');
      if(!candidate||candidate.zone!=='hand'||candidate.player!==player||type(candidate.instance.card,'Land'))throw new Error('Imprint a nonland card from your hand.');
      const types=[...cardTypes(candidate.instance.card)];
      if(!types.length)throw new Error('Unrecognized card types are not eligible for the bounded imprint adapter.');
      const chosen=remove(state,candidate);
      chosen.exiledBy={sourceId:source.instance.id,sourceName:'Semblance Anvil',sourceOwner:player,exileTurn:state.turn};
      moveTo(state,chosen,chosen.owner,'exile');
      source.instance.imprintResolved=true;
      source.instance.imprintCardTypes=types;
      source.instance.imprintCardId=chosen.id;
      log(state,`Semblance Anvil (${source.instance.id}) imprints ${named(chosen.card)}; shares ${types.join(', ')}. Spells with a shared card type cost {2} less.`);
      break;
    }
    case 'declineSemblanceAnvil': {
      const source=find(state,action.id);
      if(!source||source.zone!=='battlefield'||source.player!==player||named(source.instance.card)!=='Semblance Anvil'||source.instance.imprintResolved)throw new Error('Choose an unresolved Semblance Anvil.');
      source.instance.imprintResolved=true;
      log(state,`Semblance Anvil (${source.instance.id}): imprint declined, no discount.`);
      break;
    }
    case 'activateDarknessCrystal': {
      if(state.finished||state.phase!=='main'||state.activePlayer!==player||state.stack.length||state.pendingChoice||state.pendingLibrary)
        throw new Error('This bounded Crystal activation resolves only in your main phase with empty stack.');
      const source=find(state,action.id),target=find(state,action.targetId);
      if(!source||source.zone!=='battlefield'||source.player!==player||named(source.instance.card)!=='The Darkness Crystal'||source.instance.tapped)throw new Error('Choose your untapped Darkness Crystal.');
      if(!target||target.zone!=='exile'||!isCreature(target.instance)||target.instance.exiledBy?.sourceId!==source.instance.id||target.instance.exiledBy?.sourceName!=='The Darkness Crystal')
        throw new Error('Choose a creature card exiled by this exact Darkness Crystal.');
      const sources=state.players[player].battlefield.filter(x=>x.id!==source.instance.id).map(x=>x.id);
      const paid=payment(state,player,{name:'Darkness Crystal activation',type_line:'Activated Ability',mana_cost:'{4}{B}{B}',cmc:6},0,{sourceIds:sources},{isSpell:false});
      if(!paid)throw new Error('Pay {4}{B}{B} and tap the Crystal to return a linked exiled creature.');
      for(const step of paid.steps){const mana=find(state,step.id)?.instance;if(!mana||mana.tapped)throw new Error('Mana source unavailable.');mana.tapped=true;if(step.damage)state.players[player].life-=step.damage;if(step.lifeGain)state.players[player].life+=step.lifeGain;}
      state.players[player].manaPool=paid.pool;
      source.instance.tapped=true;
      const card=remove(state,target);
      moveTo(state,card,player,'battlefield');
      card.counters=2;card.tapped=true;
      log(state,`The Darkness Crystal (${source.instance.id}): put ${named(card.card)} onto your battlefield tapped with two additional +1/+1 counters, from linked exile. Immediate resolution shortcut: stack responses not modeled.`);
      break;
    }
    case 'activateProteusStaff': {
      if(state.finished||state.phase!=='main'||state.activePlayer!==player||state.stack.length||state.pendingChoice)throw new Error('Activate Proteus Staff in your main phase with an empty stack.');
      const staff=find(state,action.id),target=find(state,action.targetId);
      if(!staff||staff.zone!=='battlefield'||staff.player!==player||named(staff.instance.card)!=='Proteus Staff'||staff.instance.tapped)throw new Error('Choose your untapped Proteus Staff.');
      if(!target||target.zone!=='battlefield'||!isCreature(target.instance))throw new Error('Choose a battlefield creature to transform.');
      const sources=state.players[player].battlefield.filter(x=>x.id!==staff.instance.id).map(x=>x.id);
      const paid=payment(state,player,{name:'Proteus Staff activation',type_line:'Instant',mana_cost:'{2}{U}',cmc:3},0,{sourceIds:sources},{isSpell:false});
      if(!paid)throw new Error('Pay {2}{U} to activate Proteus Staff.');
      for(const step of paid.steps){const mana=find(state,step.id)?.instance;if(!mana||mana.tapped)throw new Error('Mana source unavailable.');mana.tapped=true;if(step.damage)state.players[player].life-=step.damage;if(step.lifeGain)state.players[player].life+=step.lifeGain;}
      state.players[player].manaPool=paid.pool;staff.instance.tapped=true;
      const controller=target.player,creature=remove(state,target);
      moveTo(state,creature,creature.owner,'library');
      startMatchReview(state,controller,'proteus',1,'Proteus Staff');
      log(state,`Proteus Staff: ${named(creature.card)} put on its owner library bottom; reveal from its controller library. Response timing is not modelled.`);
      break;
    }
    case 'castEmptyLaboratory': {
      if(state.finished||state.phase!=='main'||state.activePlayer!==player||state.stack.length||state.pendingChoice)throw new Error('Cast this sorcery during your main phase.');
      const x=action.x,where=find(state,action.id);
      if(!where||where.zone!=='hand'||where.player!==player||named(where.instance.card)!=='Empty the Laboratory')throw new Error('Choose Empty the Laboratory in your hand.');
      if(!Number.isInteger(x)||x<0||x>20)throw new Error('Choose X between 0 and 20.');
      const wanted={name:'Empty the Laboratory X cost',type_line:'Sorcery',mana_cost:`{${x}}{U}{U}`,cmc:x+2};
      const paid=payment(state,player,wanted);
      if(!paid)throw new Error(`Insufficient mana for Empty the Laboratory at X=${x}: pay {${x}}{U}{U}.`);
      for(const step of paid.steps){const mana=find(state,step.id)?.instance;if(!mana||mana.tapped)throw new Error('A chosen mana source is unavailable.');mana.tapped=true;if(step.damage)state.players[player].life-=step.damage;if(step.lifeGain)state.players[player].life+=step.lifeGain;}
      state.players[player].manaPool=paid.pool;
      const spell=remove(state,where);spell.controller=player;spell.paidX=x;state.stack.push(spell);
      stat(state,player,'cardsCast');queueCastInteractions(state,player,spell.card);
      log(state,`Empty the Laboratory cast for X=${x}; {${x}}{U}{U} paid with the normal mana planner. Choose Zombies when it resolves.`);
      finishIfLethal(state);break;
    }
    case 'resolveEmptyLaboratory': {
      const where=find(state,action.id);
      if(!where||where.zone!=='stack'||named(where.instance.card)!=='Empty the Laboratory'||state.stack.at(-1)?.id!==where.instance.id)throw new Error('Resolve the paid Empty the Laboratory at the top of the stack.');
      if(!Array.isArray(action.sacrificeIds)||new Set(action.sacrificeIds).size!==action.sacrificeIds.length||action.sacrificeIds.length>30||!Number.isInteger(where.instance.paidX))throw new Error('Choose distinct Zombies for a spell cast with validated X payment.');
      const availableZombies=state.players[where.player].battlefield.filter(x=>qualifies(x,'zombie'));
      if(action.sacrificeIds.length!==Math.min(where.instance.paidX,availableZombies.length))throw new Error('Sacrifice X Zombies, or all available Zombies if fewer than X.');
      for(const id of action.sacrificeIds){const loc=find(state,id);if(!loc||loc.zone!=='battlefield'||loc.player!==where.player||!qualifies(loc.instance,'zombie'))throw new Error('Choose only Zombies you control.');}
      for(const id of action.sacrificeIds){const loc=find(state,id),victim=remove(state,loc);departureToGraveyard(state,victim,where.player);}
      const spell=remove(state,where);moveTo(state,spell,spell.owner,'graveyard');
      startMatchReview(state,where.player,'empty-lab',action.sacrificeIds.length,'Empty the Laboratory');
      log(state,`Empty the Laboratory: ${action.sacrificeIds.length} Zombie(s) sacrificed after casting for X=${spell.paidX}.`);
      break;
    }
    case 'startLibraryReview': {
      if(state.finished||!state.players[0].kept)throw new Error('Keep the opening hand first.');
      startLibraryReview(state,action.targetPlayer,action.mode,action.count,action.sourceName||'Manual library review');
      break;
    }
    case 'commitLibraryReview':commitLibraryReview(state,action);break;
    case 'cancelLibraryReview':{
      if(!state.pendingLibrary||!['look','reveal-nonland'].includes(state.pendingLibrary.mode))throw new Error('This required spell resolution cannot be cancelled; use Undo if necessary.');
      log(state,`${state.pendingLibrary.sourceName}: manual library review cancelled without moving any cards.`);
      delete state.pendingLibrary;break;
    }
    case 'play': play(state, player, action.id, action.targetId, action.sourceIds ? {sourceIds:action.sourceIds,sourceChoices:action.sourceChoices||{}} : null); break;
    case 'promoteCastTrigger':{
      const index=state.stack.findIndex(x=>x.id===action.id),trigger=state.stack[index],above=state.stack[index+1];
      if(!trigger||!above||trigger.kind!=='trigger'||above.kind!=='trigger'||trigger.controller!==0||above.controller!==0||!Number.isInteger(trigger.trigger?.batchId)||trigger.trigger?.batchId!==above.trigger?.batchId)
        throw new Error('Only adjacent triggers you control from the same cast event may be reordered.');
      [state.stack[index],state.stack[index+1]]=[above,trigger];
      log(state,`Trigger order changed: ${named(trigger.card)} will resolve before ${named(above.card)}. Same-event, single-controller ordering only.`);
      break;
    }
    case 'openResponseWindow':{
      if(state.finished||state.phase!=='main'||state.activePlayer!==0||!state.stack.length||state.pendingChoice||state.pendingLibrary)
        throw new Error('Open a response window on an unresolved stack during your main phase.');
      if(state.responseWindow)throw new Error('Response window already open.');
      state.responseWindow={priorityPlayer:0,passes:0,responses:0};
      log(state,'Response window opened: you have priority. The scripted opponent has no supported response policy and will pass deterministically.');
      break;
    }
    case 'passResponse':{
      if(!state.responseWindow||!state.stack.length||state.pendingChoice||state.pendingLibrary)
        throw new Error('Open a response window with a nonempty stack.');
      if(player!==state.responseWindow.priorityPlayer||player!==0)throw new Error('Only your currently held priority may be passed in this bounded response window.');
      const top=state.stack.at(-1),adapter=profile(top.card);
      if((top.kind!=='trigger'&&(!adapter.auto||adapter.status==='manual'))||(top.trigger?.adapter==='loyalty-manual'))
        throw new Error('Top of stack needs explicit manual effect adjudication before both players can pass.');
      state.responseWindow.priorityPlayer=1;
      if(scriptedCounterResponse(state))break;
      state.responseWindow.priorityPlayer=0;
      log(state,`You pass priority; scripted opponent passes. Two consecutive passes resolve ${named(top.card)}.`);
      resolve(state);
      if(state.responseWindow){
        if(state.stack.length&&!state.pendingChoice&&!state.pendingLibrary){
          state.responseWindow.priorityPlayer=0;state.responseWindow.passes=0;
          log(state,`You regain priority with ${state.stack.length} object(s) remaining on the stack.`);
        }else{delete state.responseWindow;log(state,'Response window closed (stack empty or a choice requires adjudication).');}
      }
      break;
    }
    case 'closeResponseWindow':{
      if(!state.responseWindow)throw new Error('No response window is open.');
      delete state.responseWindow;log(state,'Response window closed; quick Resolve shortcut remains available.');break;
    }
    case 'resolve': {
      if(state.responseWindow)throw new Error('Use Pass priority and the scripted opponent pass to resolve in the active response window.');
      if(state.stack.length)log(state,'Quick Resolve: implicitly assumes both players pass; not a full priority simulation.');
      resolve(state);break;
    }
    case 'tap': {
      const location = find(state, action.id);
      if (!location || location.zone !== 'battlefield') throw new Error('Choose a battlefield card.');
      const instance = location.instance, source = manaSource(instance.card,state,location.player);
      if (!instance.tapped && source && sickness(state, instance)) throw new Error('A summoning-sick creature cannot activate its tap mana ability.');
      if(!instance.tapped && source){
        const option=source.options[action.choiceIndex ?? 0];
        if(!option) throw new Error('Select one available mana color or mode.');
        let available={...state.players[location.player].manaPool};
        let activationSpent={};
        const actualGeneric=source.optionActivationGeneric?.[action.choiceIndex??0]??source.activationGeneric??0;
        if(actualGeneric){
          const before={...available};
          const costToActivate={generic:actualGeneric,...pool()};
          available=spendPool(available,costToActivate);
          if(!available)throw new Error(`Tap another mana source first: ${named(instance.card)} needs ${actualGeneric} mana to activate.`);
          activationSpent=Object.fromEntries(COLORS.filter(c=>before[c]!==available[c]).map(c=>[c,before[c]-available[c]]));
        }
        for(const [color,amount] of Object.entries(option))available[color]+=amount;
        const activationCost=source.optionActivationGeneric?.[action.choiceIndex??0]??source.activationGeneric??0;
        const gain=source.optionLifeGain?.[action.choiceIndex??0]||0;
        if(gain){state.players[location.player].life+=gain;log(state,`${named(instance.card)} gains ${gain} life from its mana ability.`);}
        const pain=source.optionDamage?.[action.choiceIndex??0]||0;
        if(pain){state.players[location.player].life-=pain;log(state,`${named(instance.card)} deals ${pain} damage to ${state.players[location.player].name} for colored mana.`);}
        state.players[location.player].manaPool=available;
        instance.manualMana={option:action.choiceIndex??0,produced:option,activationSpent,damage:source.optionDamage?.[action.choiceIndex??0]||0,lifeGain:gain};
      }else if(instance.tapped && instance.manualMana){
        // Rewind only unspent floating mana; never create negative balances.
        const next={...state.players[location.player].manaPool};
        for(const [color,n] of Object.entries(instance.manualMana.produced)){
          if(next[color]<n)throw new Error('Mana from this source was already spent. Use Undo instead of untapping to reverse the payment.');
          next[color]-=n;
        }
        for(const [c,n] of Object.entries(instance.manualMana.activationSpent||{}))next[c]+=n;
        state.players[location.player].manaPool=next;
        if(instance.manualMana.damage)state.players[location.player].life+=instance.manualMana.damage;
        if(instance.manualMana.lifeGain)state.players[location.player].life-=instance.manualMana.lifeGain;
        delete instance.manualMana;
      }
      instance.tapped=!instance.tapped;
      finishIfLethal(state);
      log(state,`${named(instance.card)} ${instance.tapped?'tapped':'manually untapped'}${source?`; floating mana ${COLORS.filter(c=>state.players[location.player].manaPool[c]).map(c=>`${state.players[location.player].manaPool[c]}${c}`).join(' ')||'empty'}`:'; unmodeled mana ability'}.`);break;
    }
    case 'attack':
      if (state.phase !== 'main' || state.activePlayer !== player) throw new Error('Declare attackers during your turn.');
      attack(state, player, action.id); break;
    case 'combat':
      if (state.phase !== 'main' || state.activePlayer !== player) throw new Error('Resolve combat during your turn.');
      combat(state, player, action.assignments); break;
    case 'assist': {
      if (player !== 0) throw new Error('Assisted play operates on your table only.');
      if (!['land','next','main'].includes(action.mode)) throw new Error('Choose land, next, or main assistance.');
      const steps=action.mode==='main' ? 35 : 1; let applied=0;
      for (let i=0;i<steps;i++) {if (!assistedStep(state,player,action.mode)) break;applied++;}
      if (!applied) warn(state,'No further fully payable, recognized play; inspect your hand and use manual controls for unmodeled effects.');
      log(state,`Guided ${action.mode} play: ${applied} action(s); no automatic end turn or combat.`); break;
    }
    case 'manualSourceMana': {
      const x=find(state,action.id),amount=action.amount,color=action.color;
      if(!x||x.zone!=='battlefield'||x.player!==player||x.instance.tapped)
        throw new Error('Choose an untapped mana-producing permanent you control.');
      if(!['Land','Artifact','Creature'].some(kind=>type(x.instance.card,kind)))throw new Error('This permanent has no mana-source category.');
      if(!COLORS.includes(color)||!Number.isInteger(amount)||amount<1||amount>3)
        throw new Error('Choose one mana color and a quantity between 1 and 3.');
      if(isCreature(x.instance)&&sickness(state,x.instance))throw new Error('A summoning-sick creature cannot use a tap mana ability.');
      // Explicit manual override: no Oracle permission is inferred, so this must remain auditable.
      const own=state.players[player];
      own.manaPool[color]+=amount;
      x.instance.manualMana={option:null,produced:{[color]:amount},activationSpent:{},manualOverride:true};
      x.instance.tapped=true;
      log(state,`Manual mana override: ${own.name} taps ${named(x.instance.card)} and declares ${amount}${color}. Verify the printed activation cost and restrictions; not auto-validated.`);
      warn(state,`${named(x.instance.card)}: mana was supplied by explicit manual override, not an automated rule.`);
      break;
    }
    case 'createTokenCopy': {
      if(state.finished||!state.players[0].kept)throw new Error('Keep the table before creating manual token copies.');
      const target=find(state,action.targetId),source=action.sourceId?find(state,action.sourceId):null;
      const quantity=action.count??1;
      if(!target||target.zone!=='battlefield'||!['Creature','Artifact','Enchantment','Planeswalker','Land','Battle'].some(t=>type(target.instance.card,t)))
        throw new Error('Choose an existing battlefield permanent to copy.');
      if(action.sourceId&&(!source||!['battlefield','stack'].includes(source.zone)||source.instance.kind==='trigger'))
        throw new Error('Choose a source permanent/spell on the battlefield or stack, or leave source unlinked.');
      if(!Number.isInteger(quantity)||quantity<1||quantity>20)throw new Error('Choose 1–20 manual token copies.');
      if(![0,1].includes(player))throw new Error('Choose token controller.');
      const snapshot=clone(target.instance.card);
      const origin={id:target.instance.id,name:named(target.instance.card)};
      const linked=source?{id:source.instance.id,name:named(source.instance.card)}:null;
      const total=tokenCount(state,player,quantity);
      for(let i=0;i<total;i++)createTokenCopy(state,player,snapshot,origin,linked,'manual');
      log(state,`Manual token-copy allocation: ${quantity} copy/copies of ${origin.name}; no printed source ability, targeting, cost or legal trigger condition inferred.`);
      cleanupDead(state);break;
    }
    case 'mill': {
      if(state.finished||!state.players[0].kept)throw new Error('Finish opening the table before milling.');
      const target=action.targetPlayer;
      if(![0,1].includes(target)||!Number.isInteger(action.count)||action.count<1||action.count>99)
        throw new Error('Choose yourself or the opponent and 1 to 99 cards.');
      const owner=state.players[target],quantity=Math.min(action.count,owner.library.length);
      const names=[];
      for(let i=0;i<quantity;i++){
        const card=owner.library.shift();names.push(named(card.card));moveTo(state,card,target,'graveyard');
      }
      stat(state,target,'cardsMilled',quantity);
      log(state,`Manual mill: ${owner.name} mills ${quantity} of ${action.count} requested card(s) to their graveyard${names.length?': '+names.join(', '):'; library empty'}. This is not a draw; any mill/replacement triggers require manual adjudication.`);
      if(quantity<action.count)warn(state,`${owner.name} has only ${quantity} cards left to mill; milling an empty library does not itself lose the game.`);
      break;
    }
    case 'exileLinked': {
      if(state.finished||!state.players[0].kept)throw new Error('Keep the opening hand before using linked exile.');
      const target=find(state,action.id),source=find(state,action.sourceId);
      if(!target||!['battlefield','graveyard','stack'].includes(target.zone)||target.instance.kind==='trigger'||target.instance.isToken)
        throw new Error('Choose a nontoken card on the battlefield, in a graveyard or on the stack to exile.');
      if(!source||!['battlefield','stack'].includes(source.zone)||source.instance.kind==='trigger'||source.instance.id===target.instance.id)
        throw new Error('Choose a different permanent or spell on the battlefield or stack as the exile source.');
      const card=remove(state,target);
      // The exiled card is held in its OWNER'S exile zone; previous controller is not ownership.
      moveTo(state,card,card.owner,'exile');
      card.exiledBy={sourceId:source.instance.id,sourceName:named(source.instance.card),sourceOwner:source.instance.owner,exileTurn:state.turn};
      log(state,`Manual linked exile: ${named(card.card)} (owner: ${state.players[card.owner].name}) exiled from ${target.zone} by ${card.exiledBy.sourceName} (${card.exiledBy.sourceId}); any triggers and later permissions must be verified manually.`);
      if(card.isCommander)warn(state,'A commander exiled this way may have a command-zone choice; move it to command zone manually if appropriate.');
      break;
    }
    case 'castLinkedExile': {
      const target=find(state,action.id);
      if(!target||target.zone!=='exile'||!target.instance.exiledBy)throw new Error('Choose a card explicitly associated with an exile source.');
      if(action.withoutPaying!==true && action.withoutPaying!==false)throw new Error('Choose either ordinary mana payment or explicit manual free-cast permission.');
      play(state,player,action.id,action.targetId,
        action.sourceIds?{sourceIds:action.sourceIds,sourceChoices:action.sourceChoices||{}}:null,
        {fromLinkedExile:true,withoutPaying:action.withoutPaying});
      break;
    }
    case 'returnLinkedExile': {
      if(state.finished||!state.players[0].kept)throw new Error('A finished game cannot move a permanent.');
      const target=find(state,action.id);
      if(!target||target.zone!=='exile'||!target.instance.exiledBy)throw new Error('Choose an exiled card linked to a source.');
      if(!['battlefield','hand','graveyard'].includes(action.zone))throw new Error('Return linked exile to battlefield, hand or graveyard.');
      if(action.zone==='battlefield'&&!/(Creature|Artifact|Enchantment|Planeswalker|Battle|Land)/i.test(target.instance.card.type_line||target.instance.card.card_faces?.[0]?.type_line||''))
        throw new Error('Only permanent cards may be placed directly on the battlefield.');
      const source={...target.instance.exiledBy};const card=remove(state,target);
      const controller=action.zone==='battlefield'?player:card.owner;
      moveTo(state,card,controller,action.zone);
      log(state,`Manual linked exile return: ${named(card.card)} from ${source.sourceName} (${source.sourceId}) to ${state.players[controller].name}'s ${action.zone}, without casting or paying costs. Any ETB and source effects are user-adjudicated.`);
      warn(state,'Manual linked exile return does not verify the originating card or resolve its printed ability.');
      break;
    }
    case 'drawCard': {
      if(state.finished || !state.players[player].kept)throw new Error('Keep the opening hand before drawing.');
      if(action.count!==undefined && (action.count!==1||!Number.isInteger(action.count)))throw new Error('The manual Draw card control draws exactly one card.');
      if(state.players[player].library.length===0){draw(state,player,1);break;}
      draw(state,player,1);
      log(state,`Manual draw: ${state.players[player].name} draws one card; not attributed to an automated Oracle trigger.`);
      break;
    }
    case 'activateShorikai': activateShorikai(state,player,action.id);break;
    case 'chooseDiscard': {
      if(!state.pendingChoice||state.pendingChoice.kind!=='shorikai-discard'||state.pendingChoice.player!==player)
        throw new Error('No pending Shorikai discard choice.');
      const location=find(state,action.id);
      if(!location||location.player!==player||location.zone!=='hand')throw new Error('Choose one card from your hand to discard.');
      const card=remove(state,location);moveTo(state,card,player,'graveyard');
      delete state.pendingChoice;makePilot(state,player);log(state,`${state.players[player].name} discards ${named(card.card)} for Shorikai.`);break;
    }
    case 'resumeOpponent': {
      if(!state.pendingOpponent||state.activePlayer!==1||state.stack.length||state.pendingChoice)
        throw new Error('Opponent can resume only after the unresolved stack and choices are adjudicated.');
      if(!autoTurn(state,1))break;
      endCurrent(state);
      if(state.startingPlayer===0 && !state.finished && !finishRound(state))break;
      if(state.startingPlayer===1 && !state.finished && !finishRound(state))break;
      if(!state.finished)beginTurn(state,0);
      break;
    }
    case 'endTurn':
      if(state.pendingChoice)throw new Error('Complete the pending Shorikai discard choice before ending your turn.');
      endTurn(state);break;
    case 'life':
      if (!Number.isFinite(action.delta)) throw new Error('Life change must be a number.');
      state.players[player].life += action.delta; log(state, `${state.players[player].name}: life ${action.delta >= 0 ? '+' : ''}${action.delta}, now ${state.players[player].life}.`); break;
    case 'counter': {
      const location = find(state, action.id);
      if (!location || location.zone !== 'battlefield' || !Number.isInteger(action.delta) || location.instance.counters + action.delta < 0) throw new Error('Choose a battlefield card and a valid +1/+1 counter change.');
      if(type(location.instance.card,'Planeswalker'))throw new Error('Use loyalty controls for planeswalkers; +1/+1 counters are not loyalty.');
      location.instance.counters += action.delta; log(state, `${named(location.instance.card)}: ${location.instance.counters} +1/+1 counter(s).`); cleanupDead(state); break;
    }
    case 'loyaltyAdjust': {
      const where=find(state,action.id);
      if(!where||where.zone!=='battlefield'||!type(where.instance.card,'Planeswalker')||!Number.isInteger(action.delta)||Math.abs(action.delta)>100)
        throw new Error('Choose a planeswalker and a valid loyalty adjustment.');
      where.instance.loyalty=Math.max(0,(where.instance.loyalty||0)+action.delta);
      log(state,`Manual loyalty adjustment: ${named(where.instance.card)} ${action.delta>=0?'+':''}${action.delta}, now ${where.instance.loyalty}. No ability effect was applied.`);
      cleanupDead(state);break;
    }
    case 'activateLoyalty': {
      const where=find(state,action.id);
      if(!where||where.zone!=='battlefield'||where.player!==player||!type(where.instance.card,'Planeswalker'))throw new Error('Choose a planeswalker you control.');
      if(state.finished||state.activePlayer!==player||state.phase!=='main'||state.stack.length)
        throw new Error('Loyalty abilities require your main phase and an empty stack.');
      if(where.instance.loyaltyActivatedTurn===state.turn)throw new Error('This planeswalker already activated a loyalty ability this turn.');
      const ability=loyaltyOptions(where.instance.card).find(x=>x.delta===action.delta);
      if(!ability)throw new Error('Choose a printed loyalty ability; unrecognized costs require manual handling.');
      if(action.delta<0 && (where.instance.loyalty||0)<-action.delta)throw new Error('Not enough loyalty to activate that ability.');
      where.instance.loyalty+=action.delta;
      where.instance.loyaltyActivatedTurn=state.turn;
      state.stack.push({id:`p${player}-trigger-${state.nextTriggerId++}`,owner:player,controller:player,
        kind:'trigger',sourceId:where.instance.id,card:{name:`${named(where.instance.card)} — ${ability.label} loyalty`,type_line:'Activated Ability',cmc:0,oracle_text:ability.effect},
        trigger:{adapter:'loyalty-manual',count:1}});
      log(state,`${named(where.instance.card)} activates ${ability.label} loyalty (now ${where.instance.loyalty}); resolve the printed effect manually before clearing its ability from the stack.`);
      warn(state,`${named(where.instance.card)} loyalty ability effect requires manual resolution. Loyalty cost/limit are tracked.`);
      cleanupDead(state);break;
    }
    case 'move': {
      if (!ZONES.includes(action.zone)) throw new Error('Choose a supported destination zone.');
      const location = find(state, action.id); if (!location) throw new Error('Card not found.');
      if (location.instance.kind === 'trigger') throw new Error('Resolve the triggered ability from the stack instead of moving it to a card zone.');
      const fromBattlefield=location.zone==='battlefield'&&action.zone==='graveyard'&&isCreature(location.instance);
      const originController=location.player;
      const instance=remove(state,location);
      if(fromBattlefield)departureToGraveyard(state,instance,originController,{keepCommanderInGraveyard:action.keepCommanderInGraveyard===true});
      else moveTo(state,instance,player,action.zone,{keepCommanderInGraveyard:action.keepCommanderInGraveyard===true});
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
  refreshLegendChoice(state);
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
  const skippedCards = [...new Set([...deck, ...opponentDeck].filter(card => !profile(card).auto && !type(card,'Land')).map(named))];
  const notes = [
    'Bounded deterministic policy, not a complete Magic rules engine or competitive win-rate estimate.',
    'London mulligan policy keeps 2–5 lands, attempts at most two mulligans, and bottoms excess lands or expensive cards; no free mulligan.',
    'First player skips the first draw. Each round includes one turn per player. One legal land drop and one combat per turn.',
    'Runs stop at lethal damage, a failed draw from an empty library, or the round limit. Summary means include every run; per-round means include only runs reaching that round (runsObserved), so later rounds may reflect survivors.',
    'Targets use public battlefield threat factors only. Opposing hands and libraries never influence threat ranking.',
    'Combat supports one blocker per attacker and numeric power/toughness. Scripted runs cast named supported commanders (currently Ovika), evaluate known mana and land drops, and resolve the verified Ovika/Iconoclast/Gatekeeper triggers; commander damage, unmodeled triggers, multiplayer, alternate costs and general stack-response decisions remain manual.',
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
