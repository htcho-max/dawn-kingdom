'use strict';
// ---------- UI ----------
const toastsEl=$('#toasts');let lastToast='',lastToastT=0;
function toast(msg,bad){
  const now=performance.now();if(msg===lastToast&&now-lastToastT<1500)return;lastToast=msg;lastToastT=now;
  if(bad&&/부족|없습니다|필요|수 없/.test(msg))play('error');
  const d=document.createElement('div');d.className='toast'+(bad?' bad':'');d.textContent=msg;toastsEl.appendChild(d);
  while(toastsEl.children.length>3)toastsEl.firstChild.remove();
  setTimeout(()=>d.remove(),2600);
}
const costHTML=c=>Object.keys(c).map(k=>`<span><i style="background:${RCOL[k]}"></i>${c[k]}</span>`).join('');
let sigCache='',curCmds=[],curBtns=[],qSig='';
function commandsFor(){
  const own=sel.filter(e=>e.owner===0);if(!own.length)return[];
  const P=G.players[0];
  if(own[0].kind==='bld'){
    const b=own[0];if(b.built<1)return[];const cmds=[];
    for(const t of BD[b.type].train||[]){const lock=UD[t].age>P.age;
      cmds.push({label:UD[t].name,cost:UD[t].cost,lock:lock?AGE_N[UD[t].age]:null,tip:UD[t].desc,run:()=>queueItem(b,t),ok:()=>!lock&&afford(0,UD[t].cost)&&b.queue.length<5})}
    {const tr=(BD[b.type].train||[]).filter(t=>UD[t].age<=P.age);
      if(tr.length)cmds.push({label:b.repeat?'반복: '+UD[b.repeat].name:'반복 생산',cost:{},on:!!b.repeat,tip:'대기열이 비면 같은 유닛을 자원이 허락하는 한 계속 만듭니다. 누를 때마다 다음 유닛으로 바뀌고, 마지막에 꺼집니다.',run:()=>{const i=b.repeat?tr.indexOf(b.repeat):-1;b.repeat=i+1<tr.length?tr[i+1]:null;renderPanel(true)},ok:()=>true})}
    for(const id in TD){const D=TD[id];if(D.at!==b.type)continue;const st=techState(0,id);if(st==='done'||st==='hidden')continue;
      cmds.push({label:D.name,cost:D.cost,tech:true,lock:st==='locked'?AGE_N[D.age]:st==='req'?'조건 부족':st==='queued'?'연구 중':null,
        tip:D.desc+(D.reqTxt?' 조건: '+D.reqTxt+'.':''),run:()=>queueItem(b,id),ok:()=>techState(0,id)==='ok'&&afford(0,D.cost)&&b.queue.length<5})}
    if(b.type==='market')for(const r of ['food','wood']){const pr=P.price[r],sp=Math.round(pr*0.7);
      cmds.push({label:RN[r]+' 사기',cost:{gold:pr},get:{[r]:100},tip:`금 ${pr}으로 ${RN[r]} 100을 삽니다. 살 때마다 값이 오릅니다.`,run:()=>trade(0,r,true),ok:()=>P.gold>=P.price[r]});
      cmds.push({label:RN[r]+' 팔기',cost:{[r]:100},get:{gold:sp},tip:`${RN[r]} 100을 팔아 금 ${sp}을 받습니다. 팔 때마다 값이 내려갑니다.`,run:()=>trade(0,r,false),ok:()=>P[r]>=100})}
    if(BD[b.type].gar){
      if(b.type==='tc')cmds.push({label:'종 울리기',cost:{},key:'B',tip:'근처 일꾼이 가까운 마을회관·감시탑으로 대피합니다. 안에 들어간 수만큼 화살이 늘어납니다.',run:()=>ringBell(0),ok:()=>true});
      cmds.push({label:'내보내기',cost:{},tip:b.type==='tc'?'모든 마을회관·감시탑에서 내보냅니다. 대피한 일꾼은 하던 일로 돌아갑니다.':'주둔한 유닛을 내보냅니다.',run:()=>{if(b.type==='tc')allClear(0);else ungarrison(b)},ok:()=>b.type==='tc'?G.blds.some(x=>x.owner===0&&x.garrison&&x.garrison.length):b.garrison.length>0});
    }
    return cmds;
  }
  const cmds=[];
  if(own.some(u=>u.type==='villager')){
    for(const t of BUILD_PAGES[buildPage]){const lock=BD[t].age>P.age;cmds.push({label:BD[t].name,cost:BD[t].cost,lock:lock?AGE_N[BD[t].age]:null,tip:BD[t].desc,run:()=>startPlace(t),ok:()=>!lock&&afford(0,BD[t].cost)})}
    const nav=(label,pg,tip)=>cmds.push({label,cost:{},nav:true,tip,run:()=>{buildPage=pg;renderPanel(true)},ok:()=>true});
    if(buildPage===0)nav('군사 ▸',1,'병영·대장간·마구간·공성 작업장');
    if(buildPage===1){nav('방어 ▸',2,'감시탑·성벽·성문·성');nav('◂ 경제',0,'집·농장·자원 건물·시장')}
    if(buildPage===2)nav('◂ 군사',1,'병영·대장간·마구간·공성 작업장');
  }
  if(own.some(u=>['inf','arch'].includes(UD[u.type].cls)))cmds.push({label:'주둔',cost:{},key:'G',tip:'마을회관·감시탑에 들어가 화살을 늘리고 체력을 회복합니다.',run:startGarrison,ok:()=>true});
  if(own.some(u=>u.type!=='villager'&&!UD[u.type].noAtk))cmds.push({label:'공격 이동',cost:{},key:'A',tip:'지정한 곳으로 가면서 만나는 적과 싸웁니다.',run:startAmove,ok:()=>true});
  const milU=own.filter(u=>u.kind==='unit'&&u.type!=='villager'&&!UD[u.type].noAtk);
  if(milU.length&&!own.some(u=>u.type==='villager'))for(const [k,l,tip] of [['aggr','공격적','보이는 적을 끝까지 쫓아갑니다 (기본)'],['def','방어적','가까운 적만 상대하고 원래 자리로 돌아옵니다'],['hold','제자리','움직이지 않고 사거리 안의 적만 공격합니다']])
    cmds.push({label:l,cost:{},on:milU.every(u=>(u.stance||'aggr')===k),tip,run:()=>{milU.forEach(u=>{u.stance=k==='aggr'?undefined:k});renderPanel(true)},ok:()=>true});
  cmds.push({label:'정지',cost:{},tip:'하던 일을 멈춥니다.',run:()=>own.forEach(stopU),ok:()=>true});
  return cmds;
}
function renderQueue(e){
  const q=$('#qrow');
  if(!e||e.kind!=='bld'||e.owner!==0||!e.queue||!e.queue.length){if(qSig!==''){q.innerHTML='';qSig=''}return}
  const sig=e.id+':'+e.queue.join(',');
  if(sig!==qSig){qSig=sig;q.innerHTML='';
    e.queue.forEach((it,i)=>{const b=document.createElement('button');b.className='qi';b.title='클릭하면 취소하고 자원을 돌려받습니다';
      b.innerHTML=(TD[it]?TD[it].name:UD[it].name)+(i===0?'<span class="pr"></span>':'');b.onclick=()=>{cancelQueue(e,i);renderPanel(true)};q.appendChild(b)});
    const hint=document.createElement('span');hint.className='sub';hint.id='qhint';q.appendChild(hint);}
  const it=e.queue[0],need=TD[it]?TD[it].time:UD[it].time,pr=q.querySelector('.pr');if(pr)pr.style.width=Math.min(100,e.qt/need*100)+'%';
  const h=$('#qhint');if(h){h.textContent=e.blocked?'인구 한도 — 집이 필요합니다':'';h.style.color='var(--bad)'}
}
function renderPanel(force){
  if(!G)return;
  const P=G.players[0];
  const e0=sel[0];
  const sig=sel.map(e=>e.id+(e.built<1?'f':'')).join(',')+'|'+buildPage+'|'+P.age+'|'+P.tech.size+'|'+(e0&&e0.queue?e0.queue.join(','):'')+'|'+P.price.food+','+P.price.wood+'|'+(e0&&e0.garrison?e0.garrison.length:'')+'|'+(e0&&e0.repeat||'');
  const cmdsEl=$('#cmds');
  if(force||sig!==sigCache){
    sigCache=sig;curCmds=commandsFor();cmdsEl.innerHTML='';curBtns=[];
    curCmds.forEach((c,i)=>{const b=document.createElement('button');b.className='cmd'+(c.tech?' tech':'')+(c.nav?' nav':'')+(c.on?' on':'');if(c.on)b.setAttribute('aria-pressed','true');b.title=c.tip||'';
      b.innerHTML=`<span class="k">${c.key||KEYS[i]||''}</span><span class="n">${c.label}</span><span class="c">${c.lock?`<span class="lock">${c.lock}</span>`:costHTML(c.cost)+(c.get?'<span class="get">→</span>'+costHTML(c.get):'')}</span>`;
      let lpT=0;b.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;b._sup=false;lpT=setTimeout(()=>{b._sup=true;toast(tt(c.label+' — '+(c.tip||'')))},450)});
      ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(lpT)));
      b.onclick=()=>{if(b._sup){b._sup=false;return}c.run();renderPanel(false)};cmdsEl.appendChild(b);curBtns.push(b)});
  }
  curCmds.forEach((c,i)=>{curBtns[i].disabled=!c.ok()});
  const info=$('#info-main');
  renderQueue(sel.length===1?e0:null);
  if(!sel.length){info.innerHTML=tt(`<h3>새벽의 왕국</h3><div class="sub">일꾼을 선택하고 나무·열매·금광을 우클릭해 자원을 모으세요. 드래그로 여러 유닛을 고르고, 적을 우클릭하면 공격합니다.</div><div class="stats"><span>지형 <b>${(MTYPES[G.mtype]||MTYPES.grass).name}</b></span><span>시대 <b>${AGE_N[P.age]}</b></span><span>목표 <b>${G.team.some((t,o)=>o&&ally(0,o))?'상대 팀':'다른 부족'} 마을회관 모두 파괴</b></span></div><div class="roster">${G.players.map((q,o)=>`<span class="chip${q.out?' out':''}"><i class="dot" style="background:${OWN[o].c}"></i>${nameOf(o)}${teamTag(o)?' · '+teamTag(o):''}${o?' · '+DIFF[G.aiDiff[o]].name:''} · ${q.out?'멸망':AGE_N[q.age].replace(' 시대','')}</span>`).join('')}</div>`);return}
  const e=e0;
  if(sel.length>1){
    const g={};for(const u of sel)g[u.type]=(g[u.type]||0)+1;
    info.innerHTML=tt(`<h3>${sel.length}개 ${sel[0].kind==='unit'?'유닛':'건물'}</h3><div class="groups">${Object.keys(g).map(k=>`<span class="chip">${(UD[k]||BD[k]).name} × ${g[k]}</span>`).join('')}</div><div class="sub">우클릭으로 이동, 적을 우클릭하면 공격, A를 누르고 클릭하면 공격 이동합니다.</div>`);return;
  }
  const own=e.owner===0||e.owner===undefined?'':` <span class="sub"><i class="dot" style="background:${OWN[e.owner].c}"></i>${nameOf(e.owner)}${ally(0,e.owner)?' · 동맹':teamTag(e.owner)?' · '+teamTag(e.owner):''}</span>`;
  if(e.kind==='res'){info.innerHTML=tt(`<h3>${SUBN[e.sub]}</h3><div class="stats"><span>${RN[e.rt]} <b>${Math.ceil(e.amount)}</b> 남음</span></div><div class="sub">일꾼을 선택한 뒤 우클릭하면 채집합니다.</div>`);return}
  if(e.kind==='unit'){
    const D=UD[e.type],a=armOf(e);const st={idle:'대기 중',move:'이동 중',amove:'공격 이동 중',attack:'전투 중',gather:'채집 중: '+(RN[e.gtype]||''),return:'자원 운반 중',build:'건설 중',enter:'주둔하러 가는 중',trade:'교역 중'}[e.state];
    const bon=D.bonus?Object.keys(D.bonus).map(k=>CLS_N[k]+' +'+D.bonus[k]).join(', '):'';
    const atk=D.noAtk?'없음':D.siege?`건물 ${D.siege}`:atkOf(e)+(D.at==='p'?' (원거리)':'');
    info.innerHTML=tt(`<h3>${D.name}${own}</h3><div class="hpbar"><b style="width:${e.hp/e.maxHp*100}%"></b></div><div class="stats"><span>체력 <b>${Math.ceil(e.hp)}/${e.maxHp}</b></span><span>공격 <b>${atk}</b></span><span>방어 <b>${a[0]}/${a[1]}</b></span><span>사거리 <b>${D.at==='p'?rangeOf(e):'근접'}</b></span>${bon?`<span>추가 피해 <b>${bon}</b></span>`:''}${e.carry.n>0?`<span>운반 <b>${Math.floor(e.carry.n)} ${RN[e.carry.t]}</b></span>`:''}</div><div class="sub">${st} · ${D.desc}</div>`);return;
  }
  const D=BD[e.type];
  let extra='';
  if(e.built<1)extra=`<div class="sub">건설 ${Math.floor(e.built*100)}% · 일꾼으로 우클릭하면 함께 짓습니다.</div>`;
  else if(e.type==='farm')extra=`<div class="stats"><span>식량 <b>${Math.ceil(e.food)}</b> 남음</span></div>`;
  if(D.gar&&e.built>=1)extra+=`<div class="stats"><span>주둔 <b>${e.garrison.length}/${D.gar}</b></span><span>화살 <b>${1+e.garrison.length}발</b></span></div>`;
  if(D.atk&&!(D.gar&&e.built>=1))extra+=`<div class="stats"><span>공격 <b>${D.atk.dmg+G.players[e.owner].m.patk}</b></span><span>사거리 <b>${D.atk.range+G.players[e.owner].m.prng}</b></span></div>`;
  info.innerHTML=tt(`<h3>${D.name}${own}</h3><div class="hpbar"><b style="width:${e.hp/e.maxHp*100}%"></b></div><div class="stats"><span>체력 <b>${Math.ceil(e.hp)}/${e.maxHp}</b></span></div>${extra}<div class="sub">${D.desc}${e.owner===0&&D.train&&e.built>=1?' 우클릭으로 집결지를 정합니다.':''}${e.owner===0&&e.queue&&e.queue.length?' 대기열을 클릭하면 취소됩니다.':''}</div>`);
}
function renderTop(){
  const P=G.players[0];
  for(const k of ['food','wood','gold'])$('#r-'+k+' b').textContent=Math.floor(P[k]);
  const pop=popOf(0),cap=capOf(0);$('#r-pop b').textContent=pop+'/'+cap;$('#r-pop').classList.toggle('warn',pop>=cap);
  $('#clock').textContent=fmtT(G.t);
  const idle=G.units.filter(u=>u.owner===0&&u.type==='villager'&&u.state==='idle').length;$('#idle-n').textContent=idle;$('#b-idle').classList.toggle('alert',idle>0&&G.t>20);
  renderGuide();if(touchUI)syncTbar();
  let at=AGE_N[P.age];
  for(const b of G.blds)if(b.owner===0&&b.queue[0]&&TD[b.queue[0]]&&TD[b.queue[0]].ageUp){at+=' → '+TD[b.queue[0]].name+' '+Math.floor(b.qt/TD[b.queue[0]].time*100)+'%';break}
  $('#age').textContent=at;
}

// ---------- objectives guide ----------
const gCnt=t=>G.blds.filter(b=>b.owner===0&&!b.dead&&b.built>=1&&b.type===t).length;
const gVil=()=>G.units.filter(u=>u.owner===0&&u.type==='villager').length;
const gArmy=()=>G.units.filter(u=>u.owner===0&&u.type!=='villager'&&!UD[u.type].noAtk).length;
const GUIDE=[
  {t:'일꾼 셋에게 일 시키기',h:'일꾼을 고르고 나무·열매·금광을 우클릭하세요. 드래그하면 여럿을 한 번에 고릅니다.',done:()=>{const v=G.units.filter(u=>u.owner===0&&u.type==='villager');return v.length>=3&&v.every(u=>u.state!=='idle')}},
  {t:'집 짓기',h:'일꾼을 고르고 아래 명령에서 집을 누른 뒤 땅을 클릭하세요. 집 하나에 인구 +5.',done:()=>gCnt('house')>=1},
  {t:'일꾼 8명으로 늘리기',h:'마을회관(H)에서 일꾼을 만드세요. "반복 생산"을 켜 두면 계속 만들고, 새 일꾼은 알아서 일하러 갑니다.',done:()=>gVil()>=8},
  {t:'벌목소와 방앗간 짓기',h:'숲과 열매 바로 옆에 지으면 나르는 거리가 줄어 채집이 빨라집니다.',done:()=>gCnt('lumber')>=1&&gCnt('mill')>=1},
  {t:'병영 짓기',h:'첫 공격은 보통 5분쯤 옵니다. 군사 페이지에서 병영을 지으세요.',done:()=>gCnt('barracks')>=1},
  {t:'봉건 시대로 발전',h:'마을회관에서 봉건 시대를 연구하세요. 식량 400, 벌목소·방앗간·채광소·병영 중 2종이 필요합니다.',done:()=>G.players[0].age>=1},
  {t:'군대 10명 모으기',h:'적 유닛에 마우스를 올리거나 길게 누르면 내 군대가 유리한지 알려 줍니다. 창병은 기병에, 궁수는 보병에 강합니다.',done:()=>gArmy()>=10},
  {t:'대장간에서 연구하기',h:'공격·방어 연구는 이미 있는 유닛에도 바로 적용됩니다.',done:()=>['forging','fletching','scaleMail','scaleBarding','paddedArcher'].some(k=>G.players[0].tech.has(k))},
  {t:'성주 시대로 발전',h:'대장간·마구간·감시탑 중 2종을 짓고 마을회관에서 연구하세요. 기사·충차·성이 열립니다.',done:()=>G.players[0].age>=2},
  {t:'적 마을회관 무너뜨리기',h:'충차와 투석기는 건물에 강합니다. 공격 이동(A)으로 진군하세요.',done:()=>false},
];
let guideHidden=null,guideSig='';
function renderGuide(){
  const el=$('#guide');if(!G||!started||G.over){el.hidden=true;return}
  if(guideHidden===null){try{const v=localStorage.getItem('dawn.guideHidden');guideHidden=v===null?W<720:v==='1'}catch(e){guideHidden=W<720}}
  G.guide=G.guide||0;
  while(G.guide<GUIDE.length-1&&GUIDE[G.guide].done()){toast('목표 달성: '+GUIDE[G.guide].t);play('research');G.guide++}
  el.hidden=false;el.style.top=(topH+10)+'px';
  const sig=G.guide+'|'+guideHidden;if(sig===guideSig)return;guideSig=sig;
  const g=GUIDE[G.guide],n=GUIDE.length;
  el.className=guideHidden?'min':'';
  el.innerHTML=guideHidden?`<button class="gbtn" id="g-open" aria-expanded="false">목표 ${G.guide+1}/${n} · ${g.t}</button>`
    :`<div class="ghead"><span>목표 ${G.guide+1}/${n}</span><button class="gx" id="g-close" aria-label="목표 접기">접기</button></div><div class="gbar"><b style="width:${G.guide/(n-1)*100}%"></b></div><h4>${g.t}</h4><p>${tt(g.h)}</p>${G.guide+1<n?`<div class="gnext">다음: ${GUIDE[G.guide+1].t}</div>`:''}`;
  const set=v=>{guideHidden=v;try{localStorage.setItem('dawn.guideHidden',v?'1':'0')}catch(e){}renderGuide()};
  const o=$('#g-open'),c=$('#g-close');if(o)o.onclick=()=>set(false);if(c)c.onclick=()=>set(true);
}
