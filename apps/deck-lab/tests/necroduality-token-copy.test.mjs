import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,coverage} from '../web/engine.mjs';
const island={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'};
const necro={name:'Necroduality',type_line:'Enchantment',mana_cost:'{3}{U}',cmc:4,oracle_text:'Whenever a nontoken Zombie enters the battlefield under your control, create a token that is a copy of that creature.'};
const zombie={name:'Grave Zombie',type_line:'Creature — Zombie',mana_cost:'{2}{U}',cmc:3,power:'3',toughness:'2',oracle_text:''};
const other={name:'Regular Elf',type_line:'Creature — Elf',mana_cost:'{1}{G}',cmc:2,power:'2',toughness:'2',oracle_text:''};
const artifact={name:'Mana Machine',type_line:'Artifact',mana_cost:'{3}',cmc:3,oracle_text:''};
const stifle={name:'Stifle',type_line:'Instant',mana_cost:'{U}',cmc:1,oracle_text:'Counter target activated or triggered ability.'};
const item=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const table=()=>{const g=act(createGame({deck:Array(70).fill(island),opponentDeck:[],rounds:8,seed:'copy-016'}),{type:'keep'});g.players[0].hand=[];g.players[0].battlefield=[];g.players[1].battlefield=[];return g;};
test('Necroduality is a castable named enchantment, resolving directly to battlefield',()=>{
 let g=table();g.players[0].hand=[item(necro,'necro')];g.players[0].battlefield=Array.from({length:4},(_,n)=>item(island,'u'+n));
 assert.equal(coverage([necro])[0].status,'partial');
 g=act(g,{type:'play',id:'necro'});assert.equal(g.stack[0].id,'necro');
 g=act(g,{type:'resolve'});assert(g.players[0].battlefield.some(x=>x.id==='necro'));
 assert.equal(g.players[0].battlefield.filter(x=>x.tapped).length,4);
});
test('Nontoken Zombie ETB by manual move queues trigger, resolution creates untapped copy token with provenance, no recursive copy',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'necro'));let z=item(zombie,'z');z.counters=5;z.tapped=true;
 g.players[0].hand.push(z);g=act(g,{type:'move',id:'z',zone:'battlefield',player:0});
 assert.equal(g.stack.length,1);assert.equal(g.stack[0].trigger.adapter,'necroduality-copy');
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,0,'creation waits for trigger resolution');
 g=act(g,{type:'resolve'});assert.equal(g.stack.length,0,'token itself never retriggers Necroduality');
 const copy=g.players[0].battlefield.find(x=>x.isToken);assert(copy);
 assert.equal(copy.card.name,zombie.name);assert.equal(copy.card.type_line,zombie.type_line);
 assert.equal(copy.card.cmc,3);assert.equal(copy.card.mana_cost,'{2}{U}');
 assert.equal(copy.counters,0);assert.equal(copy.tapped,false);assert.equal(copy.isCommander,undefined);
 assert.deepEqual(copy.copiedFrom,{id:'z',name:'Grave Zombie'});
 assert.deepEqual(copy.createdBy,{sourceId:'necro',sourceName:'Necroduality',mode:'automatic'});
});
test('Necroduality not triggered by Zombie token entering or nontoken non-Zombie entering',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'necro'));
 g.players[0].hand.push({...item(zombie,'zombie-token'),isToken:true},item(other,'elf'));
 g=act(g,{type:'move',id:'zombie-token',zone:'battlefield',player:0});
 g=act(g,{type:'move',id:'elf',zone:'battlefield',player:0});
 assert.equal(g.stack.length,0);
});
test('Multiple Necrodualities create one independent stack trigger each and two token copies',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n1'),item(necro,'n2'));g.players[0].hand.push(item(zombie,'z'));
 g=act(g,{type:'move',id:'z',zone:'battlefield',player:0});
 assert.equal(g.stack.length,2);assert.deepEqual(g.stack.map(x=>x.sourceId),['n1','n2']);
 g=act(g,{type:'resolve'});g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,2);
 assert.deepEqual(g.players[0].battlefield.filter(x=>x.isToken).map(x=>x.createdBy.sourceId).sort(),['n1','n2']);
});
test('Creature and Necroduality leaving before trigger resolution do not erase captured trigger',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n'));g.players[0].hand.push(item(zombie,'z'));
 g=act(g,{type:'move',id:'z',zone:'battlefield',player:0});
 g=act(g,{type:'move',id:'z',zone:'graveyard',player:0});
 g=act(g,{type:'move',id:'n',zone:'graveyard',player:0});
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,1);
 assert.equal(g.players[0].battlefield.find(x=>x.isToken).createdBy.sourceId,'n');
});
test('Manual token copy supports selected target permanent, optional source, count and chosen controller',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n'),item(artifact,'a'));
 g=act(g,{type:'createTokenCopy',targetId:'a',sourceId:'n',count:2,player:1});
 const copies=g.players[1].battlefield.filter(x=>x.isToken);
 assert.equal(copies.length,2);assert.notEqual(copies[0].id,copies[1].id);
 assert.equal(copies[0].card.type_line,'Artifact');assert.equal(copies[0].createdBy.sourceId,'n');
 assert.equal(copies[0].copiedFrom.id,'a');
 assert.equal(g.stack.length,0);
 g=act(g,{type:'createTokenCopy',targetId:'a',count:1,player:0});
 assert.equal(g.players[0].battlefield.find(x=>x.isToken).createdBy.sourceId,null);
});
test('Manually copying a Zombie as token does not trigger Necroduality',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n'),item(zombie,'z'));
 g=act(g,{type:'createTokenCopy',targetId:'z',sourceId:'n',count:3,player:0});
 assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,3);
 assert.equal(g.stack.length,0);
});
test('Manual token copies do not inherit +1 counters, tapped state, damage, attachments or commander status',()=>{
 let g=table();const z=item(zombie,'z');z.counters=7;z.tapped=true;z.damage=1;z.isCommander=true;
 g.players[0].battlefield.push(z);
 g=act(g,{type:'createTokenCopy',targetId:'z',player:0});
 const tok=g.players[0].battlefield.find(x=>x.isToken);
 assert.equal(tok.tapped,false);assert.equal(tok.counters,0);assert.equal(tok.damage,0);assert.equal(tok.isCommander,undefined);
});
test('Manual copy invalid inputs do not change original snapshot',()=>{
 const g=table();g.players[0].battlefield.push(item(artifact,'a'));
 const original=JSON.stringify(g);
 for(const action of [
  {type:'createTokenCopy',targetId:'missing'},
  {type:'createTokenCopy',targetId:'a',count:0},
  {type:'createTokenCopy',targetId:'a',count:21},
  {type:'createTokenCopy',targetId:'a',sourceId:'missing'},
 ])assert.throws(()=>act(g,action));
 assert.equal(JSON.stringify(g),original);
});
test('Countering Necroduality trigger prevents creation while leaving nontoken Zombie on battlefield',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n'));g.players[0].hand.push(item(zombie,'z'),item(stifle,'stifle'));
 g.players[0].battlefield.push(item(island,'u'));
 g=act(g,{type:'move',id:'z',zone:'battlefield',player:0});
 const triggerId=g.stack.at(-1).id;
 g=act(g,{type:'play',id:'stifle',targetId:triggerId});
 g=act(g,{type:'resolve'});
 assert.equal(g.stack.length,0);assert.equal(g.players[0].battlefield.filter(x=>x.isToken).length,0);
 assert(g.players[0].battlefield.some(x=>x.id==='z'));
});
test('Saved pending Necroduality trigger and token provenance persist across serialize/upgrade',()=>{
 let g=table();g.players[0].battlefield.push(item(necro,'n'));g.players[0].hand.push(item(zombie,'z'));
 g=act(g,{type:'move',id:'z',zone:'battlefield',player:0});
 g=JSON.parse(JSON.stringify(g));g=act(g,{type:'resolve'});
 g=JSON.parse(JSON.stringify(g));
 assert.equal(g.players[0].battlefield.find(x=>x.isToken).createdBy.sourceName,'Necroduality');
});
test('Token copy disappears when leaving battlefield, not a real card in graveyard',()=>{
 let g=table();g.players[0].battlefield.push(item(artifact,'a'));
 g=act(g,{type:'createTokenCopy',targetId:'a'});
 const tok=g.players[0].battlefield.find(x=>x.isToken);
 g=act(g,{type:'move',id:tok.id,zone:'graveyard',player:0});
 assert(!g.players[0].graveyard.some(x=>x.id===tok.id));
 assert(!g.players[0].battlefield.some(x=>x.id===tok.id));
});
