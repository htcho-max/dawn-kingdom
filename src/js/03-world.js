'use strict';
// ---------- world creation ----------
function placeRes(sub,tx,ty,amt){
  const w=sub==='mine'?2:1,h=w;
  for(let y=ty;y<ty+h;y++)for(let x=tx;x<tx+w;x++)if(!inb(x,y)||G.place[idx(x,y)])return null;
  const r={kind:'res',id:G.nid++,sub,rt:sub==='tree'?'wood':sub==='berry'?'food':'gold',tx,ty,w,h,amount:amt,max:amt,v:Math.random()};
  occupy(r,true);G.res.push(r);return r;
}
function occupy(o,on){
  const farm=o.kind==='bld'&&o.type==='farm';
  for(let y=o.ty;y<o.ty+o.h;y++)for(let x=o.tx;x<o.tx+o.w;x++){const i=idx(x,y);G.place[i]=on?o:null;if(!farm)G.block[i]=on?o:null}
}
function placeBld(type,owner,tx,ty,complete){
  const D=BD[type];
  const mh=civIs(owner,'stone')&&type!=='farm'?Math.round(D.hp*1.25):D.hp;
  const b={kind:'bld',id:G.nid++,type,owner,tx,ty,w:D.w,h:D.h,maxHp:mh,hp:complete?mh:Math.max(1,mh*0.1),built:complete?1:0,queue:[],qt:0,rally:null,cd:0,food:type==='farm'?D.food+G.players[owner].m.farm:0,garrison:[]};
  occupy(b,true);G.blds.push(b);return b;
}
function canPlace(type,tx,ty,owner,margin){
  const D=BD[type];
  for(let y=ty;y<ty+D.h;y++)for(let x=tx;x<tx+D.w;x++){
    if(!inb(x,y)||G.place[idx(x,y)])return false;
    if(owner===0&&!G.exp[idx(x,y)])return false;
  }
  if(margin){
    for(let y=ty-1;y<=ty+D.h;y++)for(let x=tx-1;x<=tx+D.w;x++){
      if(x>=tx&&x<tx+D.w&&y>=ty&&y<ty+D.h)continue;
      if(!inb(x,y))continue;const p=G.place[idx(x,y)];
      if(p&&((p.kind==='bld'&&p.type!=='farm')||p.sub==='mine'))return false;
    }
  }
  return true;
}
function genMap(seed,np,layout,mtype){
  const R=rng(seed),M=MW,cx=M/2,cy=M/2,area=N/4096,MT=MTYPES[mtype]||MTYPES.grass;
  const tree=new Uint8Array(N);G.water=new Uint8Array(N);G.road=new Uint8Array(N);
  // 1. starting points
  let st=[];
  if(layout==='ring'){
    const r=M/2-11,a0=R()*Math.PI*2;
    for(let i=0;i<np;i++){const a=a0+i*2*Math.PI/np+(R()-.5)*0.3/Math.max(1,np/4),k=0.9+R()*0.1;st.push({x:cx+Math.cos(a)*r*k,y:cy+Math.sin(a)*r*k})}
  }else{
    let md=Math.min(M*0.6,M*0.95/Math.sqrt(np)),tries=0;
    while(st.length<np&&tries<20000){tries++;const q={x:10+R()*(M-20),y:10+R()*(M-20)};
      if(mtype==='lake'&&Math.hypot(q.x-cx,q.y-cy)<M*0.27)continue;
      if(st.every(s=>Math.hypot(s.x-q.x,s.y-q.y)>=md))st.push(q);
      if(tries%400===0){md*=0.95;st=[]}}
  }
  st=st.map(s=>({x:Math.round(Math.max(10,Math.min(M-11,s.x)))+0.5,y:Math.round(Math.max(10,Math.min(M-11,s.y)))+0.5}));
  for(let i=st.length-1;i>0;i--){const j=(R()*(i+1))|0;[st[i],st[j]]=[st[j],st[i]]}
  G.starts=st;
  const nearStart=(x,y,d)=>st.some(s=>Math.hypot(s.x-x,s.y-y)<d);
  const disc=(px,py,r,val,jit)=>{for(let y=Math.floor(py-r-2);y<=py+r+2;y++)for(let x=Math.floor(px-r-2);x<=px+r+2;x++){if(!inb(x,y))continue;const d=Math.hypot(x+.5-px,(y+.5-py)*1.12)+(R()-.5)*(jit||1.1);if(d<r)G.water[idx(x,y)]=val}};
  // 2. water shapes per map type
  if(mtype==='islands'){
    G.water.fill(1);
    let mind=1e9;for(const a of st)for(const b of st)if(a!==b)mind=Math.min(mind,Math.hypot(a.x-b.x,a.y-b.y));
    const ir=Math.max(12,Math.min(M*0.24,mind*0.46));
    for(const s0 of st)disc(s0.x,s0.y,ir,0,3);
    disc(cx,cy,Math.max(4,M*0.07),0,2);
    for(let k=0;k<Math.round(area*3);k++){const q={x:6+R()*(M-12),y:6+R()*(M-12)};if(!nearStart(q.x,q.y,ir+5))disc(q.x,q.y,3+R()*2.5,0,2)}
  }
  if(mtype==='river'){
    const ang=R()*Math.PI,dx=Math.cos(ang),dy=Math.sin(ang),px=-dy,py=dx,L=M*0.75,w=2.2+area*0.35,ph=R()*6;
    for(let t=-L;t<=L;t+=0.4){const off=Math.sin(t/M*5+ph)*M*0.07;const x=cx+dx*t+px*off,y=cy+dy*t+py*off;
      for(let yy=Math.floor(y-w-1);yy<=y+w+1;yy++)for(let xx=Math.floor(x-w-1);xx<=x+w+1;xx++)if(inb(xx,yy)&&Math.hypot(xx+.5-x,yy+.5-y)<w)G.water[idx(xx,yy)]=1}
    G.fords=[];for(let t=-L+R()*8;t<=L;t+=Math.max(16,M*0.28)){const off=Math.sin(t/M*5+ph)*M*0.07;G.fords.push({x:cx+dx*t+px*off,y:cy+dy*t+py*off,dx,dy,px,py,w})}
  }
  if(mtype==='lake')disc(cx,cy,M*0.19,1,3);
  // 3. forests
  const walkers=Math.round(21*area*MT.trees);
  for(let k=0;k<walkers;k++){
    let x=R()*M|0,y=R()*M|0;const len=30+R()*80;
    for(let n=0;n<len;n++){
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(inb(x+dx,y+dy)&&R()<0.75)tree[idx(x+dx,y+dy)]=1;
      x+=Math.round(R()*2-1)+(R()<0.5?0:Math.sign(R()-0.5));y+=Math.round(R()*2-1);
      x=Math.max(0,Math.min(M-1,x));y=Math.max(0,Math.min(M-1,y));
    }
  }
  // 4. ponds (oases in the desert, ringed with palms)
  const ponds=Math.round((MT.oasis?2.2:3)*area*(MT.oasis?1:MT.ponds));let made=0;
  for(let k=0;k<ponds*20&&made<ponds;k++){
    const px=6+R()*(M-12),py=6+R()*(M-12);if(nearStart(px,py,15)||Math.hypot(px-cx,py-cy)<6)continue;
    const r=MT.oasis?1.8+R()*1.4:2+R()*(1.5+area*0.8);made++;disc(px,py,r,1);
    if(MT.oasis)for(let a=0;a<6.28;a+=0.35){const d=r+1.3+R()*1.6,x=Math.floor(px+Math.cos(a)*d),y=Math.floor(py+Math.sin(a)*d);if(inb(x,y)&&R()<0.75)tree[idx(x,y)]=1}
  }
  // 5. clear the settlements, then roads: centre (not on lake maps), ring of neighbours, river fords
  const carve=(x0,y0,x1,y1)=>{const L=Math.hypot(x1-x0,y1-y0)||1;for(let t=0;t<=L;t+=0.5){const x=x0+(x1-x0)*t/L,y=y0+(y1-y0)*t/L;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const tx=Math.floor(x+dx),ty=Math.floor(y+dy);if(!inb(tx,ty))continue;const d=Math.hypot(tx+.5-x,ty+.5-y);
      if(d<1.6){tree[idx(tx,ty)]=0;G.water[idx(tx,ty)]=0}if(d<0.95)G.road[idx(tx,ty)]=1}}};
  for(const s0 of st)for(let y=0;y<M;y++)for(let x=0;x<M;x++)if((x+.5-s0.x)**2+(y+.5-s0.y)**2<=100){tree[idx(x,y)]=0;G.water[idx(x,y)]=0}
  const byAng=st.slice().sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx));
  for(let i=0;i<byAng.length;i++){const a=byAng[i],b=byAng[(i+1)%byAng.length];if(a!==b&&(byAng.length>2||i===0))carve(a.x,a.y,b.x,b.y)}
  if(mtype!=='lake')for(const s0 of st)carve(s0.x,s0.y,cx,cy);
  if(G.fords)for(const f of G.fords)for(let r=-f.w-2;r<=f.w+2;r+=0.4)for(let d=-1.1;d<=1.1;d+=0.4){const tx=Math.floor(f.x+f.px*r+f.dx*d),ty=Math.floor(f.y+f.py*r+f.dy*d);if(inb(tx,ty)){G.water[idx(tx,ty)]=0;tree[idx(tx,ty)]=0}}
  delete G.fords;
  for(let y=0;y<M;y++)for(let x=0;x<M;x++)if(Math.hypot(x+.5-cx,y+.5-cy)<4.5&&mtype!=='lake')tree[idx(x,y)]=0;
  for(let i=0;i<N;i++)if(G.water[i]){tree[i]=0;G.block[i]=WATER;G.place[i]=WATER}
  // 6. each settlement gets berries, two gold mines and a wood line behind it
  const near=(sub,x,y,amt)=>{for(let r=0;r<6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;if(placeRes(sub,x+dx,y+dy,amt))return true}return false};
  for(const s0 of st){
    const away=Math.atan2(s0.y-cy,s0.x-cx)+(R()-.5)*0.4,at=(a,d)=>({x:Math.round(s0.x+Math.cos(a)*d),y:Math.round(s0.y+Math.sin(a)*d)});
    const b=at(away+1.35+(R()-.5)*0.4,6.5);for(const [dx,dy] of [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[1,2]])placeRes('berry',b.x+dx-1,b.y+dy-1,125);
    const g1=at(away-1.45+(R()-.5)*0.4,7),g2=at(away+Math.PI*0.88,8);near('mine',g1.x-1,g1.y-1,800);near('mine',g2.x-1,g2.y-1,800);
    const dens=MT.oasis?0.55:0.85;
    for(let a=-0.85;a<=0.85;a+=0.06)for(let d=9.5;d<=12.8;d+=0.7){const q=at(away+a,d);if(inb(q.x,q.y)&&!G.water[idx(q.x,q.y)]&&!G.road[idx(q.x,q.y)]&&R()<dens)tree[idx(q.x,q.y)]=1}
  }
  // 7. contested resources out in the wilds
  const spot=(minD)=>{for(let k=0;k<300;k++){const x=4+(R()*(M-8))|0,y=4+(R()*(M-8))|0;if(!nearStart(x,y,minD)&&!G.water[idx(x,y)])return{x,y}}return null};
  if(mtype==='lake'){for(let k=0;k<4;k++){const a=k*Math.PI/2+R(),d=M*0.19+3;near('mine',Math.floor(cx+Math.cos(a)*d)-1,Math.floor(cy+Math.sin(a)*d)-1,900)}}
  else near('mine',Math.floor(cx)-1,Math.floor(cy)-1,1200);
  for(let k=0;k<Math.round((np*1.2+area*2)*(MT.oasis?1.7:1));k++){const q=spot(14);if(q)near('mine',q.x,q.y,900)}
  for(let k=0;k<Math.round(area*3*(MT.oasis?0.5:1));k++){const q=spot(13);if(q)for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1],[2,0]])placeRes('berry',q.x+dx,q.y+dy,125)}
  for(let i=0;i<N;i++)if(tree[i]){const x=i%M,y=(i/M)|0;placeRes('tree',x,y,100)}
}
function setMap(m){
  MW=MH=m;N=m*m;gS=new Float32Array(N);from=new Int32Array(N);seen=new Int32Array(N);shut=new Int32Array(N);stamp=0;
  fogC.width=MW;fogC.height=MH;fogImg=fogX.createImageData(MW,MH);miniImg.width=MW;miniImg.height=MH;miniD=miniX.createImageData(MW,MH);TER=null;
}
function teamsFor(opt,np){
  if(opt.teamList&&opt.teamList.length>=np)return Array.from({length:np},(_,i)=>{const t=opt.teamList[i];return t==='solo'||t===undefined?100+i:+t});
  if(opt.teams==='two')return Array.from({length:np},(_,i)=>i<Math.ceil(np/2)?0:1);
  if(opt.teams==='alone')return Array.from({length:np},(_,i)=>i?1:0);
  return Array.from({length:np},(_,i)=>100+i);
}
const teamTag=o=>G&&G.team&&G.team[o]<100?TEAM_N[G.team[o]]:'';
function newGame(opt){
  opt=Object.assign({diff:'normal',size:64,np:2,layout:'ring',teams:'ffa',mtype:'grass'},opt||{});
  if(typeof opt==='string')opt={diff:opt,size:64,np:2,layout:'ring',teams:'ffa'};
  const np=Math.max(2,Math.min(MAPS[opt.size].max,opt.np));setMap(opt.size);
  const seed=(Math.random()*1e9)|0,DF=DIFF[opt.diff];
  const aiDiff=Array.from({length:np},(_,i)=>(opt.diffs&&DIFF[opt.diffs[i]])?opt.diffs[i]:opt.diff);
  G={seed,opt,np,saveT:60,priceT:10,t:0,nid:1,units:[],blds:[],res:[],proj:[],fx:[],pings:[],decals:[],
    block:new Array(N).fill(null),place:new Array(N).fill(null),vis:new Uint8Array(N),exp:new Uint8Array(N),
    players:Array.from({length:np},mkPlayer),groups:{},
    stats:Array.from({length:np},()=>({gathered:0,trained:0,kills:0,lost:0})),
    diff:DF,diffKey:opt.diff,visT:0,aiT:Array.from({length:np},(_,i)=>1+i*0.137),uiT:0,alertT:-99,over:false,
    team:teamsFor(opt,np),aiDiff,mtype:opt.mtype,
    ais:Array.from({length:np},(_,i)=>i?{waveAt:DIFF[aiDiff[i]].firstAt+(i-1)*25+Math.random()*40,wave:DIFF[aiDiff[i]].wave,flip:false,waves:0}:null)};
  G.players.forEach((P,i)=>{const c=opt.civs&&opt.civs[i];P.civ=CIV[c]?c:c===null?null:CIV_KEYS[Math.floor(Math.random()*CIV_KEYS.length)];applyCivStart(i)});
  genMap(seed,np,opt.layout,opt.mtype);
  bakeTerrain(seed);
  let tc0=null;
  G.starts.forEach((s,i)=>{const tc=placeBld('tc',i,Math.round(s.x-1.5),Math.round(s.y-1.5),true);if(i===0)tc0=tc;for(let k=0;k<3;k++){const q=freeAround(tc,k*3);spawnUnit('villager',i,q.x,q.y)}const q=freeAround(tc,10);spawnUnit('scout',i,q.x,q.y)});
  sel=[];placing=null;paused=false;
  computeVis();
  Z=W<720?0.8:1;centerOn(tc0);
  G.scn=null;if(opt.scn)scnInit(opt);
  sigCache='';renderPanel(true);
}
