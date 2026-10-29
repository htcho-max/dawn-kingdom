'use strict';
// ---------- screens ----------
const overlay=$('#overlay');
const HELP=`<dl class="help">
<dt>좌클릭 · 드래그</dt><dd>유닛·건물 선택 (Shift로 추가)</dd>
<dt>우클릭</dt><dd>이동 · 채집 · 건설 · 공격 · 집결지 지정</dd>
<dt>방향키 · 미니맵 · 가장자리</dt><dd>시야 이동 (가운데 버튼 드래그도 가능)</dd>
<dt>휠 · + / −</dt><dd>확대·축소 (터치는 두 손가락)</dd>
<dt>Q W E R T Y U I O</dt><dd>명령 패널 단축키</dd>
<dt>A</dt><dd>공격 이동: 가는 길의 적과 싸우며 이동</dd>
<dt>Ctrl(또는 Shift)+1~9 / 1~9</dt><dd>부대 지정 / 부대 선택 (두 번 누르면 이동)</dd>
<dt>더블클릭</dt><dd>화면 안의 같은 종류 유닛 모두 선택</dd>
<dt>G / 우클릭</dt><dd>마을회관·감시탑·성에 주둔 (마을회관의 종으로 일꾼 대피)</dd>
<dt>교역 수레 → 시장 우클릭</dt><dd>두 시장을 오가며 금을 벌어 옵니다</dd>
<dt>H / . / P / B</dt><dd>마을회관 / 쉬는 일꾼 / 일시정지 / 종 울리기</dd>
<dt>터치 · 탭</dt><dd>선택 / 선택한 뒤 땅·적·자원을 탭하면 이동·공격·채집 / 두 번 탭하면 같은 종류</dd>
<dt>터치 · 끌기</dt><dd>한 손가락 시야 이동, 두 손가락 확대·이동, 길게 누른 뒤 끌면 범위 선택</dd>
<dt>터치 · 길게 누르기</dt><dd>적 위: 상성 보기 / 빈 땅: 공격 이동 / 내 유닛: 같은 종류 / 명령 버튼: 설명</dd>
<dt>터치 · 오른쪽 도구</dt><dd>범위 선택, 같은 종류, 마을회관, 부대 1~4 (탭 불러오기 · 길게 눌러 지정)</dd>
</dl>`;
function showStart(){
  started=false;overlay.hidden=false;
  overlay.innerHTML=`<div class="card">
  <h1>새벽의 왕국</h1>
  <p class="lede">땅과 부족을 정하고, 일꾼 셋과 마을회관 하나로 시작합니다. 자원을 모아 시대를 발전시키고, 상성을 맞춘 군대로 적 부족의 마을회관을 모두 무너뜨리세요. 컴퓨터 부족들도 같은 방식으로 성장하며 가까운 적부터 공격합니다.</p>
  <h2>땅</h2>
  <div class="diff" id="opt-size">
    <label><input type="radio" name="sz" value="64">작은 땅<small>64×64 · 최대 4부족</small></label>
    <label><input type="radio" name="sz" value="96">넓은 땅<small>96×96 · 최대 6부족</small></label>
    <label><input type="radio" name="sz" value="128">광대한 땅<small>128×128 · 최대 8부족</small></label>
  </div>
  <div class="setrow">
    <label class="field">지형<select id="opt-mtype">${Object.entries(MTYPES).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')}</select></label>
    <label class="field">시작 위치<select id="opt-layout"><option value="ring">둥글게 고르게</option><option value="scatter">흩어져 무작위</option></select></label>
  </div>
  <p class="note" id="mtype-desc"></p>
  <h2>부족</h2>
  <div class="setrow">
    <label class="field">부족 수<select id="opt-np"></select></label>
    <label class="field">외교<select id="opt-teams"><option value="ffa">모두 적</option><option value="two">두 팀으로 나눔</option><option value="alone">나 혼자 대 모두</option><option value="custom">직접 정하기</option></select></label>
    <label class="field">기본 난이도<select id="opt-diff"><option value="easy">쉬움 · 첫 공격 약 8분</option><option value="normal">보통 · 첫 공격 약 5분</option><option value="hard">어려움 · 빠른 확장</option></select></label>
  </div>
  <div class="tribes" id="tribes" role="table" aria-label="부족별 팀과 난이도"></div>
  <p class="note" id="team-warn" hidden></p>
  <h2>조작</h2>${HELP}
  ${SLOTS.some(k=>slotMeta(k))?`<h2>이어하기</h2><div class="slots">${slotRows(false)}</div>`:''}
  <details class="xd"><summary>저장 코드로 불러오기</summary>${XFER_HTML}</details>
  <div class="row"><button class="go" id="go">전투 시작</button></div></div>`;
  wireSlots(overlay);wireXfer(overlay,false);
  let pref={size:64,np:2,layout:'ring',teams:'ffa',diff:'normal',mtype:'grass',teamList:[],diffs:[]};try{Object.assign(pref,JSON.parse(localStorage.getItem('dawn.setup')||'{}'))}catch(e){}
  const szIn=[...overlay.querySelectorAll('input[name=sz]')],npSel=$('#opt-np'),tmSel=$('#opt-teams'),dfSel=$('#opt-diff'),mtSel=$('#opt-mtype'),tb=$('#tribes');
  let teamList=(pref.teamList||[]).slice(),diffs=(pref.diffs||[]).slice();
  const curSize=()=>+(szIn.find(i=>i.checked)||szIn[0]).value;
  const fillNp=()=>{const mx=MAPS[curSize()].max,cur=Math.min(mx,+npSel.value||pref.np);npSel.innerHTML='';for(let n=2;n<=mx;n++)npSel.insertAdjacentHTML('beforeend',`<option value="${n}"${n===cur?' selected':''}>${n}부족 (나 + 컴퓨터 ${n-1})</option>`)};
  const preset=()=>{const np=+npSel.value,m=tmSel.value;if(m==='custom')return;
    teamList=Array.from({length:np},(_,i)=>m==='two'?String(i<Math.ceil(np/2)?0:1):m==='alone'?String(i?1:0):'solo')};
  const sides=()=>{const np=+npSel.value,set=new Set();for(let i=0;i<np;i++){const t=teamList[i];set.add(t===undefined||t==='solo'?'s'+i:'t'+t)}return set.size};
  const renderTribes=()=>{const np=+npSel.value;
    for(let i=0;i<np;i++){if(teamList[i]===undefined)teamList[i]='solo';if(!diffs[i])diffs[i]=dfSel.value}
    tb.innerHTML=`<div class="trow th" role="row"><span role="columnheader">부족</span><span role="columnheader">팀</span><span role="columnheader">난이도</span></div>`+
      Array.from({length:np},(_,i)=>`<div class="trow" role="row"><span class="tname" role="cell"><i class="dot" style="background:${OWN[i].c}"></i>${i?OWN[i].name:'나 (파란 부족)'}</span>
      <select role="cell" data-team="${i}" aria-label="${nameOf(i)} 팀"><option value="solo">혼자</option>${TEAM_N.map((t,k)=>`<option value="${k}">${t}</option>`).join('')}</select>
      ${i?`<select role="cell" data-diff="${i}" aria-label="${nameOf(i)} 난이도"><option value="easy">쉬움</option><option value="normal">보통</option><option value="hard">어려움</option></select>`:'<span class="sub" role="cell">플레이어</span>'}</div>`).join('');
    tb.querySelectorAll('[data-team]').forEach(e=>{e.value=teamList[+e.dataset.team];e.onchange=()=>{teamList[+e.dataset.team]=e.value;tmSel.value='custom';warn()}});
    tb.querySelectorAll('[data-diff]').forEach(e=>{e.value=diffs[+e.dataset.diff];e.onchange=()=>{diffs[+e.dataset.diff]=e.value}});
    warn()};
  const warn=()=>{const w=$('#team-warn'),ok=sides()>=2;w.hidden=ok;w.textContent=ok?'':'모든 부족이 같은 팀입니다. 적어도 두 편으로 나눠 주세요.';$('#go').disabled=!ok};
  (szIn.find(i=>+i.value===+pref.size)||szIn[0]).checked=true;fillNp();npSel.value=String(Math.min(pref.np,MAPS[curSize()].max));
  $('#opt-layout').value=pref.layout;tmSel.value=pref.teams;dfSel.value=pref.diff;mtSel.value=MTYPES[pref.mtype]?pref.mtype:'grass';
  const mdesc=()=>{$('#mtype-desc').textContent=MTYPES[mtSel.value].desc};mdesc();mtSel.onchange=mdesc;
  if(tmSel.value!=='custom')preset();renderTribes();
  szIn.forEach(i=>i.onchange=()=>{fillNp();preset();renderTribes()});
  npSel.onchange=()=>{preset();renderTribes()};
  tmSel.onchange=()=>{preset();renderTribes()};
  dfSel.onchange=()=>{diffs=diffs.map(()=>dfSel.value);renderTribes()};
  $('#go').onclick=()=>{if(sides()<2)return;audioInit();const np=+npSel.value;
    const opt={diff:dfSel.value,size:curSize(),np,layout:$('#opt-layout').value,teams:tmSel.value,mtype:mtSel.value,teamList:teamList.slice(0,np),diffs:diffs.slice(0,np)};
    try{localStorage.setItem('dawn.setup',JSON.stringify(opt))}catch(e){}
    overlay.hidden=true;started=true;newGame(opt);resize();toast('왼쪽 위 목표를 따라가 보세요.')};
}
function togglePause(refresh){
  if(!G||!started||G.over)return;if(!refresh)paused=!paused;
  $('#b-pause').textContent=paused?'계속하기':'일시정지';
  if(paused){overlay.hidden=false;overlay.innerHTML=`<div class="card"><h1>일시정지</h1>
    <h2>저장 · 불러오기</h2><div class="slots">${slotRows(true)}</div><p class="note">저장은 이 브라우저에만 남습니다. 1분마다 자동 저장됩니다.</p>
    <h2>다른 기기로 옮기기</h2>${XFER_HTML}
    <h2>조작</h2><div class="setrow"><label class="field">터치 조작<select id="touch-pref"><option value="auto">자동 (터치 기기에서 켬)</option><option value="on">항상 켜기</option><option value="off">끄기</option></select></label></div>
    <h2>소리</h2><div class="sound"><label><input type="checkbox" id="snd-on" ${SFX.on?'checked':''}> 효과음</label><input type="range" id="snd-vol" min="0" max="1" step="0.05" value="${SFX.vol}" aria-label="음량"></div>
    <h2>조작</h2>${HELP}<div class="row"><button class="go" id="resume">계속하기</button><button class="ghost" id="quit">처음 화면으로</button></div></div>`;
    wireSlots(overlay);wireXfer(overlay,true);
    $('#touch-pref').value=touchPref;$('#touch-pref').onchange=e=>{touchPref=e.target.value;try{localStorage.setItem('dawn.touch',touchPref)}catch(_){}applyTouch()};
    $('#snd-on').onchange=e=>{SFX.on=e.target.checked;audioInit();sfxApply();sfxSave()};
    $('#snd-vol').oninput=e=>{SFX.vol=+e.target.value;sfxApply();sfxSave()};
    $('#resume').onclick=()=>togglePause();$('#quit').onclick=()=>{saveTo('auto');paused=false;$('#b-pause').textContent='일시정지';G=null;showStart()}}
  else overlay.hidden=true;
}
function endGame(win){
  if(G.over)return;G.over=true;placing=null;play(win?'win':'lose');recordHist();
  const s0=G.stats[0];$('#hint').hidden=true;$('#guide').hidden=true;
  setTimeout(()=>{overlay.hidden=false;toastsEl.innerHTML='';
    const rows=G.players.map((P,o)=>{const st=G.stats[o],at=P.ageT||[];
      const res=P.out?`멸망 ${fmtT(P.outT||G.t)}`:(ally(0,o)?(win?'승리':'패배'):(win?'—':'승리'));
      return`<tr${o===0?' class="me"':''}><th scope="row"><i class="dot" style="background:${OWN[o].c}"></i>${nameOf(o)}${teamTag(o)?` <small>${teamTag(o)}</small>`:''}</th><td>${res}</td><td>${at[1]!==undefined?fmtT(at[1]):'—'}</td><td>${at[2]!==undefined?fmtT(at[2]):'—'}</td><td>${st.kills}</td><td>${st.lost}</td><td>${st.gathered.toLocaleString('ko-KR')}</td><td>${st.trained}</td></tr>`}).join('');
    overlay.innerHTML=`<div class="card wide"><h1>${win?'승리':'패배'}</h1><p class="lede">${win?(G.np>2?'마지막 경쟁 부족까지 무너졌습니다. ':'적 마을회관이 무너졌습니다. ')+'이 땅은 이제 당신의 왕국입니다.':'마을회관을 잃었습니다. 아래 기록에서 군대와 경제가 어디서 벌어졌는지 확인해 보세요.'}</p>
    <div class="endstats"><div>경과 시간<b>${fmtT(G.t)}</b></div><div>모은 자원<b>${s0.gathered.toLocaleString('ko-KR')}</b></div><div>생산한 유닛<b>${s0.trained}</b></div><div>처치<b>${s0.kills}</b></div><div>잃은 유닛·건물<b>${s0.lost}</b></div></div>
    <h2>흐름</h2>
    <div class="tabs" role="tablist" aria-label="그래프 지표"><button role="tab" data-m="army" aria-selected="true">군대 규모</button><button role="tab" data-m="vil" aria-selected="false">일꾼 수</button><button role="tab" data-m="res" aria-selected="false">모은 자원 (누적)</button></div>
    <div class="chartbox"><div id="chart"></div><div id="ctip" class="ctip" hidden></div></div>
    <div class="legend">${G.players.map((P,o)=>`<span><svg width="22" height="8" aria-hidden="true"><line x1="1" y1="4" x2="21" y2="4" stroke="${OWN[o].c}" stroke-width="${o?2:3}" stroke-dasharray="${DASH[o]}"/></svg>${nameOf(o)}</span>`).join('')}</div>
    <h2>부족별 기록</h2>
    <div class="tblwrap"><table class="rtable"><thead><tr><th scope="col">부족</th><th scope="col">결과</th><th scope="col">봉건</th><th scope="col">성주</th><th scope="col">처치</th><th scope="col">잃음</th><th scope="col">모은 자원</th><th scope="col">생산</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="row"><button class="go" id="again">다시 하기</button></div></div>`;
    $('#again').onclick=()=>{G=null;showStart()};
    let metric='army';const tabs=[...overlay.querySelectorAll('.tabs button')];
    tabs.forEach(t=>t.onclick=()=>{metric=t.dataset.m;tabs.forEach(x=>x.setAttribute('aria-selected',x===t?'true':'false'));drawChart(metric)});
    drawChart(metric);
  },900);
}
const DASH=['','7 3','2 3','9 3 2 3','4 4','1 3','12 4','6 2 2 2'];
function niceMax(v){if(v<=5)return 5;const e=Math.pow(10,Math.floor(Math.log10(v))),m=v/e;return(m<=1?1:m<=2?2:m<=5?5:10)*e}
function drawChart(metric){
  const box=$('#chart'),tip=$('#ctip'),H0=G.hist;if(!box||!H0||!H0.t.length)return;
  const Wc=Math.max(280,box.clientWidth),Hc=230,ml=44,mr=Math.min(96,Wc*0.22),mt=12,mb=28,pw=Wc-ml-mr,ph=Hc-mt-mb;
  const ts=H0.t,data=H0[metric],maxT=Math.max(10,ts[ts.length-1]),maxV=niceMax(Math.max(1,...data.flat()));
  const X=t=>ml+t/maxT*pw,Y=v=>mt+ph-v/maxV*ph,fmtV=v=>metric==='res'?(v>=1000?(v/1000).toFixed(v>=10000?0:1)+'천':String(v)):String(v);
  let svg=`<svg width="${Wc}" height="${Hc}" role="img" aria-label="${{army:'군대 규모',vil:'일꾼 수',res:'모은 자원'}[metric]} 시간 흐름">`;
  for(let i=0;i<=4;i++){const v=maxV*i/4,y=Y(v);svg+=`<line x1="${ml}" x2="${ml+pw}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1" opacity=".6"/><text x="${ml-6}" y="${y+4}" text-anchor="end" class="ax">${fmtV(Math.round(v))}</text>`}
  const step=maxT>1200?300:maxT>600?120:60;for(let t=0;t<=maxT;t+=step)svg+=`<text x="${X(t)}" y="${Hc-8}" text-anchor="middle" class="ax">${fmtT(t)}</text>`;
  const ends=[];
  const order=G.players.map((_,o)=>o).sort((a,b)=>(a===0)-(b===0));
  for(const o of order){let d='';data.forEach((row,i)=>{d+=(i?'L':'M')+X(ts[i]).toFixed(1)+' '+Y(row[o]).toFixed(1)});
    svg+=`<path d="${d}" fill="none" stroke="${OWN[o].c}" stroke-width="${o?2:3}" stroke-dasharray="${DASH[o]}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const at=G.players[o].ageT||[];for(const k of [1,2])if(at[k]!==undefined){let j=ts.findIndex(t=>t>=at[k]);if(j<0)j=ts.length-1;svg+=`<circle cx="${X(ts[j])}" cy="${Y(data[j][o])}" r="4" fill="${OWN[o].c}" stroke="var(--panel)" stroke-width="2"><title>${nameOf(o)} ${AGE_N[k]} ${fmtT(at[k])}</title></circle>`}
    ends.push({o,y:Y(data[data.length-1][o])})}
  ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<12)ends[i].y=ends[i-1].y+12;
  if(G.np<=6)for(const e of ends)svg+=`<text x="${ml+pw+6}" y="${Math.min(mt+ph+4,e.y+4)}" class="lbl">${nameOf(e.o)}</text>`;
  svg+=`<line id="cx" x1="0" x2="0" y1="${mt}" y2="${mt+ph}" stroke="var(--muted)" stroke-width="1" visibility="hidden"/><rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" fill="transparent" id="chit"/></svg>`;
  box.innerHTML=svg;
  const hit=box.querySelector('#chit'),cx=box.querySelector('#cx');
  const show=ev=>{const r=box.getBoundingClientRect(),mx=ev.clientX-r.left,t=(mx-ml)/pw*maxT;let j=0,bd=1e9;ts.forEach((tt,i)=>{const d=Math.abs(tt-t);if(d<bd){bd=d;j=i}});
    cx.setAttribute('x1',X(ts[j]));cx.setAttribute('x2',X(ts[j]));cx.setAttribute('visibility','visible');
    tip.hidden=false;tip.innerHTML=`<b>${fmtT(ts[j])}</b>`+G.players.map((_,o)=>[o,data[j][o]]).sort((a,b)=>b[1]-a[1]).map(([o,v])=>`<div><i class="dot" style="background:${OWN[o].c}"></i>${nameOf(o)}<span>${fmtV(v)}</span></div>`).join('');
    const tw=tip.offsetWidth;tip.style.left=Math.max(0,Math.min(r.width-tw,X(ts[j])+(X(ts[j])>Wc/2?-tw-10:10)))+'px';tip.style.top='8px'};
  hit.addEventListener('pointermove',show);hit.addEventListener('pointerdown',show);hit.addEventListener('pointerleave',()=>{tip.hidden=true;cx.setAttribute('visibility','hidden')});
}
