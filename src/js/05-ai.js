'use strict';
// ---------- AI ----------
function findSpot(type,ax,ay,owner){
  const D=BD[type];ax=Math.round(ax-D.w/2);ay=Math.round(ay-D.h/2);
  for(let r=0;r<24;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    if(canPlace(type,ax+dx,ay+dy,owner,true))return{x:ax+dx,y:ay+dy};
  }
  return null;
}
let AIO=1;
function aiBuild(type,ax,ay,builder,vills){
  const o=AIO;if(!afford(o,BD[type].cost))return false;
  const s=findSpot(type,ax,ay,o);if(!s)return false;
  if(!builder){let bd=1e9;for(const v of vills){if(v.state==='build')continue;const d=Math.hypot(v.x-ax*T,v.y-ay*T);if(d<bd){bd=d;builder=v}}}
  if(!builder)return false;
  pay(o,BD[type].cost);const b=placeBld(type,o,s.x,s.y,false);cmdBuild(builder,b);return true;
}
const AI_TECH=['loom','wheelbarrow','doubleAxe','horseCollar','forging','fletching','scaleMail','goldMining','scaleBarding','paddedArcher','ironCasting','bodkin'];
function aiThink(o){
  AIO=o;const P=G.players[o],DF=DIFF[G.aiDiff[o]],ai=G.ais[o];
  const tc=G.blds.find(b=>b.owner===o&&b.type==='tc'&&!b.dead&&b.built>=1);if(!tc)return;
  const tcc=center(tc),tcx=tcc.x/T,tcy=tcc.y/T;
  const mx=MW/2-tcx,my=MH/2-tcy,ml=Math.hypot(mx,my)||1,fx=mx/ml,fy=my/ml; // facing the map centre
  const mine=G.units.filter(u=>u.owner===o&&!u.dead);
  const vills=mine.filter(u=>u.type==='villager'&&!u.gar),army=mine.filter(u=>u.type!=='villager'&&!u.gar);
  const myB=G.blds.filter(b=>b.owner===o&&!b.dead);
  const count=t=>myB.filter(b=>b.type===t).length;
  const pop=mine.length,cap=capOf(o),age=P.age;
  const agingUp=tc.queue.some(q=>TD[q]&&TD[q].ageUp);
  let saving=!agingUp&&((age===0&&vills.length>=DF.feudalAt-1&&techState(o,'feudal')==='ok')||(age===1&&DF.maxAge>=2&&vills.length>=DF.castleAt-1&&techState(o,'castle')==='ok'));

  // villagers
  if(!agingUp&&tc.queue.length<2&&vills.length+tc.queue.filter(q=>q==='villager').length<DF.vills&&P.food>=50)queueItem(tc,'villager');
  // age ups
  if(age===0&&vills.length>=DF.feudalAt&&techState(o,'feudal')==='ok'&&afford(o,TD.feudal.cost))queueItem(tc,'feudal');
  if(age===1&&DF.maxAge>=2&&vills.length>=DF.castleAt&&techState(o,'castle')==='ok'&&afford(o,TD.castle.cost))queueItem(tc,'castle');
  // unattended foundations
  for(const b of myB)if(b.built<1&&b.unr&&G.t-b.unr<3){const c=BD[b.type].cost;for(const k in c)P[k]+=c[k];b.dead=true;occupy(b,false)}
  for(const b of myB)if(!b.dead&&b.built<1&&!vills.some(v=>v.tgt===b)){const v=vills.find(v=>v.state!=='build');if(v)cmdBuild(v,b)}
  // one construction decision per tick
  const houseBuilding=myB.some(b=>b.type==='house'&&b.built<1);
  const prod=count('barracks')+count('stable')+count('siege');
  if(cap<POPMAX&&cap-pop<=2+prod*2&&!houseBuilding&&P.wood>=30)aiBuild('house',tcx+(Math.random()*8-4),tcy+(Math.random()*8-4),null,vills);
  else if(vills.length>=5&&!count('lumber')&&P.wood>=100){const t=nearestRes('wood',tcc.x,tcc.y,30*T);if(t)aiBuild('lumber',t.tx+(tcx>t.tx?2:-1),t.ty+(tcy>t.ty?2:-1),null,vills)}
  else if(vills.length>=7&&!count('mill')&&P.wood>=100){const t=nearestRes('food',tcc.x,tcc.y,16*T,'berry');if(t)aiBuild('mill',t.tx+(tcx>t.tx?1.5:-1),t.ty+(tcy>t.ty?1.5:-1),null,vills)}
  else if(vills.length>=8&&!count('mine')&&P.wood>=100){const t=nearestRes('gold',tcc.x,tcc.y,20*T);if(t)aiBuild('mine',t.tx+(tcx>t.tx?2.5:-1.5),t.ty+(tcy>t.ty?2.5:-1.5),null,vills)}
  else if(vills.length>=DF.barAt&&count('barracks')<1&&P.wood>=150)aiBuild('barracks',tcx-6,tcy-6,null,vills);
  else if(age>=1&&!count('blacksmith')&&P.wood>=150)aiBuild('blacksmith',tcx+5,tcy-4,null,vills);
  else if(age>=1&&DF.stable&&!count('stable')&&P.wood>=175)aiBuild('stable',tcx-7,tcy+2,null,vills);
  else if(age>=1&&DF.stable&&count('blacksmith')&&!count('market')&&P.wood>=175)aiBuild('market',tcx+6,tcy+3,null,vills);
  else if(count('mine')&&count('mine')<3&&P.wood>=100&&(()=>{const g=nearestRes('gold',tcc.x,tcc.y,40*T);if(!g)return false;const d=nearestDrop(o,'gold',(g.tx+1)*T,(g.ty+1)*T);return!d||rectDist((g.tx+1)*T,(g.ty+1)*T,d)>7*T})()){const g=nearestRes('gold',tcc.x,tcc.y,40*T);aiBuild('mine',g.tx+(tcx>g.tx?2.5:-1.5),g.ty+(tcy>g.ty?2.5:-1.5),null,vills)}
  else if(count('lumber')&&count('lumber')<3&&P.wood>=100&&(()=>{const w=nearestRes('wood',tcc.x,tcc.y,40*T);if(!w)return false;const d=nearestDrop(o,'wood',(w.tx+.5)*T,(w.ty+.5)*T);return!d||rectDist((w.tx+.5)*T,(w.ty+.5)*T,d)>8*T})()){const w=nearestRes('wood',tcc.x,tcc.y,40*T);aiBuild('lumber',w.tx+(tcx>w.tx?2:-1),w.ty+(tcy>w.ty?2:-1),null,vills)}
  else if(age>=1&&count('tower')<DF.towers&&afford(o,BD.tower.cost)&&!saving){const k=count('tower');aiBuild('tower',tcx+fx*(6+k*2)+fy*(k?4:-4),tcy+fy*(6+k*2)-fx*(k?4:-4),null,vills)}
  else if(age>=2&&!count('siege')&&P.wood>=200)aiBuild('siege',tcx-2,tcy-9,null,vills);
  else if(age>=2&&DF.stable&&count('siege')&&!count('castle')&&afford(o,BD.castle.cost))aiBuild('castle',tcx+fx*7+fy*5,tcy+fy*7-fx*5,null,vills);
  else if(vills.length>=DF.vills-2&&count('barracks')<DF.maxBar&&P.wood>=200&&!saving)aiBuild('barracks',tcx-3,tcy-8,null,vills);
  // research: one item per tick, only from surplus
  const castleSave=age>=2&&DF.stable&&!count('castle')&&count('siege')>0&&army.length>=4;
  if(!saving&&!castleSave)for(const id of AI_TECH){
    if(techState(o,id)!=='ok')continue;
    const D=TD[id],b=myB.find(x=>x.type===D.at&&x.built>=1&&x.queue.length===0);if(!b)continue;
    const c=D.cost;if(P.food>=(c.food||0)+120&&P.wood>=(c.wood||0)+60&&P.gold>=(c.gold||0)+40){queueItem(b,id);break}
  }
  // army
  const wantVills=vills.length<DF.vills;
  for(const b of myB){
    if(ai.armyCap!==undefined&&army.length>=ai.armyCap)break;
    if(!BD[b.type].train||b.type==='tc'||b.type==='market'||b.built<1||b.queue.length>=2)continue;
    const t=aiPickUnit(b);if(!t)continue;const c=UD[t].cost;
    const minDef=army.length<4,wantCastle=age>=2&&DF.stable&&!count('castle')&&count('siege')>0&&b.type!=='castle';
    const reserve=saving&&!minDef?(age===0?400:700):wantVills?50:0,greserve=saving&&!minDef&&age===1?250:wantCastle&&!minDef?400:0,wreserve=wantCastle&&!minDef?400:0;
    if(afford(o,c)&&P.food-(c.food||0)>=reserve&&P.gold-(c.gold||0)>=greserve&&P.wood-(c.wood||0)>=wreserve)queueItem(b,t);
  }
  // idle villagers
  for(const v of vills){
    if(v.state!=='idle')continue;
    if(v.carry.n>0){v.state='return';v.dropT=null;continue}
    aiAssign(v,vills,tc);
  }
  // rebalance toward food once berries run out
  {const fc=vills.filter(u=>u.gtype==='food'&&(u.state==='gather'||u.state==='return'||u.state==='build')).length;
   if(vills.length>=6&&fc<vills.length*0.35&&P.wood>=60){
     const c=vills.filter(u=>u.state==='gather'&&u.gtype!=='food'&&u.carry.n<3).sort((a,b)=>a.carry.n-b.carry.n)[0];
     if(c)aiAssign(c,vills,tc,'food');
   }
   // shift surplus gatherers when a stockpile is far above need
   const rich=P.gold>600?'gold':P.wood>500?'wood':null;
   if(rich){const c=vills.find(u=>u.state==='gather'&&u.gtype===rich&&u.carry.n<3);if(c)aiAssign(c,vills,tc,P.food<300?'food':rich==='gold'?'wood':'gold')}
  }
  // what this tribe (and its AI allies) has actually seen
  const vis=aiSense(o,ai);
  const busy=new Set([ai.scoutId,...(ai.raid?ai.raid.ids:[]),...(ai.atk?ai.atk.ids:[]),...(ai.flank?ai.flank.ids:[])]);
  aiScout(o,ai,tcc);
  // defense: only against enemies we can see near our (or a nearby ally's) buildings
  let threat=null,td=14*T;
  const guard=G.blds.filter(b=>!b.dead&&ally(b.owner,o)&&(b.owner===o||rectDist(tcc.x,tcc.y,b)<30*T));
  for(const e of vis){for(const b of guard){const d=rectDist(e.x,e.y,b)-(b.owner===o?0:4*T);if(d<td){td=d;threat=e}}}
  if(threat){for(const a of army){if(UD[a.type].onlyBld||a.id===ai.scoutId||(ai.raid&&ai.raid.ids.includes(a.id)))continue;if(a.state==='attack'&&a.tgt&&!a.tgt.dead&&a.tgt.kind==='unit')continue;if(a.state==='amove'&&Math.hypot(a.x-tcc.x,a.y-tcc.y)>20*T)continue;cmdAttack(a,threat)}}
  // town bell when outmatched at home
  {let near=0;for(const e of G.units){if(e.dead||e.gar||ally(e.owner,o)||UD[e.type].cls==='vil')continue;if(Math.hypot(e.x-tcc.x,e.y-tcc.y)<11*T)near++}
   const def=army.filter(a=>Math.hypot(a.x-tcc.x,a.y-tcc.y)<14*T).length;
   if(near>=3&&near>def+1&&!ai.bell){ringBell(o);ai.bell=G.t}
   else if(ai.bell&&near===0&&G.t-ai.bell>8){allClear(o);ai.bell=0}}
  // market: trade away lopsided stockpiles
  if(myB.some(b=>b.type==='market'&&b.built>=1)){
    if(P.gold>450&&P.food<150&&P.price.food<200)trade(o,'food',true);
    else if(P.wood>700&&P.gold<350)trade(o,'wood',false);
    else if(P.food>900&&P.gold<350)trade(o,'food',false);
    else if(P.gold>600&&P.wood<100&&P.price.wood<200)trade(o,'wood',true);
  }
  aiRaid(o,ai,DF,army,vis,tcc,busy);
  aiWatchAttack(o,ai,vis,tcc);
  // waves
  const home=army.filter(a=>(a.state==='idle'||a.state==='move')&&!busy.has(a.id));
  const join=ai.join&&G.t-ai.join.t<60?G.blds.find(b=>b.id===ai.join.id&&!b.dead):null;
  if(!join)ai.join=null;
  if(!ai.atk&&!ai.noWave&&((G.t>=ai.waveAt&&home.length>=ai.wave)||(join&&home.length>=Math.max(4,Math.ceil(ai.wave*0.6))))){
    if(aiLaunch(o,ai,DF,home,tcc,join)){ai.waves++;ai.wave=Math.min(30,ai.wave+2);ai.waveAt=G.t+DF.interval;ai.join=null}
  }
}
// ---- senses: an AI only knows enemy buildings and units its own units/buildings have seen ----
function aiSense(o,ai){
  ai.kb=ai.kb||{};ai.seen=ai.seen||{inf:0,arch:0,cav:0,siege:0};
  const eyes=[];
  for(const u of G.units)if(u.owner===o&&!u.dead&&!u.gar)eyes.push(u.x/T,u.y/T,UD[u.type].los+1);
  for(const b of G.blds)if(b.owner===o&&!b.dead)eyes.push(b.tx+b.w/2,b.ty+b.h/2,BD[b.type].los+b.w/2);
  const sees=(x,y,pad)=>{for(let i=0;i<eyes.length;i+=3){const dx=eyes[i]-x,dy=eyes[i+1]-y,r=eyes[i+2]+pad;if(dx*dx+dy*dy<=r*r)return true}return false};
  const alive=new Set();
  for(const b of G.blds){if(b.dead)continue;alive.add(b.id);if(foe(o,b.owner)&&!ai.kb[b.id]&&sees(b.tx+b.w/2,b.ty+b.h/2,b.w/2))ai.kb[b.id]=1}
  for(const id in ai.kb)if(!alive.has(+id))delete ai.kb[id];
  // AI teammates share what they have found
  for(let a=1;a<G.np;a++)if(a!==o&&G.ais[a]&&G.ais[a].kb&&ally(a,o)&&!G.players[a].out)Object.assign(ai.kb,G.ais[a].kb);
  const vis=[],cnt={inf:0,arch:0,cav:0,siege:0};
  for(const u of G.units){if(u.dead||u.gar||!foe(o,u.owner)||!sees(u.x/T,u.y/T,0))continue;vis.push(u);const c=UD[u.type].cls;if(c in cnt)cnt[c]++}
  for(const k in cnt)ai.seen[k]=Math.max(cnt[k],ai.seen[k]*0.98);
  return vis;
}
const aiKnown=(o,ai)=>G.blds.filter(b=>!b.dead&&ai.kb&&ai.kb[b.id]&&foe(o,b.owner));
// ---- scouting: walk a grid of map cells, nearest unvisited first ----
const SCELL=12;
function aiScout(o,ai,tcc){
  if(ai.scoutId===undefined){const s=G.units.find(u=>u.owner===o&&u.type==='scout'&&!u.dead);ai.scoutId=s?s.id:null}
  ai.vis=ai.vis||[];
  let s=ai.scoutId?G.units.find(u=>u.id===ai.scoutId&&!u.dead):null;
  const enemies=new Set(G.players.map((P,i)=>i).filter(i=>!G.players[i].out&&foe(o,i)));
  const knownTc=new Set(aiKnown(o,ai).filter(b=>b.type==='tc').map(b=>b.owner));
  const allFound=[...enemies].every(i=>knownTc.has(i));
  if(!s){ai.scoutId=null;
    if(!allFound&&G.t-(ai.scoutT||0)>60){const c=G.units.find(u=>u.owner===o&&!u.dead&&!u.gar&&(u.type==='scout'||u.type==='camel'||u.type==='horsearcher')&&u.state==='idle');if(c){ai.scoutId=c.id;ai.scoutT=G.t;s=c}}
    if(!s)return}
  if(s.hp<s.maxHp*0.35){cmdMove(s,tcc.x,tcc.y);ai.scoutId=null;ai.scoutT=G.t;return}
  const cw=Math.ceil(MW/SCELL),ch=Math.ceil(MH/SCELL),cc=i=>({x:((i%cw)+.5)*SCELL,y:(Math.floor(i/cw)+.5)*SCELL});
  for(let i=0;i<cw*ch;i++){if(ai.vis.includes(i))continue;const c=cc(i);if(Math.hypot(s.x/T-c.x,s.y/T-c.y)<6)ai.vis.push(i)}
  if(s.state==='move'&&s.path.length)return;
  if(ai.scoutGoal!==undefined&&ai.scoutGoal!==null&&!ai.vis.includes(ai.scoutGoal))ai.vis.push(ai.scoutGoal); // unreachable or reached
  let best=-1,bd=1e9;
  for(let i=0;i<cw*ch;i++){if(ai.vis.includes(i))continue;const c=cc(i),tx=Math.floor(c.x),ty=Math.floor(c.y);
    if(G.water&&G.water[idx(Math.min(MW-1,tx),Math.min(MH-1,ty))]){ai.vis.push(i);continue}
    const d=Math.hypot(s.x/T-c.x,s.y/T-c.y);if(d<bd){bd=d;best=i}}
  if(best<0){if(allFound){ai.scoutGoal=null;cmdMove(s,tcc.x,tcc.y);ai.scoutId=null;ai.scoutDone=true}else{ai.vis=[];ai.scoutGoal=null}return}
  const c=cc(best);ai.scoutGoal=best;cmdMove(s,c.x*T,c.y*T);
}
// ---- villager raids with fast cavalry ----
function aiRaid(o,ai,DF,army,vis,tcc,busy){
  if(ai.raid){const R=ai.raid,us=R.ids.map(id=>G.units.find(u=>u.id===id&&!u.dead)).filter(Boolean);
    const hp=us.reduce((a,u)=>a+u.hp,0);
    if(us.length<2||hp<R.hp0*0.5||G.t-R.t0>80){for(const u of us)cmdMove(u,tcc.x+(Math.random()-.5)*80,tcc.y+(Math.random()-.5)*80);ai.raid=null;ai.raidAt=G.t+(DF.raidInt||150);return}
    R.ids=us.map(u=>u.id);
    for(const u of us){if(u.state==='attack'&&u.tgt&&!u.tgt.dead&&u.tgt.kind==='unit'&&u.tgt.type==='villager')continue;
      let bv=null,bd=10*T;for(const e of vis){if(e.type!=='villager')continue;const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<bd){bd=d;bv=e}}
      if(bv)cmdAttack(u,bv)}
    return}
  if(ai.noWave||!DF.raid||G.players[o].age<1||G.t<(ai.raidAt||DF.firstAt*0.9))return;
  const fast=army.filter(a=>UD[a.type].cls==='cav'&&!busy.has(a.id)&&(a.state==='idle'||a.state==='move'));
  if(fast.length<3)return;
  const drops=aiKnown(o,ai).filter(b=>['lumber','mine','mill'].includes(b.type));
  const pool=drops.length?drops:aiKnown(o,ai).filter(b=>b.type==='tc');if(!pool.length)return;
  const tg=pool.map(b=>[rectDist(tcc.x,tcc.y,b),b]).sort((a,b)=>a[0]-b[0])[Math.random()<0.6||pool.length<2?0:1][1];
  const grp=fast.slice(0,4),c=center(tg);
  for(const u of grp)cmdAmove(u,c.x+(Math.random()-.5)*60,c.y+(Math.random()-.5)*60);
  ai.raid={ids:grp.map(u=>u.id),t0:G.t,hp0:grp.reduce((a,u)=>a+u.hp,0),tgt:tg.id};
  if(ally(0,o)&&o!==0)toast(nameOf(o)+'이 '+nameOf(tg.owner)+'의 일꾼을 습격하러 갑니다');
}
// ---- main attacks: pick a known target, split for a flank, call AI allies ----
const aiPow=u=>UD[u.type].noAtk?0:UD[u.type].onlyBld?u.hp*0.2:u.hp*Math.max(1,atkOf(u))/UD[u.type].rate;
function aiLaunch(o,ai,DF,home,tcc,join){
  const known=aiKnown(o,ai);let tgt=join||null;
  if(!tgt){const tcs=known.filter(b=>b.type==='tc').map(b=>[rectDist(tcc.x,tcc.y,b),b]).sort((a,b)=>a[0]-b[0]);
    if(tcs.length)tgt=tcs[Math.random()<0.7||tcs.length<2?0:1][1];
    else if(known.length)tgt=known.map(b=>[rectDist(tcc.x,tcc.y,b),b]).sort((a,b)=>a[0]-b[0])[0][1]}
  let dest;
  if(tgt)dest=center(tgt);
  else{ // nothing found yet: march to the least explored far cell
    ai.vis=ai.vis||[];const cw=Math.ceil(MW/SCELL),ch=Math.ceil(MH/SCELL);let best=null,bd=-1;
    for(let i=0;i<cw*ch;i++){if(ai.vis.includes(i))continue;const x=((i%cw)+.5)*SCELL*T,y=(Math.floor(i/cw)+.5)*SCELL*T;const d=Math.hypot(x-tcc.x,y-tcc.y);if(d>bd){bd=d;best={x,y}}}
    if(!best)return false;dest=best}
  const sp=Math.min(999,...home.filter(a=>a.type!=='trebuchet').map(a=>UD[a.type].speed));
  let main=home,flank=[];
  if(DF.flank&&home.length>=10&&tgt&&Math.random()<0.65){
    const sh=home.slice().sort(()=>Math.random()-.5);flank=sh.slice(0,Math.floor(sh.length*0.4)).filter(u=>!UD[u.type].onlyBld);main=home.filter(u=>!flank.includes(u))}
  for(const a of main){cmdAmove(a,dest.x+(Math.random()-.5)*60,dest.y+(Math.random()-.5)*60);a.gspd=sp}
  if(flank.length){
    const dx=dest.x-tcc.x,dy=dest.y-tcc.y,l=Math.hypot(dx,dy)||1,s=Math.random()<0.5?1:-1;
    let fx=dest.x-dx/l*5*T+(-dy/l)*s*13*T,fy=dest.y-dy/l*5*T+(dx/l)*s*13*T;
    fx=Math.max(2*T,Math.min((MW-2)*T,fx));fy=Math.max(2*T,Math.min((MH-2)*T,fy));
    const fs=Math.min(...flank.map(a=>UD[a.type].speed));
    for(const a of flank){cmdAmove(a,fx+(Math.random()-.5)*50,fy+(Math.random()-.5)*50);a.gspd=fs}
    ai.flank={ids:flank.map(u=>u.id),x:fx,y:fy,dx:dest.x,dy:dest.y,t0:G.t}}
  ai.atk={ids:home.map(u=>u.id),t0:G.t,n0:home.length,dx:dest.x,dy:dest.y,tgt:tgt?tgt.id:null};
  if(tgt){ // call AI teammates that have an army ready
    for(let a=1;a<G.np;a++){if(a===o||!G.ais[a]||G.players[a].out||!ally(a,o)||G.ais[a].atk)continue;G.ais[a].join={id:tgt.id,t:G.t};(G.ais[a].kb=G.ais[a].kb||{})[tgt.id]=1}
    if(ally(0,o)&&o!==0)toast(nameOf(o)+'이 '+nameOf(tgt.owner)+'을 공격하러 갑니다');
    else if(tgt.owner===0&&G.ais[o].waves===0&&G.np>2)toast(nameOf(o)+'의 군대가 움직이기 시작했습니다',true);
  }
  return true;
}
function aiWatchAttack(o,ai,vis,tcc){
  if(ai.flank){const F=ai.flank,us=F.ids.map(id=>G.units.find(u=>u.id===id&&!u.dead)).filter(Boolean);
    if(!us.length)ai.flank=null;
    else{const cx=us.reduce((a,u)=>a+u.x,0)/us.length,cy=us.reduce((a,u)=>a+u.y,0)/us.length;
      if(Math.hypot(cx-F.x,cy-F.y)<5*T||G.t-F.t0>45){for(const u of us)if(u.state!=='attack')cmdAmove(u,F.dx+(Math.random()-.5)*60,F.dy+(Math.random()-.5)*60);ai.flank=null}}}
  if(!ai.atk)return;
  const A=ai.atk,us=A.ids.map(id=>G.units.find(u=>u.id===id&&!u.dead&&!u.gar)).filter(Boolean);
  if(!us.length||G.t-A.t0>240){ai.atk=null;return}
  A.ids=us.map(u=>u.id);
  const fight=us.filter(u=>!UD[u.type].onlyBld);if(!fight.length)return;
  const cx=fight.reduce((a,u)=>a+u.x,0)/fight.length,cy=fight.reduce((a,u)=>a+u.y,0)/fight.length;
  if(Math.hypot(cx-tcc.x,cy-tcc.y)<16*T)return; // still near home
  if(G.t-A.t0<15)return;
  const near=us.filter(u=>Math.hypot(u.x-cx,u.y-cy)<14*T);
  const mine=near.reduce((a,u)=>a+aiPow(u),0);
  let theirs=0;for(const e of vis)if(Math.hypot(e.x-cx,e.y-cy)<10*T)theirs+=aiPow(e);
  for(const b of G.blds){const D=BD[b.type];if(b.dead||!D.atk||b.built<1||!foe(o,b.owner))continue;if(rectDist(cx,cy,b)<(D.atk.range+3)*T)theirs+=Math.min(b.hp,D.hp*1.25)*0.5*(D.atk.dmg*((D.atk.n||1)+b.garrison.length))/D.atk.rate}
  if(theirs>0&&(mine<theirs*0.3||(mine<theirs*0.5&&us.length<A.n0*0.75))){
    for(const u of us)cmdMove(u,tcc.x+(Math.random()-.5)*90,tcc.y+(Math.random()-.5)*90);
    ai.atk=null;ai.flank=null;ai.waveAt=G.t+50;ai.retreats=(ai.retreats||0)+1;
    if(ally(0,o)&&o!==0)toast(nameOf(o)+'의 군대가 불리해서 물러납니다');
  }
}
function aiPickUnit(b){
  const o=AIO,P=G.players[o],opts=trainOf(b).filter(t=>UD[t].age<=P.age);if(!opts.length)return null;
  const sn=(G.ais[o]&&G.ais[o].seen)||{},pc={vil:0,inf:sn.inf||0,arch:sn.arch||0,cav:sn.cav||0,siege:sn.siege||0};
  const rams=G.units.filter(u=>u.owner===o&&u.type==='ram').length;
  const pdef=G.blds.filter(b=>foe(o,b.owner)&&!b.dead&&G.ais[o]&&G.ais[o].kb&&G.ais[o].kb[b.id]&&['tower','wall','gate','castle'].includes(b.type)).length/Math.max(1,G.np-1),trebs=G.units.filter(u=>u.owner===o&&u.type==='trebuchet').length;
  const sc={longbow:1.2+pc.inf*0.8,trebuchet:pdef>=4?(trebs<2?2.5:0.1):0.15,militia:1+pc.inf*0.3+pc.siege*0.5,spearman:0.4+pc.cav*1.6,archer:1+pc.inf*0.9,scout:0.7+pc.arch*1.2+pc.siege*1.5,knight:1.3+pc.arch*0.8+pc.inf*0.4,ram:rams<2?3:0.1,horsearcher:1.4+pc.inf*0.7,skirm:0.5+pc.arch*1.5,shield:1+pc.arch*1.1,camel:0.6+pc.cav*1.6,javelin:0.9+pc.cav*1+pc.inf*0.3};
  let tot=0;const w=opts.map(t=>{const v=sc[t]||1;tot+=v;return v});let r=Math.random()*tot;
  for(let i=0;i<opts.length;i++){r-=w[i];if(r<=0)return opts[i]}
  return opts[0];
}
function aiAssign(v,vills,tc,force){
  const cnt={food:0,wood:0,gold:0};
  for(const u of vills)if(u.gtype&&(u.state==='gather'||u.state==='return'))cnt[u.gtype]++;
  const o=AIO,total=Math.max(1,vills.length),P=G.players[o],want=P.gold>500?{food:0.55,wood:0.37,gold:0.08}:P.age>=2?{food:0.42,wood:0.28,gold:0.3}:P.wood>450?{food:0.55,wood:0.2,gold:0.25}:{food:0.45,wood:0.35,gold:0.2};
  const order=force?[force]:['food','wood','gold'].sort((a,b)=>(cnt[a]/total-want[a])-(cnt[b]/total-want[b]));
  const tcc=center(tc);
  for(const t of order){
    if(t==='food'){
      const ber=nearestRes('food',tcc.x,tcc.y,16*T,'berry');if(ber){cmdGather(v,ber);return}
      const farm=G.blds.find(b=>b.owner===o&&!b.dead&&b.type==='farm'&&b.built>=1&&b.food>0&&!vills.some(u=>u!==v&&u.tgt===b));
      if(farm){cmdGather(v,farm);return}
      const mill=G.blds.find(b=>b.owner===o&&!b.dead&&b.type==='mill');const a=center(mill||tc);
      if(G.blds.filter(b=>b.owner===o&&!b.dead&&b.type==='farm').length<18&&(aiBuild('farm',a.x/T+(Math.random()*6-3),a.y/T+(Math.random()*6-3),v,vills)||aiBuild('farm',center(tc).x/T+(Math.random()*8-4),center(tc).y/T+(Math.random()*8-4),v,vills)))return;
      continue;
    }
    const drop=G.blds.find(b=>b.owner===o&&!b.dead&&b.type===(t==='wood'?'lumber':'mine'));const a=center(drop||tc);
    const r=nearestRes(t,a.x,a.y,40*T);if(r){cmdGather(v,r);return}
  }
}
