"""Morrow bounded interactive duel stress test, 2026-11-01.

Reuses the previously delivered Ovika card metadata and opening-hand approach,
NOT its goldfish match results. This is NOT a complete Magic engine.
100 paired seeded duels, Commander 1v1 40 life, 21 commander damage, turn limit 15.
Key rules approximated: artifact mana, two Karn lock pieces, Ovika goblins/haste,
counters, Vexing Bauble, Portcullis, simplified combat and selected wipes.
See limitations in report; results are heuristic scenarios not competitive win rates.
"""
from __future__ import annotations
import random, statistics, csv, json, pathlib, math, types, sys
from collections import Counter
from dataclasses import dataclass,field
ROOT=pathlib.Path(__file__).resolve().parent
source=(ROOT/'ovika_goldfish.py').read_text().split("if __name__=='__main__':")[0]
mod=types.ModuleType('ovika_data_only');mod.__file__=str(ROOT/'ovika_goldfish.py');sys.modules['ovika_data_only']=mod
exec(source,mod.__dict__)
OC=mod.cards; OD=list(mod.DECK)

# Karn: card classes/costs transcribed from the supplied exact list.
KC={}
def k(name,typ,mv, tags=()):
    if name in KC:raise ValueError(name)
    KC[name]=(typ,mv,tuple(tags))
for name,mv in [('Karn, Living Legacy',4),('Karn, the Great Creator',4),('Ugin, the Ineffable',6),('Karn Liberated',7),('Ugin, Eye of the Storms',7)]:k(name,'walker',mv)
for name,mv in [('Walking Ballista',0),('Junk Diver',3),('Palladium Myr',3),('Scarecrone',3),('Scrap Trawler',3),('Shimmer Myr',3),('Ultron, Artificial Malevolence',3),('Cryptothrall',4),('Silent Arbiter',4),('The Vision',4),('Voltaic Construct',4),('Geode Golem',5),('Karn, Silver Golem',5),('Duplicant',6),('Steel Hellkite',6),('Krang, Utrom Warlord',9)]:k(name,'creature',mv)
for name,mv in [('Manifold Key',1),('Shadowspear',1),('Sol Ring',1),('Vexing Bauble',1),('Voltaic Key',1),('Lightning Greaves',2),('Strionic Resonator',2),('Swiftfoot Boots',2),('The Irencrag',2),('Thought Vessel',2),('Thran Power Suit',2),('Basalt Monolith',3),('Crucible of Worlds',3),('Mimic Vat',3),('Mirage Mirror',3),('Oblivion Stone',3),('Rings of Brighthearth',3),('Staff of Domination',3),('Sword of Feast and Famine',3),('Sword of Fire and Ice',3),('Sword of Sinew and Steel',3),('Whispersilk Cloak',3),('Grafted Exoskeleton',4),('Hammer of Nazahn',4),('Hedron Archive',4),('Mystic Forge',4),("Nevinyrral's Disk",4),('Portcullis',4),('Thran Dynamo',4),('Unwinding Clock',4),('Forsaken Monument',5),('Memory Jar',5),('Mirrorworks',5),('Mindslaver',6),('Mycosynth Lattice',6),('Planar Bridge',6),("Akroma's Memorial",7),('Spine of Ish Sah',7),('Wondrous Crucible',7),('Darksteel Forge',9)]: k(name,'artifact',mv)
k('All Is Dust','sorcery',7)
k('Echoes of Eternity','enchantment',6)
for n in ['Adventurer\'s Inn','Ancient Tomb','Arch of Orazca','Buried Ruin','Captivating Cave','Conduit Pylons','Darksteel Citadel','Desert','Field of Ruin','Foundry of the Consuls','Ghost Quarter','Hidden Grotto','Inventors\' Fair','Lotus Field','Nesting Grounds','Power Depot','Reliquary Tower','Rogue\'s Passage','Sanctum of Ugin','Scorched Ruins','Shrine of the Forsaken Gods','Temple of the False God','The Gold Saucer','The Grey Havens','Tomb of the Spirit Dragon','Urza\'s Cave','Vesuva','War Room','Witch\'s Clinic']:
    k(n,'land',0)
k('Wastes','land',0);k('Karn, Legacy Reforged','commander',5)
KD=[n for n,c in KC.items() if c[0] not in ('land','commander')]+['Wastes']*7+[n for n,c in KC.items() if c[0]=='land' and n!='Wastes']
assert len(KD)==99, len(KD)

@dataclass
class P:
    who:str; seed:int; first:bool; policy:str='interactive'
    rng:object=None; library:list=field(default_factory=list); hand:list=field(default_factory=list)
    grave:list=field(default_factory=list); bf:list=field(default_factory=list); lands:list=field(default_factory=list)
    summoned:dict=field(default_factory=dict)
    mana:int=0; u:int=0; r:int=0
    life:int=40; commander_damage:int=0; goblins:int=0; soldiers:int=0; token_created:int=0
    commander_turn:int=0; commander_casts:int=0; cards_on_cast:int=0; countered:int=0; killed:int=0
    kills_by_burn:int=0; combat_total:int=0; spells_after:int=0; wipe_events:int=0; lock_turn:int=0
    special_win:str=''; notes:list=field(default_factory=list); turns_idle:int=0; combo_turn:int=0
    has_summon_sickness:bool=True
    def start(self):
        self.rng=random.Random(self.seed)
        self.library=list(OD if self.who=='Ovika' else KD);self.rng.shuffle(self.library)
        self.hand=self.library[:7];self.library=self.library[7:]
        land=sum(self.istype(x,'land') for x in self.hand)
        if land<2 or land>5:
            self.rng.shuffle(self.library+self.hand) # no op; redraw from all cards below
            self.library=list(OD if self.who=='Ovika' else KD)
            self.rng.shuffle(self.library);self.hand=self.library[:7];self.library=self.library[7:]
            # London bottom one, prefer overpriced nonlands except when flooded
            def bottomscore(x):
                if self.istype(x,'land'):return 10 if sum(self.istype(y,'land') for y in self.hand)>3 else -5
                return self.mv(x)
            bottom=max(self.hand,key=bottomscore);self.hand.remove(bottom);self.library.append(bottom)
    def istype(self,n,t):return ((OC[n].typ if self.who=='Ovika' else KC[n][0])==t)
    def mv(self,n):return OC[n].mv if self.who=='Ovika' else KC[n][1]
    def draw(self,n=1):
        for _ in range(n):
            if self.library:self.hand.append(self.library.pop(0))
    def perm(self,n):return n in self.bf
    def add(self,n,t):self.bf.append(n);self.summoned[n]=t
    def remove(self,n):
        if n in self.bf:self.bf.remove(n);self.grave.append(n)
    def landsources(self):
        if self.who=='Karn':
            total=0
            for n in self.lands:
                if n=='Temple of the False God':v=2 if len(self.lands)>=5 else 0
                elif n=='Shrine of the Forsaken Gods':v=2 if len(self.lands)>=7 else 1
                elif n=='Ancient Tomb':v=2
                elif n=='Scorched Ruins':v=4
                elif n=='Lotus Field':v=3
                else:v=1
                if self.perm('Forsaken Monument') and v>0:v+=1 # approximation: one extra {C} per land tap
                total+=v
            return total
        u=r=other=0
        for n in self.lands:
            if n=='Island':u+=1
            elif n=='Mountain':r+=1
            elif n=='Temple of the False God':other+=2 if len(self.lands)>=5 else 0
            elif n=='Lotus Field':other+=3
            elif n in ('Izzet Guildgate','Baron, Airship Kingdom','Swiftwater Cliffs','Thriving Isle'):
                # simplify dual land can produce either; assign colour to balance
                if u<=r:u+=1
                else:r+=1
            else:
                if u<=r:u+=1
                else:r+=1
        return u,r,other
    def landplay(self,turn):
        options=[n for n in self.hand if self.istype(n,'land')]
        if not options:return
        if self.who=='Karn':
            priority={'Ancient Tomb':99,'Scorched Ruins':5 if len(self.lands)<3 else 90,'Temple of the False God':1 if len(self.lands)<4 else 80,'Shrine of the Forsaken Gods':65,'Lotus Field':8 if len(self.lands)<4 else 75}
            name=max(options,key=lambda n:priority.get(n,50))
            self.hand.remove(name)
            if name in ('Scorched Ruins','Lotus Field'):
                if len(self.lands)<2:return
                self.lands=self.lands[2:]
            self.lands.append(name)
        else:
            needs_u=not any(n in self.lands for n in ('Island','Izzet Guildgate','Swiftwater Cliffs','Thriving Isle','Baron, Airship Kingdom'))
            needs_r=not any(n in self.lands for n in ('Mountain','Izzet Guildgate','Swiftwater Cliffs','Thriving Isle','Baron, Airship Kingdom'))
            def rank(n):
                if n=='Island':return 85 if needs_u else 55
                if n=='Mountain':return 85 if needs_r else 55
                if n in ('Izzet Guildgate','Baron, Airship Kingdom','Swiftwater Cliffs','Thriving Isle'):return 70 if turn<=2 else 45
                if n=='Temple of the False God':return 75 if len(self.lands)>=4 else 1
                if n=='Lotus Field':return 65 if len(self.lands)>=5 else 2
                return 68
            name=max(options,key=rank);self.hand.remove(name)
            if name=='Fabled Passage':
                name='Island' if needs_u else 'Mountain'
            elif name=='Lotus Field':
                if len(self.lands)>=2:self.lands=self.lands[2:]
            self.lands.append(name)
    def begin(self,turn,op):
        if turn>1 or not self.first:self.draw()
        self.landplay(turn)
        if self.who=='Karn':
            self.mana=self.landsources()
            # Karn upkeeps produce artifact-only mana, added to 'mana' for artifact casts below, tracked separately
            self.artifact_only=self.bf.count('Karn, Legacy Reforged')*sum(1 for n in self.bf if (KC[n][0]=='artifact' or n in ARTIFACT_CREATURES))
            self.mana+=self.artifact_only
            self.mana+=sum(({'Sol Ring':2,'Thought Vessel':1,'The Irencrag':1,'Basalt Monolith':3,'Hedron Archive':2,'Thran Dynamo':3,'Palladium Myr':2}.get(n,0)+(1 if self.perm('Forsaken Monument') and n in ('Sol Ring','Thought Vessel','The Irencrag','Basalt Monolith','Hedron Archive','Thran Dynamo','Palladium Myr') else 0)) for n in self.bf if n!='Palladium Myr' or self.summoned.get(n,-1)<turn)
        else:
            uu,rr,other=self.landsources();self.u=uu;self.r=rr;self.mana=other
            if not op.perm('Karn, the Great Creator'):
                for n in self.bf:
                    if n=='Sol Ring':self.mana+=2
                    elif n in ('Arcane Signet','Chromatic Lantern',"Commander's Sphere",'Blitzball','Decanter of Endless Water','Cursed Mirror','Izzet Signet'):self.mana+=1
                    elif n in ('Mind Stone','Strixhaven Stadium'):self.mana+=1
                    elif n in ('Sky Diamond',):self.u+=1
                    elif n in ('Heraldic Banner','Tablet of Discovery'):self.r+=1
                    elif n=='Gilded Lotus':self.mana+=3
            for n in self.bf:
                if n in ('Myr Convert','Plague Myr') and self.summoned.get(n,-1)<turn:
                    if n=='Myr Convert':self.mana+=1  # optional life payment not forced when idle
                    else:self.mana+=1
            if op.perm('Karn, the Great Creator') and op.perm('Mycosynth Lattice'):
                self.u=self.r=self.mana=0
    def can_pay(self,mv,u=0,r=0):
        return self.mana+self.u+self.r>=mv and self.u>=u and self.r>=r or (self.mana+self.u+self.r>=mv and self.u+self.r>=u+r and self.mana>0 and self.who=='Karn')
    def pay(self,mv,u=0,r=0):
        if self.who=='Karn':
            self.mana-=mv;return
        if self.u<u or self.r<r:return False
        self.u-=u;self.r-=r
        for _ in range(mv-u-r):
            if self.mana:self.mana-=1
            elif self.r:self.r-=1
            elif self.u:self.u-=1
            else:return False
        return True

ARTIFACT_CREATURES={'Walking Ballista','Junk Diver','Palladium Myr','Scarecrone','Scrap Trawler','Shimmer Myr','Ultron, Artificial Malevolence','Cryptothrall','Silent Arbiter','The Vision','Voltaic Construct','Geode Golem','Karn, Silver Golem','Duplicant','Steel Hellkite','Krang, Utrom Warlord','Karn, Legacy Reforged'}
ROCKS={'Sol Ring':2,'Thought Vessel':1,'The Irencrag':1,'Basalt Monolith':3,'Hedron Archive':2,'Thran Dynamo':3}
O_ROCKS={'Sol Ring':2,'Arcane Signet':1,'Izzet Signet':1,'Mind Stone':1,'Sky Diamond':1,'Chromatic Lantern':1,"Commander's Sphere":1,'Cursed Mirror':1,'Decanter of Endless Water':1,'Heraldic Banner':1,'Strixhaven Stadium':1,'Tablet of Discovery':1,'Gilded Lotus':3}
COUNTERS={'Fierce Guardianship','Force of Negation','Negate','Dissipate','Stoic Rebuttal',"Urza's Rebuff",'Consign to Memory','Izzet Charm'}
# For reproducibility, conservative: only fully counter a legal spell if mana is truly available.
def counter_if_possible(o:P,k:P,n:str,typ:str,turn:int):
    if k.perm('Vexing Bauble'):free_allowed=False
    else:free_allowed=True
    opts=[]
    for c in o.hand:
        if c not in COUNTERS:continue
        if c=='Consign to Memory':
            if o.u>=1 and k.mana<2:opts.append((1,c,1,1,0,False))
        elif c=='Fierce Guardianship':
            if typ in ('creature','commander'):continue
            if o.perm('Ovika, Enigma Goliath') and free_allowed:opts.append((0,c,0,0,0,False))
            elif o.u>=1 and o.mana+o.r+o.u>=3:opts.append((3,c,3,1,0,False))
        elif c=='Force of Negation':
            if typ in ('creature','commander'):continue
            blue=[x for x in o.hand if x!=c and OC[x].u>0]
            if blue and free_allowed:opts.append((0,c,0,0,0,True))
            elif o.u>=2 and o.mana+o.r+o.u>=3:opts.append((3,c,3,2,0,False))
        elif c=='Negate' and typ not in ('creature','commander') and o.u>=1 and o.mana+o.r+o.u>=2:opts.append((2,c,2,1,0,False))
        elif c in ('Dissipate','Stoic Rebuttal',"Urza's Rebuff") and o.u>=2 and o.mana+o.r+o.u>=3:opts.append((3,c,3,2,0,False))
        elif c=='Izzet Charm' and typ not in ('creature','commander') and o.u>=1 and o.r>=1 and o.mana+o.r+o.u>=2 and k.mana<2:
            opts.append((3,c,2,1,1,False))
    if not opts:return False
    # conserve counters for impactful artifacts/walkers; opponent's Karn commander is potentially significant
    valuable={'Karn, the Great Creator','Mycosynth Lattice','Portcullis',"All Is Dust",'Oblivion Stone',"Nevinyrral's Disk",'Krang, Utrom Warlord','Karn, Legacy Reforged','Forsaken Monument','Basalt Monolith','Darksteel Forge','Silent Arbiter','Vexing Bauble','Planar Bridge'}
    if n not in valuable and turn<8:return False
    chosen=min(opts)
    _,c,m,u,r,pitch=chosen
    o.hand.remove(c);o.grave.append(c)
    if pitch:
        blue=[x for x in o.hand if OC[x].u>0]
        if not blue:return False
        target=blue[-1];o.hand.remove(target)
    else:o.pay(m,u,r)
    o.countered+=1
    if o.perm('Ovika, Enigma Goliath'):
        minted=OC[c].mv
        o.token_created+=minted
        if k.perm('Portcullis') and karn_creature_count(k)+ovika_creature_count(o)>=2:pass
        else:o.goblins+=minted
        if o.perm('Molten Gatekeeper'):k.life-=minted;o.kills_by_burn+=minted
        if o.perm('Mister Fantastic, Reed Richards'):o.draw(1)
    o.notes.append(f'T{turn}: countered {n} using {c}')
    return True

def karn_priority(n,p:P,o:P,turn):
    if n=='Karn, Legacy Reforged':return 130
    if n in ROCKS or n=='Palladium Myr':return 145 if turn<=5 else 65
    if n=='Karn, the Great Creator':return 126 if len(o.bf)>=4 else 110
    if n=='Mycosynth Lattice':return 175 if p.perm('Karn, the Great Creator') else 30
    if n=='Forsaken Monument':return 132 if p.perm('Basalt Monolith') else 103
    if n=='Basalt Monolith':return 120 if p.perm('Forsaken Monument') else 125 if turn<=5 else 90
    if n=='Rings of Brighthearth':return 104
    if n=='Vexing Bauble':return 125 if turn<=6 else 35
    if n=='Portcullis':return 124 if o.perm('Ovika, Enigma Goliath') or o.goblins>=4 else 75
    if n=='Silent Arbiter':return 118 if o.goblins>=4 else 76
    if n=="All Is Dust":return 170 if o.goblins>=5 or o.perm('Ovika, Enigma Goliath') else 12
    if n in ('Oblivion Stone',"Nevinyrral's Disk"):
        return 118 if o.goblins>=6 or o.perm('Ovika, Enigma Goliath') else 73
    if n=='Darksteel Forge':return 115 if len(p.bf)>=5 else 85
    if n=='Krang, Utrom Warlord':return 128 if p.perm('Karn, Legacy Reforged') else 90
    if n in ('Mystic Forge','Memory Jar','Wondrous Crucible','The Vision'):return 110
    if n in ('Lightning Greaves','Swiftfoot Boots','Whispersilk Cloak','Akroma\'s Memorial'):return 108 if p.perm('Karn, Legacy Reforged') else 72
    if n in ('Mindslaver','Planar Bridge','Staff of Domination','Walking Ballista'):return 108 if turn>=5 else 55
    if n=='Duplicant':return 132 if o.perm('Ovika, Enigma Goliath') else 78
    if n=='Spine of Ish Sah':return 128 if o.perm('Ovika, Enigma Goliath') else 85
    return (102 if KC[n][0] in ('creature','artifact') else 70)-KC[n][1]*2

def ovika_priority(n,p:P,k:P,turn):
    c=OC[n]
    if n=='Ovika, Enigma Goliath':return 200
    if n in O_ROCKS or n in ('Myr Convert','Plague Myr'):
        return 145 if turn<=4 else (110 if not p.perm('Ovika, Enigma Goliath') else 12)
    if n in ('Mister Fantastic, Reed Richards','Third Path Iconoclast','Molten Gatekeeper'):return 135 if p.perm('Ovika, Enigma Goliath') else 95
    if n in ('Ponder','Preordain','Think Twice','Thrill of Possibility','Prismari Charm','Glacial Dragonhunt','Deep Analysis','Meeting of Minds','Laughing Mad'):
        return 125 if len(p.hand)<5 or p.perm('Ovika, Enigma Goliath') else 80
    if n=='Cyclonic Rift':return 178 if len(k.bf)>=5 or k.perm('Karn, the Great Creator') else 10
    if n=='Vandalblast':return 178 if len(k.bf)>=5 or k.perm('Vexing Bauble') else 15
    if n=='Blasphemous Act':return 150 if len([x for x in k.bf if x in ARTIFACT_CREATURES])>=4 and p.goblins<5 else 12
    if n in ('Wisdom of Ages','Harmonized Crescendo'):return 125 if p.perm('Ovika, Enigma Goliath') else 10
    if n in ('Sakashima of a Thousand Faces','Chameleon, Master of Disguise'):return 135 if p.perm('Ovika, Enigma Goliath') else 42
    if n=='Full Throttle':return 120 if p.goblins>=5 else 5
    if n in ('Omniscience','Portal to Phyrexia'):return 118 if p.perm('Ovika, Enigma Goliath') else 45
    return 88

def o_spell(p:P,k:P,n,turn,source='hand'):
    c=OC[n]
    if source=='hand':p.hand.remove(n)
    elif source=='flashback':p.grave.remove(n)
    if n=='Ovika, Enigma Goliath':
        if n in p.hand:p.hand.remove(n)
        p.add(n,turn);p.commander_turn=p.commander_turn or turn;p.commander_casts+=1;p.cards_on_cast=len(p.hand);p.notes.append(f'T{turn}: Ovika enters')
        return
    if c.typ in ('artifact','enchantment','creature'):p.add(n,turn)
    if c.typ!='creature' and c.typ not in ('commander','land'):
        if p.perm('Ovika, Enigma Goliath'):
            batches=1+(1 if p.perm('Sakashima of a Thousand Faces') else 0)
            produced=c.mv*batches
            # Portcullis tokens can enter but are exiled quickly; still trigger ETB before exile
            if k.perm('Portcullis') and karn_creature_count(k)+ovika_creature_count(p)>=2:survivors=0
            else:survivors=produced
            p.goblins+=survivors;p.token_created+=produced
            if p.perm('Molten Gatekeeper'):k.life-=produced;p.kills_by_burn+=produced
            if p.perm('Mister Fantastic, Reed Richards'):p.draw(batches)
        if c.typ in ('instant','sorcery') and p.perm('Third Path Iconoclast'):
            p.soldiers+=1
            if p.perm('Molten Gatekeeper'):k.life-=1;p.kills_by_burn+=1
            if p.perm('Mister Fantastic, Reed Richards'):p.draw()
    if c.typ in ('instant','sorcery'):
        if p.perm('Ovika, Enigma Goliath'):p.spells_after+=1
        if p.perm('Urabrask'):
            k.life-=1;p.kills_by_burn+=1
        if n in ('Think Twice','Ponder','Preordain','Prismari Charm','Glacial Dragonhunt'):p.draw(1)
        if n=='Deep Analysis' or n=='Meeting of Minds':p.draw(2)
        if n=='Izzet Charm':p.draw(2);discard(p,2)
        if n in ('Thrill of Possibility','Laughing Mad'):discard(p,1);p.draw(2)
        if n=='Harmonized Crescendo':p.draw(min(18,p.goblins+p.soldiers+1))
        if n=='Inspiration from Beyond':
            options=[x for x in p.grave if OC[x].typ in ('instant','sorcery')]
            if options:p.grave.remove(options[0]);p.hand.append(options[0])
        if n=='Wisdom of Ages':
            options=[x for x in p.grave if OC[x].typ in ('instant','sorcery')]
            for x in options:p.grave.remove(x);p.hand.append(x)
        if n=='Vandalblast':
            if k.perm('Darksteel Forge'):pass
            else:
                targets=[x for x in k.bf if (KC[x][0]=='artifact' or x in ARTIFACT_CREATURES) and x!='Darksteel Forge']
                if len(targets)>2:
                    for x in list(targets):k.remove(x)
                    k.notes.append(f'T{turn}: Vandalblast removed {len(targets)} artifacts')
                elif targets:k.remove(max(targets,key=lambda x: karn_priority(x,k,p,turn)))
        if n=='Cyclonic Rift':
            targets=list(k.bf)
            if len(targets)>3:
                for x in list(targets):
                    k.bf.remove(x);k.hand.append(x)
                k.notes.append(f'T{turn}: overloaded Cyclonic Rift returned {len(targets)} nonlands')
            elif targets:
                x=max(targets,key=lambda x:karn_priority(x,k,p,turn));k.bf.remove(x);k.hand.append(x)
        if n=='Blasphemous Act':
            kill_creatures(k,exclude_indestructible=True)
            if not p.perm('Eldrazi Monument'):kill_creatures(p,exclude_indestructible=False)
        if n=='Full Throttle':
            p.extra_combat=True
        if source=='hand':p.grave.append(n)
        else:p.grave.append(n) if n=='Glacial Dragonhunt' else None
    if n=='Mister Fantastic, Reed Richards' and p.goblins>0:pass
    if n in ('Sakashima of a Thousand Faces','Chameleon, Master of Disguise') and p.perm('Ovika, Enigma Goliath'):
        # only Sakashima counted as Ovika copy; Chameleon rules omitted
        pass
    if n=='Portal to Phyrexia':
        victims=[x for x in k.bf if x in ARTIFACT_CREATURES][:3]
        for x in victims:k.remove(x)
    if n=='Omniscience':pass

def discard(p,n):
    for _ in range(n):
        if not p.hand:return
        x=max(p.hand,key=lambda x:OC[x].mv if OC[x].typ!='land' else (10 if len(p.lands)>=6 else -4))
        p.hand.remove(x);p.grave.append(x)

def karn_creature_count(k:P):return sum(x in ARTIFACT_CREATURES for x in k.bf)
def ovika_creature_count(o:P):return sum(OC[x].typ in ('creature','commander') for x in o.bf)+o.goblins+o.soldiers

def kill_creatures(p,exclude_indestructible=True):
    if p.who=='Karn':
        invuln=p.perm('Darksteel Forge') or p.perm('Krang, Utrom Warlord')
        if invuln and exclude_indestructible:return
        for x in list(p.bf):
            if x in ARTIFACT_CREATURES and (x!='Krang, Utrom Warlord' or not exclude_indestructible):p.remove(x)
    else:
        for x in list(p.bf):
            if OC[x].typ in ('creature','commander'):p.remove(x)
        p.goblins=0;p.soldiers=0

def k_spell(k:P,o:P,n,turn):
    typ,mv,_=KC[n]
    if n in k.hand:k.hand.remove(n)
    if n=='Walking Ballista':
        if getattr(k,'ballista_cast_power',0)>=1:
            ctr=k.ballista_cast_power
            if ctr>=o.life:
                o.life-=ctr;k.special_win='Walking Ballista damage';return
            # hold counters for blocker/ping; modest pre-combat chip
            k.add(n,turn);k.ballista=ctr
        return
    if typ in ('artifact','creature','walker','enchantment','commander'):
        k.add(n,turn)
        if n=='Karn, Legacy Reforged':k.commander_turn=k.commander_turn or turn;k.commander_casts+=1;k.cards_on_cast=len(k.hand);k.notes.append(f'T{turn}: Karn enters')
    if n=='Whispersilk Cloak' and k.perm('Karn, Legacy Reforged') and k.mana>=2:
        k.mana-=2;k.equipped_cloak=True
    if n in ROCKS:
        k.mana+=ROCKS[n] + (1 if k.perm('Forsaken Monument') else 0)
    if n=='Hedron Archive':k.mana+=2+(1 if k.perm('Forsaken Monument') else 0)
    if n=='Thran Dynamo':k.mana+=3+(1 if k.perm('Forsaken Monument') else 0)
    if n=='Mystic Forge':k.draw(1) # approximation
    if n=='Memory Jar':k.draw(4) # shortfall of actual discard/redraw model
    if n=='The Vision':pass
    if n=='Duplicant' and o.perm('Ovika, Enigma Goliath'):
        # Ovika's ward tax requires 3 generic plus 3 life; Karn only has mana leftover if paid
        if k.mana>=3:
            k.mana-=3;k.life-=3;o.remove('Ovika, Enigma Goliath');o.killed+=1
    if n=='Spine of Ish Sah' and o.perm('Ovika, Enigma Goliath'):
        if k.mana>=3:
            k.mana-=3;k.life-=3;o.remove('Ovika, Enigma Goliath');o.killed+=1
    if n=='All Is Dust':
        kill_creatures(o,exclude_indestructible=False)
        for x in list(o.bf):
            if OC[x].typ=='enchantment':o.remove(x)
        o.wipe_events+=1;k.notes.append(f'T{turn}: All Is Dust')
    if n=='Portcullis' and o.goblins+karn_creature_count(k)+ovika_creature_count(o)>=2:
        # Portcullis doesn't retroactively exile existing creatures
        pass

def karn_combos(k:P,o:P,turn):
    infinite=(k.perm('Basalt Monolith') and (k.perm('Forsaken Monument') or k.perm('Rings of Brighthearth')))
    if not infinite:return False
    k.combo_turn=k.combo_turn or turn
    if k.perm('Walking Ballista') or 'Walking Ballista' in k.hand or k.perm('Planar Bridge') or k.perm('Staff of Domination'):
        # infinite mana -> activated Planar Bridge or staff draw -> Ballista, unless Ovika has sufficient free counter
        if o.perm('Ovika, Enigma Goliath') and 'Fierce Guardianship' in o.hand and not k.perm('Vexing Bauble'):
            # Guardianship cannot counter Ballista (creature), so not a valid stop
            pass
        k.special_win='Basalt infinite mana + Ballista access';o.life=0
        return True
    return False

def o_action(o:P,k:P,turn):
    if k.perm('Karn, the Great Creator') and k.perm('Mycosynth Lattice'):return False
    items=[]
    if not o.perm('Ovika, Enigma Goliath'):
        c=OC['Ovika, Enigma Goliath']; cost=c.mv+2*o.commander_casts
        if o.can_pay(cost,c.u,c.r):items.append((200,'Ovika, Enigma Goliath',cost,c.u,c.r,'command'))
    for n in o.hand:
        c=OC[n]
        if c.typ=='land' or n in COUNTERS or n in ('Return the Favor','Deflecting Swat','Untimely Malfunction'):continue
        if n in ('Think Twice','Thrill of Possibility','Izzet Charm','Laughing Mad') and n in ('Thrill of Possibility','Laughing Mad') and len(o.hand)<2:continue
        if n=='Harmonized Crescendo' and o.goblins+o.soldiers<=1:continue
        if n=='Inspiration from Beyond' and not any(OC[x].typ in ('instant','sorcery') for x in o.grave):continue
        if n=='Wisdom of Ages' and sum(OC[x].typ in ('instant','sorcery') for x in o.grave)<3:continue
        if n=='Full Throttle' and o.goblins<4:continue
        if n=='Vandalblast' and not any(x in ARTIFACT_CREATURES or KC[x][0]=='artifact' for x in k.bf):continue
        if n=='Cyclonic Rift' and not k.bf:continue
        if n=='Blasphemous Act' and karn_creature_count(k)<2:continue
        if n=='Omniscience' and o.perm('Omniscience'):continue
        price=c.mv
        # restrict Vandalblast overload if >2 artifacts; card's target removal modeled normal cost too
        if n=='Vandalblast' and sum(x in ARTIFACT_CREATURES or KC[x][0]=='artifact' for x in k.bf)>2:price=5
        if n=='Cyclonic Rift' and len(k.bf)>3:price=7
        if n=='Harmonized Crescendo':price=max(c.u+c.r,6-min(o.goblins+o.soldiers,4))
        if n=='Blasphemous Act':price=max(1,9-(karn_creature_count(k)+ovika_creature_count(o)))
        if o.perm('Omniscience'):price=0
        if o.can_pay(price,c.u if price else 0,c.r if price else 0):items.append((ovika_priority(n,o,k,turn),n,price,c.u if price else 0,c.r if price else 0,'hand'))
    for n in o.grave:
        if n not in ('Think Twice','Glacial Dragonhunt','Deep Analysis','Laughing Mad','Inspiration from Beyond'):continue
        if n=='Think Twice':price,u,r=3,1,0
        elif n=='Glacial Dragonhunt':price,u,r=6,1,1
        elif n=='Deep Analysis':price,u,r=2,1,0
        elif n=='Laughing Mad':price,u,r=4,0,1
        else:price,u,r=7,2,0
        if n=='Glacial Dragonhunt' and o.perm('Ovika, Enigma Goliath'):price=2
        if o.can_pay(price,u,r):items.append((ovika_priority(n,o,k,turn)+10,n,price,u,r,'flashback'))
    if not items:return False
    # reserve mana for counterspells in interactive policy, but do not delay Ovika.
    items.sort(reverse=True)
    for rank,n,mv,u,r,source in items:
        remaining=o.mana+o.u+o.r-mv
        needs_hold=o.policy=='interactive' and n!='Ovika, Enigma Goliath' and turn>=4 and any(c in o.hand for c in ('Negate','Dissipate','Stoic Rebuttal',"Urza's Rebuff"))
        if needs_hold and remaining<2 and k.commander_turn==0 and o.perm('Ovika, Enigma Goliath'):continue
        o.pay(mv,u,r)
        o_spell(o,k,n,turn,source)
        if n in O_ROCKS and not k.perm('Karn, the Great Creator'):
            if n=='Sky Diamond':o.u+=1
            elif n in ('Heraldic Banner','Tablet of Discovery'):o.r+=1
            else:o.mana+=O_ROCKS[n]
        return True
    return False

def k_action(k:P,o:P,turn):
    candidates=[]
    if not k.perm('Karn, Legacy Reforged') and k.mana>=5+2*k.commander_casts:candidates.append((karn_priority('Karn, Legacy Reforged',k,o,turn),'Karn, Legacy Reforged',5+2*k.commander_casts))
    for n in k.hand:
        if KC[n][0]=='land':continue
        price=KC[n][1]
        if n=='Walking Ballista':price=max(2,min(k.mana//2*2,24))
        if n=='All Is Dust' and o.goblins==0 and not o.perm('Ovika, Enigma Goliath'):continue
        if n=='Oblivion Stone' and k.perm('Oblivion Stone'):continue
        if n=="Nevinyrral's Disk" and k.perm("Nevinyrral's Disk"):continue
        if k.perm('Ugin, the Ineffable') and KC[n][0] in ('artifact','creature') and n in ARTIFACT_CREATURES or (k.perm('Ugin, the Ineffable') and KC[n][0]=='artifact'):
            price=max(0,price-2)
        # Karn upkeep mana must only pay artifact casts/activated costs; for simplification check:
        available=k.mana if (KC[n][0] in ('artifact','creature') and n in ARTIFACT_CREATURES) or KC[n][0]=='artifact' or n=='Karn, Legacy Reforged' else k.mana-getattr(k,'artifact_only',0)
        if available>=price:candidates.append((karn_priority(n,k,o,turn),n,price))
    if not candidates:return False
    _,n,price=max(candidates)
    typ=KC[n][0]
    # reactive counters live only while opponent has resource open after their turn
    if counter_if_possible(o,k,n,typ,turn):
        k.mana-=price
        if n in k.hand:k.hand.remove(n)
        k.grave.append(n);return True
    k.mana-=price
    if n=='Walking Ballista':k.ballista_cast_power=price//2
    k_spell(k,o,n,turn)
    return True

def sweep_karn(k:P,o:P,turn):
    # activate Disk/Stone when opposing army makes delaying worse than own sacrifice
    if o.goblins>=9 or (o.goblins>=5 and o.life<14):
        if k.perm('Oblivion Stone') and k.mana>=5:
            k.mana-=5;k.wipe_events+=1
            # Board wipe destroys ALL nonland permanents except protected artifact permanents
            for x in list(o.bf):
                if x!='Eldrazi Monument' and OC[x].typ!='land':o.remove(x)
            if not o.perm('Eldrazi Monument'):o.goblins=o.soldiers=0
            if not k.perm('Darksteel Forge'):
                for x in list(k.bf):k.remove(x)
            k.notes.append(f'T{turn}: Oblivion Stone activated');return
        if k.perm("Nevinyrral's Disk") and k.summoned.get("Nevinyrral's Disk",turn)>=turn:return
        if k.perm("Nevinyrral's Disk") and k.mana>=1:
            k.mana-=1;k.wipe_events+=1
            for x in list(o.bf):
                if OC[x].typ in ('creature','commander','artifact','enchantment') and not(o.perm('Eldrazi Monument') and OC[x].typ in ('creature','commander')):o.remove(x)
            if not o.perm('Eldrazi Monument'):o.goblins=o.soldiers=0
            if not k.perm('Darksteel Forge'):
                for x in list(k.bf):
                    if KC[x][0] in ('creature','artifact','enchantment','commander'):k.remove(x)
            k.notes.append(f'T{turn}: Disk activated')

def combat(o:P,k:P,active:str,turn:int):
    if active=='Ovika':
        attackers=o.goblins+o.soldiers
        # permanent evasive noncreature? Ovika herself flyer when it has been on battlefield since last turn
        flyer=6 if o.perm('Ovika, Enigma Goliath') and o.summoned.get('Ovika, Enigma Goliath',turn)<turn else 0
        if k.perm('Silent Arbiter'):
            attackers=min(attackers,1)
            if flyer:attackers=0
        defenders=karn_creature_count(k)
        if k.perm('Portcullis'):attackers=min(attackers,2)
        goblin_connected=max(0,attackers-max(0,defenders))
        if k.perm('Akroma\'s Memorial') or k.perm('Krang, Utrom Warlord') or k.perm('Steel Hellkite'):
            flyer=0
        damage=goblin_connected+flyer
        if flyer>0:
            o.commander_damage+=flyer
            if o.commander_damage>=21:o.special_win='21 Ovika commander damage'
        if o.perm('Enduring Courage'):damage+=goblin_connected
        if o.perm('Strixhaven Stadium') and goblin_connected>=10:
            o.special_win='Stadium 10 combat counters approximation';k.life=0;return
        if getattr(o,'extra_combat',False):damage*=2;o.extra_combat=False
        k.life-=damage;o.combat_total+=damage
    else:
        if not k.perm('Karn, Legacy Reforged') and not k.perm('Krang, Utrom Warlord'):return
        karn_power=max([5]+[KC[n][1] for n in k.bf if KC[n][0]=='artifact' or n in ARTIFACT_CREATURES])
        # Unblockability requires either a previously equipped Cloak or four mana for Passage.
        if k.perm('Whispersilk Cloak') and not getattr(k,'equipped_cloak',False) and k.mana>=2 and k.perm('Karn, Legacy Reforged'):
            k.mana-=2;k.equipped_cloak=True
        passage_active=('Rogue\'s Passage' in k.lands and k.mana>=4)
        if passage_active:k.mana-=4
        unblock=(k.perm('Whispersilk Cloak') and getattr(k,'equipped_cloak',False)) or passage_active
        fly=k.perm('Akroma\'s Memorial') or k.perm('Krang, Utrom Warlord')
        trample=k.perm('Krang, Utrom Warlord') or k.perm('Akroma\'s Memorial') or (k.perm('Shadowspear') and k.mana>=2)
        karn_can_attack=k.perm('Karn, Legacy Reforged') and (k.summoned.get('Karn, Legacy Reforged',turn)<turn or k.perm('Lightning Greaves') or k.perm('Akroma\'s Memorial') or k.perm('Krang, Utrom Warlord'))
        if karn_can_attack:
            airborne_block=o.perm('Ovika, Enigma Goliath') and fly
            token_block=o.goblins+o.soldiers>0 and not fly
            blocked=not unblock and (airborne_block or token_block)
            if blocked and token_block:
                if o.goblins:o.goblins-=1
                else:o.soldiers-=1
            if blocked and airborne_block and karn_power>=6 and not o.perm('Eldrazi Monument'):
                o.remove('Ovika, Enigma Goliath');o.killed+=1
            dmg=karn_power if not blocked else (max(0,karn_power-1) if trample else 0)
            o.life-=dmg;k.combat_total+=dmg;k.commander_damage+=dmg
            if k.commander_damage>=21:k.special_win='21 Karn commander damage'
        if k.perm('Krang, Utrom Warlord') and (k.summoned.get('Krang, Utrom Warlord',turn)<turn or True):
            # Krang has haste, flying and trample, blockers require Ovika and can absorb 6
            dmg=3 if o.perm('Ovika, Enigma Goliath') else 9
            o.life-=dmg;k.combat_total+=dmg

def run_game(i,seat,seed,policy='interactive',turnlimit=15):
    O=P('Ovika',seed*11+7,first=seat=='Ovika',policy=policy);K=P('Karn',seed*11+337,first=seat=='Karn')
    O.start();K.start();winner=None;reason='turn-limit';finish=None
    for turn in range(1,turnlimit+1):
        for p,enemy in ([(O,K),(K,O)] if seat=='Ovika' else [(K,O),(O,K)]):
            p.begin(turn,enemy)
            if p.who=='Ovika':
                for _ in range(28):
                    if not o_action(O,K,turn):break
            else:
                for _ in range(28):
                    if not k_action(K,O,turn):break
                    if karn_combos(K,O,turn):break
                sweep_karn(K,O,turn)
                karn_combos(K,O,turn)
            if O.life<=0 or K.life<=0 or K.special_win or O.special_win:
                winner='Ovika' if K.life<=0 or O.special_win else 'Karn'
                reason=(O.special_win if winner=='Ovika' else K.special_win) or 'life damage'
                finish=turn;break
            combat(O,K,p.who,turn)
            if O.life<=0 or K.life<=0 or K.special_win or O.special_win:
                winner='Ovika' if K.life<=0 or O.special_win else 'Karn'
                reason=(O.special_win if winner=='Ovika' else K.special_win) or 'life damage'
                finish=turn;break
            if p.who=='Ovika':
                while len(O.hand)>7:discard(O,1)
            else:
                while len(K.hand)>7:
                    idx=max(range(len(K.hand)),key=lambda j:KC[K.hand[j]][1]);K.grave.append(K.hand.pop(idx))
        if winner:break
    if not winner:
        # do not assign presumed winner on timeout. Explicitly unresolved.
        if K.perm('Karn, the Great Creator') and K.perm('Mycosynth Lattice'):
            reason='unresolved with Karn lock on battlefield'
        else:reason='turn limit: no lethal outcome'
    return dict(game=i,first=seat,policy=policy,winner=winner or 'Unresolved',reason=reason,finish_turn=finish,
          ovika_commander_turn=O.commander_turn or None,karn_commander_turn=K.commander_turn or None,
          ovika_life=O.life,karn_life=K.life,ovika_tokens_created=O.token_created,
          ovika_goblins_remaining=O.goblins,ovika_spells_after=O.spells_after,
          ovika_counterspells_used=O.countered,ovika_commander_damage=O.commander_damage,karn_commander_damage=K.commander_damage,
          karn_combo_turn=K.combo_turn or None,karn_lock=K.perm('Karn, the Great Creator') and K.perm('Mycosynth Lattice'),
          karn_wipes=K.wipe_events,ovika_wipes=O.wipe_events,
          karn_permanents=len(K.bf),ovika_permanents=len(O.bf),
          notes='; '.join(O.notes[-7:]+K.notes[-7:]))

def summarize(rows):
    w=Counter(x['winner'] for x in rows)
    def avg(key,predicate=lambda x:True):
        values=[x[key] for x in rows if x[key] is not None and predicate(x)]
        return round(statistics.mean(values),2) if values else None
    return dict(games=len(rows),winner_counts=dict(w),
         first_player= {seat:dict(Counter(x['winner'] for x in rows if x['first']==seat)) for seat in ('Ovika','Karn')},
         mean_finish_turn=avg('finish_turn'),
         ovika_cast_by_6=sum(x['ovika_commander_turn'] is not None and x['ovika_commander_turn']<=6 for x in rows),
         ovika_cast_by_7=sum(x['ovika_commander_turn'] is not None and x['ovika_commander_turn']<=7 for x in rows),
         karn_cast_by_5=sum(x['karn_commander_turn'] is not None and x['karn_commander_turn']<=5 for x in rows),
         avg_ovika_cast_turn=avg('ovika_commander_turn'),avg_karn_cast_turn=avg('karn_commander_turn'),
         avg_ovika_tokens_created=avg('ovika_tokens_created'),
         avg_ovika_counterspells_used=avg('ovika_counterspells_used'),
         avg_karn_commander_damage=avg('karn_commander_damage'),
         karn_lock_still_active_at_end=sum(x['karn_lock'] for x in rows),
         karn_infinite_mana_assembled=sum(x['karn_combo_turn'] is not None for x in rows),
         avg_karn_wipes=avg('karn_wipes'))

def main():
    allrows=[]
    for i in range(100):
        seat='Ovika' if i%2==0 else 'Karn'
        allrows.append(run_game(i+1,seat,seed=20261101+i*1009))
    data=summarize(allrows)
    p=ROOT/'Ovika_vs_Karn_100_head_to_head.csv'
    with p.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=allrows[0].keys());w.writeheader();w.writerows(allrows)
    (ROOT/'Ovika_vs_Karn_results.json').write_text(json.dumps(data,indent=2))
    print(json.dumps(data,indent=2))
    print('winning method',Counter((r['winner'],r['reason']) for r in allrows))
    print('FILES',p)
if __name__=='__main__':main()
