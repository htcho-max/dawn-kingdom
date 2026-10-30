'use strict';
// ---------- utils ----------
const idx=(x,y)=>y*MW+x;
const inb=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH;
let PO=-1; // owner whose gates count as open for the current walk query
const walk=(x,y)=>{if(!inb(x,y))return false;const b=G.block[idx(x,y)];return!b||(b.type==='gate'&&b.owner===PO&&b.built>=1)};
const walkPx=(x,y)=>walk(Math.floor(x/T),Math.floor(y/T));
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function rectDist(x,y,o){const x0=o.tx*T,y0=o.ty*T,x1=x0+o.w*T,y1=y0+o.h*T;return Math.hypot(Math.max(x0-x,0,x-x1),Math.max(y0-y,0,y-y1))}
function entDist(u,o){return o.kind==='unit'?Math.max(0,Math.hypot(o.x-u.x,o.y-u.y)-7):rectDist(u.x,u.y,o)}
function center(o){return o.kind==='unit'?{x:o.x,y:o.y}:{x:(o.tx+o.w/2)*T,y:(o.ty+o.h/2)*T}}
const rtOf=o=>o.kind==='res'?o.rt:'food';
const fmtT=s=>{s=Math.floor(s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function afford(o,c){const P=G.players[o];return Object.keys(c).every(k=>P[k]>=c[k])}
function pay(o,c){const P=G.players[o];for(const k in c)P[k]-=c[k]}
function lack(o,c){const P=G.players[o];for(const k in c)if(P[k]<c[k])return RNS[k]+' 부족합니다';return''}
function popOf(o){let n=0;for(const u of G.units)if(u.owner===o&&!u.dead)n++;return n}
function capOf(o){let c=0;for(const b of G.blds)if(b.owner===o&&!b.dead&&b.built>=1&&BD[b.type].pop)c+=BD[b.type].pop;return Math.min(POPMAX,c)}

// ---------- stats with upgrades ----------
const PM=()=>({matk:0,patk:0,prng:0,arm:{vil:[0,0],inf:[0,0],arch:[0,0],cav:[0,0],siege:[0,0],trade:[0,0]},vilHp:0,vilSpd:1,carry:0,gw:1,gg:1,farm:0});
const mkPlayer=()=>({food:200,wood:200,gold:100,age:0,tech:new Set(),m:PM(),price:{food:100,wood:100}});
function atkOf(u){const D=UD[u.type],m=G.players[u.owner].m;if(D.cls==='vil'||D.cls==='siege')return D.atk;return D.atk+(D.at==='p'?m.patk:m.matk)}
function rangeOf(u){const D=UD[u.type];return D.at==='p'?D.range+G.players[u.owner].m.prng:D.range}
function armOf(u){const D=UD[u.type],a=G.players[u.owner].m.arm[D.cls]||[0,0];return[D.arm[0]+a[0],D.arm[1]+a[1]]}
function speedOf(u){const D=UD[u.type];let s=D.speed;if(D.cls==='vil')s*=G.players[u.owner].m.vilSpd;return u.gspd?Math.min(s,u.gspd):s}
function capOfU(u){return CAP+G.players[u.owner].m.carry}
function calcDmg(src,tgt){
  if(src.kind==='bld'){const D=BD[src.type];return Math.max(1,D.atk.dmg+G.players[src.owner].m.patk+(civIs(src.owner,'stone')?1:0)-armOf(tgt)[1])}
  const D=UD[src.type];
  if(tgt.kind==='bld')return D.siege?D.siege:Math.max(1,atkOf(src)*D.bmul);
  const a=armOf(tgt),cls=UD[tgt.type].cls;
  return Math.max(1,atkOf(src)-(D.at==='p'?a[1]:a[0]))+((D.bonus&&D.bonus[cls])||0);
}
function queued(o,id){return G.blds.some(b=>b.owner===o&&!b.dead&&b.queue.includes(id))}
function techState(o,id){
  const P=G.players[o],D=TD[id];
  if(P.tech.has(id)||(D.ageUp&&P.age>=D.ageUp))return'done';
  if(D.need&&!P.tech.has(D.need))return'hidden';
  if(queued(o,id))return'queued';
  if(P.age<D.age)return'locked';
  if(D.req&&!D.req(o))return'req';
  return'ok';
}
function applyTech(o,id){
  const P=G.players[o],m=P.m,D=TD[id];P.tech.add(id);
  if(D.ageUp){P.age=D.ageUp;P.ageT=P.ageT||[];P.ageT[P.age]=Math.round(G.t);if(o===0||G.np<=4)toast(o===0?AGE_N[P.age]+'에 들어섰습니다':nameOf(o)+'이 '+AGE_N[P.age]+'에 들어섰습니다',o!==0);if(o===0)play('ageup');if(o===0)sigCache='';return}
  if(id==='loom'){m.vilHp+=15;for(const u of G.units)if(u.owner===o&&u.type==='villager'){u.maxHp+=15;u.hp+=15}}
  else if(id==='wheelbarrow'){m.vilSpd=1.1;m.carry+=3}
  else if(id==='doubleAxe')m.gw*=1.2;
  else if(id==='goldMining')m.gg*=1.2;
  else if(id==='horseCollar')m.farm+=75;
  else if(id==='forging'||id==='ironCasting')m.matk++;
  else if(id==='fletching'){m.patk++;m.prng++}
  else if(id==='bodkin')m.patk++;
  else if(id==='scaleMail'){m.arm.inf[0]++;m.arm.inf[1]++}
  else if(id==='scaleBarding'){m.arm.cav[0]++;m.arm.cav[1]++}
  else if(id==='paddedArcher'){m.arm.arch[0]++;m.arm.arch[1]++}
  if(o===0){toast(D.name+' 연구 완료');sigCache='';play('research')}
}
