'use strict';
// ---------- terrain bake ----------
const WATER={kind:'water'};
let TT=null; // per-tile terrain type: 0 grass 1 dirt 2 sand 3 water
function bakeTerrain(seed){
  const n1=vnoise(seed+1),n2=vnoise(seed+2),n3=vnoise(seed+3);
  const fbm=(x,y)=>n1(x,y)*0.55+n1(x*2.1+7,y*2.1+3)*0.3+n1(x*4.3+1,y*4.3+9)*0.15;
  // per-tile fields
  const wf=new Float32Array(N),df=new Float32Array(N);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=idx(x,y);wf[i]=G.water[i];
    let d=0;for(const s0 of G.starts)d=Math.max(d,1-Math.hypot(x+.5-s0.x,y+.5-s0.y)/6);
    if(G.road&&G.road[i])d=Math.max(d,0.6);
    df[i]=d;}
  const blur=a=>{const o=new Float32Array(N);for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){let s=0,c=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(inb(x+dx,y+dy)){s+=a[idx(x+dx,y+dy)];c++}o[idx(x,y)]=s/c}return o};
  const wb=blur(wf),db=blur(blur(df));
  const S=(a,u,v)=>{u-=0.5;v-=0.5;const x=Math.max(0,Math.min(MW-1.001,u)),y=Math.max(0,Math.min(MH-1.001,v)),xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi;
    const g=(p,q)=>a[idx(Math.min(MW-1,p),Math.min(MH-1,q))];return(g(xi,yi)*(1-fx)+g(xi+1,yi)*fx)*(1-fy)+(g(xi,yi+1)*(1-fx)+g(xi+1,yi+1)*fx)*fy};
  const SUB=4,CM=MW*SUB,cm=document.createElement('canvas');cm.width=CM;cm.height=CM;const cx=cm.getContext('2d'),img=cx.createImageData(CM,CM);
  const mt=G.mtype||'grass',DES=mt==='desert';
  const G1=DES?[196,164,104]:mt==='forest'?[50,88,36]:[64,104,42],G2=DES?[224,198,140]:mt==='forest'?[92,128,52]:[112,150,62],DIRT=DES?[176,132,82]:[146,118,76],DIRT2=DES?[150,110,66]:[120,94,60],SAND=DES?[232,214,160]:[208,188,128],SH=[86,152,166],DEEP=mt==='islands'?[28,78,118]:[36,92,124];
  TT=new Uint8Array(N);
  for(let sy=0;sy<CM;sy++)for(let sx=0;sx<CM;sx++){
    const u=(sx+.5)/SUB,v=(sy+.5)/SUB;
    let col=mix(G1,G2,sstep(0.25,0.75,fbm(u*0.11,v*0.11)));
    col=mix(col,[col[0]*0.86,col[1]*0.9,col[2]*0.8],n2(u*1.7,v*1.7)*0.6);
    const d=S(db,u,v)+(n3(u*0.6,v*0.6)-0.5)*0.35;
    if(d>0.3)col=mix(col,mix(DIRT,DIRT2,n2(u*2,v*2)),sstep(0.3,0.5,d));
    const w=S(wb,u,v)+(n3(u*0.9+40,v*0.9)-0.5)*0.22;
    if(w>0.18)col=mix(col,SAND,sstep(0.18,0.3,w));
    if(w>0.42)col=mix(SH,DEEP,sstep(0.45,0.85,w));
    const p=(sy*CM+sx)*4;img.data[p]=col[0];img.data[p+1]=col[1];img.data[p+2]=col[2];img.data[p+3]=255;
  }
  cx.putImageData(img,0,0);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const i=idx(x,y),u=x+.5,v=y+.5;
    TT[i]=G.water[i]?3:S(wb,u,v)>0.22?2:S(db,u,v)>0.42?1:0}
  TER={cm,seed,chunks:new Map()};
}
const CHK=512;let TER=null;
function terrainChunk(ci,cj){
  const key=ci+','+cj;let c=TER.chunks.get(key);
  if(c){TER.chunks.delete(key);TER.chunks.set(key,c);return c}
  c=document.createElement('canvas');c.width=CHK;c.height=CHK;const g=c.getContext('2d');
  const ox=ci*CHK,oy=cj*CHK;
  g.save();g.setTransform(32,16,-32,16,-ox,-oy);g.imageSmoothingEnabled=true;g.drawImage(TER.cm,0,0,MW,MH);g.restore();
  const E=(u,v)=>[(u-v)*32-ox,(u+v)*16-oy];
  const toUV=(ix,iy)=>[(ix/32+iy/16)/2,(iy/16-ix/32)/2];
  const cs=[toUV(ox-40,oy-30),toUV(ox+CHK+40,oy-30),toUV(ox-40,oy+CHK+30),toUV(ox+CHK+40,oy+CHK+30)];
  const u0=Math.max(0,Math.floor(Math.min(...cs.map(q=>q[0])))),u1=Math.min(MW-1,Math.ceil(Math.max(...cs.map(q=>q[0])))),v0=Math.max(0,Math.floor(Math.min(...cs.map(q=>q[1])))),v1=Math.min(MH-1,Math.ceil(Math.max(...cs.map(q=>q[1]))));
  for(let y=v0;y<=v1;y++)for(let x=u0;x<=u1;x++){
    const o=E(x+.5,y+.5);if(o[0]<-40||o[0]>CHK+40||o[1]<-30||o[1]>CHK+30)continue;
    const i=idx(x,y),t=TT[i],R=rng(TER.seed*7+i*13+11);
    const rp=()=>{const a=R()-.5,b=R()-.5;return[o[0]+(a-b)*28,o[1]+(a+b)*14]};
    if(t===0&&G.mtype==='desert'){for(let k=0;k<3;k++){const p=rp();g.strokeStyle=R()<.5?'rgba(150,115,70,.45)':'rgba(250,235,195,.5)';g.lineWidth=1;g.beginPath();g.moveTo(p[0]-6,p[1]);g.quadraticCurveTo(p[0],p[1]-2,p[0]+6,p[1]);g.stroke()}if(R()<0.05){const p=rp();g.strokeStyle='rgba(120,110,60,.7)';g.beginPath();g.moveTo(p[0]-2,p[1]);g.lineTo(p[0]-3,p[1]-4);g.moveTo(p[0],p[1]);g.lineTo(p[0],p[1]-5);g.moveTo(p[0]+2,p[1]);g.lineTo(p[0]+3,p[1]-4);g.stroke()}}
    else if(t===0){for(let k=0;k<5;k++){const p=rp(),dark=R()<0.55;g.strokeStyle=dark?'rgba(30,60,20,.55)':'rgba(170,205,110,.5)';g.lineWidth=1;g.beginPath();g.moveTo(p[0]-2,p[1]);g.lineTo(p[0]-1,p[1]-3.5);g.moveTo(p[0],p[1]);g.lineTo(p[0]+0.5,p[1]-4.5);g.moveTo(p[0]+2,p[1]);g.lineTo(p[0]+2.5,p[1]-3);g.stroke()}
      if(R()<0.07){const p=rp();g.fillStyle=['#f0e070','#f4f1ea','#d796d8','#f09a6a'][(R()*4)|0];for(let k=0;k<3;k++){g.beginPath();g.arc(p[0]+(R()-.5)*6,p[1]+(R()-.5)*3,1.2,0,7);g.fill()}}}
    else if(t===1){for(let k=0;k<4;k++){const p=rp();g.fillStyle=R()<.5?'rgba(80,60,40,.5)':'rgba(190,170,130,.5)';g.beginPath();g.ellipse(p[0],p[1],1.4+R(),0.9,0,0,7);g.fill()}}
    else if(t===2){for(let k=0;k<6;k++){const p=rp();g.fillStyle='rgba(150,130,80,.45)';g.fillRect(p[0],p[1],1,1)}}
    else{if(R()<0.6){const p=rp();g.strokeStyle='rgba(200,235,240,.35)';g.lineWidth=1;g.beginPath();g.moveTo(p[0]-5,p[1]);g.quadraticCurveTo(p[0],p[1]-2,p[0]+5,p[1]);g.stroke()}}
  }
  TER.chunks.set(key,c);
  while(TER.chunks.size>44)TER.chunks.delete(TER.chunks.keys().next().value);
  return c;
}

// ---------- world rendering ----------
function bldKey(o){return o.tx+o.ty+(o.w+o.h)/2}
function drawBld(b){
  const a=isoT(b.tx,b.ty),O=OWN[b.owner];
  if(b.type==='farm')return drawFarm(b,a);
  const gateOpen=b.type==='gate'&&b.built>=1&&G.units.some(u=>u.owner===b.owner&&Math.abs(u.x/T-b.tx-0.5)<1.4&&Math.abs(u.y/T-b.ty-0.5)<1.4);
  const s=bldSprite(b.type,b.owner,gateOpen?'open':'');
  if(b.built<1){
    const P=(u,v,z)=>[a.x+32*(u-v),a.y+16*(u+v)-(z||0)];
    poly(ctx,[P(0,0),P(b.w,0),P(b.w,b.h),P(0,b.h)],'#9a8460','rgba(60,40,20,.6)',1);
    const vis=Math.max(0.08,b.built);const bottom=a.y-s.oy+s.h;const top=a.y-s.oy+s.top+(s.h-s.top)*(1-vis);
    ctx.save();ctx.beginPath();ctx.rect(a.x-s.ox,top,s.w,bottom-top);ctx.clip();ctx.drawImage(s.c,a.x-s.ox,a.y-s.oy,s.w,s.h);ctx.restore();
    ctx.strokeStyle='#8a6a3e';ctx.lineWidth=1.4;
    for(const [u,v] of [[0.1,0.1],[b.w-0.1,0.1],[b.w-0.1,b.h-0.1],[0.1,b.h-0.1]]){const p=P(u,v,0);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0],p[1]-BH[b.type]*0.7);ctx.stroke()}
    const q=P(0.1,b.h-0.1,BH[b.type]*0.35),r=P(b.w-0.1,b.h-0.1,BH[b.type]*0.35),q2=P(b.w-0.1,0.1,BH[b.type]*0.35);
    ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(r[0],r[1]);ctx.lineTo(q2[0],q2[1]);ctx.stroke();
    return;
  }
  ctx.drawImage(s.c,a.x-s.ox,a.y-s.oy,s.w,s.h);
  const P=(u,v,z)=>[a.x+32*(u-v),a.y+16*(u+v)-(z||0)];
  const tm=performance.now()/1000;
  if(b.type==='tc'){
    const p=P(1.5,1.5,74);ctx.strokeStyle='#3a2a1a';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(p[0],p[1]+8);ctx.lineTo(p[0],p[1]-12);ctx.stroke();
    const f=Math.sin(tm*4+b.id)*2;ctx.fillStyle=O.c;ctx.beginPath();ctx.moveTo(p[0],p[1]-12);ctx.quadraticCurveTo(p[0]+8,p[1]-14+f,p[0]+15,p[1]-9+f);ctx.lineTo(p[0],p[1]-5);ctx.fill();
  }else if(b.type==='blacksmith'){
    const c=P(1.45,0.5,44);for(let i=0;i<3;i++){const k=((tm*0.5+i/3)%1);ctx.fillStyle=`rgba(80,78,74,${0.4*(1-k)})`;ctx.beginPath();ctx.arc(c[0]+k*8,c[1]-k*22,2.5+k*5,0,7);ctx.fill()}
  }else if(b.type==='mill'){
    const c=P(1,1.66,26),ang=tm*1.4;ctx.strokeStyle='#5a3a20';ctx.lineWidth=1.6;
    for(let i=0;i<4;i++){const t=ang+i*Math.PI/2,ex=c[0]+Math.cos(t)*22,ey=c[1]+Math.sin(t)*22*0.9;
      ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(ex,ey);ctx.stroke();
      const nx=-Math.sin(t),ny=Math.cos(t)*0.9;ctx.fillStyle='rgba(236,226,200,.92)';ctx.beginPath();
      ctx.moveTo(c[0]+Math.cos(t)*6,c[1]+Math.sin(t)*6*0.9);ctx.lineTo(ex,ey);ctx.lineTo(ex+nx*5,ey+ny*5);ctx.lineTo(c[0]+Math.cos(t)*6+nx*5,c[1]+Math.sin(t)*6*0.9+ny*5);ctx.fill()}
    ctx.fillStyle='#3a2614';ctx.beginPath();ctx.arc(c[0],c[1],2.2,0,7);ctx.fill();
  }
  if(b.hp<b.maxHp*0.35){const p=P(b.w*0.55,b.h*0.55,BH[b.type]*0.6);for(let i=0;i<3;i++){const fl=Math.sin(tm*14+i*2)*2;ctx.fillStyle=i?'rgba(255,200,60,.85)':'rgba(240,90,30,.85)';ctx.beginPath();ctx.ellipse(p[0]+(i-1)*5,p[1]-3-fl,2.5,5+fl,0,0,7);ctx.fill()}}
}
function drawFarm(b,a){
  const P=(u,v,z)=>[a.x+32*(u-v),a.y+16*(u+v)-(z||0)];
  poly(ctx,[P(0.05,0.05),P(2.95,0.05),P(2.95,2.95),P(0.05,2.95)],b.built<1?'#9a8460':'#6e5032','rgba(50,30,15,.55)',1);
  ctx.strokeStyle=b.built<1?'rgba(120,95,60,.6)':'rgba(70,45,22,.8)';ctx.lineWidth=1.3;
  for(let i=1;i<12;i++){const v=i*0.25;const p=P(0.15,v),q=P(2.85,v);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}
  if(b.built>=1){const f=Math.max(0,b.food/BD.farm.food),grow=0.35+0.65*f;
    for(let i=1;i<12;i++)for(let j=0;j<9;j++){if((i*9+j)%11>f*11+0.5)continue;const p=P(0.3+j*0.3,i*0.25);
      ctx.strokeStyle=`rgb(${110+70*(1-f)|0},${150+30*f|0},60)`;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]-1.5,p[1]-4*grow);ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+1.5,p[1]-4.5*grow);ctx.stroke()}}
  for(const [u,v] of [[0.05,0.05],[2.95,0.05],[2.95,2.95],[0.05,2.95]]){const p=P(u,v);ctx.fillStyle=OWN[b.owner].c;ctx.fillRect(p[0]-1,p[1]-6,2,6)}
}
function drawRes(r){
  if(r.sub==='tree'){const set=G.mtype==='desert'?PALMS:TREES,p=isoT(r.tx+.5,r.ty+.5),s=set[Math.floor(r.v*set.length)];ctx.drawImage(s.c,p.x-s.ax,p.y-s.ay,s.w,s.h);return}
  const a=isoT(r.tx,r.ty);
  if(r.sub==='berry'){const s=BUSH;ctx.drawImage(s.c,a.x-s.ox,a.y-s.oy,s.w,s.h);
    const c=isoT(r.tx+.5,r.ty+.5),n=Math.ceil(9*r.amount/r.max);ctx.fillStyle='#d8344a';
    for(let i=0;i<n;i++){const t=i*2.4+r.v*6;ctx.beginPath();ctx.arc(c.x+Math.cos(t)*8,c.y-7+Math.sin(t)*5,1.7,0,7);ctx.fill()}
    ctx.fillStyle='rgba(255,220,230,.8)';for(let i=0;i<n;i+=3){const t=i*2.4+r.v*6;ctx.fillRect(c.x+Math.cos(t)*8-1,c.y-8+Math.sin(t)*5,0.9,0.9)}
    return}
  const s=ROCKS;ctx.drawImage(s.c,a.x-s.ox,a.y-s.oy,s.w,s.h);
  const c=isoT(r.tx+1,r.ty+1),n=Math.ceil(14*r.amount/r.max),tm=performance.now()/1000;
  for(let i=0;i<n;i++){const t=i*2.17+r.v*5,rr=4+(i%4)*4;const x=c.x+Math.cos(t)*rr*1.6,y=c.y-6+Math.sin(t)*rr*0.7-(i%3)*2;
    ctx.fillStyle=i%2?'#f6d55a':'#d9a82a';ctx.beginPath();ctx.moveTo(x,y-2.2);ctx.lineTo(x+2.2,y);ctx.lineTo(x,y+1.6);ctx.lineTo(x-2.2,y);ctx.fill();
    if((i+Math.floor(tm*1.5))%9===0){ctx.fillStyle='rgba(255,255,230,.9)';ctx.fillRect(x-0.5,y-4,1,8);ctx.fillRect(x-4,y-0.5,8,1)}}
}
const SKIN='#e0b48c';
function limb(x1,y1,x2,y2,c,w){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function drawUnit(u){
  if(!u.lb&&!u.px){const p0=isoW(u.x,u.y),k=RAD[UD[u.type].cls]/6;ctx.fillStyle=OWN[u.owner].c;ctx.globalAlpha=0.4;ell(p0.x,p0.y+0.5,8.5*k,4.2*k);ctx.fill();ctx.globalAlpha=1}
  if(u.type==='scout'||u.type==='knight'||u.type==='horsearcher'||u.type==='camel')return drawRider(u);
  if(u.type==='skirm')return drawUnit(Object.assign(Object.create(u),{type:'archer',px:true,sk:true}));
  if(u.type==='shield')return drawUnit(Object.assign(Object.create(u),{type:'militia',px:true,sh:true}));
  if(u.type==='javelin')return drawUnit(Object.assign(Object.create(u),{type:'spearman',px:true,jv:true}));
  if(u.type==='ram')return drawRam(u);
  if(u.type==='trebuchet')return drawTreb(u);
  if(u.type==='cart')return drawCart(u);
  if(u.type==='longbow')return drawUnit(Object.assign(Object.create(u),{type:'archer',lb:true}));
  const p=isoW(u.x,u.y),x=p.x,y=p.y,O=OWN[u.owner],D=UD[u.type];
  const f=(Math.cos(u.face)-Math.sin(u.face))>=0?1:-1;
  const tm=performance.now()/1000;
  const wk=u.moving?Math.sin(u.anim*13):0,bob=u.moving?Math.abs(Math.cos(u.anim*13))*1.1:0;
  let sw=-1;
  if(u.state==='attack'&&u.work)sw=Math.max(0,(u.cd-(D.rate-0.4))/0.4);
  else if(u.work&&(u.state==='gather'||u.state==='build'))sw=(Math.sin(tm*7+u.id)+1)/2;
  ctx.fillStyle='rgba(15,25,10,.35)';ell(x+2,y,7.5,3.2);ctx.fill();
  const by=y-bob;ctx.lineCap='round';ctx.lineJoin='round';
  const legC=u.type==='militia'?'#4a4d55':'#5a4632';
  limb(x-f*1.6,by-7,x-f*1.6-wk*2.6,y-0.8,shade(legC,-0.25),2.4);
  // body
  const bodyC=u.sk?'#4f6a73':u.jv?'#8a5a3a':u.sh?'#6e737b':u.type==='militia'?'#8c929b':u.type==='archer'?'#6f6a3e':u.type==='spearman'?'#7a6a4e':O.c;
  if(u.jv){for(const k of [-1.5,1.2])limb(x-f*3+k,by-4,x-f*5+k,by-21,'#7a5530',1.1)}
  // back-side gear first
  if(u.type==='archer'){ctx.fillStyle='#6b4a2a';ctx.save();ctx.translate(x-f*4,by-12);ctx.rotate(-f*0.35);ctx.fillRect(-1.6,-5,3.2,9);ctx.fillStyle='#e8e2d0';ctx.fillRect(-1.4,-7,1,2.5);ctx.fillRect(0.4,-7.4,1,2.5);ctx.restore()}
  if(u.type==='villager'&&u.carry.n>0&&!(u.work&&u.state==='gather')){const cx=x-f*5,cy=by-11;
    if(u.carry.t==='wood'){ctx.fillStyle='#7a5030';ctx.fillRect(cx-3,cy-3,6,2.6);ctx.fillRect(cx-3,cy,6,2.6);ctx.fillStyle='#d6b07a';ctx.fillRect(cx+f*3-0.5,cy-3,1.2,5.6)}
    else if(u.carry.t==='gold'){ctx.fillStyle='#b88f3a';ell(cx,cy,3.6,4);ctx.fill();ctx.fillStyle='#f2cd4c';ctx.beginPath();ctx.arc(cx,cy-3,1.8,0,7);ctx.fill()}
    else{ctx.fillStyle='#9c7a46';ell(cx,cy,3.8,3.2);ctx.fill();ctx.fillStyle='#d8344a';ctx.beginPath();ctx.arc(cx-1,cy-2.5,1.3,0,7);ctx.arc(cx+1.4,cy-2.2,1.3,0,7);ctx.fill()}}
  if(u.type==='militia'){ctx.fillStyle=O.d;ell(x-f*4.2,by-10,3.4,5);ctx.fill();ctx.fillStyle=O.c;ell(x-f*4.2,by-10,2.6,4.1);ctx.fill();ctx.fillStyle='#d9d2b8';ctx.beginPath();ctx.arc(x-f*4.2,by-10,0.9,0,7);ctx.fill()}
  ctx.fillStyle=bodyC;ctx.beginPath();ctx.moveTo(x-4,by-15);ctx.lineTo(x+4,by-15);ctx.lineTo(x+4.6,by-6);ctx.quadraticCurveTo(x,by-4.6,x-4.6,by-6);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.moveTo(x+0.5,by-15);ctx.lineTo(x+4,by-15);ctx.lineTo(x+4.6,by-6);ctx.quadraticCurveTo(x+2.5,by-5,x+0.5,by-5.2);ctx.closePath();ctx.fill();
  if(u.type!=='villager'){ctx.fillStyle=O.c;ctx.fillRect(x-2,by-14.5,4,8.5);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x+0.5,by-14.5,1.5,8.5)}
  ctx.fillStyle='#4a3322';ctx.fillRect(x-4.4,by-8.2,8.8,1.4);
  limb(x+f*1.6,by-7,x+f*1.6+wk*2.6,y-0.8,legC,2.4);
  // head
  const hx=x+f*0.4,hy=by-18.6;
  ctx.fillStyle=SKIN;ctx.beginPath();ctx.arc(hx,hy,3.5,0,7);ctx.fill();
  ctx.fillStyle='#2a1a10';ctx.fillRect(hx+f*1.4-0.5,hy-0.6,1,1.2);
  if(u.type==='villager'){ctx.fillStyle='#c9a65a';ell(hx,hy-2.4,5.4,1.8);ctx.fill();ctx.fillStyle='#b3914a';ell(hx,hy-3.6,3.2,2.2);ctx.fill()}
  else if(u.type==='militia'){ctx.fillStyle='#a7adb6';ctx.beginPath();ctx.arc(hx,hy-0.8,3.9,Math.PI,0);ctx.fill();ctx.fillStyle='#7d838c';ctx.fillRect(hx-4,hy-1.2,8,1.2);ctx.fillRect(hx+f*1.2-0.5,hy-1,1,3.2)}
  else if(u.jv){ctx.fillStyle='#3a2416';ctx.beginPath();ctx.arc(hx,hy-1.2,3.6,Math.PI,0);ctx.fill();ctx.fillStyle=O.c;ctx.fillRect(hx-3.8,hy-1.8,7.6,1.4)}
  else if(u.type==='spearman'){ctx.fillStyle='#6b4a2a';ctx.beginPath();ctx.arc(hx,hy-0.9,3.8,Math.PI,0);ctx.fill();ctx.fillStyle='#8a6a42';ctx.fillRect(hx-4.2,hy-1.3,8.4,1.1)}
  else{ctx.fillStyle=u.sk?'#2f4a55':'#3f5b2c';ctx.beginPath();ctx.arc(hx-f*0.6,hy-0.6,4.1,Math.PI*0.95,Math.PI*2.05);ctx.fill();ctx.beginPath();ctx.moveTo(hx-f*3.8,hy);ctx.lineTo(hx-f*5.5,hy+3);ctx.lineTo(hx-f*2,hy+1);ctx.fill()}
  // arm + tool
  const sx=x+f*3.2,sy=by-13.5;
  const tool=u.type!=='villager'?u.type:(u.state==='build'?'hammer':(u.state==='gather'||(u.state==='return'&&false))?(u.gtype==='wood'?'axe':u.gtype==='gold'?'pick':(u.tgt&&u.tgt.kind==='bld')?'hoe':'basket'):'none');
  let ang=1.15;
  if(sw>=0&&tool!=='basket'&&tool!=='archer')ang=-1.55+sw*2.5;
  if(tool==='militia'&&sw<0)ang=0.5;
  const hxp=sx+Math.cos(ang)*5*f,hyp=sy+Math.sin(ang)*5;
  if(tool==='spearman'){
    const a=sw>=0?-0.12-(1-sw)*0.1:-1.38,th=sw>=0?sw*5:0,hx2=x+f*(3.5+th*0.6),hy2=by-11.5;
    const ex=hx2+Math.cos(a)*f*(17+th),ey=hy2+Math.sin(a)*(17+th);
    limb(sx,sy,hx2,hy2,shade(bodyC,-0.1),2.1);
    limb(hx2-Math.cos(a)*f*8,hy2-Math.sin(a)*8,ex,ey,'#7a5530',1.4);
    ctx.fillStyle='#d9dde3';ctx.beginPath();ctx.moveTo(ex+Math.cos(a)*f*4,ey+Math.sin(a)*4);ctx.lineTo(ex-Math.sin(a)*1.6,ey+Math.cos(a)*f*1.6*f);ctx.lineTo(ex+Math.sin(a)*1.6,ey-Math.cos(a)*1.6);ctx.fill();
    ctx.fillStyle=SKIN;ctx.beginPath();ctx.arc(hx2,hy2,1.3,0,7);ctx.fill();
  }else if(tool==='archer'){
    const bx=x+f*5.5,byy=by-12,pull=sw>=0?(1-sw)*3:0;
    ctx.strokeStyle='#7a5530';ctx.lineWidth=1.5;ctx.beginPath();
    const br=u.lb?9.5:u.sk?5.5:7;if(f>0)ctx.arc(bx-3,byy,br,-1.05,1.05);else ctx.arc(bx+3,byy,br,Math.PI-1.05,Math.PI+1.05);ctx.stroke();if(u.lb){ctx.fillStyle=OWN[u.owner].c;ctx.fillRect(x-f*2-1,by-25,2,4)}
    const t1=[bx-3*f+Math.cos(f>0?-1.05:Math.PI+1.05)*7,byy-Math.sin(1.05)*7],t2=[t1[0],byy+Math.sin(1.05)*7];
    ctx.strokeStyle='rgba(240,235,220,.8)';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(t1[0],t1[1]);ctx.lineTo(t1[0]-f*pull,byy);ctx.lineTo(t2[0],t2[1]);ctx.stroke();
    limb(sx,sy,bx-f*1,byy,shade(bodyC,-0.1),2);
  }else{
    limb(sx,sy,hxp,hyp,u.type==='villager'?shade(O.c,-0.15):'#7d838c',2.1);
    ctx.fillStyle=SKIN;ctx.beginPath();ctx.arc(hxp,hyp,1.3,0,7);ctx.fill();
    const dx=Math.cos(ang-0.9)*f,dy=Math.sin(ang-0.9);
    if(tool==='militia'){limb(hxp,hyp,hxp+dx*10,hyp+dy*10,'#dfe3e8',1.8);limb(hxp-dy*f*2.4,hyp+dx*f*2.4,hxp+dy*f*2.4,hyp-dx*f*2.4,'#8a6a3a',1.4)}
    else if(tool==='axe'||tool==='pick'||tool==='hammer'||tool==='hoe'){
      const L=tool==='hoe'?11:8;const ex=hxp+dx*L,ey=hyp+dy*L;limb(hxp-dx*2,hyp-dy*2,ex,ey,'#7a5530',1.3);
      const px=-dy*f,py=dx*f;
      if(tool==='axe'){ctx.fillStyle='#c4c8ce';ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+px*3.5-dx*1.5,ey+py*3.5-dy*1.5);ctx.lineTo(ex+px*3.5+dx*1.5,ey+py*3.5+dy*1.5);ctx.fill()}
      else if(tool==='pick')limb(ex-px*3.5,ey-py*3.5+1,ex+px*3.5,ey+py*3.5+1,'#c4c8ce',1.5);
      else if(tool==='hammer'){ctx.fillStyle='#8f949b';ctx.fillRect(ex-2,ey-2,4,4)}
      else limb(ex,ey,ex+px*3,ey+py*3,'#c4c8ce',1.4);
    }else if(tool==='basket'){ctx.fillStyle='#9c7a46';ell(hxp,hyp+1,3,2.4);ctx.fill();ctx.fillStyle='#d8344a';ctx.beginPath();ctx.arc(hxp-0.8,hyp-0.6,1.1,0,7);ctx.arc(hxp+1,hyp-0.4,1.1,0,7);ctx.fill()}
  }
  if(u.sh){const sx2=x+f*4.6,sy2=by-12;ctx.fillStyle=O.d;ctx.beginPath();ctx.moveTo(sx2-3.6,sy2-7);ctx.lineTo(sx2+3.6,sy2-7);ctx.lineTo(sx2+3.6,sy2+4);ctx.quadraticCurveTo(sx2,sy2+8,sx2-3.6,sy2+4);ctx.closePath();ctx.fill();
    ctx.fillStyle=O.c;ctx.beginPath();ctx.moveTo(sx2-2.6,sy2-6);ctx.lineTo(sx2+2.6,sy2-6);ctx.lineTo(sx2+2.6,sy2+3.4);ctx.quadraticCurveTo(sx2,sy2+6.5,sx2-2.6,sy2+3.4);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d9d2b8';ctx.fillRect(sx2-0.6,sy2-5,1.2,9)}
}
function drawRider(u){
  const p=isoW(u.x,u.y),x=p.x,y=p.y,O=OWN[u.owner],D=UD[u.type],kn=u.type==='knight',ha=u.type==='horsearcher',cm=u.type==='camel';
  const f=(Math.cos(u.face)-Math.sin(u.face))>=0?1:-1,tm=performance.now()/1000;
  const g=u.moving?u.anim*15:0,bob=u.moving?Math.abs(Math.sin(g))*1.5:0;
  let sw=-1;if(u.state==='attack'&&u.work)sw=Math.max(0,(u.cd-(D.rate-0.4))/0.4);
  ctx.fillStyle='rgba(15,25,10,.35)';ell(x+2,y,13,4.2);ctx.fill();
  const hy=y-11-bob-(cm?2:0),horse=kn?'#d8d2c6':cm?'#c9a66b':ha?'#8b6a44':'#7a5232',dark=shade(horse,-0.3);
  ctx.lineCap='round';
  const leg=(lx,ph,c)=>limb(lx,hy+2,lx+Math.sin(g+ph)*3*(u.moving?1:0),y-0.5,c,2.2);
  leg(x-f*6,Math.PI,dark);leg(x+f*5,0,dark);
  ctx.fillStyle=horse;ell(x,hy,10,4.8);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.18)';ell(x+1,hy+2,9,2.6);ctx.fill();
  if(cm){ctx.fillStyle=horse;ell(x-f*3,hy-4.5,4.5,3.6);ctx.fill()}
  ctx.fillStyle=horse;ctx.beginPath();ctx.moveTo(x+f*6,hy-2);ctx.lineTo(x+f*11,hy-11);ctx.lineTo(x+f*14,hy-9);ctx.lineTo(x+f*9,hy+1);ctx.closePath();ctx.fill();
  ctx.save();ctx.translate(x+f*14,hy-9.5);ctx.rotate(f*0.5);ctx.fillStyle=horse;ell(0,0,4,2.3);ctx.fill();ctx.restore();
  ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(x+f*10.5,hy-12.5);ctx.lineTo(x+f*11.5,hy-15);ctx.lineTo(x+f*12.5,hy-12);ctx.fill();
  limb(x+f*6,hy-4,x+f*10.5,hy-11,kn?'#9a9184':'#2a1a10',1.6);
  limb(x-f*9.5,hy-1,x-f*12,hy+6+Math.sin(tm*3)*0.8,kn?'#b8b0a4':'#2a1a10',2);
  leg(x-f*8,0,horse);leg(x+f*7,Math.PI,horse);
  if(kn){ctx.fillStyle=O.c;ctx.beginPath();ctx.moveTo(x-9,hy-2);ctx.lineTo(x+9,hy-2);ctx.lineTo(x+8,hy+4.5);ctx.lineTo(x-8,hy+4.5);ctx.closePath();ctx.fill();
    ctx.fillStyle=shade(O.c,0.35);for(let i=-7;i<8;i+=3.5)ctx.fillRect(x+i,hy+3.6,2,1)}
  else{ctx.fillStyle=O.c;ctx.fillRect(x-3.5,hy-4,7,3)}
  // rider
  const rx=x-f*0.5,ry=hy-4;
  limb(rx+f*1,ry,rx+f*3,ry+6,kn?'#7d838c':'#5a4632',2.2);
  ctx.fillStyle=kn?'#9aa0a8':O.c;ctx.beginPath();ctx.moveTo(rx-3.6,ry-9);ctx.lineTo(rx+3.6,ry-9);ctx.lineTo(rx+4,ry);ctx.lineTo(rx-4,ry);ctx.closePath();ctx.fill();
  if(kn){ctx.fillStyle=O.c;ctx.fillRect(rx-1.8,ry-8.5,3.6,8)}
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(rx+0.5,ry-9,3.4,9);
  const hx=rx+f*0.4,hh=ry-12;
  ctx.fillStyle=SKIN;ctx.beginPath();ctx.arc(hx,hh,3.3,0,7);ctx.fill();
  if(kn){ctx.fillStyle='#b4bac2';ctx.beginPath();ctx.arc(hx,hh-0.3,3.7,Math.PI*0.9,Math.PI*2.1);ctx.fill();ctx.fillRect(hx-3.7,hh-0.6,7.4,2.4);ctx.fillStyle='#2a2a30';ctx.fillRect(hx+f*0.6-1.8*(f<0?1:0),hh,2.6,0.8);
    ctx.strokeStyle=O.c;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(hx,hh-3.6);ctx.quadraticCurveTo(hx-f*4,hh-7,hx-f*7,hh-4);ctx.stroke()}
  else if(cm){ctx.fillStyle='#efe6d2';ctx.beginPath();ctx.arc(hx,hh-1,3.9,Math.PI,0);ctx.fill();ctx.fillStyle=O.c;ctx.fillRect(hx-3.9,hh-1.4,7.8,1.3)}
  else{ctx.fillStyle=ha?'#3f5b2c':'#6b4a2a';ctx.beginPath();ctx.arc(hx,hh-0.8,3.6,Math.PI,0);ctx.fill()}
  if(ha){const bx=rx+f*6,byy=ry-7;ctx.strokeStyle='#7a5530';ctx.lineWidth=1.4;ctx.beginPath();if(f>0)ctx.arc(bx-3,byy,6,-1.05,1.05);else ctx.arc(bx+3,byy,6,Math.PI-1.05,Math.PI+1.05);ctx.stroke();limb(rx+f*3,ry-7,bx-f,byy,shade(O.c,-0.15),2);return}
  const sx=rx+f*3,sy=ry-7,ang=sw>=0?-1.5+sw*2.4:0.7;
  const hx2=sx+Math.cos(ang)*4.5*f,hy2=sy+Math.sin(ang)*4.5;
  limb(sx,sy,hx2,hy2,kn?'#8c929b':shade(O.c,-0.15),2);
  const dx=Math.cos(ang-0.9)*f,dy=Math.sin(ang-0.9);
  limb(hx2,hy2,hx2+dx*(kn?12:9),hy2+dy*(kn?12:9),'#dfe3e8',1.6);
  if(kn){ctx.fillStyle=O.d;ell(rx-f*4,ry-5,2.8,4.2);ctx.fill();ctx.fillStyle=O.c;ell(rx-f*4,ry-5,2,3.3);ctx.fill()}
}
function drawRam(u){
  const p=isoW(u.x,u.y),x=p.x,y=p.y,O=OWN[u.owner],D=UD[u.type];
  const f=(Math.cos(u.face)-Math.sin(u.face))>=0?1:-1;
  let sw=0;if(u.state==='attack'&&u.work)sw=Math.max(0,(u.cd-(D.rate-0.6))/0.6);
  const roll=u.moving?u.anim*6:0;
  ctx.fillStyle='rgba(15,25,10,.38)';ell(x+2,y,16,5);ctx.fill();
  ctx.lineCap='round';
  limb(x-f*6,y-11,x+f*(17+sw*7),y-11,'#6b4426',4.4);
  ctx.fillStyle='#4a4d55';ctx.beginPath();ctx.arc(x+f*(18+sw*7),y-11,3.2,0,7);ctx.fill();
  ctx.fillStyle='#6b4a2e';ctx.fillRect(x-13,y-9,26,4);
  ctx.fillStyle='#8a6440';ctx.beginPath();ctx.moveTo(x-14,y-8);ctx.lineTo(x+14,y-8);ctx.lineTo(x+8,y-22);ctx.lineTo(x-8,y-22);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(40,25,10,.5)';ctx.lineWidth=0.8;for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(x-14+i*1.5,y-8-i*3.5);ctx.lineTo(x+14-i*1.5,y-8-i*3.5);ctx.stroke()}
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.moveTo(x+2,y-8);ctx.lineTo(x+14,y-8);ctx.lineTo(x+8,y-22);ctx.lineTo(x+1,y-22);ctx.closePath();ctx.fill();
  ctx.fillStyle=O.c;ctx.fillRect(x-13,y-10.5,26,2.2);
  for(const wx of [-9,8]){const cx=x+wx,cy=y-3.5;ctx.fillStyle='#3a2614';ctx.beginPath();ctx.arc(cx,cy,3.6,0,7);ctx.fill();
    ctx.strokeStyle='#8a6440';ctx.lineWidth=0.9;ctx.beginPath();ctx.moveTo(cx+Math.cos(roll)*3,cy+Math.sin(roll)*3);ctx.lineTo(cx-Math.cos(roll)*3,cy-Math.sin(roll)*3);ctx.stroke()}
}
function drawTreb(u){
  const p=isoW(u.x,u.y),x=p.x,y=p.y,O=OWN[u.owner],D=UD[u.type];
  const f=(Math.cos(u.face)-Math.sin(u.face))>=0?1:-1;
  let sw=0;if(u.state==='attack'&&u.work)sw=Math.max(0,(u.cd-(D.rate-1.2))/1.2);
  ctx.fillStyle='rgba(15,25,10,.38)';ell(x+2,y,18,5.5);ctx.fill();ctx.lineCap='round';
  ctx.fillStyle='#5e4429';ctx.fillRect(x-16,y-7,32,4);
  for(const wx of [-12,12]){ctx.fillStyle='#3a2614';ctx.beginPath();ctx.arc(x+wx,y-3,3.4,0,7);ctx.fill()}
  limb(x-9,y-6,x,y-30,'#7a5530',2.4);limb(x+9,y-6,x,y-30,'#6b4a2a',2.4);limb(x-5,y-16,x+5,y-16,'#6b4a2a',1.6);
  const a=f>0?(-2.5+sw*2.9):(Math.PI+2.5-sw*2.9),L1=22,L2=8;
  const ex=x+Math.cos(a)*L1,ey=y-30+Math.sin(a)*L1,cx=x-Math.cos(a)*L2,cy=y-30-Math.sin(a)*L2;
  limb(cx,cy,ex,ey,'#8a6440',2.2);
  ctx.fillStyle='#4a4d55';ctx.fillRect(cx-4,cy,8,7);ctx.fillStyle=O.c;ctx.fillRect(cx-4,cy+5,8,2);
  if(sw<0.15){ctx.strokeStyle='rgba(60,40,20,.8)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex+f*3,ey+8);ctx.stroke();ctx.fillStyle='#6d665a';ctx.beginPath();ctx.arc(ex+f*3,ey+9,2.4,0,7);ctx.fill()}
  ctx.fillStyle='#e3c39b';ctx.beginPath();ctx.arc(x-f*13,y-14,2.4,0,7);ctx.fill();ctx.fillStyle=O.c;ctx.fillRect(x-f*13-2.5,y-12,5,7);
}
function drawCart(u){
  const p=isoW(u.x,u.y),x=p.x,y=p.y,O=OWN[u.owner];
  const f=(Math.cos(u.face)-Math.sin(u.face))>=0?1:-1,g=u.moving?u.anim*14:0,bob=u.moving?Math.abs(Math.sin(g))*1:0;
  ctx.fillStyle='rgba(15,25,10,.35)';ell(x+2,y,15,4.5);ctx.fill();ctx.lineCap='round';
  const mx=x+f*10,my=y-7-bob;
  for(const [lx,ph] of [[mx-f*3.5,0],[mx+f*3,Math.PI]])limb(lx,my+2,lx+Math.sin(g+ph)*2*(u.moving?1:0),y-0.5,'#5f5a54',1.8);
  ctx.fillStyle='#8a847c';ell(mx,my,6,3.4);ctx.fill();
  ctx.beginPath();ctx.moveTo(mx+f*3,my-1);ctx.lineTo(mx+f*7,my-7);ctx.lineTo(mx+f*9,my-5);ctx.lineTo(mx+f*5,my+1);ctx.fill();
  ctx.fillStyle='#5f5a54';ctx.beginPath();ctx.moveTo(mx+f*6.5,my-7);ctx.lineTo(mx+f*6,my-10);ctx.lineTo(mx+f*7.5,my-7.5);ctx.fill();
  limb(x+f*2,y-8,mx-f*4,my,'#5a3a20',1.2);
  ctx.fillStyle='#7a5638';ctx.fillRect(x-9,y-11,14,6);
  ctx.fillStyle=O.c;ctx.beginPath();ctx.moveTo(x-9,y-11);ctx.quadraticCurveTo(x-2,y-21,x+5,y-11);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x-2,y-14,7,3);
  ctx.fillStyle='#f0c84a';ctx.fillRect(x-7,y-13,3,2);ctx.fillStyle='#d9bd6a';ctx.fillRect(x+1,y-13,3,2);
  ctx.fillStyle='#3a2614';ctx.beginPath();ctx.arc(x-2,y-3.5,3.6,0,7);ctx.fill();
  ctx.strokeStyle='#8a6440';ctx.lineWidth=0.9;ctx.beginPath();ctx.moveTo(x-2+Math.cos(g)*3,y-3.5+Math.sin(g)*3);ctx.lineTo(x-2-Math.cos(g)*3,y-3.5-Math.sin(g)*3);ctx.stroke();
}
const UTOP={scout:38,knight:40,horsearcher:38,camel:42,ram:30,trebuchet:46,cart:28};
function hpBar(x,y,w,f,own){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x-w/2-1,y-1,w+2,5);ctx.fillStyle=own?(f>0.5?'#6fc26b':f>0.25?'#e2a23b':'#e45b4f'):'#e45b4f';ctx.fillRect(x-w/2,y,w*f,3)}
function objKey(o){return o.kind==='unit'?(o.x+o.y)/T:o.kind==='res'&&o.w===1?o.tx+o.ty+1:bldKey(o)}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#0b0e14';ctx.fillRect(0,0,W,H);
  if(!G)return;
  const k=DPR*Z;ctx.setTransform(k,0,0,k,-cam.x*k,-cam.y*k);
  const vw=W/Z,vh=H/Z;
  // terrain
  {const E=(u,v,dz)=>[(u-v)*32,(u+v)*16+(dz||0)];
    poly(ctx,[E(0,MH),E(MW,MH),E(MW,0),E(MW,0,30),E(MW,MH,30),E(0,MH,30)],'#4a3826');poly(ctx,[E(MW,MH),E(MW,0),E(MW,0,30),E(MW,MH,30)],'rgba(0,0,0,.25)');
    ctx.save();ctx.transform(32,16,-32,16,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(TER.cm,0,0,MW,MH);ctx.restore();
    const i0=Math.floor(cam.x/CHK),i1=Math.floor((cam.x+vw)/CHK),j0=Math.max(0,Math.floor(cam.y/CHK)),j1=Math.min(Math.floor((MW*32)/CHK),Math.floor((cam.y+vh)/CHK));
    let baked=0;ctx.imageSmoothingEnabled=Z<1;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const cx0=i*CHK,cy0=j*CHK;if(cx0>MW*32||cx0+CHK<-MH*32)continue;
      const has=TER.chunks.has(i+','+j);if(!has&&baked>=3)continue;if(!has)baked++;
      ctx.drawImage(terrainChunk(i,j),cx0,cy0)}
    ctx.imageSmoothingEnabled=true;}
  const inView=(x,y,m)=>x>cam.x-m&&x<cam.x+vw+m&&y>cam.y-m&&y<cam.y+vh+m+40;
  const tm=performance.now()/1000;
  // water shimmer
  for(let i=0;i<N;i++){if(TT[i]!==3)continue;const x=i%MW,y=(i/MW)|0;const p=isoT(x+.5,y+.5);if(!inView(p.x,p.y,40)||!G.exp[i])continue;
    const s=Math.sin(tm*1.6+x*1.3+y*0.7);ctx.strokeStyle=`rgba(220,245,250,${0.12+0.12*s})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-8+s*3,p.y+2);ctx.quadraticCurveTo(p.x+s*3,p.y,p.x+8+s*3,p.y+2);ctx.stroke()}
  // ground layer: decals, farms, corpses
  for(const d of G.decals){const p=isoW(d.x,d.y);if(!inView(p.x,p.y,40))continue;
    if(d.type==='stump'){ctx.fillStyle='#5a3b20';ell(p.x,p.y-1.5,4,2.2);ctx.fill();ctx.fillStyle='#c9a46c';ell(p.x,p.y-2.5,3.4,1.7);ctx.fill()}
    else{ctx.globalAlpha=Math.min(1,d.t/5);ctx.fillStyle='#5f5446';for(let i=0;i<9;i++){ell(p.x+Math.cos(i*2.3)*d.r*0.6,p.y+Math.sin(i*2.3)*d.r*0.3,4+i%3,2+i%2);ctx.fill()}ctx.globalAlpha=1}}
  for(const b of G.blds)if(b.type==='farm'&&knownTo0(b)){const p=isoT(b.tx+1.5,b.ty+1.5);if(inView(p.x,p.y,120))drawBld(b)}
  for(const f of G.fx)if(f.corpse){const p=isoW(f.x,f.y);if(!inView(p.x,p.y,30))continue;ctx.globalAlpha=Math.min(1,f.t/2)*0.75;ctx.fillStyle=f.c;ell(p.x,p.y-1.5,6,2.6);ctx.fill();ctx.fillStyle=SKIN;ctx.beginPath();ctx.arc(p.x+6,p.y-2.5,2.4,0,7);ctx.fill();ctx.globalAlpha=1}
  // selection markers under objects
  const selSet=new Set(sel);
  for(const s of selSet){
    const col=s.owner===0||s.owner===undefined?'#f4ecd4':ally(0,s.owner)?'#9fe39a':'#ff8a7a';
    if(s.kind==='unit'){const p=isoW(s.x,s.y),k=RAD[UD[s.type].cls]/6;ctx.strokeStyle=col;ctx.lineWidth=1.5;ell(p.x,p.y,9*k,4.5*k);ctx.stroke()}
    else{const a=isoT(s.tx,s.ty),P=(u,v)=>[a.x+32*(u-v),a.y+16*(u+v)];ctx.setLineDash([5,4]);poly(ctx,[P(-0.1,-0.1),P(s.w+0.1,-0.1),P(s.w+0.1,s.h+0.1),P(-0.1,s.h+0.1)],null,col,1.5);ctx.setLineDash([])}
  }
  {const tg=new Set();for(const s2 of sel)if(s2.kind==='unit'&&s2.owner===0&&s2.state==='attack'&&s2.tgt&&!s2.tgt.dead)tg.add(s2.tgt);
    ctx.setLineDash([4,3]);ctx.strokeStyle='#ff6b5c';ctx.lineWidth=1.6;
    for(const t of tg){if(t.kind==='unit'){const q=isoW(t.x,t.y),k=RAD[UD[t.type].cls]/6;ell(q.x,q.y,11*k,5.5*k);ctx.stroke()}else{const a=isoT(t.tx,t.ty),P=(u,v)=>[a.x+32*(u-v),a.y+16*(u+v)];poly(ctx,[P(-0.15,-0.15),P(t.w+0.15,-0.15),P(t.w+0.15,t.h+0.15),P(-0.15,t.h+0.15)],null,'#ff6b5c',1.6)}}
    ctx.setLineDash([])}
  // sorted world objects
  const list=[];
  for(const r of G.res){const p=isoT(r.tx+r.w/2,r.ty+r.h/2);if(inView(p.x,p.y,90)&&G.exp[idx(r.tx,r.ty)])list.push(r)}
  for(const b of G.blds){if(b.type==='farm')continue;const p=isoT(b.tx+b.w/2,b.ty+b.h/2);if(inView(p.x,p.y,140)&&knownTo0(b))list.push(b)}
  for(const u of G.units){if(u.gar)continue;const p=isoW(u.x,u.y);if(inView(p.x,p.y,30)&&visibleTo0(u))list.push(u)}
  list.sort((a,b)=>objKey(a)-objKey(b));
  const nowMs=performance.now();
  for(const o of list){if(o.kind==='res')drawRes(o);else if(o.kind==='bld')drawBld(o);else{drawUnit(o);if(o.hitT&&nowMs-o.hitT<120){const q=isoW(o.x,o.y),k=RAD[UD[o.type].cls]/6;ctx.fillStyle='rgba(255,236,220,.55)';ell(q.x,q.y-11*k,6*k,9*k);ctx.fill()}}}
  // projectiles & effects
  for(const p of G.proj){if(p.t<0)continue;const k2=p.t/p.d,k1=Math.max(0,k2-0.06);
    const at=k=>{const w=isoW(p.x0+(p.x1-p.x0)*k,p.y0+(p.y1-p.y0)*k);return[w.x,w.y-(p.z0+(p.z1-p.z0)*k)-Math.sin(k*Math.PI)*(p.stone?110:26)]};
    const a=at(k1),b=at(k2);if(p.stone){ctx.fillStyle='#6d665a';ctx.beginPath();ctx.arc(b[0],b[1],3.8,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(b[0]-1,b[1]-1,1.4,0,7);ctx.fill();continue}ctx.strokeStyle='#efe3c0';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
  for(const f of G.fx){if(f.corpse)continue;const p=isoW(f.x,f.y);if(!inView(p.x,p.y,60))continue;const y=p.y-(f.z||0);
    if(f.txt){ctx.globalAlpha=Math.min(1,f.t*1.5);ctx.font='700 '+(f.sz||12)+'px "IBM Plex Mono",monospace';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(20,15,10,.7)';ctx.strokeText(f.txt,p.x,y);ctx.fillStyle=f.c;ctx.fillText(f.txt,p.x,y)}
    else if(f.smoke){const a=f.t/f.l;ctx.globalAlpha=a*0.45;ctx.fillStyle='#4d4b48';ctx.beginPath();ctx.arc(p.x+(1-a)*10,y,3+(1-a)*9,0,7);ctx.fill()}
    else{ctx.globalAlpha=Math.min(1,f.t*2);ctx.fillStyle=f.c;ctx.fillRect(p.x-2,y-2,4,3)}
    ctx.globalAlpha=1}
  // rally flag & click marker
  if(sel.length===1&&sel[0].kind==='bld'&&sel[0].owner===0&&sel[0].rally){const r=isoW(sel[0].rally.x,sel[0].rally.y);ctx.strokeStyle='#f4ecd4';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x,r.y-20);ctx.stroke();ctx.fillStyle=OWN[0].c;ctx.beginPath();ctx.moveTo(r.x,r.y-20);ctx.lineTo(r.x+11,r.y-16);ctx.lineTo(r.x,r.y-12);ctx.fill()}
  if(G.mark&&G.mark.t>0){const m=G.mark,p=isoW(m.x,m.y);ctx.strokeStyle=m.c;ctx.lineWidth=2;ctx.globalAlpha=Math.min(1,m.t*2);ell(p.x,p.y,16*(1-m.t)+4,8*(1-m.t)+2);ctx.stroke();ctx.globalAlpha=1}
  // fog of war, projected onto the diamond
  ctx.save();ctx.transform(32,16,-32,16,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(fogC,0,0,MW,MH);ctx.restore();
  // health bars over fog
  for(const o of list){
    if(o.kind==='unit'&&(selSet.has(o)||o.hp<o.maxHp)){const p=isoW(o.x,o.y);hpBar(p.x,p.y-(UTOP[o.type]||29),UTOP[o.type]?22:16,o.hp/o.maxHp,o.owner===0)}
    else if(o.kind==='bld'&&(selSet.has(o)||o.hp<o.maxHp)){const p=isoT(o.tx+o.w/2,o.ty+o.h/2);hpBar(p.x,p.y-(BH[o.type]||10)-16,o.w*22,o.hp/o.maxHp,o.owner===0)}
    if(o.kind==='bld'&&o.garrison&&o.garrison.length&&knownTo0(o)){const p=isoT(o.tx+o.w/2,o.ty+o.h/2),y=p.y-(BH[o.type]||10)-28;ctx.fillStyle='rgba(20,24,34,.85)';ctx.beginPath();ctx.roundRect(p.x-13,y-8,26,15,7);ctx.fill();ctx.strokeStyle=OWN[o.owner].c;ctx.lineWidth=1.2;ctx.stroke();ctx.fillStyle='#f4ecd4';ctx.font='700 10px "IBM Plex Mono",monospace';ctx.textAlign='center';ctx.fillText(o.garrison.length,p.x,y+3.5)}
  }
  for(const p of G.pings){const q=isoW(p.x,p.y);ctx.strokeStyle='#ff6b5c';ctx.lineWidth=3;ctx.globalAlpha=p.t/3;ell(q.x,q.y,(40-(p.t%1)*24),(40-(p.t%1)*24)/2);ctx.stroke();ctx.globalAlpha=1}
  // placement ghost
  if(placing&&(mouse.in||touchGhost)){
    if(placing==='wall'&&wallA){
      const tl=tileAt(mouse.x,mouse.y),tiles=lineTiles(wallA,tl);let n=0;const ws=bldSprite('wall',0);
      for(const t of tiles){const ok=canPlace('wall',t.x,t.y,0,false),a=isoT(t.x,t.y),P=(u,v)=>[a.x+32*(u-v),a.y+16*(u+v)];if(ok)n++;
        if(ok){ctx.globalAlpha=0.5;ctx.drawImage(ws.c,a.x-ws.ox,a.y-ws.oy,ws.w,ws.h);ctx.globalAlpha=1}
        poly(ctx,[P(0,0),P(1,0),P(1,1),P(0,1)],ok?'rgba(110,210,110,.28)':'rgba(230,80,70,.38)',ok?'#9fe39a':'#ff8a7a',1.5)}
      const e=isoT(tl.x+.5,tl.y+.5),txt=n+'칸 · 목재 '+n*BD.wall.cost.wood;
      ctx.font='700 13px "Noto Sans KR",sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(15,12,8,.8)';ctx.strokeText(txt,e.x,e.y-36);ctx.fillStyle='#f4ecd4';ctx.fillText(txt,e.x,e.y-36);
    }else{
      const D=BD[placing],w=screenToWorld(mouse.x,mouse.y),tx=Math.round(w.x/T-D.w/2),ty=Math.round(w.y/T-D.h/2);
      const ok=canPlace(placing,tx,ty,0,false),a=isoT(tx,ty),P=(u,v)=>[a.x+32*(u-v),a.y+16*(u+v)];
      if(placing!=='farm'){const s=bldSprite(placing,0);ctx.globalAlpha=0.55;ctx.drawImage(s.c,a.x-s.ox,a.y-s.oy,s.w,s.h);ctx.globalAlpha=1}
      poly(ctx,[P(0,0),P(D.w,0),P(D.w,D.h),P(0,D.h)],ok?'rgba(110,210,110,.3)':'rgba(230,80,70,.38)',ok?'#9fe39a':'#ff8a7a',2);
    }
  }
  if(cmdMode==='amove'&&mouse.in){const w=screenToWorld(mouse.x,mouse.y),q=isoW(w.x,w.y);ctx.strokeStyle='#ff8a7a';ctx.lineWidth=2;ell(q.x,q.y,12,6);ctx.stroke();ctx.beginPath();ctx.moveTo(q.x-16,q.y);ctx.lineTo(q.x+16,q.y);ctx.moveTo(q.x,q.y-8);ctx.lineTo(q.x,q.y+8);ctx.stroke()}
  // screen space: soft vignette + drag box
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!VIG||VIG.w!==W||VIG.h!==H){const g=ctx.createRadialGradient(W/2,H*0.45,Math.min(W,H)*0.35,W/2,H*0.45,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(10,8,4,.35)');VIG={g,w:W,h:H}}
  ctx.fillStyle=VIG.g;ctx.fillRect(0,0,W,H);
  if(drag&&drag.mode==='box'&&(Math.abs(drag.x-drag.sx)>4||Math.abs(drag.y-drag.sy)>4)){
    ctx.strokeStyle='#f4ecd4';ctx.lineWidth=1;ctx.fillStyle='rgba(244,236,212,.08)';
    const x=Math.min(drag.sx,drag.x),y=Math.min(drag.sy,drag.y),w=Math.abs(drag.x-drag.sx),h=Math.abs(drag.y-drag.sy);
    ctx.fillRect(x,y,w,h);ctx.strokeRect(x+.5,y+.5,w,h);
  }
}
let VIG=null;

// ---------- minimap (diamond, like the map) ----------
const miniImg=document.createElement('canvas');miniImg.width=MW;miniImg.height=MH;const miniX=miniImg.getContext('2d');let miniD=miniX.createImageData(MW,MH);
const TCOL=[[86,128,54],[140,112,72],[196,178,120],[52,112,140]],TCOL_DES=[[214,186,128],[176,136,86],[230,212,160],[52,112,140]];
function miniGeom(){const S=mini.width,Hh=mini.height,pad=2*DPR;return{S,Hh,a:(S-pad*2)/(2*MW),b:(Hh-pad*2)/(2*MH),ox:S/2,oy:pad}}
function renderMini(){
  if(!G)return;const d=miniD.data;
  for(let i=0;i<N;i++){
    let c=(G.mtype==='desert'?TCOL_DES:TCOL)[TT[i]];const p=G.place[i];
    if(p&&p!==WATER){if(p.kind==='res')c=p.sub==='tree'?[34,70,34]:p.sub==='berry'?[190,70,90]:[236,196,72];else if(knownTo0(p))c=OWN[p.owner].rgb}
    if(!G.exp[i])c=[10,12,18];else if(!G.vis[i])c=[c[0]*.55|0,c[1]*.55|0,c[2]*.6|0];
    d[i*4]=c[0];d[i*4+1]=c[1];d[i*4+2]=c[2];d[i*4+3]=255;
  }
  miniX.putImageData(miniD,0,0);
  const m=miniGeom();
  mctx.setTransform(1,0,0,1,0,0);mctx.clearRect(0,0,m.S,m.Hh);
  mctx.setTransform(m.a,m.b,-m.a,m.b,m.ox,m.oy);mctx.imageSmoothingEnabled=false;mctx.drawImage(miniImg,0,0);
  mctx.setTransform(1,0,0,1,0,0);
  const toM=(wx,wy)=>{const u=wx/T,v=wy/T;return[m.ox+(u-v)*m.a,m.oy+(u+v)*m.b]};
  for(const u of G.units){if(u.gar||!visibleTo0(u))continue;const q=toM(u.x,u.y);mctx.fillStyle=shade(OWN[u.owner].c,0.45);mctx.fillRect(q[0]-1.5*DPR,q[1]-1.5*DPR,3*DPR,3*DPR)}
  for(const p of G.pings){const q=toM(p.x,p.y);mctx.strokeStyle='#ff6b5c';mctx.lineWidth=2;mctx.beginPath();mctx.arc(q[0],q[1],(6+(p.t%1)*8)*DPR,0,7);mctx.stroke()}
  // camera rectangle: iso space maps linearly onto the minimap
  const kx=m.a/32,ky=m.b/16;
  mctx.strokeStyle='#f4ecd4';mctx.lineWidth=1.5;
  mctx.strokeRect(m.ox+cam.x*kx,m.oy+(cam.y+topH/Z)*ky,(W/Z)*kx,((H-panH-topH)/Z)*ky);
}
