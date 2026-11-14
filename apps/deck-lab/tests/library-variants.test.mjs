import test from 'node:test';import assert from 'node:assert/strict';
import {act,createGame,coverage} from '../web/engine.mjs';
const island={name:'Island',type_line:'Basic Land — Island',mana_cost:'',cmc:0,oracle_text:'{T}: Add {U}.'},forest={...island,name:'Forest',type_line:'Basic Land — Forest',oracle_text:'{T}: Add {G}.'};
const waste={...island,name:'Wastes',type_line:'Basic Land — Wastes',oracle_text:'{T}: Add {C}.'};
const creature={name:'Sample Creature',type_line:'Creature — Beast',mana_cost:'{3}',cmc:3,power:'3',toughness:'3',oracle_text:''};
const zombie={...creature,name:'Sample Zombie',type_line:'Creature — Zombie',mana_cost:'{1}{B}',cmc:2,power:'2',toughness:'2'};
const noncreature={name:'Unrelated Spell',type_line:'Sorcery',mana_cost:'{3}',cmc:3,oracle_text:''};
const mass={name:'Mass Polymorph',type_line:'Sorcery',mana_cost:'{5}{U}',cmc:6,oracle_text:'Exile all creatures you control, then reveal cards from the top of your library until you reveal that many creature cards. Put all creature cards revealed this way onto the battlefield, then shuffle the rest of the revealed cards into your library.'};
const staff={name:'Proteus Staff',type_line:'Artifact',mana_cost:'{3}',cmc:3,oracle_text:"{2}{U}, {T}: Put target creature on the bottom of its owner's library. That creature's controller reveals cards from the top of their library until they reveal a creature card. The player puts that card onto the battlefield and the rest on the bottom of their library in any order. Activate only as a sorcery."};
const lab={name:'Empty the Laboratory',type_line:'Sorcery',mana_cost:'{X}{U}{U}',cmc:2,oracle_text:'Sacrifice X Zombies, then reveal cards from the top of your library until you reveal a number of Zombie creature cards equal to the number of Zombies sacrificed this way. Put those cards onto the battlefield and the rest on the bottom of your library in a random order.'};
const item=(card,id,owner=0)=>({id,card,owner,controller:owner,tapped:false,counters:0,damage:0,enteredTurn:0,attacking:false});
const table=()=>act(createGame({deck:Array(65).fill(island),opponentDeck:Array(65).fill(forest),seed:'named-creature-variants-021',rounds:8}),{type:'keep'});
const top=(state,records,player=0)=>{state.players[player].library=records.map((c,i)=>item(c,`top-${player}-${i}`,player));return state;};
const finalize=(g)=>act(g,{type:'commitLibraryReview',order:g.pendingLibrary.ids.slice(),destinations:{},shuffle:false});
test('Mass Polymorph exiles creature cards and tokens, reveals number of creature cards, keeps excluded exiles',()=>{
 let g=table();g.players[0].battlefield=[item(creature,'original'),{...item(creature,'token'),isToken:true}];
 top(g,[forest,creature,noncreature,creature,forest]);g.stack.push(item(mass,'mass'));
 g=act(g,{type:'resolve'});
 assert.equal(g.players[0].exile.some(x=>x.id==='original'),true);
 assert.equal(g.players[0].exile.some(x=>x.id==='token'),false);
 assert.equal(g.pendingLibrary.required,2);assert.deepEqual(g.pendingLibrary.matches,['top-0-1','top-0-3']);
 assert.equal(g.players[0].graveyard.some(x=>x.id==='mass'),true);
 g=finalize(g);
 assert.deepEqual(g.players[0].battlefield.map(x=>x.id).sort(),['top-0-1','top-0-3']);
 assert.equal(g.players[0].library.length,3);assert.equal(g.pendingLibrary,undefined);
});
test('Mass Polymorph with no creatures shuffles library without exiling cards',()=>{
 let g=table();top(g,[forest,creature]);g.stack.push(item(mass,'mass'));g=act(g,{type:'resolve'});
 assert.equal(g.pendingLibrary.required,0);assert.equal(g.pendingLibrary.ids.length,0);
 g=finalize(g);assert.equal(g.players[0].library.length,2);assert.equal(g.players[0].exile.length,0);
});
test('Mass Polymorph with fewer creature cards than requested reveals entire library and never invents extra matches',()=>{
 let g=table();g.players[0].battlefield=[item(creature,'old1'),item(creature,'old2'),item(creature,'old3')];top(g,[forest,creature,noncreature]);g.stack.push(item(mass,'mass'));
 g=act(g,{type:'resolve'});assert.equal(g.pendingLibrary.required,3);assert.equal(g.pendingLibrary.matches.length,1);
 g=finalize(g);assert.equal(g.players[0].battlefield.length,1);assert.equal(g.players[0].library.length,2);
});
test('Proteus Staff pays {2}{U}, puts opponent-controlled owned creature bottom of owner library, reveals controller library',()=>{
 let g=table();g.players[0].battlefield=[item(staff,'staff'),item(island,'blue'),item(waste,'c1'),item(waste,'c2')];
 const stolen=item(creature,'stolen',0);stolen.controller=1;g.players[1].battlefield.push(stolen);
 top(g,[forest,creature],1);
 const prior=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'activateProteusStaff',id:'staff',targetId:'missing'}),/battlefield creature/);
 assert.equal(JSON.stringify(g),prior);
 g=act(g,{type:'activateProteusStaff',id:'staff',targetId:'stolen'});
 assert.equal(g.players[0].battlefield.find(x=>x.id==='staff').tapped,true);
 assert.equal(g.players[0].battlefield.filter(x=>['blue','c1','c2'].includes(x.id)&&x.tapped).length,3);
 assert.equal(g.players[0].library.at(-1).id,'stolen');
 assert.equal(g.pendingLibrary.player,1);assert.deepEqual(g.pendingLibrary.ids,['top-1-0','top-1-1']);
 g=finalize(g);assert.equal(g.players[1].battlefield.some(x=>x.id==='top-1-1'),true);
 assert.equal(g.players[1].library.at(-1).id,'top-1-0');
});
test('Proteus Staff all noncreature library yields no hits and bottoms revealed cards',()=>{
 let g=table();g.players[0].battlefield=[item(staff,'staff'),item(island,'u'),item(waste,'c1'),item(waste,'c2'),item(creature,'t')];top(g,[forest,noncreature]);
 g=act(g,{type:'activateProteusStaff',id:'staff',targetId:'t'});
 assert.equal(g.pendingLibrary.matches.length,1,'target bottom card is in searched library for own creature');
 assert.equal(g.pendingLibrary.ids.length,3,'all library including bottomed target is searched');
 g=finalize(g);assert.equal(g.players[0].battlefield.some(x=>x.id==='t'),true);
});
test('Empty the Laboratory pays real X cost and sacrifices chosen Zombies on resolution',()=>{
 let g=table();g.players[0].battlefield=[item(island,'u1'),item(island,'u2'),item(waste,'c1'),item(zombie,'z1'),item(zombie,'z2')];g.players[0].hand=[item(lab,'lab')];top(g,[forest,zombie,creature,zombie,forest]);
 g=act(g,{type:'castEmptyLaboratory',id:'lab',x:1});assert.equal(g.stack.at(-1).paidX,1);
 assert.equal(g.players[0].battlefield.filter(x=>x.id==='u1'||x.id==='u2'||x.id==='c1').filter(x=>x.tapped).length,3);
 assert.throws(()=>act(g,{type:'resolveEmptyLaboratory',id:'lab',sacrificeIds:['z1','z2']}),/Sacrifice X Zombies/);
 g=act(g,{type:'resolveEmptyLaboratory',id:'lab',sacrificeIds:['z1']});
 assert.equal(g.players[0].graveyard.some(x=>x.id==='z1'),true);
 assert.deepEqual(g.pendingLibrary.matches,['top-0-1']);
 g=finalize(g);assert.equal(g.players[0].battlefield.some(x=>x.id==='top-0-1'),true);
});
test('Empty the Laboratory validates payment and X selection without mutating an invalid turn',()=>{
 let g=table();g.players[0].hand=[item(lab,'lab')];const before=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'castEmptyLaboratory',id:'lab',x:2}),/Insufficient mana/);
 assert.throws(()=>act(g,{type:'castEmptyLaboratory',id:'lab',x:-1}),/X between/);
 assert.equal(JSON.stringify(g),before);
});
test('Matching reveal cannot move nonmatches to hand or overwrite predetermined shuffled destinations',()=>{
 let g=table();g.stack.push(item(mass,'mass'));g.players[0].battlefield.push(item(creature,'t'));
 top(g,[forest,creature,noncreature]);g=act(g,{type:'resolve'});const saved=JSON.stringify(g);
 assert.throws(()=>act(g,{type:'commitLibraryReview',order:g.pendingLibrary.ids,destinations:{'top-0-0':'hand'},shuffle:false}),/fixed destinations/);
 assert.throws(()=>act(g,{type:'commitLibraryReview',order:g.pendingLibrary.ids,destinations:{},shuffle:true}),/fixed destinations/);
 assert.equal(JSON.stringify(g),saved);
});
