import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,suggestions,opponentDiagnostics} from '../web/engine.mjs';
const land={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const plains={...land,name:'Plains',type_line:'Basic Land — Plains',oracle_text:'{T}: Add {W}.'};
const swamp={...land,name:'Swamp',type_line:'Basic Land — Swamp',oracle_text:'{T}: Add {B}.'};
const ring={name:'Sol Ring',type_line:'Artifact',mana_cost:'{1}',cmc:1,oracle_text:'{T}: Add {C}{C}.'};
const sai={name:'Sai, Master Thopterist',type_line:'Legendary Creature — Human Artificer',mana_cost:'{2}{U}',cmc:3,power:'1',toughness:'4',oracle_text:'Whenever you cast an artifact spell, create a 1/1 colorless Thopter artifact creature token with flying.\n{1}{U}, Sacrifice two artifacts: Draw a card.'};
const spinner={name:'Etherium Spinner',type_line:'Artifact Creature — Human Wizard',mana_cost:'{2}{U}',cmc:3,power:'2',toughness:'1',oracle_text:'Whenever you cast a spell with mana value 4 or greater, create a 1/1 colorless Thopter artifact creature token with flying.'};
const sram={name:'Sram, Senior Edificer',type_line:'Legendary Creature — Dwarf Advisor',mana_cost:'{1}{W}',cmc:2,power:'2',toughness:'2',oracle_text:'Whenever you cast an Aura, Equipment, or Vehicle spell, draw a card.'};
const whirlwind={name:'Whirlwind of Thought',type_line:'Enchantment',mana_cost:'{1}{U}{R}{W}',cmc:4,oracle_text:'Whenever you cast a noncreature spell, draw a card.'};
const gear={name:'Swiftfoot Boots',type_line:'Artifact — Equipment',mana_cost:'{2}',cmc:2,oracle_text:'Equipped creature has hexproof and haste. Equip {1}'};
const shorikai={name:'Shorikai, Genesis Engine',type_line:'Legendary Artifact — Vehicle',mana_cost:'{2}{W}{U}',cmc:4,oracle_text:'{1}, {T}: Draw two cards, then discard a card. Create a 1/1 colorless Pilot creature token.\nCrew 8'};
const whisper={name:"Night's Whisper",type_line:'Sorcery',mana_cost:'{1}{B}',cmc:2,oracle_text:'You draw two cards and lose 2 life.'};
const filler={name:'Very Expensive Test Creature',type_line:'Creature — Beast',mana_cost:'{8}',cmc:8,power:'6',toughness:'6',oracle_text:'It cannot be cast using the available mana.'};
const unknown={name:'Unmodelled Complex Sorcery',type_line:'Sorcery',mana_cost:'{2}{U}',cmc:3,oracle_text:'Each player secretly chooses a mode.'};
const instance=(card,id,owner=1)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
function game(){return act(createGame({deck:Array(70).fill(land),opponentDeck:Array(70).fill(land),seed:'opponent-mechanics-seed',rounds:8,onPlay:true}),{type:'keep'});}

test('Opponent uses the same stack: Sai Thopter trigger resolves before equipment spell',()=>{
 let g=game();const p=g.players[1];p.hand=[instance(gear,'gear')];p.battlefield.push(instance(sai,'sai'),instance(land,'u1'),instance(land,'u2'));
 g=act(g,{type:'endTurn'});
 assert.equal(g.players[1].battlefield.filter(x=>x.isToken&&x.card.name==='Thopter').length,1);
 assert.equal(g.players[1].battlefield.find(x=>x.id==='gear')?.card.name,'Swiftfoot Boots');
 assert.equal(g.stack.length,0);
 assert.equal(opponentDiagnostics(g).casts,1);
 assert(opponentDiagnostics(g).triggerResolutions>=1);
 assert(g.log.some(x=>/Sai.*trigger|Artifact cast trigger resolves/.test(x)));
});
test('Sram draws on Equipment cast; Whirlwind draws on noncreature cast (including equipment)',()=>{
 let g=game();const p=g.players[1];p.hand=[instance(gear,'gear')];p.battlefield.push(instance(sram,'sram'),instance(whirlwind,'whirlwind'),instance(land,'u1'),instance(land,'u2'));
 const initial=p.library.length;
 g=act(g,{type:'endTurn'});
 // Opponent takes one regular turn draw plus two separate cast-trigger draws.
 assert.equal(g.players[1].library.length,initial-3);
 assert.equal(g.players[1].battlefield.find(x=>x.id==='gear')?.card.name,'Swiftfoot Boots');
 assert(g.log.some(x=>/Sram.*trigger: draw/.test(x)));
 assert(g.log.some(x=>/Whirlwind.*trigger: draw/.test(x)));
});
test('Etherium Spinner triggers on a mana value 4 spell including nonartifact card',()=>{
 let g=game();const p=g.players[1];p.hand=[instance(shorikai,'vehicle')];p.battlefield.push(instance(spinner,'spinner'),instance(land,'u1'),instance(plains,'w1'),instance(land,'u2'),instance(land,'u3'));
 g=act(g,{type:'endTurn'});
 assert.equal(g.players[1].battlefield.filter(x=>x.isToken&&x.card.name==='Thopter').length,1);
 assert(g.players[1].battlefield.some(x=>x.id==='vehicle'));
});
test('Night Whisper opponent draw and life loss are real, not a misleading name-only cast',()=>{
 let g=game();const p=g.players[1];p.hand=[instance(whisper,'whisper')];p.battlefield.push(instance(swamp,'b1'),instance(land,'u1'));
 const library=p.library.length;
 g=act(g,{type:'endTurn'});
 assert.equal(g.players[1].life,38);
 assert.equal(g.players[1].library.length,library-3,'turn draw and two spell draws');
 assert(g.players[1].graveyard.some(x=>x.card.name==="Night's Whisper"));
});
test('Scripted Shorikai can activate ability with mana, draw 2, discard one using public deterministic policy and make Pilot',()=>{
 let g=game();const p=g.players[1];p.hand=[instance(filler,'expensive')];p.battlefield.push(instance(shorikai,'shorikai'),instance(land,'u1'));
 const before=p.library.length;
 g=act(g,{type:'endTurn'});
 assert.equal(g.players[1].library.length,before-3,'turn draw plus ability draws');
 assert.equal(g.players[1].battlefield.filter(x=>x.isToken&&x.card.name==='Pilot').length,1);
 assert(g.players[1].graveyard.some(x=>x.id==='expensive'),'highest-cost discard deterministic policy');
 assert.equal(opponentDiagnostics(g).activatedAbilities,1);
 assert.equal(g.players[1].battlefield.find(x=>x.id==='shorikai').tapped,true);
 assert.equal(g.pendingChoice,undefined);
});
test('Player Shorikai requires an explicit discard choice after draw before Pilot exists',()=>{
 let g=game();const p=g.players[0];p.hand=[instance(filler,'discard-me',0)];p.battlefield.push(instance(shorikai,'shorikai',0),instance(land,'u1',0));
 g=act(g,{type:'activateShorikai',id:'shorikai'});
 assert.equal(g.stack.at(-1).trigger.adapter,'shorikai-activate');
 g=act(g,{type:'resolve'});
 assert.equal(g.pendingChoice?.kind,'shorikai-discard');
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,0);
 assert.throws(()=>act(g,{type:'endTurn'}),/pending.*discard/i);
 g=act(g,{type:'chooseDiscard',id:'discard-me'});
 assert.equal(g.pendingChoice,undefined);
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken&&x.card.name==='Pilot').length,1);
 assert(g.players[0].graveyard.some(x=>x.id==='discard-me'));
});
test('Unknown opponent cards are counted as unsupported, kept hidden and never auto-resolved or silently moved',()=>{
 let g=game();g.players[1].hand=[instance(unknown,'unknown')];g.players[1].battlefield.push(instance(land,'u1'),instance(land,'u2'),instance(land,'u3'));
 g=act(g,{type:'endTurn'});
 const audit=opponentDiagnostics(g);
 assert.equal(audit.unknownHandCount,1);
 assert.equal('unsupportedCards' in audit,false,'no hidden hand names exposed before end');
 assert(g.players[1].hand.some(x=>x.id==='unknown'));
 assert.equal(g.players[1].graveyard.some(x=>x.id==='unknown'),false);
 const revealed=opponentDiagnostics(g,{revealHand:true});assert.equal(revealed.unsupportedCards[0].name,unknown.name);
});
test('Manual loyalty trigger cannot be silently auto-resolved by the scripted policy',()=>{
 let g=game();g.stack.push({id:'manual-loyalty',owner:1,controller:1,kind:'trigger',card:{name:'Manual loyalty effect',type_line:'Activated Ability'},trigger:{adapter:'loyalty-manual'}});
 assert.deepEqual(suggestions(g,0),[]);
 g.activePlayer=1;
 assert.deepEqual(suggestions(g,1),[]);
 assert.equal(g.stack.length,1);
});
