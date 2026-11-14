import test from 'node:test';
import assert from 'node:assert/strict';
import {act,createGame,upgradeGame,simulate} from '../web/engine.mjs';

// Independent rules fixtures, not a reconstruction of a user's deck.
const forest={name:'Forest',mana_cost:'',cmc:0,type_line:'Basic Land — Forest',oracle_text:'',produced_mana:['G']};
const wastes={name:'Wastes',mana_cost:'',cmc:0,type_line:'Basic Land',oracle_text:'{T}: Add {C}.',produced_mana:['C']};
const swamp={name:'Swamp',mana_cost:'',cmc:0,type_line:'Basic Land — Swamp',oracle_text:'',produced_mana:['B']};
const bear={name:'Ordinary Bear',mana_cost:'{1}{G}',cmc:2,type_line:'Creature — Bear',oracle_text:'',power:'2',toughness:'2',keywords:[]};
const commander={...bear,name:'Fixture Commander',type_line:'Legendary Creature — Bear'};
const blocker={...bear,name:'Larger Blocker',power:'3',toughness:'3'};
const murder={name:'Murder',mana_cost:'{1}{B}{B}',cmc:3,type_line:'Instant',oracle_text:'Destroy target creature.'};
const zones=['library','hand','battlefield','graveyard','exile','command'];
const physical=(card,id,owner=0)=>({id,card:structuredClone(card),owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const locate=(state,id)=>[...state.players.flatMap(player=>zones.flatMap(zone=>player[zone]||[])),...state.stack].find(instance=>instance.id===id);
const total=(state,owner)=>[...state.players.flatMap(player=>zones.flatMap(zone=>player[zone]||[])),...state.stack].filter(instance=>instance.owner===owner).length;
function opening(options={}){return createGame({deck:Array(99).fill(forest),commander,seed:'commander-rules',rounds:8,...options});}
function table(options={}){return act(opening(options),{type:'keep'});}
function mana(state,cards=[forest,...Array(7).fill(wastes)],player=0){
  state.players[player].battlefield=cards.map((card,index)=>physical(card,`mana-${player}-${index}`,player));
  state.players[player].manaPool={W:0,U:0,B:0,R:0,G:0,C:0};
  return state;
}
const cast=(state,id='p0-commander',player=0)=>act(state,{type:'play',id,player});
const tappedMana=(state,player=0)=>state.players[player].battlefield.filter(instance=>instance.id.startsWith('mana-')&&instance.tapped).length;
function throwsPure(state,action,pattern){
  const before=JSON.stringify(state);
  assert.throws(()=>act(state,action),pattern);
  assert.equal(JSON.stringify(state),before,'An unsuccessful action must not alter its input.');
}

test('commanders remain outside opening hands, libraries and London mulligans',()=>{
  let state=opening({opponentDeck:Array(99).fill(forest),opponentCommander:{...commander,name:'Opponent Commander'}});
  assert.equal(state.players[0].commanderId,'p0-commander');
  assert.equal(state.players[1].commanderId,'p1-commander');
  for(let player=0;player<2;player++){
    const instance=state.players[player].command[0];
    assert.equal(instance.isCommander,true);assert.equal(instance.commanderCasts,0);
    assert.equal(state.players[player].returnCommanderOnDeath,true);
    assert.ok(![...state.players[player].hand,...state.players[player].library].some(card=>card.id===instance.id));
    assert.equal(total(state,player),100);
  }
  state=act(state,{type:'mulligan'});state=act(state,{type:'mulligan'});
  assert.equal(state.players[0].command[0].id,'p0-commander');
  assert.equal(state.players[0].command[0].commanderCasts,0);
  const bottomIds=state.players[0].hand.slice(0,2).map(instance=>instance.id);
  state=act(state,{type:'keep',bottomIds});
  assert.equal(state.players[0].hand.length,5);
  assert.equal(total(state,0),100);
});

test('command-zone casting pays ordinary colored mana and adds two generic mana per prior cast',()=>{
  let state=mana(table());
  for(const [castNumber,expectedCost] of [[1,2],[2,4],[3,6]]){
    const snapshot=JSON.stringify(state);
    const next=cast(state);
    assert.equal(JSON.stringify(state),snapshot,'Successful actions also preserve the input state.');
    state=next;
    assert.equal(state.players[0].command.length,0);
    assert.equal(state.stack.at(-1).id,'p0-commander');
    assert.equal(state.stack.at(-1).commanderCasts,castNumber);
    assert.equal(state.stack.at(-1).card.mana_cost,'{1}{G}');
    assert.equal(tappedMana(state),expectedCost);
    state=act(state,{type:'resolve'});
    if(castNumber<3){
      state=act(state,{type:'move',id:'p0-commander',zone:'graveyard'});
      assert.equal(state.players[0].command[0].commanderCasts,castNumber);
      state=act(state,{type:'endTurn'});
    }
  }
});

test('failed payment does not increment casts or spend mana, and generic tax cannot replace colored cost',()=>{
  let state=mana(table(),[forest,wastes]);
  state=cast(state);state=act(state,{type:'resolve'});
  state=act(state,{type:'move',id:'p0-commander',zone:'graveyard'});
  state=act(state,{type:'endTurn'});
  throwsPure(state,{type:'play',id:'p0-commander'},/mana|cost/i);
  assert.equal(state.players[0].command[0].commanderCasts,1);
  let colorless=mana(table(),Array(8).fill(wastes));
  throwsPure(colorless,{type:'play',id:'p0-commander'},/mana|color/i);
  assert.equal(colorless.players[0].command[0].commanderCasts,0);
});

test('a commander cast from hand pays its base cost without increasing command-zone cast history',()=>{
  let state=mana(table(),[forest,wastes]);
  state=cast(state);state=act(state,{type:'resolve'});
  state=act(state,{type:'move',id:'p0-commander',zone:'hand'});
  state=act(state,{type:'endTurn'});
  state=cast(state);
  assert.equal(tappedMana(state),2);
  assert.equal(state.stack.at(-1).commanderCasts,1);
  assert.equal(state.stack.at(-1).isCommander,true);
});

test('commander casting rejects opening, off-turn, nonowner and nonempty-stack attempts without mutation',()=>{
  throwsPure(opening(),{type:'play',id:'p0-commander'});
  let state=mana(table({opponentCommander:{...commander,name:'Enemy Commander'}}));
  throwsPure(state,{type:'play',id:'p1-commander',player:0});
  state.activePlayer=1;
  throwsPure(state,{type:'play',id:'p0-commander',player:0});
  throwsPure(state,{type:'play',id:'p0-commander',player:1});
  state.activePlayer=0;
  state.players[0].hand.push(physical(bear,'ordinary-spell'));
  state=act(state,{type:'play',id:'ordinary-spell'});
  throwsPure(state,{type:'play',id:'p0-commander'},/stack|instant/i);
});

test('unsupported commander abilities stay on the stack until explicitly resolved by a manual move',()=>{
  const complex={...commander,name:'Complex Commander',oracle_text:'Whenever another creature enters, draw a card.'};
  let state=mana(table({commander:complex}));
  state=cast(state);
  assert.equal(state.stack[0].commanderCasts,1);
  throwsPure(state,{type:'resolve'},/manual|unsupported|ability|abilities/i);
  state=act(state,{type:'move',id:'p0-commander',zone:'battlefield'});
  assert.equal(state.stack.length,0);
  assert.equal(state.players[0].battlefield.find(instance=>instance.id==='p0-commander').commanderCasts,1);
});

test('double-faced commanders pay the front-face mana cost and require manual resolution',()=>{
  const doubleFaced={name:'Front Commander // Back Commander',mana_cost:'',cmc:2,type_line:'Legendary Creature — Human Wizard // Legendary Planeswalker — Fixture',oracle_text:'',card_faces:[
    {name:'Front Commander',mana_cost:'{1}{G}',type_line:'Legendary Creature — Human Wizard',oracle_text:'Whenever this creature attacks, draw a card.',power:'2',toughness:'2'},
    {name:'Back Commander',mana_cost:'',type_line:'Legendary Planeswalker — Fixture',oracle_text:'+1: Draw a card.',loyalty:'3'}
  ]};
  let state=mana(table({commander:doubleFaced}),[forest,wastes]);
  state=cast(state);
  assert.equal(tappedMana(state),2);
  assert.equal(state.stack[0].commanderCasts,1);
  assert.equal(state.stack[0].card.card_faces[0].mana_cost,'{1}{G}');
  throwsPure(state,{type:'resolve'},/manual|unsupported|ability|abilities/i);
});

test('combat death returns a commander to its owner command zone while ordinary creatures enter the graveyard',()=>{
  let state=mana(table());state=cast(state);state=act(state,{type:'resolve'});state=act(state,{type:'endTurn'});
  state.players[0].battlefield.push(physical(bear,'ordinary-attacker'));
  state.players[1].battlefield=[physical(blocker,'enemy-blocker-1',1),physical(blocker,'enemy-blocker-2',1)];
  state=act(state,{type:'attack',id:'p0-commander'});
  state=act(state,{type:'attack',id:'ordinary-attacker'});
  state=act(state,{type:'combat',assignments:[{attackerId:'p0-commander',blockerId:'enemy-blocker-1'},{attackerId:'ordinary-attacker',blockerId:'enemy-blocker-2'}]});
  assert.equal(state.players[0].command[0].id,'p0-commander');
  assert.equal(state.players[0].command[0].commanderCasts,1);
  assert.equal(state.players[0].graveyard.some(instance=>instance.id==='ordinary-attacker'),true);
  assert.equal(state.players[0].graveyard.some(instance=>instance.id==='p0-commander'),false);
});

test('destroy effects respect the commander owner return policy and leave the removal spell in its graveyard',()=>{
  for(const enabled of [true,false]){
    let state=mana(table({opponentCommander:{...commander,name:'Enemy Commander'}}),Array(3).fill(swamp));
    state=act(state,{type:'commanderReturnPolicy',player:1,enabled});
    state=act(state,{type:'move',id:'p1-commander',player:1,zone:'battlefield'});
    state.players[0].hand.push(physical(murder,'removal'));
    state=act(state,{type:'play',id:'removal',targetId:'p1-commander'});
    state=act(state,{type:'resolve'});
    assert.equal(state.players[1][enabled?'command':'graveyard'].some(instance=>instance.id==='p1-commander'),true);
    assert.equal(state.players[0].graveyard.some(instance=>instance.id==='removal'),true);
  }
});

test('control changes preserve commander identity and private zones always route to the owner',()=>{
  for(const zone of ['command','hand','library','exile','graveyard']){
    let state=table();
    state=act(state,{type:'commanderReturnPolicy',player:0,enabled:false});
    state=act(state,{type:'move',id:'p0-commander',player:1,zone:'battlefield'});
    assert.equal(locate(state,'p0-commander').controller,1);
    assert.equal(locate(state,'p0-commander').owner,0);
    state=act(state,{type:'move',id:'p0-commander',player:1,zone});
    assert.equal(state.players[0][zone].some(instance=>instance.id==='p0-commander'),true,zone);
    assert.equal(state.players[1][zone].some(instance=>instance.id==='p0-commander'),false,zone);
    assert.equal(locate(state,'p0-commander').isCommander,true);
    assert.equal(locate(state,'p0-commander').commanderCasts,0);
  }
});

test('graveyard override keeps a commander there despite default policy, without changing ownership or cast history',()=>{
  let state=mana(table());state=cast(state);state=act(state,{type:'resolve'});
  state=act(state,{type:'move',id:'p0-commander',player:1,zone:'battlefield'});
  state=act(state,{type:'move',id:'p0-commander',player:1,zone:'graveyard',keepCommanderInGraveyard:true});
  assert.equal(state.players[0].returnCommanderOnDeath,true);
  assert.equal(state.players[0].graveyard[0].id,'p0-commander');
  assert.equal(state.players[0].graveyard[0].commanderCasts,1);
  state=act(state,{type:'move',id:'p0-commander',player:1,zone:'command'});
  assert.equal(state.players[0].command[0].commanderCasts,1);
  throwsPure(state,{type:'commanderReturnPolicy',enabled:'false'});
});

test('old saves migrate commander identity and default policies without mutating their saved input',()=>{
  let old=table({opponentCommander:{...commander,name:'Enemy Commander'}});
  old=act(old,{type:'move',id:'p0-commander',player:1,zone:'battlefield'});
  for(const player of old.players){delete player.commanderId;delete player.returnCommanderOnDeath;}
  for(const instance of [...old.players.flatMap(player=>zones.flatMap(zone=>player[zone]||[])),...old.stack]){delete instance.isCommander;delete instance.commanderCasts;}
  const snapshot=JSON.stringify(old),upgraded=upgradeGame(old);
  assert.equal(JSON.stringify(old),snapshot);
  assert.equal(upgraded.players[0].commanderId,'p0-commander');
  assert.equal(upgraded.players[1].commanderId,'p1-commander');
  assert.equal(locate(upgraded,'p0-commander').owner,0);
  assert.equal(locate(upgraded,'p0-commander').isCommander,true);
  assert.equal(locate(upgraded,'p0-commander').commanderCasts,0);
  assert.equal(upgraded.players[0].returnCommanderOnDeath,true);
  assert.deepEqual(upgradeGame(upgraded),upgraded);
  const moved=act(old,{type:'move',id:'p0-commander',player:1,zone:'graveyard'});
  assert.equal(JSON.stringify(old),snapshot);
  assert.equal(moved.players[0].command[0].id,'p0-commander');
});

test('scripted simulations leave commanders outside the casting policy',()=>{
  const free={...commander,name:'Free Fixture Commander',mana_cost:'{0}',cmc:0};
  const options={deck:Array(99).fill(forest),opponentDeck:Array(99).fill(forest),commander:free,opponentCommander:free,rounds:8,runs:2,seed:'no-auto-commanders'};
  const report=simulate(options);
  assert.equal(report.summary.avgCardsCast,0);
  assert.equal(report.summary.avgDamage,0);
  assert.deepEqual(report,simulate(options));
});
