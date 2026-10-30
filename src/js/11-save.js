'use strict';
// ---------- save / load (this browser only) ----------
const SLOTS=['auto','1','2','3'],slotName=k=>k==='auto'?'자동 저장':'슬롯 '+k;
function storeGet(k){try{return localStorage.getItem('dawn.save.'+k)}catch(e){return null}}
function storeSet(k,v){try{localStorage.setItem('dawn.save.'+k,v);return true}catch(e){return false}}
function slotMeta(k){const v=storeGet(k);if(!v)return null;try{return JSON.parse(v).meta||null}catch(e){return null}}
const packBits=a=>{let o='';for(let i=0;i<a.length;i++)o+=a[i]?'1':'0';return o};
function serialize(){
  const id=o=>o&&!o.dead?o.id:null,P0=G.players[0];
  const goal=u=>u.state==='move'&&u.path.length?u.path[u.path.length-1]:null;
  return JSON.stringify({v:1,meta:{when:Date.now(),t:G.t,diff:(MTYPES[G.mtype]||MTYPES.grass).name+' · '+G.diff.name,age:AGE_N[P0.age],map:MAPS[MW]?MAPS[MW].name:'',np:G.np},
    v2:1,size:MW,np:G.np,opt:G.opt,team:G.team,aiDiff:G.aiDiff,mtype:G.mtype||'grass',starts:G.starts,road:packBits(G.road||new Uint8Array(N)),ais:G.ais,
    seed:G.seed,diffKey:G.diffKey,t:G.t,nid:G.nid,stats:G.stats,exp:packBits(G.exp),water:packBits(G.water),
    hist:G.hist||null,guide:G.guide||0,scn:G.scn||null,players:G.players.map(P=>({civ:P.civ||null,ageT:P.ageT||[],outT:P.outT,out:!!P.out,food:P.food,wood:P.wood,gold:P.gold,age:P.age,tech:[...P.tech],m:P.m,price:P.price})),
    groups:Object.fromEntries(Object.entries(G.groups).map(([k,a])=>[k,a.filter(o=>!o.dead).map(o=>o.id)])),
    res:G.res.filter(r=>!r.dead).map(r=>[r.id,r.sub,r.tx,r.ty,Math.round(r.amount*10)/10,r.max,+r.v.toFixed(3)]),
    blds:G.blds.filter(b=>!b.dead).map(b=>({id:b.id,type:b.type,owner:b.owner,tx:b.tx,ty:b.ty,hp:b.hp,built:b.built,queue:b.queue,qt:b.qt,cd:b.cd,food:b.food,repeat:b.repeat||null,rally:b.rally?{x:b.rally.x,y:b.rally.y,obj:id(b.rally.obj)}:null})),
    units:G.units.filter(u=>!u.dead).map(u=>({id:u.id,type:u.type,owner:u.owner,x:u.x,y:u.y,hp:u.hp,maxHp:u.maxHp,state:u.state,tgt:id(u.tgt),dropT:id(u.dropT),carry:u.carry,cd:u.cd,gtype:u.gtype,
      dest:u.dest||null,resume:u.resume||null,leash:u.leash||null,goal:goal(u),aggr:!!u.aggr,gspd:u.gspd||0,face:u.face,stance:u.stance||null,gar:id(u.gar),homeM:id(u.homeM),ta:id(u.ta),tb:id(u.tb),bell:u.bell?{state:u.bell.state,tgt:id(u.bell.tgt),gtype:u.bell.gtype}:null})),
    decals:G.decals.map(d=>[Math.round(d.x),Math.round(d.y),d.type,d.t>1e8?-1:Math.round(d.t),d.r||0]),
    cam:{x:cam.x,y:cam.y,z:Z}});
}
function deserialize(str){
  const S=JSON.parse(str);if(S.v!==1)throw new Error('version');
  const size=S.size||64,np=S.np||S.players.length;setMap(size);
  G={seed:S.seed,opt:S.opt||{diff:S.diffKey,size,np,layout:'ring',teams:'ffa'},np,saveT:60,priceT:10,t:S.t,nid:1,units:[],blds:[],res:[],proj:[],fx:[],pings:[],decals:[],
    block:new Array(N).fill(null),place:new Array(N).fill(null),vis:new Uint8Array(N),exp:new Uint8Array(N),water:new Uint8Array(N),road:new Uint8Array(N),
    players:Array.from({length:np},mkPlayer),groups:{},stats:S.stats,diff:DIFF[S.diffKey],diffKey:S.diffKey,visT:0,aiT:Array.from({length:np},(_,i)=>1+i*0.137),uiT:0,alertT:-99,over:false,
    team:S.team||Array.from({length:np},(_,i)=>100+i),ais:S.ais||[null,S.ai],aiDiff:S.aiDiff||Array.from({length:np},()=>S.diffKey),mtype:S.mtype||'grass',starts:S.starts||[{x:8.5,y:8.5},{x:55.5,y:55.5}]};
  if(S.road)for(let i=0;i<N;i++)G.road[i]=S.road.charCodeAt(i)===49?1:0;
  for(let i=0;i<N;i++){G.exp[i]=S.exp.charCodeAt(i)===49?1:0;if(S.water.charCodeAt(i)===49){G.water[i]=1;G.block[i]=WATER;G.place[i]=WATER}}
  G.hist=S.hist||null;G.guide=S.guide||0;G.scn=S.scn&&SCN_BY[S.scn.id]!==undefined?S.scn:null;
  S.players.forEach((q,i)=>{const P=G.players[i];Object.assign(P,{civ:q.civ||null,ageT:q.ageT||[],outT:q.outT,out:!!q.out,food:q.food,wood:q.wood,gold:q.gold,age:q.age,tech:new Set(q.tech),m:q.m,price:q.price||{food:100,wood:100}})});
  const byId=new Map();
  for(const [id,sub,tx,ty,amt,max,v] of S.res){const r=placeRes(sub,tx,ty,amt);if(!r)continue;r.id=id;r.max=max;r.v=v;byId.set(id,r)}
  for(const q of S.blds){const b=placeBld(q.type,q.owner,q.tx,q.ty,true);Object.assign(b,{repeat:q.repeat||null,id:q.id,hp:q.hp,built:q.built,queue:q.queue,qt:q.qt,cd:q.cd,food:q.food});b.rallyRaw=q.rally;byId.set(q.id,b)}
  for(const q of S.units){const u=spawnUnit(q.type,q.owner,q.x,q.y);Object.assign(u,{stance:q.stance||undefined,id:q.id,hp:q.hp,maxHp:q.maxHp,state:q.state,carry:q.carry,cd:q.cd,gtype:q.gtype,dest:q.dest,resume:q.resume,leash:q.leash,aggr:q.aggr,gspd:q.gspd,face:q.face});u.raw=q;byId.set(q.id,u)}
  const ref=i=>i==null?null:byId.get(i)||null;
  for(const b of G.blds){const r=b.rallyRaw;delete b.rallyRaw;b.rally=r?{x:r.x,y:r.y,obj:ref(r.obj)}:null}
  for(const u of G.units){const q=u.raw;delete u.raw;u.tgt=ref(q.tgt);u.dropT=ref(q.dropT);u.homeM=ref(q.homeM);u.ta=ref(q.ta);u.tb=ref(q.tb);
    if(q.bell)u.bell={state:q.bell.state,tgt:ref(q.bell.tgt),gtype:q.bell.gtype};
    const gb=ref(q.gar);if(gb){u.gar=gb;gb.garrison.push(u);u.state='garrison'}
    else if(u.state==='garrison')u.state='idle';
    if(u.state==='move'){if(q.goal)pathTo(u,null,q.goal.x,q.goal.y);else u.state='idle'}
    else if(u.state==='amove'&&u.dest)pathTo(u,null,u.dest.x,u.dest.y);}
  for(const k in S.groups)G.groups[k]=S.groups[k].map(ref).filter(Boolean);
  for(const [x,y,type,t,r] of S.decals)G.decals.push({x,y,type,t:t<0?1e9:t,r});
  G.nid=Math.max(S.nid,...[...byId.keys()].map(k=>k+1));
  bakeTerrain(S.seed);
  sel=[];placing=null;cmdMode=null;wallA=null;paused=false;started=true;overlay.hidden=true;$('#b-pause').textContent='일시정지';
  resize();computeVis();
  Z=S.cam.z||1;cam.x=S.cam.x;cam.y=S.cam.y;clampCam();
  sigCache='';qSig='';renderPanel(true);renderTop();
}
function saveTo(k){
  if(!G||G.over)return false;const ok=storeSet(k,serialize());
  if(k!=='auto'){toast(ok?slotName(k)+'에 저장했습니다':'저장하지 못했습니다. 브라우저 저장 공간을 확인하세요',!ok);if(ok)play('build')}
  return ok;
}
function loadFrom(k){
  const v=storeGet(k);if(!v){toast('저장된 게임이 없습니다',true);return false}
  try{deserialize(v);toast(slotName(k)+'을 불러왔습니다');return true}catch(e){console.error(e);toast('저장된 게임을 읽지 못했습니다',true);return false}
}
function slotRows(withSave){
  return SLOTS.filter(k=>withSave||slotMeta(k)).map(k=>{const m=slotMeta(k);
    const info=m?`${m.map?m.map+' · '+m.np+'부족 · ':''}${m.diff} · ${m.age} · ${fmtT(m.t)} 진행 · ${new Date(m.when).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`:'비어 있음';
    return`<div class="slot"><div class="slot-t"><b>${slotName(k)}</b><span>${info}</span></div><div class="slot-b">${withSave&&k!=='auto'?`<button class="ghost sm" data-save="${k}">저장</button>`:''}<button class="ghost sm" data-load="${k}" ${m?'':'disabled'}>불러오기</button></div></div>`}).join('');
}
const XFER_HTML=`<div class="xfer"><button class="ghost sm" id="x-copy" type="button">저장 코드 복사</button><label class="ghost sm filebtn">파일에서 불러오기<input type="file" id="x-file" accept=".json,.txt,application/json,text/plain" hidden></label></div>
<textarea id="x-code" rows="3" spellcheck="false" placeholder="다른 기기에서 복사한 저장 코드를 여기에 붙여넣으세요"></textarea>
<div class="row"><button class="ghost sm" id="x-load" type="button">코드로 불러오기</button></div>`;
function loadCode(txt){txt=(txt||'').trim();if(!txt){toast('저장 코드를 붙여넣으세요',true);return}
  try{audioInit();deserialize(txt);toast('저장 코드로 불러왔습니다')}catch(e){console.error(e);toast('저장 코드를 읽지 못했습니다. 코드 전체를 붙여넣었는지 확인하세요',true)}}
function wireXfer(root,canCopy){
  const ta=root.querySelector('#x-code'),cp=root.querySelector('#x-copy');
  if(cp){if(!canCopy)cp.remove();else cp.onclick=()=>{const code=serialize();
    const fallback=()=>{ta.value=code;ta.focus();ta.select();toast('복사가 막혀 있어 아래 칸에 코드를 넣었습니다. 전체 선택해 복사하세요')};
    try{navigator.clipboard.writeText(code).then(()=>toast('저장 코드를 복사했습니다. 메모장 등에 붙여넣어 보관하세요')).catch(fallback)}catch(e){fallback()}}}
  root.querySelector('#x-load').onclick=()=>loadCode(ta.value);
  root.querySelector('#x-file').onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>loadCode(String(r.result));r.onerror=()=>toast('파일을 읽지 못했습니다',true);r.readAsText(f)};
}
function wireSlots(root){
  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{if(saveTo(b.dataset.save)){const k=b.dataset.save;paused=true;togglePause(true)}});
  root.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{audioInit();loadFrom(b.dataset.load)});
}
