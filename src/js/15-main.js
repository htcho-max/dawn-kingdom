'use strict';
// ---------- loop ----------
let last=performance.now(),miniT=0;
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  if(G&&started&&!paused&&!G.over){
    const sp=700*dt/Z;
    if(keys.ArrowLeft)cam.x-=sp;if(keys.ArrowRight)cam.x+=sp;if(keys.ArrowUp)cam.y-=sp;if(keys.ArrowDown)cam.y+=sp;
    if(edgeScroll&&mouse.in&&!drag&&matchMedia('(pointer:fine)').matches){const m=10;if(mouse.x<m)cam.x-=sp;if(mouse.x>W-m)cam.x+=sp;if(mouse.y<topH+m&&mouse.y>topH-2)cam.y-=sp;if(mouse.y>H-panH-m&&mouse.y<H-panH+2)cam.y+=sp}
    clampCam();
    step(dt);
    if(G.mark)G.mark.t-=dt;
    G.saveT-=dt;if(G.saveT<=0){G.saveT=60;saveTo('auto')}
    SFX.birdT-=dt;if(SFX.birdT<=0){SFX.birdT=5+Math.random()*9;play('bird')}
    G.uiT-=dt;if(G.uiT<=0){G.uiT=0.2;renderTop();renderPanel(false)}
  }
  render();
  miniT-=dt;if(miniT<=0){miniT=0.25;renderMini()}
  requestAnimationFrame(frame);
}
window.addEventListener('resize',resize);
resSprites();applyTouch();resize();sfxApply();showStart();requestAnimationFrame(frame);
// test hooks
window.__rts={get G(){return G},get cam(){return {x:cam.x,y:cam.y}},ud:UD,newGame:o=>{overlay.hidden=true;started=true;newGame(o);resize()},pathOk:(u,o)=>pathTo(u,o),dbg:{findSpot,aiAssign,center,aiBuild,canPlace},place:(t,o,x,y)=>placeBld(t,o,x,y,true),save:k=>saveTo(k),load:k=>loadFrom(k),ser:()=>serialize(),ring:o=>ringBell(o),clear:o=>allClear(o),cmdAt:(x,y)=>command({x,y}),trade:(u,b)=>cmdTrade(u,b),amove:(u,x,y)=>cmdAmove(u,x*T,y*T),queue:(b,t)=>queueItem(b,t),loadCode:t=>loadCode(t),pickAt:(x,y)=>{const o=pick(x,y);return o?(o.type||o.sub):null},select:a=>selectArr(a),sel:()=>sel,spawn:(t,o,x,y)=>spawnUnit(t,o,x*T,y*T),zoom:z=>setZoom(z),center:(x,y)=>centerIso(isoT(x,y)),step:(sec)=>{for(let t=0;t<sec;t+=1/30)if(G&&!G.over)step(1/30)},mission:(i,c)=>startMission(i,c),campaign:()=>SCN.map(m=>m.id),start:d=>{overlay.hidden=true;started=true;newGame(d||'normal');resize()}};
