'use strict';
// ---------- step ----------
function step(dt){
  G.t+=dt;
  for(const u of G.units)if(!u.dead&&!u.gar)updUnit(u,dt);
  SEP_DT=dt;separate();
  G.priceT-=dt;if(G.priceT<=0){G.priceT=10;for(const P of G.players)for(const r of ['food','wood'])P.price[r]+=Math.sign(100-P.price[r])}
  for(const b of G.blds)if(!b.dead)updBld(b,dt);
  for(const p of G.proj)p.t+=dt;G.proj=G.proj.filter(p=>p.t<p.d);
  for(const f of G.fx){f.t-=dt;if(f.vz!==undefined){f.z+=f.vz*dt;if(f.g){f.vz-=f.g*dt;if(f.z<0){f.z=0;f.vz=0;f.vx=0;f.vy=0}}}if(f.vx){f.x+=f.vx*dt;f.y+=f.vy*dt}}G.fx=G.fx.filter(f=>f.t>0);
  for(const d of G.decals)d.t-=dt;if(G.decals.some(d=>d.t<=0))G.decals=G.decals.filter(d=>d.t>0);
  for(const p of G.pings)p.t-=dt;G.pings=G.pings.filter(p=>p.t>0);
  if(G.units.some(u=>u.dead))G.units=G.units.filter(u=>!u.dead);
  if(G.blds.some(b=>b.dead))G.blds=G.blds.filter(b=>!b.dead);
  if(G.res.some(r=>r.dead))G.res=G.res.filter(r=>!r.dead);
  if(sel.some(e=>e.dead))sel=sel.filter(e=>!e.dead);
  G.visT-=dt;if(G.visT<=0){G.visT=0.15;computeVis()}
  for(let o=1;o<G.np;o++){if(G.players[o].out)continue;G.aiT[o]-=dt;if(G.aiT[o]<=0){G.aiT[o]=1;aiThink(o)}}
  G.elimT=(G.elimT||0)-dt;if(G.elimT<=0){G.elimT=0.5;checkElim()}
  G.histT=(G.histT===undefined?0:G.histT)-dt;if(G.histT<=0){G.histT=10;recordHist()}
}

function recordHist(){
  if(!G.hist)G.hist={t:[],army:[],vil:[],res:[]};const H=G.hist;
  if(H.t.length>=360)for(const k in H)H[k]=H[k].filter((_,i)=>i%2===0);
  H.t.push(Math.round(G.t));
  const a=[],v=[],r=[];for(let o=0;o<G.np;o++){let na=0,nv=0;for(const u of G.units)if(u.owner===o&&!u.dead){if(u.type==='villager')nv++;else if(!UD[u.type].noAtk)na++}a.push(na);v.push(nv);r.push(G.stats[o].gathered)}
  H.army.push(a);H.vil.push(v);H.res.push(r);
}
function eliminate(o){
  const P=G.players[o];if(P.out)return;P.out=true;P.outT=Math.round(G.t);
  for(const b of G.blds)if(b.owner===o&&!b.dead)kill(b,null);
  for(const u of G.units)if(u.owner===o&&!u.dead){u.dead=true;G.fx.push({x:u.x,y:u.y,corpse:true,t:4,c:OWN[o].c})}
  if(o!==0){toast(nameOf(o)+'이 무너졌습니다');play('collapse')}
}
function checkElim(){
  if(G.over)return;
  for(let o=0;o<G.np;o++){const P=G.players[o];if(P.out)continue;if(!G.blds.some(b=>b.owner===o&&b.type==='tc'&&!b.dead)){if(o===0){P.out=true;endGame(false);return}eliminate(o)}}
  if(!G.players.some((P,o)=>!P.out&&foe(0,o)))endGame(true);
}
