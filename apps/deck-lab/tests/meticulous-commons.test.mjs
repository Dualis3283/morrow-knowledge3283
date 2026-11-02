import test from 'node:test';
import assert from 'node:assert/strict';
import {act, createGame, tapOptions, castOptions, coverage} from '../web/engine.mjs';

const commons={name:'Meticulous Commons',type_line:'Land',cmc:0,mana_cost:'',oracle_text:'This land enters tapped unless you control a planeswalker.\n{T}: Add {W} or {B}.',produced_mana:['W','B']};
const island={name:'Island',type_line:'Basic Land — Island',cmc:0,mana_cost:'',oracle_text:'{T}: Add {U}.'};
const walker={name:'Test Planeswalker',type_line:'Legendary Planeswalker — Test',cmc:4,mana_cost:'{2}{W}{W}',oracle_text:'',loyalty:'4'};
const white={name:'One White Test Instant',type_line:'Instant',cmc:1,mana_cost:'{W}',oracle_text:'A manually resolved test spell.'};
const black={...white,name:'One Black Test Instant',mana_cost:'{B}'};
const blue={...white,name:'One Blue Test Instant',mana_cost:'{U}'};
const physical=(card,id)=>({id,card,owner:0,controller:0,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
function game(){let state=createGame({deck:Array(75).fill(island),rounds:8,seed:'meticulous-commons-entry'});state=act(state,{type:'keep'});state.players[0].hand=[physical(commons,'commons')];return state;}

test('Meticulous Commons is a recognised white/black mana source, never blue or two mana',()=>{
 const state=game();
 assert.equal(coverage([commons])[0].status,'supported');
 state.players[0].battlefield.push(physical(commons,'on-field'));
 assert.deepEqual(tapOptions(state,0,'on-field').options,[{W:1},{B:1}]);
 state.players[0].hand=[physical(white,'w'),physical(black,'b'),physical(blue,'u')];
 assert.equal(castOptions(state,0,'w').canCast,true);
 assert.equal(castOptions(state,0,'b').canCast,true);
 assert.equal(castOptions(state,0,'u').canCast,false);
 assert.equal(castOptions(state,0,'w',{sourceIds:['on-field'],sourceChoices:{'on-field':1}}).canCast,false,'black mode does not pay for white');
 assert.equal(castOptions(state,0,'b',{sourceIds:['on-field'],sourceChoices:{'on-field':1}}).canCast,true);
});
test('Meticulous Commons enters tapped without a planeswalker, then produces chosen mana after untapping',()=>{
 let state=game();state=act(state,{type:'play',id:'commons'});
 assert.equal(state.players[0].battlefield.find(x=>x.id==='commons').tapped,true);
 assert.equal(tapOptions(state,0,'commons').options.length,2,'available mana ability is registered even when tapped');
 assert.equal(state.warnings.some(x=>/Meticulous Commons.*condition not automated/.test(x)),false);
 assert.equal(castOptions(state,0,'w').canCast,false);
 state=act(state,{type:'endTurn'});
 assert.equal(state.players[0].battlefield.find(x=>x.id==='commons').tapped,false);
 state=act(state,{type:'tap',id:'commons',choiceIndex:1});
 assert.equal(state.players[0].manaPool.B,1);
 assert.equal(state.players[0].manaPool.W,0);
 state.players[0].hand=[physical(black,'black')];
 assert.equal(castOptions(state,0,'black').canCast,true);
 state=act(state,{type:'play',id:'black',sourceIds:[]});
 assert.equal(state.players[0].manaPool.B,0,'floating black mana used for instant');
});
test('A planeswalker you control makes Meticulous Commons enter untapped and usable immediately',()=>{
 let state=game();state.players[0].battlefield.push(physical(walker,'our-walker'));
 state.players[0].hand.push(physical(white,'white'));
 state=act(state,{type:'play',id:'commons'});
 assert.equal(state.players[0].battlefield.find(x=>x.id==='commons').tapped,false);
 assert.equal(castOptions(state,0,'white').canCast,true);
 state=act(state,{type:'tap',id:'commons',choiceIndex:0});
 assert.equal(state.players[0].manaPool.W,1);
 assert.equal(state.players[0].manaPool.B,0);
});
test('An opponent planeswalker does not allow Meticulous Commons to enter untapped',()=>{
 let state=game();state.players[1].battlefield.push({...physical(walker,'their-walker'),owner:1,controller:1});
 state=act(state,{type:'play',id:'commons'});
 assert.equal(state.players[0].battlefield.find(x=>x.id==='commons').tapped,true);
});
test('No false inference from unrelated conditional lands',()=>{
 let state=game();const unknown={...commons,name:'Hypothetical Conditional Land',oracle_text:'This land enters tapped unless you pay 2 life.\n{T}: Add {W} or {B}.'};
 state.players[0].hand=[physical(unknown,'unknown')];
 state=act(state,{type:'play',id:'unknown'});
 assert.equal(state.players[0].battlefield[0].tapped,true);
 assert.equal(tapOptions(state,0,'unknown'),null,'unrecognized entry condition and mana text do not get invented permissions');
});
