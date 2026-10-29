'use strict';
// ---------- isometric projection ----------
// world px (T per tile) -> iso px: one tile is a 64x32 diamond
const isoT=(u,v)=>({x:(u-v)*32,y:(u+v)*16});
const isoW=(x,y)=>isoT(x/T,y/T);
let Z=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=cvs.clientWidth;H=cvs.clientHeight;cvs.width=Math.round(W*DPR);cvs.height=Math.round(H*DPR);
  topH=$('#top').offsetHeight;panH=$('#panel').offsetHeight;
  mini.width=Math.round(mini.clientWidth*DPR);mini.height=Math.round(mini.clientHeight*DPR);
  if(G)clampCam();
}
function clampCam(){
  const vw=W/Z,vh=(H-panH)/Z,top=topH/Z;
  const minX=-MW*32-120,maxX=MW*32+120-vw;
  cam.x=minX>maxX?(-vw/2):Math.max(minX,Math.min(maxX,cam.x));
  const minY=-top-160,maxY=MH*32+120-vh;
  cam.y=minY>maxY?(MH*16-(vh+top)/2-top):Math.max(minY,Math.min(maxY,cam.y));
}
function viewCenterY(){return(topH+(H-panH))/2}
function centerIso(p){cam.x=p.x-W/Z/2;cam.y=p.y-viewCenterY()/Z;clampCam()}
function centerOn(o){const c=center(o);centerIso(isoW(c.x,c.y))}
function setZoom(z,sx,sy){
  if(sx===undefined){sx=W/2;sy=viewCenterY()}
  const ix=sx/Z+cam.x,iy=sy/Z+cam.y;
  Z=Math.max(0.55,Math.min(1.8,z));
  cam.x=ix-sx/Z;cam.y=iy-sy/Z;clampCam();
}

// ---------- small paint helpers ----------
function ell(x,y,rx,ry){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2)}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;
  if(f<0){r*=1+f;g*=1+f;b*=1+f}else{r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f}return`rgb(${r|0},${g|0},${b|0})`}
function poly(g,pts,fill,stroke,lw){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
  if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||0.8;g.stroke()}}
function line(g,a,b,c,w){g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.strokeStyle=c;g.lineWidth=w||1;g.stroke()}
function vnoise(seed){
  const R=rng(seed);const P=new Float32Array(65536);for(let i=0;i<65536;i++)P[i]=R();
  const s=t=>t*t*(3-2*t);
  return(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),u=s(x-xi),v=s(y-yi);const g=(a,b)=>P[((a&255)<<8)|(b&255)];
    return(g(xi,yi)*(1-u)+g(xi+1,yi)*u)*(1-v)+(g(xi,yi+1)*(1-u)+g(xi+1,yi+1)*u)*v};
}
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};

// ---------- sprite factory (drawn once, supersampled) ----------
const SS=2;
function makeSprite(w,h,zmax,draw){
  const pad=8,cw=(w+h)*32+pad*2,ch=(w+h)*16+zmax+pad*2;
  const c=document.createElement('canvas');c.width=cw*SS;c.height=ch*SS;
  const g=c.getContext('2d');g.scale(SS,SS);g.lineJoin='round';g.lineCap='round';
  const ox=h*32+pad,oy=zmax+pad;
  const P=(u,v,z)=>[ox+32*(u-v),oy+16*(u+v)-(z||0)];
  draw(g,P);
  return{c,ox,oy,w:cw,h:ch,top:pad};
}
function box(g,P,u0,v0,u1,v1,z0,z1,cl,cr,ct){
  poly(g,[P(u0,v1,z0),P(u1,v1,z0),P(u1,v1,z1),P(u0,v1,z1)],cl,'rgba(30,20,10,.45)');
  poly(g,[P(u1,v0,z0),P(u1,v1,z0),P(u1,v1,z1),P(u1,v0,z1)],cr,'rgba(30,20,10,.45)');
  if(ct)poly(g,[P(u0,v0,z1),P(u1,v0,z1),P(u1,v1,z1),P(u0,v1,z1)],ct,'rgba(30,20,10,.35)');
}
function hipRoof(g,P,u0,v0,u1,v1,z,rh,ov,col){
  u0-=ov;v0-=ov;u1+=ov;v1+=ov;
  const du=u1-u0,dv=v1-v0,L=shade(col,0.18),M=col,D=shade(col,-0.32),K='rgba(20,12,6,.55)';
  let R1,R2,faces;
  if(du>=dv){const vm=(v0+v1)/2;R1=P(u0+dv/2,vm,z+rh);R2=P(u1-dv/2,vm,z+rh);
    faces=[[[P(u0,v0,z),P(u1,v0,z),R2,R1],L],[[P(u0,v0,z),R1,P(u0,v1,z)],L],[[P(u0,v1,z),P(u1,v1,z),R2,R1],M],[[P(u1,v0,z),P(u1,v1,z),R2],D]];
  }else{const um=(u0+u1)/2;R1=P(um,v0+du/2,z+rh);R2=P(um,v1-du/2,z+rh);
    faces=[[[P(u0,v0,z),P(u0,v1,z),R2,R1],L],[[P(u0,v0,z),P(u1,v0,z),R1],L],[[P(u1,v0,z),P(u1,v1,z),R2,R1],D],[[P(u0,v1,z),P(u1,v1,z),R2],M]];}
  for(const [pts,c] of faces)poly(g,pts,c,K,0.9);
  // shingle courses on the two front faces
  const lp=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  for(let k=1;k<5;k++){const t=k/5;
    if(du>=dv){line(g,lp(P(u0,v1,z),R1,t),lp(P(u1,v1,z),R2,t),'rgba(0,0,0,.16)',0.7);line(g,lp(P(u1,v1,z),R2,t),lp(P(u1,v0,z),R2,t),'rgba(0,0,0,.22)',0.7)}
    else{line(g,lp(P(u0,v1,z),R2,t),lp(P(u1,v1,z),R2,t),'rgba(0,0,0,.16)',0.7);line(g,lp(P(u1,v1,z),R2,t),lp(P(u1,v0,z),R1,t),'rgba(0,0,0,.22)',0.7)}
  }
  line(g,R1,R2,shade(col,0.35),1.4);
}
function foundation(g,P,w,h,col){
  // contact shadow cast to the east, then a packed-earth pad
  g.save();g.translate(10,2);poly(g,[P(0,0),P(w,0),P(w,h),P(0,h)],'rgba(15,25,10,.28)');g.restore();
  poly(g,[P(-0.04,-0.04),P(w+0.04,-0.04),P(w+0.04,h+0.04),P(-0.04,h+0.04)],col||'#8f7a58','rgba(60,40,20,.5)');
}
function timberSW(g,P,u0,u1,v,z0,z1,n){
  for(let i=0;i<=n;i++){const u=u0+(u1-u0)*i/n;line(g,P(u,v,z0),P(u,v,z1),'#5a3a20',1.4)}
  line(g,P(u0,v,(z0+z1)/2),P(u1,v,(z0+z1)/2),'#5a3a20',1.2);
  for(let i=0;i<n;i++){const a=u0+(u1-u0)*i/n,b=u0+(u1-u0)*(i+1)/n;line(g,P(a,v,z0),P(b,v,(z0+z1)/2),'#5a3a20',1)}
}
function timberSE(g,P,u,v0,v1,z0,z1,n){
  for(let i=0;i<=n;i++){const v=v0+(v1-v0)*i/n;line(g,P(u,v,z0),P(u,v,z1),'#4a2e18',1.4)}
  line(g,P(u,v0,(z0+z1)/2),P(u,v1,(z0+z1)/2),'#4a2e18',1.2);
}
function stones(g,P,face,a0,a1,fixed,z0,z1,R){
  for(let z=z0;z<z1-1;z+=4){const off=((z/4)|0)%2?0.09:0;
    for(let a=a0+off;a<a1-0.05;a+=0.18){const b=Math.min(a1,a+0.17),c=shade('#a69e8e',(R()-.5)*0.18);
      const p=face==='sw'?[P(a,fixed,z),P(b,fixed,z),P(b,fixed,z+3.6),P(a,fixed,z+3.6)]:[P(fixed,a,z),P(fixed,b,z),P(fixed,b,z+3.6),P(fixed,a,z+3.6)];
      poly(g,p,face==='sw'?c:shade('#7d7567',(R()-.5)*0.18),'rgba(40,35,30,.35)',0.5)}}
}
function windowSW(g,P,u,v,z,w,h){poly(g,[P(u,v,z),P(u+w,v,z),P(u+w,v,z+h),P(u,v,z+h)],'#2a2a33','#e6d6a8',0.8)}
function windowSE(g,P,u,v,z,w,h){poly(g,[P(u,v,z),P(u,v+w,z),P(u,v+w,z+h),P(u,v,z+h)],'#22222a','#c9b98e',0.8)}
function door(g,P,u,v,w,h){poly(g,[P(u,v,0),P(u+w,v,0),P(u+w,v,h),P(u,v,h)],'#4a2f1c','#2a1a0e',0.8);line(g,P(u+w/2,v,0),P(u+w/2,v,h),'#2a1a0e',0.6)}

const SPR={};
const BH={tc:84,house:44,barracks:44,lumber:32,mill:56,mine:34,farm:0,blacksmith:46,stable:40,siege:48,tower:82,wall:26,gate:36,market:42,castle:96};
function bldSprite(type,owner,variant){
  const key=type+owner+(variant||'');if(SPR[key])return SPR[key];
  const O=OWN[owner],R=rng(type.length*97+owner);
  const roof=O.roof,w=BD[type].w,h=BD[type].h;
  let s;
  if(type==='house')s=makeSprite(2,2,BH.house,(g,P)=>{
    foundation(g,P,2,2);
    box(g,P,0.25,0.25,1.75,1.75,0,17,'#dccaa2','#a8936c');
    timberSW(g,P,0.25,1.75,1.75,0,17,3);timberSE(g,P,1.75,0.25,1.75,0,17,3);
    door(g,P,0.85,1.75,0.3,11);windowSE(g,P,1.75,0.7,8,0.3,5);
    box(g,P,1.15,0.45,1.4,0.7,17,38,'#8d8576','#6b6457','#9d9586');
    hipRoof(g,P,0.25,0.25,1.75,1.75,17,15,0.14,roof);
    box(g,P,1.15,0.45,1.4,0.7,28,40,'#8d8576','#6b6457','#4a443b');
  });
  else if(type==='tc')s=makeSprite(3,3,BH.tc,(g,P)=>{
    foundation(g,P,3,3,'#9a8a6c');
    box(g,P,0.12,0.12,2.88,2.88,0,13,'#a69e8e','#7d7567','#b8b0a0');
    stones(g,P,'sw',0.12,2.88,2.88,0,13,R);stones(g,P,'se',0.12,2.88,2.88,0,13,R);
    box(g,P,0.32,0.32,2.68,2.68,13,30,'#e0cfa6','#ab966e');
    timberSW(g,P,0.32,2.68,2.68,13,30,5);timberSE(g,P,2.68,0.32,2.68,13,30,5);
    poly(g,[P(1.25,2.88,0),P(1.75,2.88,0),P(1.75,2.88,10),P(1.5,2.88,13),P(1.25,2.88,10)],'#3e2716','#22140a',1);
    windowSW(g,P,0.6,2.68,19,0.3,6);windowSW(g,P,2.1,2.68,19,0.3,6);windowSE(g,P,2.68,0.7,19,0.3,6);windowSE(g,P,2.68,1.7,19,0.3,6);
    poly(g,[P(2.88,1.2,13),P(2.88,1.6,13),P(2.88,1.6,-2),P(2.88,1.4,1),P(2.88,1.2,-2)],O.c,shade(O.c,-0.4),0.8);
    hipRoof(g,P,0.32,0.32,2.68,2.68,30,18,0.16,roof);
    box(g,P,1.12,1.12,1.88,1.88,38,60,'#a69e8e','#7d7567');
    stones(g,P,'sw',1.12,1.88,1.88,38,60,R);stones(g,P,'se',1.12,1.88,1.88,38,60,R);
    windowSW(g,P,1.4,1.88,48,0.2,6);
    hipRoof(g,P,1.12,1.12,1.88,1.88,60,16,0.1,roof);
  });
  else if(type==='barracks')s=makeSprite(3,3,BH.barracks,(g,P)=>{
    foundation(g,P,3,3,'#8a7656');
    // training yard fence along the front edges
    for(let i=0;i<=8;i++){const u=0.15+i*0.335;line(g,P(u,2.85,0),P(u,2.85,7),'#6b4a2a',1.6)}
    for(let i=0;i<=3;i++){const v=1.75+i*0.37;line(g,P(2.85,v,0),P(2.85,v,7),'#6b4a2a',1.6)}
    line(g,P(0.15,2.85,5),P(2.85,2.85,5),'#7d5a36',1.2);line(g,P(2.85,1.75,5),P(2.85,2.85,5),'#7d5a36',1.2);
    box(g,P,0.15,0.15,2.85,1.6,0,21,'#7a5638','#573b25');
    for(let i=1;i<9;i++){const u=0.15+i*0.3;line(g,P(u,1.6,0),P(u,1.6,21),'rgba(30,18,8,.4)',0.7)}
    for(let i=1;i<5;i++){const v=0.15+i*0.29;line(g,P(2.85,v,0),P(2.85,v,21),'rgba(20,12,6,.4)',0.7)}
    door(g,P,1.25,1.6,0.5,14);
    poly(g,[P(0.5,1.6,19),P(0.8,1.6,19),P(0.8,1.6,6),P(0.65,1.6,9),P(0.5,1.6,6)],O.c,shade(O.c,-0.4),0.8);
    poly(g,[P(2.2,1.6,19),P(2.5,1.6,19),P(2.5,1.6,6),P(2.35,1.6,9),P(2.2,1.6,6)],O.c,shade(O.c,-0.4),0.8);
    hipRoof(g,P,0.15,0.15,2.85,1.6,21,13,0.12,roof);
    // straw dummy and weapon rack in the yard
    line(g,P(1,2.3,0),P(1,2.3,15),'#6b4a2a',1.6);line(g,P(0.85,2.3,11),P(1.15,2.3,11),'#6b4a2a',1.4);
    g.fillStyle='#d8bd73';g.beginPath();const hd=P(1,2.3,17);g.arc(hd[0],hd[1],2.6,0,7);g.fill();
    line(g,P(2.0,2.05,0),P(2.0,2.05,10),'#5a3a20',1.2);line(g,P(2.5,2.05,0),P(2.5,2.05,10),'#5a3a20',1.2);line(g,P(2.0,2.05,8),P(2.5,2.05,8),'#5a3a20',1.2);
    for(let i=0;i<4;i++){const u=2.06+i*0.12;line(g,P(u,2.1,1),P(u+0.03,2.0,13),'#c9ccd2',0.9)}
  });
  else if(type==='lumber')s=makeSprite(2,2,BH.lumber,(g,P)=>{
    foundation(g,P,2,2,'#7d6a4a');
    for(let i=0;i<30;i++){const p=P(0.2+R()*1.6,0.2+R()*1.6,0);g.fillStyle=R()<.5?'#c9a46c':'#a8824e';g.fillRect(p[0],p[1],1.6,0.9)}
    box(g,P,0.2,0.2,1.8,0.32,0,19,'#8a6440','#664a2e');
    for(const [u,v] of [[0.25,1.1],[1.75,1.1],[1.75,0.3]])line(g,P(u,v,0),P(u,v,16),'#5a3a20',1.8);
    poly(g,[P(0.1,0.15,21),P(1.9,0.15,21),P(1.9,1.2,14),P(0.1,1.2,14)],shade(roof,0.05),'rgba(20,12,6,.55)',0.9);
    poly(g,[P(1.9,0.15,21),P(1.9,1.2,14),P(1.9,1.2,12.5),P(1.9,0.15,19.5)],shade(roof,-0.35));
    for(let row=0;row<3;row++)for(let i=0;i<4-row;i++){const v=1.32+i*0.13+row*0.065,z=2.6+row*4.4;
      line(g,P(0.35,v,z),P(1.45,v,z),'#7a5030',4.6);const e=P(1.45,v,z);g.fillStyle='#d6b07a';g.beginPath();g.ellipse(e[0],e[1],2.2,2.2,0,0,7);g.fill();g.strokeStyle='#8a5e34';g.lineWidth=0.6;g.stroke();}
    const st=P(1.7,1.65,0);g.fillStyle='#8a6440';g.beginPath();g.ellipse(st[0],st[1]-3,4,2,0,0,7);g.fill();g.fillStyle='#d6b07a';g.beginPath();g.ellipse(st[0],st[1]-4,4,2,0,0,7);g.fill();
    line(g,[st[0]-1,st[1]-5],[st[0]+4,st[1]-13],'#6b4a2a',1.2);poly(g,[[st[0]+3,st[1]-14],[st[0]+7,st[1]-12],[st[0]+5,st[1]-10]],'#b8bcc4');
  });
  else if(type==='mill')s=makeSprite(2,2,BH.mill,(g,P)=>{
    foundation(g,P,2,2);
    box(g,P,0.35,0.35,1.65,1.65,0,9,'#a69e8e','#7d7567','#b8b0a0');
    stones(g,P,'sw',0.35,1.65,1.65,0,9,R);stones(g,P,'se',0.35,1.65,1.65,0,9,R);
    box(g,P,0.42,0.42,1.58,1.58,9,30,'#e2d2ab','#b09a70');
    timberSW(g,P,0.42,1.58,1.58,9,30,2);timberSE(g,P,1.58,0.42,1.58,9,30,2);
    door(g,P,0.85,1.65,0.3,9);
    hipRoof(g,P,0.42,0.42,1.58,1.58,30,20,0.1,roof);
    for(const [u,v] of [[1.75,1.3],[1.85,1.55],[1.62,1.82]]){const p=P(u,v,0);g.fillStyle='#d9c38c';g.beginPath();g.ellipse(p[0],p[1]-3.5,3.2,4,0,0,7);g.fill();g.strokeStyle='#9c8150';g.lineWidth=0.6;g.stroke()}
  });
  else if(type==='mine')s=makeSprite(2,2,BH.mine,(g,P)=>{
    foundation(g,P,2,2,'#857256');
    box(g,P,0.2,0.2,1.3,1.15,0,15,'#80603e','#5e4429');
    for(let i=1;i<4;i++)line(g,P(0.2+i*0.27,1.15,0),P(0.2+i*0.27,1.15,15),'rgba(20,12,6,.4)',0.7);
    door(g,P,0.55,1.15,0.3,10);
    hipRoof(g,P,0.2,0.2,1.3,1.15,15,10,0.1,roof);
    const c=P(1.5,1.55,0);
    poly(g,[[c[0]-8,c[1]-9],[c[0]+8,c[1]-9],[c[0]+6,c[1]-2],[c[0]-6,c[1]-2]],'#6b4a2e','#3a2614',0.8);
    for(let i=0;i<7;i++){g.fillStyle=i%2?'#f2cd4c':'#d8a92c';g.beginPath();g.arc(c[0]-6+i*2,c[1]-10-(i%3),2,0,7);g.fill()}
    g.fillStyle='#3a2614';g.beginPath();g.arc(c[0]-5,c[1]-1,2,0,7);g.arc(c[0]+5,c[1]-1,2,0,7);g.fill();
    const k=P(1.85,0.6,0);line(g,[k[0],k[1]],[k[0]-5,k[1]-15],'#6b4a2a',1.3);line(g,[k[0]-9,k[1]-13],[k[0]-1,k[1]-17],'#b8bcc4',1.6);
  });
  else if(type==='blacksmith')s=makeSprite(2,2,BH.blacksmith,(g,P)=>{
    foundation(g,P,2,2,'#7d6a52');
    box(g,P,0.2,0.2,1.8,1.25,0,17,'#8d8576','#6b6457');
    stones(g,P,'sw',0.2,1.8,1.25,0,17,R);stones(g,P,'se',0.2,1.25,1.8,0,17,R);
    poly(g,[P(1.25,1.25,0),P(1.6,1.25,0),P(1.6,1.25,8),P(1.25,1.25,8)],'#2a1a10');
    poly(g,[P(1.3,1.25,1),P(1.55,1.25,1),P(1.55,1.25,5),P(1.3,1.25,5)],'rgba(255,140,40,.9)');
    door(g,P,0.55,1.25,0.3,11);
    hipRoof(g,P,0.2,0.2,1.8,1.25,17,12,0.1,roof);
    box(g,P,1.3,0.35,1.6,0.65,17,42,'#7d7567','#5d574c','#2a2622');
    box(g,P,0.7,1.5,1.0,1.68,0,4,'#3a3c42','#2a2c30','#5a5d65');
    box(g,P,0.62,1.52,1.08,1.66,4,7,'#4a4d55','#33363c','#6b6f78');
    for(let i=0;i<3;i++){const q=P(1.45,1.55+i*0.08,0);line(g,q,[q[0]+2,q[1]-12],'#6b4a2a',1.1);}
  });
  else if(type==='stable')s=makeSprite(3,3,BH.stable,(g,P)=>{
    foundation(g,P,3,3,'#857152');
    for(let i=0;i<=8;i++){const u=0.15+i*0.335;line(g,P(u,2.85,0),P(u,2.85,8),'#6b4a2a',1.6)}
    for(let i=0;i<=4;i++){const v=1.5+i*0.335;line(g,P(2.85,v,0),P(2.85,v,8),'#6b4a2a',1.6)}
    line(g,P(0.15,2.85,4),P(2.85,2.85,4),'#7d5a36',1.2);line(g,P(0.15,2.85,7),P(2.85,2.85,7),'#7d5a36',1.2);
    line(g,P(2.85,1.5,4),P(2.85,2.85,4),'#7d5a36',1.2);line(g,P(2.85,1.5,7),P(2.85,2.85,7),'#7d5a36',1.2);
    box(g,P,0.15,0.15,2.85,1.35,0,18,'#8a6440','#664a2e');
    for(let i=1;i<9;i++){const u=0.15+i*0.3;line(g,P(u,1.35,0),P(u,1.35,18),'rgba(30,18,8,.35)',0.7)}
    for(const u of [0.45,1.25,2.05]){poly(g,[P(u,1.35,0),P(u+0.42,1.35,0),P(u+0.42,1.35,11),P(u+0.21,1.35,14),P(u,1.35,11)],'#3a2614','#24170c',0.8)}
    hipRoof(g,P,0.15,0.15,2.85,1.35,18,13,0.14,roof);
    for(const [u,v] of [[2.2,2.2],[2.45,2.45],[2.2,2.55]])box(g,P,u,v,u+0.28,v+0.2,0,6,'#d9bd6a','#b89a4e','#ead08a');
    box(g,P,0.5,2.2,1.3,2.38,0,5,'#6b4a2a','#4f3620','#3a6a8a');
    poly(g,[P(0.5,2.85,7),P(0.8,2.85,7),P(0.8,2.85,0),P(0.5,2.85,0)],O.c,shade(O.c,-0.4),0.6);
  });
  else if(type==='siege')s=makeSprite(3,3,BH.siege,(g,P)=>{
    foundation(g,P,3,3,'#857152');
    box(g,P,0.15,0.15,2.7,2.0,0,24,'#7a5a3c','#5a402a');
    for(let i=1;i<8;i++){const u=0.15+i*0.32;line(g,P(u,2.0,0),P(u,2.0,24),'rgba(30,18,8,.35)',0.7)}
    poly(g,[P(0.7,2.0,0),P(2.0,2.0,0),P(2.0,2.0,19),P(0.7,2.0,19)],'#3e2716','#22140a',1);
    line(g,P(0.7,2.0,0),P(2.0,2.0,19),'#6b4a2a',1.6);line(g,P(2.0,2.0,0),P(0.7,2.0,19),'#6b4a2a',1.6);
    hipRoof(g,P,0.15,0.15,2.7,2.0,24,14,0.12,roof);
    for(let i=0;i<4;i++){const v=2.3+i*0.12;line(g,P(0.3,v,2.5+(i%2)*3),P(1.5,v,2.5+(i%2)*3),'#7a5030',4.2)}
    const wc=P(2.55,2.55,7);g.strokeStyle='#4a3020';g.lineWidth=1.6;g.beginPath();g.ellipse(wc[0],wc[1],4.5,7,0.5,0,7);g.stroke();
    line(g,[wc[0]-3,wc[1]-5],[wc[0]+3,wc[1]+5],'#4a3020',1);line(g,[wc[0]+3,wc[1]-5],[wc[0]-3,wc[1]+5],'#4a3020',1);
  });
  else if(type==='tower')s=makeSprite(1,1,BH.tower,(g,P)=>{
    g.save();g.translate(14,3);poly(g,[P(0.1,0.1),P(0.9,0.1),P(0.9,0.9),P(0.1,0.9)],'rgba(15,25,10,.3)');g.restore();
    box(g,P,0.14,0.14,0.86,0.86,0,58,'#a69e8e','#7d7567');
    stones(g,P,'sw',0.14,0.86,0.86,0,58,R);stones(g,P,'se',0.14,0.86,0.86,0,58,R);
    windowSW(g,P,0.42,0.86,36,0.16,7);windowSE(g,P,0.86,0.42,44,0.16,7);
    door(g,P,0.38,0.86,0.24,10);
    box(g,P,0.04,0.04,0.96,0.96,58,63,'#7a5a3c','#5a402a','#8a6a48');
    for(const [u,v] of [[0.04,0.78],[0.4,0.78],[0.78,0.78],[0.78,0.4],[0.78,0.04]])box(g,P,u,v,u+0.18,v+0.18,63,68,'#8a6a48','#6a4e32','#9a7a58');
    hipRoof(g,P,0.12,0.12,0.88,0.88,68,15,0.06,roof);
  });
  else if(type==='wall')s=makeSprite(1,1,BH.wall,(g,P)=>{
    box(g,P,0.02,0.02,0.98,0.98,0,19,'#a69e8e','#7d7567','#b8b0a0');
    stones(g,P,'sw',0.02,0.98,0.98,0,19,R);stones(g,P,'se',0.02,0.98,0.98,0,19,R);
    poly(g,[P(0.02,0.98,16),P(0.98,0.98,16),P(0.98,0.98,18),P(0.02,0.98,18)],O.c);
    poly(g,[P(0.98,0.02,16),P(0.98,0.98,16),P(0.98,0.98,18),P(0.98,0.02,18)],shade(O.c,-0.35));
    for(const [u,v] of [[0.02,0.02],[0.62,0.02],[0.02,0.62],[0.62,0.62]])box(g,P,u,v,u+0.36,v+0.36,19,25,'#a69e8e','#7d7567','#c2baa9');
  });
  else if(type==='castle')s=makeSprite(4,4,BH.castle,(g,P)=>{
    foundation(g,P,4,4,'#8f8068');
    const SC='#a69e8e',SD='#7d7567',ST='#b8b0a0';
    const crenSW=(u0,u1,v,z)=>{for(let u=u0;u<u1-0.1;u+=0.3)box(g,P,u,v-0.32,u+0.16,v,z,z+5,SC,SD,'#c2baa9')};
    const crenSE=(u,v0,v1,z)=>{for(let v=v0;v<v1-0.1;v+=0.3)box(g,P,u-0.32,v,u,v+0.16,z,z+5,SC,SD,'#c2baa9')};
    const tw=(u,v)=>{box(g,P,u,v,u+0.8,v+0.8,0,40,SC,SD);stones(g,P,'sw',u,u+0.8,v+0.8,0,40,R);stones(g,P,'se',v,v+0.8,u+0.8,0,40,R);
      windowSW(g,P,u+0.32,v+0.8,26,0.16,6);box(g,P,u-0.05,v-0.05,u+0.85,v+0.85,40,44,'#968e7e','#6d665a','#aaa292');hipRoof(g,P,u,v,u+0.8,v+0.8,44,16,0.05,roof)};
    tw(0.05,0.05);
    box(g,P,0.85,0.2,3.15,0.55,0,24,SC,SD,ST);box(g,P,0.2,0.85,0.55,3.15,0,24,SC,SD,ST);
    box(g,P,1.2,1.2,2.8,2.8,0,52,SC,SD);stones(g,P,'sw',1.2,2.8,2.8,0,52,R);stones(g,P,'se',1.2,2.8,2.8,0,52,R);
    windowSW(g,P,1.5,2.8,34,0.2,8);windowSW(g,P,2.3,2.8,34,0.2,8);windowSE(g,P,2.8,1.5,34,0.2,8);windowSE(g,P,2.8,2.3,34,0.2,8);
    poly(g,[P(2.8,1.75,50),P(2.8,2.25,50),P(2.8,2.25,30),P(2.8,2.0,33),P(2.8,1.75,30)],O.c,shade(O.c,-0.4),0.8);
    hipRoof(g,P,1.2,1.2,2.8,2.8,52,24,0.12,roof);
    tw(3.15,0.05);tw(0.05,3.15);
    box(g,P,0.85,3.45,3.15,3.8,0,24,SC,SD,ST);stones(g,P,'sw',0.85,3.15,3.8,0,24,R);crenSW(0.9,3.15,3.8,24);
    box(g,P,3.45,0.85,3.8,3.15,0,24,SC,SD,ST);stones(g,P,'se',0.85,3.15,3.8,0,24,R);crenSE(3.8,0.9,3.15,24);
    poly(g,[P(1.65,3.8,0),P(2.35,3.8,0),P(2.35,3.8,14),P(2.0,3.8,19),P(1.65,3.8,14)],'#3e2716','#22140a',1.2);
    for(const u of [1.1,2.6])poly(g,[P(u,3.8,22),P(u+0.3,3.8,22),P(u+0.3,3.8,6),P(u+0.15,3.8,9),P(u,3.8,6)],O.c,shade(O.c,-0.4),0.6);
    tw(3.15,3.15);
  });
  else if(type==='market')s=makeSprite(3,3,BH.market,(g,P)=>{
    foundation(g,P,3,3,'#9a8564');
    for(let i=0;i<26;i++){const q=P(0.2+R()*2.6,0.2+R()*2.6,0);g.fillStyle=R()<.5?'rgba(120,100,70,.5)':'rgba(190,170,130,.5)';g.fillRect(q[0],q[1],2,1)}
    box(g,P,0.2,0.2,1.55,1.3,0,18,'#dccaa2','#a8936c');
    timberSW(g,P,0.2,1.55,1.3,0,18,3);timberSE(g,P,1.55,0.2,1.3,0,18,2);
    door(g,P,0.75,1.3,0.3,11);windowSE(g,P,1.55,0.55,8,0.3,5);
    hipRoof(g,P,0.2,0.2,1.55,1.3,18,13,0.12,roof);
    const stall=(u,v,col)=>{
      box(g,P,u,v,u+0.75,v+0.5,0,6,'#8a6440','#664a2e','#a07a50');
      const goods=['#d8344a','#f0c84a','#7fae52','#d9bd6a','#b0814f'];for(let i=0;i<5;i++){const q=P(u+0.12+i*0.13,v+0.25,6);g.fillStyle=goods[(i+((u*7)|0))%5];g.beginPath();g.arc(q[0],q[1]-1.5,2,0,7);g.fill()}
      for(const [a,b2] of [[u,v+0.5],[u+0.75,v+0.5],[u+0.75,v]])line(g,P(a,b2,0),P(a,b2,13),'#5a3a20',1.2);
      for(let k=0;k<4;k++){const a=u+k*0.1875,b2=a+0.1875;poly(g,[P(a,v-0.05,15),P(b2,v-0.05,15),P(b2,v+0.6,11),P(a,v+0.6,11)],k%2?'#efe6cf':col,'rgba(40,25,10,.35)',0.5)}
    };
    stall(1.85,0.35,O.c);stall(1.85,1.25,'#c9a34a');stall(0.35,1.95,'#c9a34a');stall(1.3,1.95,O.c);
    for(const [u,v] of [[2.45,2.3],[2.65,2.5]]){const q=P(u,v,0);g.fillStyle='#7a5030';g.beginPath();g.ellipse(q[0],q[1]-4,3.4,4.6,0,0,7);g.fill();g.strokeStyle='#3a2614';g.lineWidth=0.7;g.beginPath();g.moveTo(q[0]-3.3,q[1]-5);g.lineTo(q[0]+3.3,q[1]-5);g.moveTo(q[0]-3.3,q[1]-2.5);g.lineTo(q[0]+3.3,q[1]-2.5);g.stroke()}
  });
  else if(type==='gate')s=makeSprite(1,1,BH.gate,(g,P)=>{
    box(g,P,0.02,0.02,0.98,0.26,0,30,'#a69e8e','#7d7567','#b8b0a0');
    if(variant!=='open'){poly(g,[P(0.12,0.5,0),P(0.88,0.5,0),P(0.88,0.5,21),P(0.12,0.5,21)],'#6b4a2a','#3a2614',1);
      for(let i=1;i<5;i++)line(g,P(0.12+i*0.152,0.5,0),P(0.12+i*0.152,0.5,21),'rgba(30,18,8,.5)',0.8);
      line(g,P(0.12,0.5,7),P(0.88,0.5,7),'#3a3c42',1.4);line(g,P(0.12,0.5,15),P(0.88,0.5,15),'#3a3c42',1.4);}
    box(g,P,0.02,0.74,0.98,0.98,0,30,'#a69e8e','#7d7567','#b8b0a0');
    stones(g,P,'sw',0.02,0.98,0.98,0,30,R);
    box(g,P,0.02,0.02,0.98,0.98,24,31,'#968e7e','#6d665a','#aaa292');
    poly(g,[P(0.3,0.98,30),P(0.7,0.98,30),P(0.7,0.98,20),P(0.5,0.98,23),P(0.3,0.98,20)],O.c,shade(O.c,-0.4),0.6);
  });
  SPR[key]=s;return s;
}
function treeSprites(){
  const out=[];
  for(let k=0;k<10;k++){
    const R=rng(1000+k),pine=k>=7;
    const cw=56,ch=84,c=document.createElement('canvas');c.width=cw*SS;c.height=ch*SS;
    const g=c.getContext('2d');g.scale(SS,SS);const ax=cw/2,ay=ch-10;
    g.fillStyle='rgba(15,30,10,.32)';g.beginPath();g.ellipse(ax+9,ay+1,15,6,0,0,7);g.fill();
    g.fillStyle='#5a3b20';g.beginPath();g.moveTo(ax-2.5,ay);g.lineTo(ax+2.5,ay);g.lineTo(ax+1.4,ay-20);g.lineTo(ax-1.4,ay-20);g.fill();
    g.fillStyle='#3e2814';g.fillRect(ax+0.6,ay-20,1,20);
    if(pine){
      const tiers=4;for(let t=0;t<tiers;t++){const y=ay-14-t*11,wd=17-t*3.4;
        g.fillStyle=['#24472b','#2b5232','#315c38','#386641'][t];g.beginPath();g.moveTo(ax-wd,y);g.lineTo(ax,y-17);g.lineTo(ax+wd,y);g.quadraticCurveTo(ax,y+4,ax-wd,y);g.fill();
        g.fillStyle='rgba(140,190,110,.22)';g.beginPath();g.moveTo(ax-wd,y);g.lineTo(ax,y-17);g.lineTo(ax-wd*0.3,y+1);g.fill();}
    }else{
      const hue=R()<0.5?0:1,base=hue?[52,98,44]:[60,104,40];
      const blobs=[];for(let i=0;i<9;i++)blobs.push([ax+(R()-.5)*22,ay-32+(R()-.5)*18-(i<3?8:0),8+R()*6]);
      blobs.sort((a,b)=>a[1]-b[1]);
      for(const [x,y,r] of blobs){const gr=g.createRadialGradient(x-r*0.4,y-r*0.45,1,x,y,r);
        gr.addColorStop(0,`rgb(${base[0]+60},${base[1]+70},${base[2]+30})`);gr.addColorStop(0.55,`rgb(${base[0]},${base[1]},${base[2]})`);gr.addColorStop(1,`rgb(${base[0]-28},${base[1]-42},${base[2]-20})`);
        g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill()}
      for(let i=0;i<40;i++){const x=ax+(R()-.5)*30,y=ay-32+(R()-.5)*26;g.fillStyle=R()<0.5?'rgba(20,45,15,.35)':'rgba(170,210,120,.25)';g.fillRect(x,y,1.5,1.5)}
    }
    out.push({c,ax,ay,w:cw,h:ch});
  }
  return out;
}
let TREES=null,ROCKS=null,BUSH=null,PALMS=null;
function palmSprites(){const out=[];for(let k=0;k<5;k++){const R=rng(2000+k);const cw=60,ch=86,c=document.createElement('canvas');c.width=cw*SS;c.height=ch*SS;const g=c.getContext('2d');g.scale(SS,SS);const ax=cw/2,ay=ch-10;
  g.fillStyle='rgba(60,45,20,.3)';g.beginPath();g.ellipse(ax+10,ay+1,15,5,0,0,7);g.fill();
  const lean=(R()-.5)*14,tx=ax+lean,ty=ay-44-R()*8;
  g.strokeStyle='#7a5a36';g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(ax,ay);g.quadraticCurveTo(ax+lean*0.2,ay-24,tx,ty);g.stroke();
  g.strokeStyle='#5a4026';g.lineWidth=1;for(let i=1;i<9;i++){const t=i/9,x=ax+(tx-ax)*t+lean*0.2*(1-t)*t*2,y=ay+(ty-ay)*t;g.beginPath();g.moveTo(x-2.2,y);g.lineTo(x+2.2,y+1);g.stroke()}
  for(let i=0;i<7;i++){const a=-Math.PI/2+(i-3)*0.55+(R()-.5)*0.2,L=17+R()*6,ex=tx+Math.cos(a)*L,ey=ty+Math.sin(a)*L*0.55+8;
    g.strokeStyle=i%2?'#3f7a2c':'#4f8f36';g.lineWidth=3.2;g.beginPath();g.moveTo(tx,ty);g.quadraticCurveTo(tx+Math.cos(a)*L*0.5,ty-6,ex,ey);g.stroke()}
  g.fillStyle='#6b4a2a';for(let i=0;i<3;i++){g.beginPath();g.arc(tx-2+i*2,ty+2,1.6,0,7);g.fill()}
  out.push({c,ax,ay,w:cw,h:ch})}return out}
function resSprites(){
  TREES=treeSprites();PALMS=palmSprites();
  ROCKS=makeSprite(2,2,28,(g,P)=>{
    g.save();g.translate(8,2);poly(g,[P(0.3,0.3),P(1.7,0.3),P(1.7,1.7),P(0.3,1.7)],'rgba(15,25,10,.14)');g.restore();
    const R=rng(77);const rocks=[];for(let i=0;i<9;i++)rocks.push([0.35+R()*1.3,0.35+R()*1.3,6+R()*7]);
    rocks.sort((a,b)=>(a[0]+a[1])-(b[0]+b[1]));
    for(const [u,v,r] of rocks){const p=P(u,v,0);const gr=g.createRadialGradient(p[0]-r*0.4,p[1]-r*0.9,1,p[0],p[1]-r*0.4,r*1.3);
      gr.addColorStop(0,'#b9b2a6');gr.addColorStop(0.6,'#7f786d');gr.addColorStop(1,'#4f4a43');g.fillStyle=gr;
      g.beginPath();g.moveTo(p[0]-r,p[1]);g.quadraticCurveTo(p[0]-r*0.9,p[1]-r*1.3,p[0]-r*0.1,p[1]-r*1.4);g.quadraticCurveTo(p[0]+r*0.9,p[1]-r*1.2,p[0]+r,p[1]);g.quadraticCurveTo(p[0],p[1]+r*0.35,p[0]-r,p[1]);g.fill();
      g.strokeStyle='rgba(30,25,20,.4)';g.lineWidth=0.6;g.stroke();}
  });
  BUSH=makeSprite(1,1,22,(g,P)=>{
    const c=P(0.5,0.5,0);g.fillStyle='rgba(15,30,10,.3)';g.beginPath();g.ellipse(c[0]+5,c[1]+1,13,5,0,0,7);g.fill();
    for(const [dx,dy,r] of [[-7,-6,7],[6,-6,7],[0,-11,8],[-3,-4,7],[4,-3,6]]){const gr=g.createRadialGradient(c[0]+dx-2,c[1]+dy-3,1,c[0]+dx,c[1]+dy,r);
      gr.addColorStop(0,'#7fae52');gr.addColorStop(1,'#2e5a26');g.fillStyle=gr;g.beginPath();g.arc(c[0]+dx,c[1]+dy,r,0,7);g.fill()}
  });
}
