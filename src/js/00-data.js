'use strict';
const T=32;let MW=64,MH=64,N=MW*MH;
const OWN=[
  {c:'#3f7fe0',d:'#24508f',l:'#a9c6f5',roof:'#3b6cc0',name:'나',rgb:[90,150,245]},
  {c:'#d4473b',d:'#8a2a22',l:'#f2b0a8',roof:'#b5433a',name:'붉은 부족',rgb:[232,82,66]},
  {c:'#3f9a4a',d:'#245e2b',l:'#a9dcae',roof:'#3a8a44',name:'초록 부족',rgb:[80,200,90]},
  {c:'#e0b52f',d:'#8f6f12',l:'#f5e2a1',roof:'#c99a22',name:'노란 부족',rgb:[245,205,60]},
  {c:'#8a4fd0',d:'#552c88',l:'#d2b7f2',roof:'#7a45b8',name:'보라 부족',rgb:[170,110,240]},
  {c:'#2fb3b8',d:'#17696d',l:'#a6e6e8',roof:'#289ea3',name:'청록 부족',rgb:[60,210,215]},
  {c:'#e5782e',d:'#904615',l:'#f6c49f',roof:'#cc6725',name:'주황 부족',rgb:[245,140,60]},
  {c:'#d65aa0',d:'#86305f',l:'#f1b6d6',roof:'#bf4d8d',name:'분홍 부족',rgb:[235,115,180]},
];
const ally=(a,b)=>a===b||(!!G&&!!G.team&&G.team[a]!==undefined&&G.team[a]===G.team[b]);
const foe=(a,b)=>a!==undefined&&b!==undefined&&!ally(a,b);
const nameOf=o=>o===0?'나':OWN[o].name;
const MAPS={64:{name:'작은 땅',max:4},96:{name:'넓은 땅',max:6},128:{name:'광대한 땅',max:8}};
const MTYPES={
  grass:{name:'초원',desc:'숲과 연못이 고르게 섞인 기본 지형',trees:1,ponds:1},
  forest:{name:'울창한 숲',desc:'나무가 빽빽해 길이 좁고 목재가 넉넉함',trees:2.3,ponds:0.6},
  river:{name:'강',desc:'큰 강이 땅을 가르고 여울로만 건널 수 있음',trees:1,ponds:0.4},
  desert:{name:'사막',desc:'나무가 귀하고 오아시스와 금광이 많음',trees:0.25,ponds:0,oasis:1},
  lake:{name:'호수 지대',desc:'가운데 큰 호수를 둘러싸고 싸움',trees:0.9,ponds:1.4},
  islands:{name:'섬',desc:'부족마다 섬에서 시작하고 좁은 둑길로 이어짐',trees:0.9,ponds:0},
};
const TEAM_N=['팀 1','팀 2','팀 3','팀 4'];
const UD={
  villager:{name:'일꾼',cls:'vil',hp:25,atk:3,at:'m',arm:[0,0],range:0.9,rate:1.5,speed:58,los:5,cost:{food:50},time:10,bmul:0.5,age:0,desc:'자원을 모으고 건물을 짓습니다.'},
  militia:{name:'검사',cls:'inf',hp:50,atk:7,at:'m',arm:[1,0],range:0.9,rate:1.6,speed:54,los:5,cost:{food:60,gold:20},time:12,bmul:1,age:0,bonus:{inf:1},desc:'튼튼한 근접 보병. 건물을 잘 부수고 창병을 이깁니다. 궁수에게 약합니다.'},
  spearman:{name:'창병',cls:'inf',hp:45,atk:4,at:'m',arm:[0,0],range:1,rate:1.7,speed:56,los:5,cost:{food:35,wood:25},time:10,bmul:0.6,age:1,bonus:{cav:14},desc:'값싼 대기병 보병. 기병에게 큰 피해를 주지만 궁수·검사에게 약합니다.'},
  archer:{name:'궁수',cls:'arch',hp:30,atk:5,at:'p',arm:[0,0],range:5,rate:2,speed:58,los:7,cost:{wood:25,gold:45},time:12,bmul:0.3,age:1,bonus:{inf:2},desc:'보병을 멀리서 제압합니다. 기병에게 약합니다.'},
  scout:{name:'경기병',cls:'cav',hp:80,atk:6,at:'m',arm:[0,2],range:0.9,rate:1.8,speed:92,los:8,cost:{food:80},time:14,bmul:0.4,age:1,bonus:{arch:4,siege:10},desc:'빠른 기병. 궁수와 공성 무기를 사냥하지만 창병에게 약합니다.'},
  knight:{name:'기사',cls:'cav',hp:130,atk:10,at:'m',arm:[2,2],range:0.9,rate:1.8,speed:80,los:6,cost:{food:60,gold:75},time:20,bmul:0.6,age:2,bonus:{arch:2,siege:10},desc:'단단한 중기병. 창병 무리는 피하세요.'},
  longbow:{name:'장궁병',cls:'arch',hp:35,atk:6,at:'p',arm:[0,1],range:7,rate:2,speed:56,los:9,cost:{wood:35,gold:40},time:14,bmul:0.3,age:2,bonus:{inf:2},desc:'성에서만 훈련하는 장거리 궁수. 탑보다 멀리서 쏩니다. 기병에게 약합니다.'},
  trebuchet:{name:'투석기',cls:'siege',hp:150,atk:0,siege:90,at:'m',arm:[1,10],range:11,rate:6,speed:24,los:12,cost:{wood:200,gold:200},time:30,bmul:0,age:2,onlyBld:true,proj:'stone',desc:'아주 먼 거리에서 건물·성벽을 부숩니다. 유닛은 공격하지 못하니 호위가 필요합니다.'},
  cart:{name:'교역 수레',cls:'trade',hp:70,atk:0,at:'m',arm:[0,1],range:0.9,rate:9,speed:66,los:5,cost:{food:100,gold:50},time:18,bmul:0,age:1,noAtk:true,desc:'다른 시장을 우클릭하면 두 시장을 오가며 금을 벌어 옵니다. 멀수록 많이 법니다.'},
  horsearcher:{name:'궁기병',cls:'cav',hp:70,atk:6,at:'p',arm:[1,2],range:4,rate:1.9,speed:86,los:7,cost:{wood:40,gold:60},time:18,bmul:0.3,age:1,bonus:{inf:2},civ:'horse',desc:'바람의 기마족 고유 유닛. 말을 타고 활을 쏘며 보병·궁수를 잡습니다. 창병과 다른 기병에게 약합니다.'},
  skirm:{name:'척후병',cls:'arch',hp:30,atk:3,at:'p',arm:[0,3],range:4,rate:2,speed:56,los:7,cost:{food:25,wood:35},time:12,bmul:0.2,age:1,bonus:{arch:4},civ:'bow',desc:'숲의 궁술족 고유 유닛. 화살에 강하고 궁수를 잘 잡는 값싼 투척병. 기병·검사에게 약합니다.'},
  shield:{name:'방패병',cls:'inf',hp:60,atk:5,at:'m',arm:[1,4],range:0.9,rate:1.7,speed:50,los:5,cost:{food:55,gold:30},time:14,bmul:0.8,age:1,bonus:{arch:2},civ:'stone',desc:'바위산 성채족 고유 유닛. 큰 방패로 화살을 막으며 궁수에게 다가갑니다. 느립니다.'},
  camel:{name:'낙타 기병',cls:'cav',hp:95,atk:6,at:'m',arm:[0,1],range:0.9,rate:1.8,speed:84,los:7,cost:{food:60,gold:45},time:16,bmul:0.4,age:1,bonus:{cav:8},civ:'trade',desc:'강가 상인족 고유 유닛. 다른 기병을 잘 잡는 기병. 창병·검사에게 약합니다.'},
  javelin:{name:'투창병',cls:'inf',hp:40,atk:5,at:'p',arm:[0,1],range:4,rate:2.3,speed:56,los:6,cost:{food:45,gold:30},time:11,bmul:0.6,age:1,bonus:{cav:5},civ:'farm',desc:'들판의 농경족 고유 유닛. 창을 던지는 보병으로 기병 상대로 강합니다. 궁수에게 약합니다.'},
  ram:{name:'충차',cls:'siege',hp:180,atk:0,siege:40,at:'m',arm:[0,8],range:0.9,rate:3,speed:32,los:4,cost:{wood:160,gold:75},time:24,bmul:0,age:2,onlyBld:true,desc:'건물·성벽을 부수는 공성 무기. 유닛은 공격하지 못하고 화살에 강합니다.'},
};
const BD={
  tc:{name:'마을회관',w:3,h:3,hp:1400,cost:{wood:275,gold:100},time:60,pop:5,drop:['food','wood','gold'],train:['villager'],los:8,age:0,atk:{dmg:5,range:6,rate:2},gar:15,desc:'일꾼 생산·시대 발전. 모든 자원을 받고, 적이 오면 화살을 쏩니다. 주둔한 유닛 수만큼 화살이 늘어납니다.'},
  house:{name:'집',w:2,h:2,hp:300,cost:{wood:30},time:12,pop:5,los:3,age:0,desc:'인구 한도가 5 늘어납니다 (최대 75).'},
  farm:{name:'농장',w:3,h:3,hp:150,cost:{wood:60},time:10,los:2,age:0,food:250,desc:'식량 250을 생산합니다. 다 쓰면 목재가 있을 때 자동으로 다시 짓습니다.'},
  lumber:{name:'벌목소',w:2,h:2,hp:500,cost:{wood:100},time:18,drop:['wood'],los:4,age:0,desc:'목재를 내려놓는 곳. 숲 가까이 지으세요.'},
  mill:{name:'방앗간',w:2,h:2,hp:500,cost:{wood:100},time:18,drop:['food'],los:4,age:0,desc:'식량을 내려놓는 곳. 열매·농장 옆에 지으세요.'},
  mine:{name:'채광소',w:2,h:2,hp:500,cost:{wood:100},time:18,drop:['gold'],los:4,age:0,desc:'금을 내려놓는 곳. 금광 옆에 지으세요.'},
  barracks:{name:'병영',w:3,h:3,hp:900,cost:{wood:150},time:30,train:['militia','spearman','archer'],los:5,age:0,desc:'검사·창병·궁수를 훈련합니다.'},
  blacksmith:{name:'대장간',w:2,h:2,hp:700,cost:{wood:150},time:30,los:4,age:1,desc:'공격력과 방어력을 연구합니다.'},
  stable:{name:'마구간',w:3,h:3,hp:900,cost:{wood:175},time:35,train:['scout','knight'],los:5,age:1,desc:'경기병과 기사를 훈련합니다.'},
  siege:{name:'공성 작업장',w:3,h:3,hp:900,cost:{wood:200},time:40,train:['ram'],los:5,age:2,desc:'충차를 만듭니다.'},
  tower:{name:'감시탑',w:1,h:1,hp:700,cost:{wood:125,gold:25},time:30,los:9,age:1,atk:{dmg:5,range:7,rate:2},gar:5,desc:'다가오는 적에게 화살을 쏩니다. 보병·궁수·일꾼 5명까지 주둔해 화살을 늘립니다. 충차·검사에 약합니다.'},
  market:{name:'시장',w:3,h:3,hp:900,cost:{wood:175},time:40,los:5,age:1,train:['cart'],desc:'식량·목재를 금으로 사고팔고 교역 수레를 만듭니다. 거래할수록 값이 움직입니다.'},
  castle:{name:'성',w:4,h:4,hp:4000,cost:{wood:400,gold:400},time:90,los:10,age:2,atk:{dmg:7,range:8,rate:2,n:3},gar:20,train:['longbow','trebuchet'],desc:'성주 시대의 요새. 화살을 여러 발 쏘고, 장궁병과 투석기를 만듭니다.'},
  wall:{name:'성벽',w:1,h:1,hp:600,cost:{wood:6},time:5,los:2,age:1,desc:'드래그하거나 두 지점을 클릭해 길게 짓습니다. 한 칸에 목재 6.'},
  gate:{name:'성문',w:1,h:1,hp:900,cost:{wood:40},time:12,los:3,age:1,desc:'내 유닛만 지나갈 수 있는 문. 성벽 사이에 끼워 넣으세요.'},
};
// Civilizations: each has a couple of bonuses and one unique unit trained at uuAt.
const CIV={
  horse:{name:'바람의 기마족',short:'기마',uu:'horsearcher',uuAt:'stable',bon:['기병 체력 +20%','마구간 생산 25% 빠름']},
  bow:{name:'숲의 궁술족',short:'궁술',uu:'skirm',uuAt:'barracks',bon:['원거리 유닛·탑 사거리 +1','목재 채집 +15%']},
  stone:{name:'바위산 성채족',short:'성채',uu:'shield',uuAt:'barracks',bon:['건물 체력 +25%','탑·마을회관·성 화살 공격 +1']},
  trade:{name:'강가 상인족',short:'상인',uu:'camel',uuAt:'stable',bon:['금 채집 +20%','교역 수익 +40%, 시장 시세 변동 절반']},
  farm:{name:'들판의 농경족',short:'농경',uu:'javelin',uuAt:'barracks',bon:['농장 식량 +100','일꾼 생산 25% 빠름']},
};
const CIV_KEYS=Object.keys(CIV);
const civOf=o=>G&&G.players[o]?CIV[G.players[o].civ]||null:null;
const civIs=(o,k)=>!!G&&!!G.players[o]&&G.players[o].civ===k;
function civDesc(k){const c=CIV[k];return c?`${c.bon.join(' · ')} · 고유 유닛 ${UD[c.uu].name}(${BD[c.uuAt].name})`:''}
function trainOf(b){const L=BD[b.type].train||[],c=civOf(b.owner);return c&&c.uuAt===b.type?L.concat(c.uu):L}
// Bonuses that live in the player's modifier block (saved with the game).
function applyCivStart(o){const P=G.players[o],m=P.m;
  if(P.civ==='bow'){m.prng+=1;m.gw*=1.15}
  else if(P.civ==='trade')m.gg*=1.2;
  else if(P.civ==='farm')m.farm+=100;}
const BUILD_PAGES=[['house','farm','lumber','mill','mine','market','tc'],['barracks','blacksmith','stable','siege'],['tower','wall','gate','castle']];
const AGE_N=['암흑 시대','봉건 시대','성주 시대'];
const CLS_N={vil:'일꾼',inf:'보병',arch:'궁수',cav:'기병',siege:'공성',trade:'교역'};
const builtTypes=(o,list)=>list.filter(t=>G.blds.some(b=>b.owner===o&&!b.dead&&b.built>=1&&b.type===t)).length;
const TD={
  feudal:{name:'봉건 시대',at:'tc',age:0,cost:{food:400},time:45,ageUp:1,req:o=>builtTypes(o,['lumber','mill','mine','barracks'])>=2,reqTxt:'벌목소·방앗간·채광소·병영 중 2종',desc:'창병·궁수·경기병과 대장간·마구간·감시탑·성벽이 열립니다.'},
  castle:{name:'성주 시대',at:'tc',age:1,cost:{food:700,gold:250},time:60,ageUp:2,req:o=>builtTypes(o,['blacksmith','stable','tower'])>=2,reqTxt:'대장간·마구간·감시탑 중 2종',desc:'기사·충차와 공성 작업장, 상위 연구가 열립니다.'},
  loom:{name:'베틀',at:'tc',age:0,cost:{gold:50},time:20,desc:'일꾼 체력 +15.'},
  wheelbarrow:{name:'손수레',at:'tc',age:1,cost:{food:150,wood:50},time:30,desc:'일꾼 이동 속도 +10%, 한 번에 3 더 운반.'},
  doubleAxe:{name:'양날 도끼',at:'lumber',age:1,cost:{food:100,wood:50},time:20,desc:'목재 채집 속도 +20%.'},
  horseCollar:{name:'말 목걸이',at:'mill',age:1,cost:{food:75,wood:75},time:20,desc:'새로 짓는 농장 식량 +75.'},
  goldMining:{name:'금 채굴',at:'mine',age:1,cost:{food:100,wood:75},time:25,desc:'금 채집 속도 +20%.'},
  forging:{name:'단조',at:'blacksmith',age:1,cost:{food:150},time:30,desc:'보병·기병 근접 공격 +1.'},
  fletching:{name:'깃 다듬기',at:'blacksmith',age:1,cost:{food:100,gold:50},time:30,desc:'궁수·감시탑·마을회관 원거리 공격 +1, 사거리 +1.'},
  scaleMail:{name:'비늘 갑옷',at:'blacksmith',age:1,cost:{food:100},time:30,desc:'보병 방어 +1/+1.'},
  scaleBarding:{name:'비늘 마갑',at:'blacksmith',age:1,cost:{food:150},time:30,desc:'기병 방어 +1/+1.'},
  paddedArcher:{name:'누비 갑옷',at:'blacksmith',age:1,cost:{food:100},time:25,desc:'궁수 방어 +1/+1.'},
  ironCasting:{name:'철 주조',at:'blacksmith',age:2,cost:{food:220,gold:120},time:40,need:'forging',desc:'근접 공격 +1 추가.'},
  bodkin:{name:'송곳 화살촉',at:'blacksmith',age:2,cost:{food:200,gold:100},time:40,need:'fletching',desc:'원거리 공격 +1 추가.'},
};
const RN={food:'식량',wood:'목재',gold:'금'}, RNS={food:'식량이',wood:'목재가',gold:'금이'};
const RCOL={food:'#e0665a',wood:'#b0814f',gold:'#f0c84a'};
const SUBN={tree:'나무',berry:'열매 덤불',mine:'금광'};
const KEYS='QWERTYUIO';
const GRATE={berry:0.75,farm:0.6,tree:0.55,mine:0.5}, CAP=10, POPMAX=75;
const RAD={vil:6,inf:6,arch:6,cav:9,siege:11,trade:9};
const DIFF={
  easy:{name:'쉬움',gather:0.75,vills:14,firstAt:480,interval:240,wave:4,maxBar:1,barAt:11,train:1.25,feudalAt:13,castleAt:99,maxAge:1,towers:0,stable:false,raid:false,flank:false},
  normal:{name:'보통',gather:1,vills:22,firstAt:330,interval:180,wave:5,maxBar:2,barAt:9,train:1,feudalAt:11,castleAt:18,maxAge:2,towers:1,stable:true,raid:true,raidInt:160,flank:true},
  hard:{name:'어려움',gather:1.3,vills:28,firstAt:240,interval:150,wave:6,maxBar:2,barAt:8,train:0.85,feudalAt:10,castleAt:16,maxAge:2,towers:2,stable:true,raid:true,raidInt:110,flank:true},
};

const $=s=>document.querySelector(s);
const cvs=$('#view'), ctx=cvs.getContext('2d');
const mini=$('#mini'), mctx=mini.getContext('2d');
let W=0,H=0,DPR=1,topH=44,panH=170;
const cam={x:0,y:0};
let G=null, paused=false, sel=[], placing=null, started=false;
