'use strict';
// ---------- A* ----------
let gS=new Float32Array(N),from=new Int32Array(N),seen=new Int32Array(N),shut=new Int32Array(N);let stamp=0;
const hI=[],hF=[];
function hpush(i,f){hI.push(i);hF.push(f);let c=hI.length-1;while(c>0){const p=(c-1)>>1;if(hF[p]<=hF[c])break;[hI[p],hI[c]]=[hI[c],hI[p]];[hF[p],hF[c]]=[hF[c],hF[p]];c=p}}
function hpop(){const top=hI[0];const li=hI.pop(),lf=hF.pop();if(hI.length){hI[0]=li;hF[0]=lf;let c=0;for(;;){const l=2*c+1,r=l+1;let m=c;if(l<hI.length&&hF[l]<hF[m])m=l;if(r<hI.length&&hF[r]<hF[m])m=r;if(m===c)break;[hI[m],hI[c]]=[hI[c],hI[m]];[hF[m],hF[c]]=[hF[c],hF[m]];c=m}}return top}
const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
function astar(sx,sy,goal,hx,hy,maxN){
  stamp++;hI.length=0;hF.length=0;
  const H=(x,y)=>{const dx=Math.abs(x-hx),dy=Math.abs(y-hy);return Math.max(dx,dy)+0.414*Math.min(dx,dy)};
  const s=idx(sx,sy);gS[s]=0;seen[s]=stamp;from[s]=-1;hpush(s,H(sx,sy));
  let best=s,bestH=H(sx,sy),n=0,found=-1;
  while(hI.length){
    const c=hpop();if(shut[c]===stamp)continue;shut[c]=stamp;
    const cx=c%MW,cy=(c/MW)|0;
    if(goal(cx,cy)){found=c;break}
    const h=H(cx,cy);if(h<bestH){bestH=h;best=c}
    if(++n>maxN)break;
    for(const [dx,dy,cost] of DIRS){
      const nx=cx+dx,ny=cy+dy;if(!walk(nx,ny))continue;
      if(dx&&dy&&(!walk(cx+dx,cy)||!walk(cx,cy+dy)))continue;
      const ni=idx(nx,ny);if(shut[ni]===stamp)continue;
      const ng=gS[c]+cost;
      if(seen[ni]!==stamp||ng<gS[ni]){seen[ni]=stamp;gS[ni]=ng;from[ni]=c;hpush(ni,ng+H(nx,ny))}
    }
  }
  const end=found>=0?found:best;const out=[];
  for(let c=end;c!==s&&c>=0;c=from[c])out.push(c);
  out.reverse();return{path:out,ok:found>=0};
}
function pathTo(u,o,px,py){
  PO=u.owner;
  const sx=Math.max(0,Math.min(MW-1,Math.floor(u.x/T))),sy=Math.max(0,Math.min(MH-1,Math.floor(u.y/T)));
  let goal,hx,hy,fin=null;
  if(o){
    if(o.kind==='unit'){const gx=Math.floor(o.x/T),gy=Math.floor(o.y/T);goal=(x,y)=>Math.abs(x-gx)<=1&&Math.abs(y-gy)<=1;hx=gx;hy=gy}
    else if(o.kind==='bld'&&o.type==='farm'){goal=(x,y)=>x>=o.tx&&x<o.tx+o.w&&y>=o.ty&&y<o.ty+o.h;hx=o.tx+1;hy=o.ty+1}
    else{goal=(x,y)=>x>=o.tx-1&&x<=o.tx+o.w&&y>=o.ty-1&&y<=o.ty+o.h;hx=o.tx+(o.w-1)/2;hy=o.ty+(o.h-1)/2}
  }else{
    const gx=Math.floor(px/T),gy=Math.floor(py/T);
    if(walk(gx,gy)){goal=(x,y)=>x===gx&&y===gy;fin={x:px,y:py}}
    else goal=(x,y)=>Math.abs(x-gx)<=1&&Math.abs(y-gy)<=1;
    hx=gx;hy=gy;
  }
  const r=astar(sx,sy,goal,hx,hy,Math.max(4500,N*0.7));
  if(!r.ok&&o&&o.kind!=='unit'&&G)o.unr=G.t;
  u.path=r.path.map(i=>({x:(i%MW)*T+T/2,y:((i/MW)|0)*T+T/2}));
  if(fin&&r.ok){if(u.path.length)u.path[u.path.length-1]=fin;else u.path.push(fin)}
  else if(!u.path.length)u.path.push({x:sx*T+T/2,y:sy*T+T/2});
  return r.ok;
}
