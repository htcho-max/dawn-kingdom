'use strict';
// ---------- campaign ----------
// Each mission sets up a normal game (newGame with fixed options), then adjusts it in
// setup(), shows goals in the guide panel, and decides win/lose in check().
const cB=(o,t)=>G.blds.filter(b=>b.owner===o&&!b.dead&&b.built>=1&&b.type===t).length;
const cU=(o,f)=>G.units.filter(u=>u.owner===o&&!u.dead&&(typeof f==='string'?u.type===f:f(u))).length;
const startOf=o=>G.starts[o];
function scnClearArea(cx,cy,r){for(const x of G.res)if(!x.dead&&Math.hypot(x.tx+.5-cx,x.ty+.5-cy)<r){x.dead=true;occupy(x,false)}}
function scnSpawnNear(type,o,b,n){const out=[];for(let i=0;i<n;i++){const q=freeAround(b,i+2);out.push(spawnUnit(type,o,q.x,q.y))}return out}
function scnMarch(units,tgt){const c=center(tgt);const sp=Math.min(...units.map(u=>UD[u.type].speed));for(const u of units){cmdAmove(u,c.x+(Math.random()-.5)*60,c.y+(Math.random()-.5)*60);u.gspd=sp}}
const tcOf=o=>G.blds.find(b=>b.owner===o&&b.type==='tc'&&!b.dead);
function scnBuildNear(type,o,tx,ty){const s=findSpot(type,tx,ty,o);return s?placeBld(type,o,s.x,s.y,true):null}

const SCN=[
  {id:'winter',name:'첫 겨울',civ:'farm',
    brief:'작은 마을이 겨울을 앞두고 있습니다. 일꾼을 늘리고 집과 병영을 지어 다가올 습격에 대비하세요. 이웃 부족은 아직 조용합니다.',
    opt:{size:64,np:2,mtype:'grass',layout:'ring',diffs:['easy','easy']},passive:[1],
    goals:[
      {t:'일꾼 10명',done:()=>cU(0,'villager')>=10},
      {t:'집 2채',done:()=>cB(0,'house')>=2},
      {t:'병영 짓기',done:()=>cB(0,'barracks')>=1},
      {t:'검사 5명 훈련',done:()=>cU(0,'militia')>=5},
      {t:'습격대 물리치기',show:S=>!!S.raid,done:S=>!!S.raid&&S.raid.every(id=>!G.units.some(u=>u.id===id&&!u.dead))},
    ],
    tick(S){if(S.raid){const me=G.blds.find(b=>b.owner===0&&!b.dead&&b.type==='tc')||G.blds.find(b=>b.owner===0&&!b.dead);const idle=G.units.filter(u=>S.raid.includes(u.id)&&!u.dead&&u.state==='idle');if(me&&idle.length)scnMarch(idle,me);return}const ready=SCN[0].goals.slice(0,4).every(g=>g.done(S));
      if(ready||G.t>600){const etc=tcOf(1),me=tcOf(0);if(!etc||!me)return;
        const us=scnSpawnNear('militia',1,etc,5).concat(scnSpawnNear('spearman',1,etc,ready?1:0));scnMarch(us,me);S.raid=us.map(u=>u.id);
        toast('붉은 부족의 습격대가 다가옵니다!',true);play('alert')}},
    check(S){return S.done.length>=SCN[0].goals.length?'win':null}},

  {id:'feudal',name:'봉건의 문턱',civ:'stone',
    brief:'바위산 성채족은 탑으로 땅을 지킵니다. 14분 안에 봉건 시대로 올라서고 감시탑 두 개를 세우세요. 이웃이 시험 삼아 공격해 올 것입니다.',
    opt:{size:64,np:2,mtype:'forest',layout:'ring',diffs:['easy','easy']},limit:840,
    goals:[
      {t:'봉건 시대 진입',done:()=>G.players[0].age>=1},
      {t:'감시탑 2개',done:()=>cB(0,'tower')>=2},
    ],
    check(S){if(S.done.length>=2)return'win';if(G.t>840)return'봉건 시대에 제때 들어서지 못했습니다.';return null}},

  {id:'hold',name:'성채를 지켜라',civ:'stone',
    brief:'두 부족이 손을 잡고 우리 성을 노립니다. 성과 성벽, 남은 군대로 12분을 버티세요. 공성 무기가 오면 기병으로 끊어 내세요.',
    opt:{size:96,np:3,mtype:'grass',layout:'ring',teamList:['solo','1','1'],diffs:['normal','normal','normal']},passive:[1,2],limit:720,
    goals:[{t:'12분 동안 마을회관 지키기',done:()=>G.t>=720}],
    setup(S){const P=G.players[0];P.age=2;P.tech.add('feudal');P.tech.add('castle');P.food=P.wood=900;P.gold=700;
      for(const o of [1,2]){G.players[o].age=2}
      const s=startOf(0),tc=tcOf(0);scnClearArea(s.x+4,s.y+4,5);
      scnBuildNear('castle',0,s.x+5,s.y+5);for(let i=0;i<5;i++)scnBuildNear('house',0,s.x-5+i*2,s.y-5);
      scnBuildNear('barracks',0,s.x-6,s.y+3);scnBuildNear('stable',0,s.x+3,s.y-7);scnBuildNear('blacksmith',0,s.x-3,s.y+6);
      scnBuildNear('tower',0,s.x+8,s.y);scnBuildNear('tower',0,s.x,s.y+8);
      scnSpawnNear('villager',0,tc,7);scnSpawnNear('longbow',0,tc,6);scnSpawnNear('spearman',0,tc,6);scnSpawnNear('knight',0,tc,4);
      S.next=70;S.k=0},
    tick(S){if(G.t<S.next)return;S.next+=95;S.k++;const k=S.k,me=tcOf(0);if(!me)return;
      for(const o of [1,2]){const etc=tcOf(o);if(!etc)continue;
        let us=scnSpawnNear('militia',o,etc,2+k).concat(scnSpawnNear('archer',o,etc,1+Math.floor(k/2)));
        if(k>=3)us=us.concat(scnSpawnNear('knight',o,etc,k-2));if(k>=4)us=us.concat(scnSpawnNear('ram',o,etc,1));
        scnMarch(us,me)}
      toast(k===1?'첫 공격대가 출발했습니다':'공격대 '+k+'진이 다가옵니다',true);play('alert')},
    check(S){return G.t>=720?'win':null}},

  {id:'raid',name:'기마 습격대',civ:'horse',noTc:true,
    brief:'마을 없이 기병만으로 적 땅 깊숙이 들어왔습니다. 12분 안에 적의 자원 창고 3곳을 불태우고 일꾼 10명을 쓰러뜨리세요. 마을회관과 탑의 화살 범위(약 7칸) 밖에서 싸우고, 창병은 궁기병으로 먼저 잡으세요.',
    opt:{size:64,np:2,mtype:'grass',layout:'ring',diffs:['easy','easy']},passive:[1],armyCap:{1:2},limit:720,
    goals:[
      {t:'적 자원 창고 3곳 파괴',done:S=>(S.drops||0)>=3},
      {t:'적 일꾼 10명 처치',done:S=>(S.vk||0)>=10},
    ],
    setup(S){const tc=tcOf(0),s=startOf(0);for(const u of G.units)if(u.owner===0){u.dead=true}G.units=G.units.filter(u=>!u.dead);tc.dead=true;occupy(tc,false);G.blds=G.blds.filter(b=>!b.dead);
      for(let i=0;i<14;i++){const t=i<6?'scout':i<11?'horsearcher':'knight';spawnUnit(t,0,(s.x+(i%5)-2)*T,(s.y+Math.floor(i/5)*1.4)*T)}
      const e=startOf(1),etc=tcOf(1),P=G.players[1];P.age=1;P.tech.add('feudal');P.wood+=400;
      // camps sit away from the town centre so they can be raided without facing its arrows
      const far=(rt,used)=>{let best=null,bd=1e9;for(const r of G.res){if(r.dead||r.rt!==rt||!exposed(r))continue;const d=Math.hypot(r.tx-e.x,r.ty-e.y);if(d<12||d>22)continue;if(used.some(q=>Math.hypot(q.tx-r.tx,q.ty-r.ty)<9))continue;const sc=Math.abs(d-15);if(sc<bd){bd=sc;best=r}}return best};
      const used=[];for(const rt of ['wood','gold','wood','gold']){if(used.length>=3)break;const r=far(rt,used);if(!r)continue;const b=scnBuildNear(rt==='wood'?'lumber':'mine',1,r.tx+(r.tx>e.x?-1:2),r.ty+(r.ty>e.y?-1:2));if(b){used.push(r);S.camps=(S.camps||[]).concat(b.id)}}
      if(used.length<3){const ber=nearestRes('food',e.x*T,e.y*T,16*T,'berry');if(ber)scnBuildNear('mill',1,ber.tx+1,ber.ty+1)}
      if(used[0])scnBuildNear('tower',1,used[0].tx+(used[0].tx>e.x?-3:3),used[0].ty+(used[0].ty>e.y?-3:3));
      scnBuildNear('house',1,e.x-4,e.y-4);scnBuildNear('house',1,e.x+4,e.y-4);scnBuildNear('barracks',1,e.x-5,e.y+3);
            scnSpawnNear('villager',1,etc,12);scnSpawnNear('spearman',1,etc,1);
      // send the new villagers out to the camps
      const vs=G.units.filter(u=>u.owner===1&&u.type==='villager');vs.forEach((v,i)=>{const r=used[i%Math.max(1,used.length)];if(r&&i<12)cmdGather(v,r)});
      S.drops=0;S.vk=0;centerIso(isoT(s.x,s.y));G.pings.push({x:e.x*T,y:e.y*T,t:8});setTimeout(()=>toast('적 마을은 미니맵에 깜빡이는 쪽에 있습니다'),1500)},
    onKill(S,o,src){if(!src||!ally(0,src.owner)||o.owner!==1)return;if(o.kind==='unit'&&o.type==='villager')S.vk++;if(o.kind==='bld'&&['lumber','mine','mill'].includes(o.type))S.drops++},
    check(S){if(S.done.length>=2)return'win';if(!G.units.some(u=>u.owner===0&&!u.dead))return'습격대가 모두 쓰러졌습니다.';if(G.t>720)return'시간 안에 임무를 마치지 못했습니다.';return null}},

  {id:'river',name:'강을 건너',civ:'trade',
    brief:'강 건너 두 부족이 동맹을 맺었습니다. 우리도 초록 부족과 손을 잡았습니다. 여울을 지키고, 동맹과 함께 적 마을회관 두 곳을 무너뜨리세요.',
    opt:{size:96,np:4,mtype:'river',layout:'ring',teamList:['0','0','1','1'],diffs:['normal','normal','normal','normal']},
    goals:[{t:'적 마을회관 2곳 파괴',done:()=>[2,3].every(o=>!tcOf(o))}],
    check(S){return null}},

  {id:'dawn',name:'새벽의 왕',civ:null,
    brief:'마지막 싸움입니다. 세 부족이 하나로 뭉쳐 섬들을 차지했습니다. 조금 더 큰 마을로 시작하니, 둑길을 장악하고 모두 무너뜨리세요.',
    opt:{size:96,np:4,mtype:'islands',layout:'ring',teamList:['solo','1','1','1'],diffs:['hard','hard','hard','hard']},
    goals:[{t:'적 마을회관 모두 파괴',done:()=>[1,2,3].every(o=>!tcOf(o))}],
    setup(S){const P=G.players[0];P.food+=300;P.wood+=300;P.gold+=200;scnSpawnNear('villager',0,tcOf(0),4)},
    check(S){return null}},
];
const SCN_BY=Object.fromEntries(SCN.map((m,i)=>[m.id,i]));
const scnDef=()=>G&&G.scn?SCN[SCN_BY[G.scn.id]]:null;
function campLoad(){try{return JSON.parse(localStorage.getItem('dawn.campaign')||'{}')}catch(e){return{}}}
function campSave(c){try{localStorage.setItem('dawn.campaign',JSON.stringify(c))}catch(e){}}
const campCleared=()=>campLoad().cleared||[];
const campOpen=i=>i===0||campCleared().includes(SCN[i-1].id)||campCleared().includes(SCN[i].id);
function startMission(i,civ){
  const m=SCN[i],np=m.opt.np;
  const opt=Object.assign({diff:'normal',teams:'custom'},m.opt,{teamList:m.opt.teamList||Array.from({length:np},()=>'solo'),
    civs:Array.from({length:np},(_,o)=>o===0?(m.civ||civ||'random'):'random'),scn:m.id});
  toastsEl.innerHTML='';overlay.hidden=true;started=true;newGame(opt);resize();
  toast('임무: '+m.name);
}
function scnInit(opt){
  const m=SCN[SCN_BY[opt.scn]];if(!m)return;
  G.scn={id:m.id,done:[]};
  for(const o of m.passive||[])if(G.ais[o])G.ais[o].noWave=true;
  for(const o in m.armyCap||{})if(G.ais[o])G.ais[o].armyCap=m.armyCap[o];
  if(m.setup)m.setup(G.scn);
  computeVis();
}
function scnCheck(){
  const m=scnDef();if(!m||G.over)return;const S=G.scn;
  if(m.tick)m.tick(S);
  m.goals.forEach((g,i)=>{if(!S.done.includes(i)&&(!g.show||g.show(S))&&g.done(S)){S.done.push(i);toast('목표 달성: '+g.t);play('research');guideSig=''}});
  const r=m.check(S);
  if(r==='win')endGame(true);else if(r)endGame(false,r);
}
function scnKill(o,src){const m=scnDef();if(m&&m.onKill)m.onKill(G.scn,o,src)}
function renderScnGuide(el){
  const m=scnDef(),S=G.scn;
  const left=m.limit?Math.max(0,m.limit-G.t):null;
  const sig='s'+S.done.join(',')+'|'+guideHidden+'|'+(left!==null?Math.ceil(left):'')+'|'+m.goals.filter(g=>!g.show||g.show(S)).length;
  if(sig===guideSig)return;guideSig=sig;
  el.className=guideHidden?'min':'';
  const vis=m.goals.map((g,i)=>[g,i]).filter(([g])=>!g.show||g.show(S));
  const timer=left!==null?`<div class="gtimer${left<60?' warn':''}">남은 시간 <b>${fmtT(left)}</b></div>`:'';
  el.innerHTML=guideHidden?`<button class="gbtn" id="g-open" aria-expanded="false">임무 · ${m.name}${left!==null?' · '+fmtT(left):''}</button>`
    :`<div class="ghead"><span>임무 ${SCN_BY[m.id]+1} · ${m.name}</span><button class="gx" id="g-close" aria-label="목표 접기">접기</button></div>${timer}
      <ul class="goals">${vis.map(([g,i])=>`<li class="${S.done.includes(i)?'ok':''}"><span aria-hidden="true">${S.done.includes(i)?'✓':'○'}</span>${g.t}${g.t==='적 자원 창고 3곳 파괴'?` (${S.drops||0}/3)`:g.t==='적 일꾼 10명 처치'?` (${S.vk||0}/10)`:''}</li>`).join('')}</ul>`;
  const set=v=>{guideHidden=v;try{localStorage.setItem('dawn.guideHidden',v?'1':'0')}catch(e){}guideSig=''};
  const o=$('#g-open'),c=$('#g-close');if(o)o.onclick=()=>set(false);if(c)c.onclick=()=>set(true);
}
function campaignHTML(){
  const cl=campCleared();
  return`<div class="camp">${SCN.map((m,i)=>{const open=campOpen(i),done=cl.includes(m.id);
    return`<div class="mis${done?' done':''}${open?'':' locked'}"><div class="mis-t"><b>${i+1}. ${m.name}</b>${done?'<span class="tag">완료</span>':''}${m.civ?`<span class="tag ghost">${CIV[m.civ].name}</span>`:''}</div>
      <p>${open?m.brief:'앞 임무를 마치면 열립니다.'}</p>${open?`<button class="go sm" data-mis="${i}">${done?'다시 하기':'시작'}</button>`:''}</div>`}).join('')}</div>`;
}
function wireCampaign(root){root.querySelectorAll('[data-mis]').forEach(b=>b.onclick=()=>{audioInit();startMission(+b.dataset.mis)})}
function campWin(){const m=scnDef();if(!m)return;const c=campLoad();c.cleared=[...new Set([...(c.cleared||[]),m.id])];c.best=c.best||{};c.best[m.id]=Math.min(c.best[m.id]||1e9,Math.round(G.t));campSave(c)}
