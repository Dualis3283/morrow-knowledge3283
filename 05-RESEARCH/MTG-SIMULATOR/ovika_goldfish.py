"""Deterministic 100-hand Ovika goldfish (bounded heuristic, no stack/opponents).
Seed 20261101; 12 turns; one London mulligan; mana colour budget approximated.
Does not simulate blockers or opposing actions. Captures proactive casting and draw packages.
"""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent
from dataclasses import dataclass, field
import random, statistics as st, csv, json, math
from collections import Counter, defaultdict

@dataclass(frozen=True)
class Card:
    name:str; typ:str; mv:int; u:int=0; r:int=0; tags:tuple=()
    @property
    def generic(self): return self.mv-self.u-self.r

cards={}
def add(name,typ,mv,u=0,r=0,tags=()):
    assert name not in cards,name
    cards[name]=Card(name,typ,mv,u,r,tuple(tags))
# creatures
add('Myr Convert','creature',2,tags=('mana_creature',))
add('Plague Myr','creature',2,tags=('mana_creature',))
add('Ral, Monsoon Mage','creature',2,r=1,tags=('reducer',))
add('Raphael, Tough Turtle','creature',2,r=1,tags=('ping',))
add('Third Path Iconoclast','creature',2,u=1,r=1,tags=('token_on_spell',))
add('Electro, Assaulting Battery','creature',3,r=2,tags=('spell_mana',))
add('Irma, Part-Time Mutant','creature',3,u=1,tags=('copy',))
add('Krenko, Baron of Tin Street','creature',3,r=1,tags=('goblin',))
add('Molten Gatekeeper','creature',3,r=1,tags=('etb_pinger',))
add('Chameleon, Master of Disguise','creature',4,u=1,tags=('copy',))
add('Enduring Courage','creature',4,r=2,tags=('buff',))
add('Mister Fantastic, Reed Richards','creature',4,u=1,tags=('draw_tokens',))
add('Sakashima of a Thousand Faces','creature',4,u=1,tags=('copy',))
add('Urabrask','creature',4,r=2,tags=('spell_burn',))
# artifacts
for n,m,u,r,tags in [
('Sol Ring',1,0,0,('ramp',)),('Wayfarer\'s Bauble',1,0,0,('bauble',)),
('Arcane Signet',2,0,0,('ramp',)),('Izzet Signet',2,0,0,('ramp',)),
('Mind Stone',2,0,0,('ramp','cashdraw')),('Sky Diamond',2,0,0,('ramp',)),
('Strionic Resonator',2,0,0,('copy_trigger',)),('Ashnod\'s Altar',3,0,0,('sac',)),
('Blitzball',3,0,0,('ramp','conditional_draw')),('Chromatic Lantern',3,0,0,('ramp',)),
('Commander\'s Sphere',3,0,0,('ramp','cashdraw')),('Cursed Mirror',3,0,0,('ramp',)),
('Decanter of Endless Water',3,0,0,('ramp',)),('Heraldic Banner',3,0,0,('ramp',)),
('Strixhaven Stadium',3,0,0,('ramp','stadium')),('Tablet of Discovery',3,0,1,('ramp','impulse')),
('Resonating Lute',4,1,1,('spell_ramp',)),('Eldrazi Monument',5,0,0,('anthem',)),
('Gilded Lotus',5,0,0,('ramp',)),('Portal to Phyrexia',9,0,0,('payoff',))]:add(n,'artifact',m,u,r,tags)
# instants
for n,m,u,r,tags in [
('Consign to Memory',1,1,0,('reactive',)),('Cyclonic Rift',2,1,0,('reactive',)),
('Izzet Charm',2,1,1,('filter',)),('Negate',2,1,0,('reactive',)),
('Prismari Charm',2,1,1,('filter','draw1')),('Return the Favor',2,0,2,('reactive',)),
('Think Twice',2,1,0,('draw1','flashback',)),('Thrill of Possibility',2,0,1,('discard1','draw2')),
('Untimely Malfunction',2,0,1,('reactive',)),('Deflecting Swat',3,0,1,('reactive',)),
('Dissipate',3,2,0,('reactive',)),('Fierce Guardianship',3,1,0,('reactive',)),
('Force of Negation',3,2,0,('reactive',)),('Laughing Mad',3,0,1,('discard1','draw2','flashback')),
('Stoic Rebuttal',3,2,0,('reactive',)),('Urza\'s Rebuff',3,2,0,('reactive',)),
('Meeting of Minds',4,1,0,('draw2','convoke',)),('Harmonized Crescendo',6,2,0,('creature_draw','convoke',))]:add(n,'instant',m,u,r,tags)
# sorceries
for n,m,u,r,tags in [
('Ponder',1,1,0,('draw1','scry3')),
('Preordain',1,1,0,('draw1','scry2')),
('Vandalblast',1,0,1,('reactive',)),
('Glacial Dragonhunt',2,1,1,('draw1','harmonize')),
('Inspiration from Beyond',3,1,0,('recur','flashback')),
('Deep Analysis',4,1,0,('draw2','flashback')),
('Full Throttle',6,0,2,('combat_boost',)),
('Wisdom of Ages',7,3,0,('mass_recur',)),
('Blasphemous Act',9,0,1,('reactive','selfwiping'))]:add(n,'sorcery',m,u,r,tags)
add('Frostcliff Siege','enchantment',3,1,1,('combat_draw',))
add('Omniscience','enchantment',10,3,0,('free',))
# lands
for n in ['Island']*14+['Mountain']*15+['Baron, Airship Kingdom','Fabled Passage', 'Izzet Guildgate','Lotus Field','Swiftwater Cliffs','Temple of the False God','Thriving Isle']:
    if n not in cards:add(n,'land',0)
add('Ovika, Enigma Goliath','commander',7,1,1)

DECK = ([x for x,c in cards.items() if c.typ not in ('land','commander')] + ['Island']*14+['Mountain']*15+['Baron, Airship Kingdom','Fabled Passage', 'Izzet Guildgate','Lotus Field','Swiftwater Cliffs','Temple of the False God','Thriving Isle'])
assert len(DECK)==99, (len(DECK),Counter(c.typ for c in cards.values()))

@dataclass
class Pool:
    u:int=0; r:int=0; c:int=0; a:int=0
    def total(self):return self.u+self.r+self.c+self.a
    def affordability(self,cc,generic_discount=0):
        need_u=cc.u;need_r=cc.r;need_g=max(0,cc.generic-generic_discount)
        if self.total() < need_g+need_u+need_r:return False
        if self.u+self.a<need_u or self.r+self.a<need_r:return False
        if self.u+self.r+self.a<need_u+need_r:return False
        return True
    def pay(self,cc,generic_discount=0):
        assert self.affordability(cc,generic_discount)
        need_u=cc.u; need_r=cc.r
        # pay colored fixed before flexible
        x=min(self.u,need_u);self.u-=x;need_u-=x
        x=min(self.r,need_r);self.r-=x;need_r-=x
        self.a-=need_u+need_r
        g=max(0,cc.generic-generic_discount)
        for p in ['c','r','u','a']:
            x=min(getattr(self,p),g);setattr(self,p,getattr(self,p)-x);g-=x
        assert g==0

@dataclass
class Game:
    num:int; deck:list; rng:object; hand:list=field(default_factory=list); battlefield:list=field(default_factory=list)
    grave:list=field(default_factory=list); exile:list=field(default_factory=list)
    lands:list=field(default_factory=list); deckpos:int=0; mulligans:int=0
    ovika_turn:int=0; ovika_hand:int=0; ovika_mana:int=0
    token_by_turn:list=field(default_factory=list); draws_after:int=0; goblins:int=0; soldiers:int=0
    total_goblins:int=0; total_soldiers:int=0; spells_after:int=0; turns_after:list=field(default_factory=list)
    spells_by_turn:list=field(default_factory=list); hand_by_turn:list=field(default_factory=list)
    unused_reactive:list=field(default_factory=list); castlog:list=field(default_factory=list)
    mana_turns:list=field(default_factory=list); land_turns:list=field(default_factory=list); ramp_turns:list=field(default_factory=list)
    wiped:bool=False; life_cost:int=0; max_hand:bool=False; times_recast:int=0; ovika_copies:int=0; irma_copied:bool=False
    def draw(self,n=1):
        for _ in range(max(0,int(n))):
            if self.deckpos < len(self.deck):self.hand.append(self.deck[self.deckpos]);self.deckpos+=1
            if self.ovika_turn:self.draws_after+=1
    def mill(self,n=1):
        for _ in range(n):
            if self.deckpos < len(self.deck):self.grave.append(self.deck[self.deckpos]);self.deckpos+=1
    def has(self,n):return n in self.battlefield
    def count(self,n):return self.battlefield.count(n)
    def scry(self,n):
        # put best among top N cards on top. Real scry lets put any bottom.
        cands=self.deck[self.deckpos:self.deckpos+n]
        if not cands:return
        land_need=len(self.lands) < (4 if self.ovika_turn else 5)
        def rating(k):
            c=cards[k]
            if c.typ=='land':return 10 if land_need else -4
            if c.name in ('Ponder','Preordain','Think Twice','Prismari Charm','Glacial Dragonhunt','Deep Analysis','Mister Fantastic, Reed Richards'):return 9
            if 'ramp' in c.tags and len(self.lands)<=4:return 8
            if 'reactive' in c.tags:return -5
            if c.mv>=7 and not self.ovika_turn:return -2
            return 4
        best=max(cands,key=rating)
        ci=cands.index(best)
        self.deck[self.deckpos],self.deck[self.deckpos+ci]=self.deck[self.deckpos+ci],self.deck[self.deckpos]
    def new_token(self,n,typ):
        if n<=0:return
        if typ=='goblin':self.goblins+=n;self.total_goblins+=n
        else:self.soldiers+=n;self.total_soldiers+=n
        if self.has('Mister Fantastic, Reed Richards'):
            # once per separate token-producing trigger, not once per token
            self.draw(1)
    def spell_trigger(self, card):
        if card.typ!='creature' and card.typ!='land':
            copies=1 if self.has('Ovika, Enigma Goliath') else 0
            copies+=self.ovika_copies
            if self.irma_copied:copies+=1
            # Ovika trigger on spells, each creates one batch
            for _ in range(copies):self.new_token(card.mv,'goblin')
            if self.has('Third Path Iconoclast'):self.new_token(1,'soldier')
        if card.typ in ('instant','sorcery'):
            if self.has('Electro, Assaulting Battery'):return 1
        return 0
    def cast_priority(self,name,turn):
        c=cards[name]
        if 'reactive' in c.tags:return -100
        if 'ramp' in c.tags or 'mana_creature' in c.tags or 'bauble' in c.tags:
            # later ramp still playable, but decline excessive ramp with Ovika out and enough mana
            return 115 if turn<=4 else (50 if not self.ovika_turn else -25)
        if name=='Ovika, Enigma Goliath':return 175
        if name=='Mister Fantastic, Reed Richards':return 130 if self.ovika_turn or turn<=6 else 90
        if name=='Third Path Iconoclast':return 115
        if name=='Ral, Monsoon Mage':return 110
        if name=='Frostcliff Siege':return 115
        if name in ('Think Twice','Ponder','Preordain','Prismari Charm','Izzet Charm','Glacial Dragonhunt','Laughing Mad','Thrill of Possibility','Deep Analysis'):return 87 if len(self.hand)<5 or self.ovika_turn else 65
        if name=='Harmonized Crescendo':return 100 if self.goblins>=3 or self.ovika_turn else -50
        if name=='Inspiration from Beyond':return 90 if any(cards[x].typ in ('instant','sorcery') for x in self.grave) else -25
        if name=='Wisdom of Ages':return 120 if sum(cards[x].typ in ('instant','sorcery') for x in self.grave)>=3 else -30
        if name=='Urabrask':return 106
        if name in ('Sakashima of a Thousand Faces','Chameleon, Master of Disguise','Irma, Part-Time Mutant'):
            return 112 if self.ovika_turn else 30
        if name=='Molten Gatekeeper':return 104
        if name=='Ashnod\'s Altar':return 92 if self.ovika_turn else 50
        if name=='Resonating Lute':return 65 if not self.ovika_turn else 30
        if name=='Strionic Resonator':return 50
        if name in ('Full Throttle','Portal to Phyrexia','Omniscience'):
            return 90 if self.ovika_turn else -30
        return 55
    def play_land(self,turn):
        names=[x for x in self.hand if cards[x].typ=='land']
        if not names:return
        needU=not(any(x=='Island' for x in self.lands) or any(x in ('Izzet Guildgate','Baron, Airship Kingdom','Swiftwater Cliffs','Thriving Isle','Lotus Field') for x in self.lands))
        needR=not(any(x=='Mountain' for x in self.lands) or any(x in ('Izzet Guildgate','Baron, Airship Kingdom','Swiftwater Cliffs','Thriving Isle','Lotus Field') for x in self.lands))
        priority={'Island':70 if needU else 45,'Mountain':70 if needR else 45,'Fabled Passage':66 if needU or needR else 40,
            'Thriving Isle':46,'Izzet Guildgate':43,'Swiftwater Cliffs':43,'Baron, Airship Kingdom':43,
            'Temple of the False God': 5 if len(self.lands)<4 else 70, 'Lotus Field':-100 if len(self.lands)<3 else 37}
        if turn==1:priority.update({k:75 for k in ('Thriving Isle','Izzet Guildgate','Swiftwater Cliffs','Baron, Airship Kingdom')})
        if len(self.lands)>=5:priority['Lotus Field']=77
        name=max(names,key=lambda x:priority[x]);self.hand.remove(name)
        if name=='Fabled Passage':
            # sacrifice immediately to fetch basic tapped (unless 4+ lands), choose missing color
            name='Island' if needU else ('Mountain' if needR else ('Island' if self.lands.count('Island')<self.lands.count('Mountain') else 'Mountain'))
            self.lands.append(name+' (fetched tapped)' if len(self.lands)<3 else name)
        elif name=='Lotus Field':
            # sack two other lands, it enters tapped
            self.lands=self.lands[2:];self.lands.append('Lotus Field (tapped)')
        elif name in ('Izzet Guildgate','Baron, Airship Kingdom','Swiftwater Cliffs','Thriving Isle'):
            self.lands.append(name+' (tapped)')
        else:self.lands.append(name)
    def mana(self,turn):
        p=Pool()
        for x in self.lands:
            if x.endswith(' (tapped)'):continue
            if x=='Island':p.u+=1
            elif x=='Mountain':p.r+=1
            elif x=='Temple of the False God':
                if len(self.lands)>=5:p.c+=2
            elif x=='Lotus Field':p.a+=3
            else:p.a+=1
        for x in self.battlefield:
            if x=='Sol Ring':p.c+=2
            elif x=='Izzet Signet':p.a+=1 # net one, simplified filter
            elif x in ('Arcane Signet','Chromatic Lantern',"Commander's Sphere",'Blitzball','Decanter of Endless Water','Cursed Mirror','Gilded Lotus'):
                p.a+= (3 if x=='Gilded Lotus' else 1)
            elif x in ('Mind Stone','Plague Myr','Strixhaven Stadium'):p.c+=1
            elif x=='Sky Diamond':p.u+=1
            elif x=='Heraldic Banner':p.r+=1
            elif x=='Tablet of Discovery':p.r+=1
            elif x=='Myr Convert':p.a+=1;self.life_cost+=2
            # lute conditional spell-only mana handled approximately when casting proactive I/S below
        return p
    def effective(self,name,source, pool):
        c=cards[name]
        red=max(0,c.r); blue=c.u
        mv=c.mv
        if source in ('flashback','harmonize'):
            if name=='Think Twice':mv=3;blue=1;red=0
            elif name=='Deep Analysis':mv=2;blue=1;red=0
            elif name=='Laughing Mad':mv=4;blue=0;red=1
            elif name=='Inspiration from Beyond':mv=7;blue=2;red=0
            elif name=='Glacial Dragonhunt':
                mv=6;blue=1;red=1
                # power of tapped creature can reduce generic on harmonize
                power=6 if self.has('Ovika, Enigma Goliath') else (4 if self.has('Urabrask') else (2 if self.has('Mister Fantastic, Reed Richards') else 0))
                mv=max(blue+red,mv-power)
        disc=int(self.has('Ral, Monsoon Mage') and c.typ in ('instant','sorcery'))
        if c.typ in ('instant','sorcery') and 'convoke' in c.tags:
            # goblins can pay generic, not colored
            disc+=min(self.goblins+self.soldiers,max(0,mv-blue-red))
        if name=='Omniscience' and self.has('Omniscience'):return Card(name,c.typ,0,0,0),0
        if self.has('Omniscience') and c.typ!='land':return Card(name,c.typ,0,0,0),0
        return Card(name,c.typ,mv,blue,red),disc
    def discard_worst(self):
        if not self.hand:return
        def score(n):
            c=cards[n]; base=self.cast_priority(n,7)
            if c.typ=='land':return 10 if len(self.lands)>=6 else 60
            if c.mv>=7 and not self.ovika_turn:return 0
            return base
        n=min(self.hand,key=score);self.hand.remove(n);self.grave.append(n)
    def cast(self,name,source,pool,turn):
        if source=='hand':self.hand.remove(name)
        elif source in ('flashback','harmonize'):self.grave.remove(name)
        c=cards[name]
        if name=='Ovika, Enigma Goliath':
            self.battlefield.append(name);self.ovika_turn=turn;self.ovika_hand=len(self.hand);self.ovika_mana=len(self.lands)
        elif c.typ in ('artifact','creature','enchantment'):
            # Copies must enter when Ovika is present; earlier copies do not change later.
            if name in ('Sakashima of a Thousand Faces','Chameleon, Master of Disguise') and self.has('Ovika, Enigma Goliath'):
                self.ovika_copies+=1
            self.battlefield.append(name)
        if c.typ not in ('land','commander','creature') or c.typ=='artifact':
            # Ovika triggers for artifacts, enchantments, instants and sorceries
            self.spell_trigger(c)
        elif c.typ=='creature' and self.has('Raphael, Tough Turtle'):pass
        if c.typ in ('instant','sorcery'):
            # mana from Electro cast trigger
            if self.has('Electro, Assaulting Battery'):pool.r+=1
            if self.ovika_turn:self.spells_after+=1
            tags=c.tags
            if name=='Ponder':self.scry(3);self.draw(1)
            elif name=='Preordain':self.scry(2);self.draw(1)
            elif name=='Prismari Charm':self.scry(2);self.draw(1)
            elif name=='Izzet Charm':self.draw(2);self.discard_worst();self.discard_worst()
            elif name=='Glacial Dragonhunt':self.draw(1)
            elif name=='Harmonized Crescendo':
                self.draw(min(30,self.goblins + (1 if self.has('Krenko, Baron of Tin Street') else 0)))
            elif name=='Inspiration from Beyond':
                self.mill(3)
                options=[x for x in self.grave if cards[x].typ in ('instant','sorcery') and x!=name]
                if options:
                    n=max(options,key=lambda x:70 if 'draw' in str(cards[x].tags) or x in ('Ponder','Preordain') else 20)
                    self.grave.remove(n);self.hand.append(n)
            elif name=='Wisdom of Ages':
                options=[x for x in self.grave if cards[x].typ in ('instant','sorcery')]
                for n in options:self.grave.remove(n);self.hand.append(n)
                self.max_hand=True
            elif name in ('Thrill of Possibility','Laughing Mad'):
                # discard additional cost should be before triggers; simulated here
                self.discard_worst();self.draw(2)
            elif name in ('Think Twice',):self.draw(1)
            elif name in ('Deep Analysis','Meeting of Minds'):self.draw(2)
            if source=='hand':
                self.grave.append(name)
            else:self.exile.append(name)
        self.castlog.append((turn,name,source,len(self.hand),self.goblins))
    def do_bauble(self,pool):
        if not self.has("Wayfarer's Bauble"):return False
        if pool.total()<2:return False
        dummy=Card('activate','ability',2)
        if not pool.affordability(dummy):return False
        pool.pay(dummy)
        self.battlefield.remove("Wayfarer's Bauble");self.grave.append("Wayfarer's Bauble")
        # fetch tapped; land enters and will untap next turn
        self.lands.append(('Island' if self.lands.count('Island')<self.lands.count('Mountain') else 'Mountain')+' (tapped)')
        return True
    def available(self,pool,turn):
        opts=[]
        if not self.ovika_turn:
            cc=cards['Ovika, Enigma Goliath'];
            if pool.affordability(cc):opts.append((self.cast_priority('Ovika, Enigma Goliath',turn),'Ovika, Enigma Goliath','command'))
        else:pass
        for name in self.hand:
            c=cards[name]
            if c.typ=='land' or 'reactive' in c.tags:continue
            if 'discard1' in c.tags and len(self.hand)<2:continue
            if name=='Harmonized Crescendo' and self.goblins+self.soldiers<=0 and not self.ovika_turn:continue
            if name=='Inspiration from Beyond' and not any(cards[x].typ in ('instant','sorcery') for x in self.grave):continue
            if name=='Wisdom of Ages' and sum(cards[x].typ in ('instant','sorcery') for x in self.grave)<3:continue
            if name=='Full Throttle' and self.goblins<5:continue
            if name=='Omniscience' and self.has('Omniscience'):continue
            cc,d=self.effective(name,'hand',pool)
            if pool.affordability(cc,d):opts.append((self.cast_priority(name,turn)+ (20 if c.typ in ('instant','sorcery') and self.ovika_turn else 0),name,'hand'))
        for name in set(self.grave):
            if name in ('Think Twice','Deep Analysis','Laughing Mad','Inspiration from Beyond','Glacial Dragonhunt'):
                cc,d=self.effective(name,'harmonize' if name=='Glacial Dragonhunt' else 'flashback',pool)
                if pool.affordability(cc,d):opts.append((self.cast_priority(name,turn)+14,name,'harmonize' if name=='Glacial Dragonhunt' else 'flashback'))
        return sorted(opts,reverse=True)
    def go(self):
        self.rng.shuffle(self.deck)
        # London mulligan once if 0-1 or 6-7 lands, or exactly two lands and no castable cheap play
        self.hand=self.deck[:7];self.deckpos=7
        def keep(h):
            n=sum(cards[x].typ=='land' for x in h)
            return 2<=n<=5
        if not keep(self.hand):
            self.mulligans=1;self.rng.shuffle(self.deck);self.hand=self.deck[:7];self.deckpos=7
            # bottom 1 -> move from hand to bottom of library
            x=max(self.hand,key=lambda n:cards[n].mv if cards[n].typ!='land' else (-3 if sum(cards[t].typ=='land' for t in self.hand)<=3 else 8))
            self.hand.remove(x);self.deck.append(x)
        for turn in range(1,13):
            # untap lands tapped previous turn
            self.lands=[x.replace(' (tapped)','').replace(' (fetched tapped)','') for x in self.lands]
            if turn>1:self.draw(1)
            self.play_land(turn)
            pool=self.mana(turn)
            # defer nonurgent spells when Ovika is close to casting (but still play ramp and draw)
            spells=0
            for i in range(35):
                opts=self.available(pool,turn)
                if opts:
                    _,name,source=opts[0]
                    cc,d=self.effective(name,source,pool)
                    # avoid burning all mana before reaching commander, if commander almost castable next turn
                    pool.pay(cc,d)
                    self.cast(name,source,pool,turn)
                    spells+=1
                    # new mana rocks can be tapped same turn; Myr cannot (summoning sickness)
                    if name in ('Sol Ring','Arcane Signet','Mind Stone','Chromatic Lantern','Cursed Mirror',"Commander's Sphere",'Decanter of Endless Water','Blitzball','Heraldic Banner','Strixhaven Stadium','Tablet of Discovery','Gilded Lotus'):
                        if name=='Sol Ring':pool.c+=2
                        elif name=='Gilded Lotus':pool.a+=3
                        elif name in ('Mind Stone','Strixhaven Stadium'):pool.c+=1
                        elif name=='Tablet of Discovery':pool.r+=1
                        else:pool.a+=1
                    # credit net of Izzet Signet only when leftover mana available
                    if name=='Izzet Signet' and pool.total()>=1:
                        dummy=Card('signet_activation','ability',1)
                        pool.pay(dummy);pool.u+=1;pool.r+=1
                    if name=='Tablet of Discovery':
                        self.mill(1) # temporary play permission not modelled
                    if name=='Ovika, Enigma Goliath':
                        # Commander is creature, no tokens from casting it
                        pass
                elif self.do_bauble(pool):spells+=1
                elif self.has('Mind Stone') and pool.total()>=1 and len(self.hand)<=2 and turn>=6:
                    pool.pay(Card('cashdraw','ability',1));self.battlefield.remove('Mind Stone');self.grave.append('Mind Stone');self.draw(1)
                elif self.has("Commander's Sphere") and len(self.hand)<=2 and turn>=7:
                    self.battlefield.remove("Commander's Sphere");self.grave.append("Commander's Sphere");self.draw(1)
                else:break
            # At start of combat Irma can copy Ovika once it is on the battlefield; future main phases benefit.
            if self.has('Irma, Part-Time Mutant') and self.has('Ovika, Enigma Goliath'):self.irma_copied=True
            # combat damage triggers: assumes one unblocked creature connects if goblins, for siege (optimistic)
            if self.has('Frostcliff Siege') and self.goblins>0:self.draw(1)
            # End of turn hand size
            if not self.max_hand:
                while len(self.hand)>7:self.discard_worst()
            self.spells_by_turn.append(sum(1 for t,n,src,hand,gob in self.castlog if t==turn and cards[n].typ in ('instant','sorcery')))
            self.hand_by_turn.append(len(self.hand));self.token_by_turn.append(self.goblins)
            self.mana_turns.append(len(self.battlefield));self.land_turns.append(len(self.lands))
            # note no opponents, no actual damage modeled
        following= sum(self.spells_by_turn[self.ovika_turn-1:min(12,self.ovika_turn+1)]) if self.ovika_turn else 0
        # include Ovika turn and next two turns for postcast follow-ups
        follow_t1= sum(self.spells_by_turn[self.ovika_turn-1:min(12,self.ovika_turn+1)]) if self.ovika_turn else 0
        follow_t2= sum(self.spells_by_turn[self.ovika_turn-1:min(12,self.ovika_turn+2)]) if self.ovika_turn else 0
        noncreature_by_turn=[sum(1 for t,n,src,hand,gob in self.castlog if t==turn and cards[n].typ in ('artifact','enchantment','instant','sorcery')) for turn in range(1,13)]
        t=self.ovika_turn
        follow2nc=sum(noncreature_by_turn[t:min(12,t+2)]) if t else 0
        follow3nc=sum(noncreature_by_turn[t:min(12,t+3)]) if t else 0
        # after casting commander: next two full turns, not commander turn
        follow2_spells=sum(self.spells_by_turn[t:min(12,t+2)]) if t else 0
        # noncreature spell casts after Ovika, while token trigger is present; include artifacts etc
        return dict(game=self.num, mulligan=self.mulligans, ovika_turn=self.ovika_turn or None,
                    ovika_by_6=bool(self.ovika_turn and self.ovika_turn<=6),ovika_by_7=bool(self.ovika_turn and self.ovika_turn<=7),
                    hand_at_ovika=self.ovika_hand if self.ovika_turn else None, lands_on_ovika=self.ovika_mana if self.ovika_turn else None,
                    follow_spells_2turn=follow2_spells,follow_spells_3turn=follow_t2,
                    follow_nonc_2turn=follow2nc,follow_nonc_3turn=follow3nc,
                    spells_by_12=sum(self.spells_by_turn),post_ovika_instants_sorceries=self.spells_after,
                    goblins_by_8=self.token_by_turn[7],goblins_by_12=self.goblins,
                    total_goblins=self.total_goblins, hand_by_12=len(self.hand),
                    lands_by_7=self.land_turns[6],hand_by_7=self.hand_by_turn[6],
                    missed_ovika_by_12=not bool(self.ovika_turn),
                    reactive_in_hand=sum('reactive' in cards[x].tags for x in self.hand),
                    powerful_board=self.has('Ovika, Enigma Goliath') and self.goblins>=10,
                    spell_log=' | '.join(f'{t}:{name}' for t,name,src,h,g in self.castlog),
                    hand_trace=' '.join(map(str,self.hand_by_turn)),goblin_trace=' '.join(map(str,self.token_by_turn)))

def run(seed=20261101, n=100):
    rows=[]
    for i in range(n):
        rng=random.Random(seed+i*1009)
        rows.append(Game(i+1,DECK.copy(),rng).go())
    return rows

def report(rows):
    def avg(k):return round(st.mean(r[k] for r in rows if r[k] is not None),2)
    def med(k):return st.median(r[k] for r in rows if r[k] is not None)
    with_ov=[r for r in rows if r['ovika_turn']]
    return dict(seed=20261101, n=len(rows),cards=len(DECK)+1,
            count_ovika_by_6=sum(r['ovika_by_6'] for r in rows),count_ovika_by_7=sum(r['ovika_by_7'] for r in rows),
            count_ovika_by_12=len(with_ov), no_commander=sum(r['missed_ovika_by_12'] for r in rows),
            avg_ovika_turn=avg('ovika_turn'), median_ovika_turn=med('ovika_turn'),
            avg_hand_at_ovika=avg('hand_at_ovika'), median_hand_at_ovika=med('hand_at_ovika'),
            avg_post_ovika_spells=round(st.mean(r['post_ovika_instants_sorceries'] for r in with_ov),2),
            avg_follow_2turn=round(st.mean(r['follow_spells_2turn'] for r in with_ov),2),
            follow_2turn_le2=sum(r['follow_spells_2turn']<=2 for r in with_ov),
            cast_by_10=sum(bool(r['ovika_turn'] and r['ovika_turn']<=10) for r in rows),
            n_o_2turn_le2=sum(r['follow_nonc_2turn']<=2 for r in rows if r['ovika_turn'] and r['ovika_turn']<=10),
            n_o_2turn_none=sum(r['follow_nonc_2turn']==0 for r in rows if r['ovika_turn'] and r['ovika_turn']<=10),
            avg_n_o_2turn=round(st.mean(r['follow_nonc_2turn'] for r in rows if r['ovika_turn'] and r['ovika_turn']<=10),2),
            avg_instants_2turn=round(st.mean(r['follow_spells_2turn'] for r in rows if r['ovika_turn'] and r['ovika_turn']<=10),2),
            avg_follow_3turn=round(st.mean(r['follow_spells_3turn'] for r in with_ov),2),
            avg_goblins_8=avg('goblins_by_8'),median_goblins_8=med('goblins_by_8'),
            avg_goblins_12=avg('goblins_by_12'),median_goblins_12=med('goblins_by_12'),
            avg_total_goblins=avg('total_goblins'),median_total_goblins=med('total_goblins'),
            avg_hand_7=avg('hand_by_7'), avg_land_7=avg('lands_by_7'),
            total_mulligans=sum(r['mulligan'] for r in rows),
            total_spells=round(st.mean(r['spells_by_12'] for r in rows),2),
            by_turn=Counter((r['ovika_turn'] or 0) for r in rows),
            powerful_boards=sum(r['powerful_board'] for r in rows),
            token_by_turn_avg=[round(st.mean(int(r['goblin_trace'].split()[t]) for r in rows),2) for t in range(12)],
            hand_by_turn_avg=[round(st.mean(int(r['hand_trace'].split()[t]) for r in rows),2) for t in range(12)])
if __name__=='__main__':
    print('nonland counts',Counter(c.typ for k,c in cards.items() if c.typ not in ('land',)), 'deck 99',len(DECK))
    print('curve',dict(sorted(Counter(cards[n].mv for n in DECK+['Ovika, Enigma Goliath'] if cards[n].typ!='land').items())))
    rows=run(); stats=report(rows)
    with open(ROOT / 'Ovika_goldfish_100_games.csv','w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=rows[0].keys());writer.writeheader();writer.writerows(rows)
    with open(ROOT / 'Ovika_goldfish_summary.json','w') as f:json.dump(stats,f,indent=2)
    print(json.dumps(stats,indent=2))

# Same model, historical 29 October deck, for an apples-to-apples check.
# Card-specific omitted effects and opponent interaction apply to both.
for name,typ,mv,u,r,tags in [
    ('The Eternity Elevator','artifact',5,0,0,('ramp',)),
    ('Rush of Inspiration','instant',3,0,0,('draw2','discard1','mdfc')),
    ('Corrupted Conscience','enchantment',5,2,0,('payoff',)),
    ('Impostor Syndrome','enchantment',6,2,0,('copy_combat',)),
    ('Crackling Falls','land',0,0,0,()),
]:
    if name not in cards:add(name,typ,mv,u,r,tags)

OLD_REMOVE=['Prismari Charm','Untimely Malfunction','Think Twice','Glacial Dragonhunt']
OLD_ADD=['The Eternity Elevator','Rush of Inspiration','Corrupted Conscience','Impostor Syndrome']
OLD_DECK=[x for x in DECK if x not in OLD_REMOVE]+OLD_ADD
assert len(OLD_DECK)==99

# Additional historical mana and draw functionality (localized monkey patches).
original_play_land=Game.play_land
original_cast=Game.cast
original_mana=Game.mana
original_go=Game.go

def historical_play_land(self,turn):
    if 'Rush of Inspiration' in self.hand and not any(cards[x].typ=='land' for x in self.hand) and len(self.lands)<6:
        self.hand.remove('Rush of Inspiration');self.lands.append('Crackling Falls (tapped)')
    else:return original_play_land(self,turn)

def historical_cast(self,name,source,pool,turn):
    original_cast(self,name,source,pool,turn)
    if name=='Rush of Inspiration':
        self.draw(2)
        if self.hand:
            x=self.rng.choice(self.hand);self.hand.remove(x);self.grave.append(x)

def historical_mana(self,turn):
    p=original_mana(self,turn)
    if self.has('The Eternity Elevator'):p.c+=3
    return p

Game.play_land=historical_play_land
Game.cast=historical_cast
Game.mana=historical_mana
OLD_ROWS=[Game(i+1,OLD_DECK.copy(),random.Random(20261101+i*1009)).go() for i in range(100)]
OLD_REPORT=report(OLD_ROWS)
with open(ROOT / 'Ovika_goldfish_Oct29_100_games.csv','w',newline='') as f:
    wr=csv.DictWriter(f,fieldnames=OLD_ROWS[0].keys());wr.writeheader();wr.writerows(OLD_ROWS)
with open(ROOT / 'Ovika_goldfish_comparison.json','w') as f:
    json.dump({'current':stats,'oct29':OLD_REPORT},f,indent=2)
print('OCTOBER29 BENCHMARK',json.dumps(OLD_REPORT,indent=2))
