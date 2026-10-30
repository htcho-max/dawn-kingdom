'use strict';
// ---------- input ----------
const mouse={x:0,y:0,in:false};let drag=null;const keys={};
let wallA=null,wallArmed=false,cmdMode=null,buildPage=0,lastClick={o:null,t:0},lastGrp={k:0,t:0};
function tileAt(sx,sy){const w=screenToWorld(sx,sy);return{x:Math.max(0,Math.min(MW-1,Math.floor(w.x/T))),y:Math.max(0,Math.min(MH-1,Math.floor(w.y/T)))}}
function lineTiles(a,b){const out=[];let x=a.x,y=a.y;const dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1;let err=dx-dy;
  for(;;){out.push({x,y});if((x===b.x&&y===b.y)||out.length>=48)break;const e2=2*err;if(e2>-dy){err-=dy;x+=sx}if(e2<dx){err+=dx;y+=sy}}return out}
function cancelModes(){placing=null;wallA=null;wallArmed=false;cmdMode=null;touchGhost=false;cvs.style.cursor='default';const c=document.getElementById('confirm');if(c)c.hidden=true}
function placeWall(a,b){
  const segs=[];let short=false;
  for(const t of lineTiles(a,b)){if(!canPlace('wall',t.x,t.y,0,false))continue;if(!afford(0,BD.wall.cost)){short=true;break}pay(0,BD.wall.cost);segs.push(placeBld('wall',0,t.x,t.y,false))}
  const vs=sel.filter(e=>e.kind==='unit'&&e.owner===0&&e.type==='villager');
  if(segs.length)play('place');
  if(segs.length)for(const u of vs){let best=segs[0],bd=1e9;for(const w of segs){const d=rectDist(u.x,u.y,w);if(d<bd){bd=d;best=w}}cmdBuild(u,best)}
  if(!segs.length)toast(short?'목재가 부족합니다':'여기에는 성벽을 지을 수 없습니다',true);
  else if(short)toast('목재가 부족해 성벽 '+segs.length+'칸만 놓았습니다',true);
  cancelModes();
}
function doAmove(p){
  const w=screenToWorld(p.x,p.y),units=sel.filter(e=>e.kind==='unit'&&e.owner===0);
  const mil=units.filter(u=>u.type!=='villager'),cols=Math.ceil(Math.sqrt(mil.length)),sp=Math.min(...mil.map(u=>UD[u.type].speed));
  mil.forEach((u,i)=>{const r=Math.floor(i/cols),c=i%cols;cmdAmove(u,w.x+(c-(cols-1)/2)*20,w.y+(r-(Math.ceil(mil.length/cols)-1)/2)*20);if(mil.length>1)u.gspd=sp});
  units.filter(u=>u.type==='villager').forEach(u=>cmdMove(u,w.x,w.y));
  G.mark={x:w.x,y:w.y,t:0.5,c:'#ff6b5c'};cancelModes();
}
function startGarrison(){if(!sel.some(e=>e.kind==='unit'&&e.owner===0&&['vil','inf','arch'].includes(UD[e.type].cls))){toast('보병·궁수·일꾼을 먼저 선택하세요');return}placing=null;wallA=null;cmdMode='garrison';cvs.style.cursor='crosshair';toast('들어갈 마을회관이나 감시탑을 클릭하세요')}
function doGarrison(p){
  const t=pick(p.x,p.y);
  if(!(t&&t.kind==='bld'&&t.owner===0&&BD[t.type].gar&&t.built>=1)){toast('마을회관이나 감시탑을 클릭하세요',true);return}
  let n=0;for(const u of sel)if(u.kind==='unit'&&canGar(u,t)){cmdGarrison(u,t);n++}
  if(!n)toast('들어갈 수 있는 유닛이 없거나 자리가 없습니다',true);else{play('cmd');const c=center(t);G.mark={x:c.x,y:c.y,t:0.5,c:'#9fe39a'}}
  cancelModes();
}
function startAmove(){if(!sel.some(e=>e.kind==='unit'&&e.owner===0&&e.type!=='villager')){toast('군대를 먼저 선택하세요');return}placing=null;wallA=null;cmdMode='amove';cvs.style.cursor='crosshair';toast('공격 이동할 지점을 클릭하세요. 가는 길의 적과 싸웁니다')}
function screenToIso(x,y){return{x:x/Z+cam.x,y:y/Z+cam.y}}
function screenToWorld(x,y){const i=screenToIso(x,y);const u=(i.x/32+i.y/16)/2,v=(i.y/16-i.x/32)/2;return{x:u*T,y:v*T}}
function pos(e){const r=cvs.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function bbox(o){
  if(o.kind==='unit'){const p=isoW(o.x,o.y),c=UD[o.type].cls;if(c==='cav')return[p.x-14,p.y-36,p.x+14,p.y+4];if(o.type==='trebuchet')return[p.x-17,p.y-46,p.x+17,p.y+5];if(c==='siege'||c==='trade')return[p.x-15,p.y-25,p.x+16,p.y+5];return[p.x-8,p.y-25,p.x+8,p.y+4]}
  if(o.kind==='res'&&o.sub==='tree'){const p=isoT(o.tx+.5,o.ty+.5);return[p.x-15,p.y-58,p.x+15,p.y+6]}
  const a=isoT(o.tx,o.ty),h=o.kind==='bld'?(BH[o.type]||0)*0.85:o.sub==='mine'?20:16;
  return[a.x-32*o.h+6,a.y-h,a.x+32*o.w-6,a.y+16*(o.w+o.h)];
}
function pick(sx,sy,ownFirst){
  const i=screenToIso(sx,sy),pd=touchUI?7/Z:0;const inB=(o)=>{const b=bbox(o);return i.x>=b[0]-pd&&i.x<=b[2]+pd&&i.y>=b[1]-pd&&i.y<=b[3]+pd};
  let best=null,bk=-1e9;
  for(const u of G.units){if(u.gar||!visibleTo0(u)||!inB(u))continue;let k=objKey(u)+(ownFirst&&u.owner===0?1000:0);if(k>bk){bk=k;best=u}}
  if(best)return best;
  const w=screenToWorld(sx,sy),tx=Math.floor(w.x/T),ty=Math.floor(w.y/T);
  for(const b of G.blds){if(!knownTo0(b))continue;const onFoot=tx>=b.tx&&tx<b.tx+b.w&&ty>=b.ty&&ty<b.ty+b.h;if(!onFoot&&(b.type==='farm'||!inB(b)))continue;const k=objKey(b)+(onFoot?0.3:0);if(k>bk){bk=k;best=b}}
  for(const r of G.res){if(!G.exp[idx(r.tx,r.ty)])continue;const onFoot=tx>=r.tx&&tx<r.tx+r.w&&ty>=r.ty&&ty<r.ty+r.h;if(!onFoot&&!inB(r))continue;const k=objKey(r)+(onFoot?0.3:0);if(k>bk){bk=k;best=r}}
  return best;
}
const costSum=c=>Object.values(c).reduce((x,y)=>x+y,0);
function matchup(a,t){
  const DA=UD[a.type];
  if(t.kind==='bld'){const e=DA.siege?['매우 효과적','good']:DA.bmul>=1?['효과적','good']:DA.bmul>=0.5?['보통','even']:['약함','bad'];return{txt:`${DA.name} → ${BD[t.type].name}: 건물 공격 ${e[0]} · 한 번에 ${Math.round(calcDmg(a,t))}`,cls:e[1]}}
  const DB=UD[t.type];if(DA.onlyBld)return{txt:`${DA.name}은(는) 유닛을 공격하지 못합니다`,cls:'bad'};
  const da=calcDmg(a,t),db=DB.noAtk||DB.onlyBld?0:calcDmg(t,a),dpsA=da/DA.rate,dpsB=db/DB.rate;
  let sc=(dpsB>0?a.maxHp/dpsB:1e9)/(t.maxHp/dpsA)*(costSum(DB.cost)/Math.max(1,costSum(DA.cost)));
  if(DA.at==='p'&&DB.at!=='p')sc*=1.4;else if(DB.at==='p'&&DA.at!=='p')sc/=1.4;
  const lv=sc>1.6?['매우 유리','good']:sc>1.15?['유리','good']:sc>0.87?['비슷','even']:sc>0.6?['불리','bad']:['매우 불리','bad'];
  const bon=bonusOf(a,t),bon2=bonusOf(t,a);
  return{txt:`${DA.name} → ${DB.name}: ${lv[0]}\n주는 피해 ${da}${bon?` (상성 +${bon})`:''} · 받는 피해 ${db}${bon2?` (상성 +${bon2})`:''}`,cls:lv[1]};
}
function updateHint(){
  const h=$('#hint');
  if(!G||!started||paused||!mouse.in||placing||cmdMode||drag){h.hidden=true;return}
  const mil=sel.filter(u=>u.kind==='unit'&&u.owner===0&&!['vil','trade'].includes(UD[u.type].cls));
  if(!mil.length){h.hidden=true;return}
  const t=pick(mouse.x,mouse.y);
  if(!t||t.kind==='res'||!foe(0,t.owner)){h.hidden=true;return}
  const cnt={};for(const u of mil)cnt[u.type]=(cnt[u.type]||0)+1;const A=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const m=matchup(mil.find(u=>u.type===A),t);
  h.hidden=false;h.className='hint '+m.cls;h.textContent=m.txt;
  const r=cvs.getBoundingClientRect(),hw=h.offsetWidth,hh=h.offsetHeight;
  h.style.left=Math.min(r.width-hw-8,mouse.x+18)+'px';h.style.top=Math.max(topH+4,Math.min(r.height-panH-hh-6,mouse.y+18))+'px';
}
function selectArr(a){sel=a.filter(o=>!o.gar);buildPage=0;if(sel.length)play('select');renderPanel(true)}
function clickSelect(p,shift){
  const o=pick(p.x,p.y,true);
  if(!o){if(!shift)selectArr([]);return}
  const now=performance.now(),dbl=lastClick.o===o&&now-lastClick.t<380;lastClick={o,t:now};
  if(dbl&&o.kind==='unit'&&o.owner===0){const i1=screenToIso(0,topH),i2=screenToIso(W,H-panH);
    selectArr(G.units.filter(u=>{if(u.owner!==0||u.gar||u.type!==o.type)return false;const q=isoW(u.x,u.y);return q.x>=i1.x&&q.x<=i2.x&&q.y>=i1.y&&q.y<=i2.y+20}));return}
  if(shift&&o.kind==='unit'&&o.owner===0&&sel.every(s=>s.kind==='unit'&&s.owner===0)){selectArr(sel.includes(o)?sel.filter(s=>s!==o):sel.concat(o));return}
  selectArr([o]);
}
function boxSelect(a,b,shift){
  const i1=screenToIso(Math.min(a.x,b.x),Math.min(a.y,b.y)),i2=screenToIso(Math.max(a.x,b.x),Math.max(a.y,b.y));
  const us=G.units.filter(u=>{if(u.owner!==0||u.gar)return false;const p=isoW(u.x,u.y);return p.x>=i1.x-5&&p.x<=i2.x+5&&p.y-10>=i1.y-8&&p.y-10<=i2.y+8});
  if(us.length){let s=us;if(shift)s=[...new Set(sel.filter(x=>x.kind==='unit'&&x.owner===0).concat(us))];selectArr(s);return}
  if(!shift)selectArr([]);
}
function command(p,target){
  const w=screenToWorld(p.x,p.y);
  const own=sel.filter(e=>e.owner===0);
  if(!own.length)return;
  const t=target!==undefined?target:pick(p.x,p.y);
  if(own[0].kind==='bld'){
    const b=own[0];if(!BD[b.type].train)return;
    b.rally={x:w.x,y:w.y,obj:t&&(t.kind==='res'||t.type==='farm')?t:null};G.mark={x:w.x,y:w.y,t:0.5,c:'#f4ecd4'};return;
  }
  let units=own.filter(e=>e.kind==='unit');
  play('cmd');
  if(t&&t.kind==='bld'&&t.owner===0&&t.built>=1&&t.type==='market'){
    const carts=units.filter(u=>u.type==='cart');
    if(carts.length){let ok=0;for(const u of carts)if(cmdTrade(u,t))ok++;if(ok){const c=center(t);G.mark={x:c.x,y:c.y,t:0.5,c:'#f0c84a'};toast('교역로를 정했습니다. 한 번 오갈 때마다 금 '+tradeGold(center(carts[0].ta),center(t)))}units=units.filter(u=>u.type!=='cart');if(!units.length)return}
  }
  if(t&&t.kind==='bld'&&t.owner===0&&t.built>=1&&BD[t.type].gar){
    const g=[];for(const u of units)if((u.type!=='villager'||t.type==='tower')&&canGar(u,t)){cmdGarrison(u,t);g.push(u)}
    if(g.length){const c=center(t);G.mark={x:c.x,y:c.y,t:0.5,c:'#9fe39a'};units=units.filter(u=>!g.includes(u));if(!units.length)return}
  }
  if(t&&t.kind!=='res'&&foe(0,t.owner)){units.forEach(u=>cmdAttack(u,t));G.mark={x:w.x,y:w.y,t:0.5,c:'#ff6b5c'};return}
  const vill=units.filter(u=>u.type==='villager'),mil=units.filter(u=>u.type!=='villager');
  let rest=units;
  if(t&&t.kind==='res'&&vill.length){vill.forEach(u=>cmdGather(u,t));rest=mil}
  else if(t&&t.kind==='bld'&&t.owner===0&&vill.length){
    if(t.built<1)vill.forEach(u=>cmdBuild(u,t));
    else if(t.type==='farm')vill.forEach(u=>cmdGather(u,t));
    else vill.forEach(u=>{if(u.carry.n>0&&BD[t.type].drop&&BD[t.type].drop.includes(u.carry.t))cmdReturn(u,t);else cmdMove(u,w.x,w.y)});
    rest=mil;
  }
  G.mark={x:w.x,y:w.y,t:0.5,c:'#9fe39a'};
  const cols=Math.ceil(Math.sqrt(rest.length));
  const sp=rest.length>1?Math.min(...rest.map(u=>UD[u.type].speed)):0;
  rest.forEach((u,i)=>{const r=Math.floor(i/cols),c=i%cols;cmdMove(u,w.x+(c-(cols-1)/2)*18,w.y+(r-(Math.ceil(rest.length/cols)-1)/2)*18);u.gspd=sp});
}
function tryPlace(p){
  const D=BD[placing],w=screenToWorld(p.x,p.y),tx=Math.round(w.x/T-D.w/2),ty=Math.round(w.y/T-D.h/2);
  if(!canPlace(placing,tx,ty,0,false)){toast('여기에는 지을 수 없습니다',true);return}
  if(!afford(0,D.cost)){toast(lack(0,D.cost),true);placing=null;return}
  pay(0,D.cost);const b=placeBld(placing,0,tx,ty,false);play('place',(tx+D.w/2)*T,(ty+D.h/2)*T);
  sel.filter(e=>e.kind==='unit'&&e.owner===0&&e.type==='villager').forEach(u=>cmdBuild(u,b));
  placing=null;cvs.style.cursor='default';
}
function startPlace(t){if(placing===t){cancelModes();toast('건설을 취소했습니다');return}if(BD[t].age>G.players[0].age){toast(AGE_N[BD[t].age]+'가 필요합니다',true);return}if(!afford(0,BD[t].cost)){toast(lack(0,BD[t].cost),true);return}cancelModes();placing=t;cvs.style.cursor='crosshair';if(touchUI){setConfirm(t==='wall'?'성벽 시작 지점을 탭하세요':BD[t].name+' · 지을 곳을 탭하세요',false);return}toast(t==='wall'?'성벽 시작점을 누른 채 끝점까지 끌거나, 두 지점을 차례로 클릭하세요':BD[t].name+' 위치를 고르세요 (우클릭·Esc로 취소)')}

const touches=new Map();let pinch=null,boxNext=false,touchGhost=false,touchUI=false,autoTouch=false;
let edgeScroll=false;try{edgeScroll=localStorage.getItem('dawn.edge')==='1'}catch(e){}
let touchPref='auto';try{touchPref=localStorage.getItem('dawn.touch')||'auto'}catch(e){}
try{autoTouch=matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&!matchMedia('(hover:hover)').matches)}catch(e){}
function applyTouch(){const on=touchPref==='on'||(touchPref==='auto'&&autoTouch);if(on===touchUI&&document.body.classList.contains('touch')===on)return;touchUI=on;document.body.classList.toggle('touch',on);sigCache='';if(G)renderPanel(true);resize();syncTbar()}
function noteTouch(){if(!autoTouch){autoTouch=true;applyTouch()}}
function setConfirm(txt,ready){const c=$('#confirm');c.hidden=false;$('#cf-txt').textContent=txt;$('#cf-ok').disabled=!ready;c.style.bottom=(panH+12)+'px'}
$('#cf-ok').onclick=()=>{if(!placing)return;const p={x:mouse.x,y:mouse.y};if(placing==='wall'&&wallA)placeWall(wallA,tileAt(p.x,p.y));else tryPlace(p);if(!placing)cancelModes()};
$('#cf-no').onclick=()=>{cancelModes();toast('건설을 취소했습니다')};
function showLP(p){const r=$('#lpring');r.hidden=false;r.style.left=p.x+'px';r.style.top=p.y+'px';r.classList.remove('go');void r.offsetWidth;r.classList.add('go')}
function hideLP(){const r=document.getElementById('lpring');if(r)r.hidden=true}
let hintTimer=0;
function tt(x){if(!touchUI)return x;return x.replace(/A를 누르고 클릭하면 공격 이동합니다/g,'빈 땅을 길게 누르면 공격 이동합니다').replace(/마우스를 올리거나 /g,'').replace(/우클릭/g,'탭').replace(/드래그하면/g,'길게 누른 뒤 끌면').replace(/드래그로/g,'길게 누른 뒤 끌어서').replace(/드래그하거나 두 지점을 클릭해/g,'시작과 끝 지점을 탭해')}
function showHintAt(m,p){const h=$('#hint');h.hidden=false;h.className='hint '+m.cls;h.textContent=m.txt;const r=cvs.getBoundingClientRect();
  h.style.left=Math.max(8,Math.min(r.width-h.offsetWidth-8,p.x-h.offsetWidth/2))+'px';h.style.top=Math.max(topH+6,p.y-h.offsetHeight-40)+'px';clearTimeout(hintTimer);hintTimer=setTimeout(()=>h.hidden=true,3200)}
function selectSameOnScreen(types){const i1=screenToIso(0,topH),i2=screenToIso(W,H-panH);
  return G.units.filter(u=>{if(u.owner!==0||u.gar||!types.includes(u.type))return false;const q=isoW(u.x,u.y);return q.x>=i1.x&&q.x<=i2.x&&q.y>=i1.y&&q.y<=i2.y+20})}
function longPress(p){
  if(placing||cmdMode)return;
  const o=pick(p.x,p.y,true),mil=sel.filter(u=>u.kind==='unit'&&u.owner===0&&!['vil','trade'].includes(UD[u.type].cls));
  if(o&&o.kind!=='res'&&foe(0,o.owner)&&mil.length){const cnt={};for(const u of mil)cnt[u.type]=(cnt[u.type]||0)+1;const A=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];showHintAt(matchup(mil.find(u=>u.type===A),o),p);return}
  if(o&&o.kind==='bld'&&o.owner===0&&sel.some(s=>s.owner===0&&s.kind==='unit')){command(p,o);toast(o.built<1?'건설을 돕습니다':o.hp<o.maxHp?'수리하거나 들어갑니다':BD[o.type].drop||o.type==='tc'?'자원을 내려놓거나 주둔합니다':'명령을 내렸습니다');return}
  if(o&&o.kind==='unit'&&o.owner===0){selectArr(selectSameOnScreen([o.type]));toast('화면 안의 '+UD[o.type].name+' '+sel.length+'명을 골랐습니다');return}
  if(mil.length&&(!o||o.kind==='res')){doAmove(p);toast('공격 이동');return}
  if(o)selectArr([o]);
}
function syncTbar(){
  const b=$('#tbar');if(!b)return;b.style.top=(topH+10)+'px';
  $('#t-box').classList.toggle('on',boxNext);$('#t-box').setAttribute('aria-pressed',boxNext?'true':'false');
  const gw=b.querySelector('.tgroups');if(!gw.children.length){for(let k=1;k<=4;k++){const g=document.createElement('button');g.dataset.k=k;g.className='tg';gw.appendChild(g);
    let lp=0,held=false;g.addEventListener('pointerdown',()=>{held=false;lp=setTimeout(()=>{held=true;if(!G)return;const s2=sel.filter(o=>o.owner===0);if(!s2.length){toast('부대로 묶을 유닛을 먼저 고르세요');return}G.groups[k]=s2.slice();toast('부대 '+k+'에 '+s2.length+' 지정');syncTbar();try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}},550)});
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>g.addEventListener(ev,()=>clearTimeout(lp)));
    g.onclick=()=>{if(held){held=false;return}if(!G)return;const gg=(G.groups[k]||[]).filter(o=>!o.dead&&!o.gar);if(!gg.length){toast('부대 '+k+'이 비어 있습니다. 유닛을 고른 뒤 길게 눌러 지정하세요');return}const now=performance.now();if(lastGrp.k===k&&now-lastGrp.t<420)centerOn(gg[0]);lastGrp={k,t:now};selectArr(gg)}}}
  for(const g of gw.children){const k=+g.dataset.k,n=G&&G.groups[k]?G.groups[k].filter(o=>!o.dead).length:0;g.innerHTML=`부대 ${k}${n?`<small>${n}</small>`:''}`;g.classList.toggle('has',n>0)}
}
$('#t-box').onclick=()=>{boxNext=!boxNext;syncTbar();if(boxNext)toast('끌어서 범위를 정하세요')};
$('#t-same').onclick=()=>{if(!G)return;const ts=[...new Set(sel.filter(u=>u.kind==='unit'&&u.owner===0).map(u=>u.type))];if(!ts.length){toast('유닛을 먼저 고르세요');return}selectArr(selectSameOnScreen(ts))};
$('#t-tc').onclick=()=>{if(!G)return;const tc=G.blds.find(b=>b.owner===0&&b.type==='tc'&&!b.dead);if(tc){selectArr([tc]);centerOn(tc)}};
$('#desel').onclick=()=>{if(!G)return;cancelModes();selectArr([])};
$('#t-clear').onclick=()=>{if(!G)return;cancelModes();selectArr([])};
{const fb=$('#b-full');if(document.fullscreenEnabled&&document.documentElement.requestFullscreen){fb.hidden=false;
  fb.onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen().catch(()=>toast('이 화면에서는 전체 화면을 쓸 수 없습니다',true))};
  document.addEventListener('fullscreenchange',()=>{fb.textContent=document.fullscreenElement?'전체 화면 끄기':'전체 화면';setTimeout(resize,100)})}}
window.addEventListener('contextmenu',e=>{if(touchUI)e.preventDefault()});
cvs.addEventListener('contextmenu',e=>e.preventDefault());
cvs.addEventListener('pointerenter',e=>{const p=pos(e);mouse.x=p.x;mouse.y=p.y;mouse.in=true});
cvs.addEventListener('pointerleave',e=>{mouse.in=false;if(e.pointerType!=='touch')$('#hint').hidden=true});
cvs.addEventListener('pointerdown',e=>{
  if(!G||G.over||!started)return;
  const p=pos(e);mouse.x=p.x;mouse.y=p.y;mouse.in=true;
  try{cvs.setPointerCapture(e.pointerId)}catch(_){}
  if(e.pointerType==='touch'){
    noteTouch();touches.set(e.pointerId,p);
    if(touches.size===2){const [a,b]=[...touches.values()];if(drag&&drag.lpT)clearTimeout(drag.lpT);hideLP();
      pinch={d:Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)),z:Z,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,cx:cam.x,cy:cam.y};drag=null;return}
    if(touches.size>2)return;
    drag={mode:boxNext?'box':'touch',sx:p.x,sy:p.y,x:p.x,y:p.y,cx:cam.x,cy:cam.y,moved:false,long:false};
    if(!boxNext)drag.lpT=setTimeout(()=>{if(drag&&drag.mode==='touch'&&!drag.moved){drag.long=true;showLP(p);try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}}},430);
    return}
  if(e.button===1){drag={mode:'pan',sx:p.x,sy:p.y,cx:cam.x,cy:cam.y};e.preventDefault();return}
  if(e.button===2){if(placing||cmdMode){cancelModes();return}command(p);return}
  if(e.button===0){
    if(cmdMode==='amove'){doAmove(p);return}
    if(cmdMode==='garrison'){doGarrison(p);return}
    if(placing==='wall'){if(!wallA){wallA=tileAt(p.x,p.y);wallArmed=false}return}
    if(placing){tryPlace(p);return}
    drag={mode:'box',sx:p.x,sy:p.y,x:p.x,y:p.y,shift:e.shiftKey}}
});
cvs.addEventListener('pointermove',e=>{
  const p=pos(e);mouse.x=p.x;mouse.y=p.y;mouse.in=true;if(e.pointerType!=='touch')updateHint();
  if(e.pointerType==='touch'&&touches.has(e.pointerId)){touches.set(e.pointerId,p);
    if(pinch&&touches.size>=2){const [a,b]=[...touches.values()];const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,ix=pinch.mx/pinch.z+pinch.cx,iy=pinch.my/pinch.z+pinch.cy;
      Z=Math.max(0.55,Math.min(1.8,pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d));cam.x=ix-mx/Z;cam.y=iy-my/Z;clampCam();return}}
  if(!drag)return;
  drag.x=p.x;drag.y=p.y;
  if(drag.mode==='touch'&&!drag.moved&&Math.hypot(p.x-drag.sx,p.y-drag.sy)>10){
    if(drag.long){drag.mode='box';hideLP()}else{drag.moved=true;clearTimeout(drag.lpT)}}
  if(drag.mode==='pan'||(drag.mode==='touch'&&drag.moved)){cam.x=drag.cx-(p.x-drag.sx)/Z;cam.y=drag.cy-(p.y-drag.sy)/Z;clampCam()}
});
function endTouch(e){touches.delete(e.pointerId);if(touches.size<2)pinch=null}
cvs.addEventListener('pointerup',e=>{
  const wasPinch=!!pinch;if(e.pointerType==='touch')endTouch(e);
  if(e.pointerType!=='touch'&&e.button===0&&placing==='wall'&&wallA){const p=pos(e),t=tileAt(p.x,p.y);if(t.x!==wallA.x||t.y!==wallA.y||wallArmed)placeWall(wallA,t);else wallArmed=true;return}
  if(drag&&drag.lpT)clearTimeout(drag.lpT);hideLP();
  if(!drag||wasPinch){drag=null;return}const p=pos(e);const d=drag;drag=null;
  if(d.mode==='box'){if(e.pointerType==='touch'){boxNext=false;syncTbar()}if(Math.abs(p.x-d.sx)<5&&Math.abs(p.y-d.sy)<5)clickSelect(p,d.shift);else boxSelect({x:d.sx,y:d.sy},p,d.shift)}
  else if(d.mode==='touch'&&!d.moved&&d.long)longPress(p);
  else if(d.mode==='touch'&&!d.moved){
    if(cmdMode==='amove'){doAmove(p);return}
    if(cmdMode==='garrison'){doGarrison(p);return}
    if(placing){mouse.x=p.x;mouse.y=p.y;touchGhost=true;
      if(placing==='wall'&&!wallA){wallA=tileAt(p.x,p.y);setConfirm('끝 지점을 탭하세요 (다시 탭하면 옮겨집니다)',false)}
      else setConfirm(placing==='wall'?'성벽 '+lineTiles(wallA,tileAt(p.x,p.y)).length+'칸 · 다른 곳을 탭하면 옮겨집니다':BD[placing].name+' · 다른 곳을 탭하면 옮겨집니다',true);
      return}
    const o=pick(p.x,p.y,true);
    const ownUnits=sel.some(s=>s.owner===0&&s.kind==='unit');
    const ownBld=sel.length===1&&sel[0].kind==='bld'&&sel[0].owner===0;
    if(o&&o.owner===0&&o.kind==='unit'){clickSelect(p,false);return}
    // Touch: tapping my building selects it. Only unfinished buildings and farms take a
    // villager order on tap; dropping off, garrisoning and repairing use a long press.
    if(o&&o.owner===0&&o.kind==='bld'&&!(ownUnits&&(o.built<1||(o.type==='farm'&&sel.some(s=>s.owner===0&&s.type==='villager'))))){selectArr([o]);return}
    if(ownUnits||(ownBld&&!(o&&o.owner===0))){command(p,o);return}
    selectArr(o?[o]:[]);
  }
});
cvs.addEventListener('pointercancel',e=>{drag=null;endTouch(e)});
cvs.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e);
  if(e.ctrlKey||Math.abs(e.deltaY)>=Math.abs(e.deltaX)&&!e.shiftKey&&e.deltaMode===1||(Math.abs(e.deltaY)>40&&e.deltaX===0&&!e.shiftKey))setZoom(Z*Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0015)),p.x,p.y);
  else{cam.x+=(e.shiftKey?e.deltaY:e.deltaX)/Z;cam.y+=(e.shiftKey?0:e.deltaY)/Z;clampCam()}},{passive:false});
function miniIso(e){const r=mini.getBoundingClientRect(),m=miniGeom();const mx=(e.clientX-r.left)*DPR,my=(e.clientY-r.top)*DPR;return{x:(mx-m.ox)/(m.a/32),y:(my-m.oy)/(m.b/16)}}
let miniDrag=false;
mini.addEventListener('pointerdown',e=>{if(!G)return;const i=miniIso(e);
  if(e.button===2){const u=(i.x/32+i.y/16)/2,v=(i.y/16-i.x/32)/2;const s={x:(i.x-cam.x)*Z,y:(i.y-cam.y)*Z};command(s,null);return}
  miniDrag=true;try{mini.setPointerCapture(e.pointerId)}catch(_){}centerIso(i)});
mini.addEventListener('pointermove',e=>{if(miniDrag)centerIso(miniIso(e))});
mini.addEventListener('pointerup',()=>miniDrag=false);
mini.addEventListener('contextmenu',e=>e.preventDefault());

window.addEventListener('keydown',e=>{
  if(!G||!started)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){keys[e.key]=true;e.preventDefault();return}
  if(e.key==='Escape'){if(placing||cmdMode)cancelModes();else selectArr([]);return}
  if(e.key==='p'||e.key==='P'||e.key==='ㅔ'){togglePause();return}
  if(e.key==='+'||e.key==='='){setZoom(Z*1.2);return}
  if(e.key==='-'||e.key==='_'){setZoom(Z/1.2);return}
  if(G.over||paused)return;
  if(e.key==='h'||e.key==='H'||e.key==='ㅗ'){const tc=G.blds.find(b=>b.owner===0&&b.type==='tc');if(tc){selectArr([tc]);centerOn(tc)}return}
  if(e.key==='.'){selectIdle();return}
  if(e.code&&/^Digit[1-9]$/.test(e.code)){const k=+e.code.slice(5);
    if(e.ctrlKey||e.metaKey||e.shiftKey){e.preventDefault();const g=sel.filter(o=>o.owner===0);if(!g.length){toast('지정할 유닛을 먼저 선택하세요');return}G.groups[k]=g.slice();toast('부대 '+k+' 지정 ('+g.length+')');return}
    const g=(G.groups[k]||[]).filter(o=>!o.dead&&!o.gar);if(!g.length)return;const now=performance.now();
    if(lastGrp.k===k&&now-lastGrp.t<420)centerOn(g[0]);lastGrp={k,t:now};selectArr(g);return}
  if(e.key==='a'||e.key==='A'||e.key==='ㅁ'){startAmove();return}
  if(e.key==='g'||e.key==='G'||e.key==='ㅎ'){startGarrison();return}
  if(e.key==='b'||e.key==='B'||e.key==='ㅠ'){ringBell(0);return}
  const map={'ㅂ':'Q','ㅈ':'W','ㄷ':'E','ㄱ':'R','ㅅ':'T','ㅛ':'Y','ㅕ':'U','ㅑ':'I','ㅐ':'O'};
  const k=(map[e.key]||e.key).toUpperCase();const i=KEYS.indexOf(k);
  if(i>=0&&curCmds[i]&&!curBtns[i].disabled){curCmds[i].run();renderPanel(false)}
});
window.addEventListener('keyup',e=>{keys[e.key]=false});
let idleIdx=0;
function selectIdle(){const idle=G.units.filter(u=>u.owner===0&&u.type==='villager'&&u.state==='idle');if(!idle.length){toast('쉬고 있는 일꾼이 없습니다');return}const u=idle[idleIdx++%idle.length];selectArr([u]);centerOn(u)}
$('#b-idle').onclick=()=>{if(G&&started)selectIdle()};
$('#b-army').onclick=()=>{if(!G||!started)return;const a=G.units.filter(u=>u.owner===0&&u.type!=='villager');if(!a.length){toast('군대가 없습니다. 병영에서 훈련하세요');return}selectArr(a)};
$('#b-pause').onclick=()=>togglePause();
$('#b-snd').onclick=()=>{audioInit();SFX.on=!SFX.on;sfxApply();sfxSave();if(SFX.on)play('cmd')};
window.addEventListener('pointerdown',()=>{if(SFX.ac&&SFX.ac.state==='suspended')SFX.ac.resume().catch(()=>{})},{capture:true});
$('#b-zin').onclick=()=>{if(G)setZoom(Z*1.2)};
$('#b-zout').onclick=()=>{if(G)setZoom(Z/1.2)};
