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
  // defense
  let threat=null,td=14*T;
  for(const e of G.units){if(e.dead||e.gar||ally(e.owner,o))continue;for(const b of myB){const d=rectDist(e.x,e.y,b);if(d<td){td=d;threat=e}}}
  if(threat){for(const a of army){if(UD[a.type].onlyBld)continue;if(a.state==='attack'&&a.tgt&&!a.tgt.dead&&a.tgt.kind==='unit')continue;if(a.state==='amove'&&Math.hypot(a.x-tcc.x,a.y-tcc.y)>20*T)continue;cmdAttack(a,threat)}}
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
  // waves
  const home=army.filter(a=>a.state==='idle'||a.state==='move');
  if(G.t>=ai.waveAt&&home.length>=ai.wave){
    const tcs=G.blds.filter(b=>!b.dead&&b.type==='tc'&&foe(o,b.owner)).map(b=>[rectDist(tcc.x,tcc.y,b),b]).sort((a,b2)=>a[0]-b2[0]);
    const tgt=tcs.length?tcs[Math.random()<0.7||tcs.length<2?0:1][1]:null;
    if(tgt){const c=center(tgt);const sp=Math.min(999,...home.filter(a=>a.type!=='trebuchet').map(a=>UD[a.type].speed));
      for(const a of home){cmdAmove(a,c.x+(Math.random()-.5)*60,c.y+(Math.random()-.5)*60);a.gspd=sp}
      ai.waves++;ai.wave=Math.min(30,ai.wave+2);ai.waveAt=G.t+DF.interval}
  }
}
function aiPickUnit(b){
  const o=AIO,P=G.players[o],opts=BD[b.type].train.filter(t=>UD[t].age<=P.age);if(!opts.length)return null;
  const pc={vil:0,inf:0,arch:0,cav:0,siege:0};for(const u of G.units)if(foe(o,u.owner)&&!u.dead)pc[UD[u.type].cls]++;
  const rams=G.units.filter(u=>u.owner===o&&u.type==='ram').length;
  const pdef=G.blds.filter(b=>foe(o,b.owner)&&!b.dead&&['tower','wall','gate','castle'].includes(b.type)).length/Math.max(1,G.np-1),trebs=G.units.filter(u=>u.owner===o&&u.type==='trebuchet').length;
  const sc={longbow:1.2+pc.inf*0.8,trebuchet:pdef>=4?(trebs<2?2.5:0.1):0.15,militia:1+pc.inf*0.3+pc.siege*0.5,spearman:0.4+pc.cav*1.6,archer:1+pc.inf*0.9,scout:0.7+pc.arch*1.2+pc.siege*1.5,knight:1.3+pc.arch*0.8+pc.inf*0.4,ram:rams<2?3:0.1};
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
