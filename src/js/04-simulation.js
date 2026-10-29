'use strict';
// ---------- entities ----------
function spawnUnit(type,owner,x,y){
  const D=UD[type];
  const hp0=D.hp+(type==='villager'?G.players[owner].m.vilHp:0);
  const u={kind:'unit',id:G.nid++,type,owner,x,y,hp:hp0,maxHp:hp0,gspd:0,state:'idle',path:[],tgt:null,carry:{t:null,n:0},cd:0,repath:0,stuck:0,acq:Math.random()*0.4,face:Math.PI/2,anim:Math.random()*10,gtype:null,moving:false};
  G.units.push(u);return u;
}
function freeAround(b,skip=0){
  let k=0;PO=b.owner;
  for(let r=1;r<8;r++){
    for(let y=b.ty-r;y<b.ty+b.h+r;y++)for(let x=b.tx-r;x<b.tx+b.w+r;x++){
      if(x>b.tx-r&&x<b.tx+b.w+r-1&&y>b.ty-r&&y<b.ty+b.h+r-1)continue;
      if(walk(x,y)&&!(G.place[idx(x,y)])){if(k++>=skip)return{x:x*T+T/2+(Math.random()*6-3),y:y*T+T/2+(Math.random()*6-3)}}
    }
  }
  return{x:b.tx*T-T/2,y:b.ty*T-T/2};
}
function exposed(r){
  for(let y=r.ty-1;y<=r.ty+r.h;y++)for(let x=r.tx-1;x<=r.tx+r.w;x++){
    if(x>=r.tx&&x<r.tx+r.w&&y>=r.ty&&y<r.ty+r.h)continue;if(walk(x,y))return true}
  return false;
}
function nearestRes(rt,x,y,maxPx,sub,excl){
  let best=null,bd=maxPx;
  for(const r of G.res){if(r.dead||r.rt!==rt||r===excl)continue;if(sub&&r.sub!==sub)continue;if(r.unr&&G.t-r.unr<180)continue;
    const d=rectDist(x,y,r);if(d<bd&&exposed(r)){bd=d;best=r}}
  return best;
}
function nearestDrop(owner,rt,x,y){
  let best=null,bd=1e9;
  for(const b of G.blds){if(b.dead||b.owner!==owner||b.built<1)continue;const D=BD[b.type];if(!D.drop||!D.drop.includes(rt))continue;
    const d=rectDist(x,y,b);if(d<bd){bd=d;best=b}}
  return best;
}

// ---------- commands ----------
function resetU(u){u.path=[];u.tgt=null;u.stuck=0;u.resume=null;u.leash=null;u.aggr=false;u.work=false;u.gspd=0}
function cmdMove(u,x,y){resetU(u);u.state='move';pathTo(u,null,x,y)}
function cmdAttack(u,t){resetU(u);u.state='attack';u.tgt=t}
function cmdGather(u,o){if(u.type!=='villager')return;resetU(u);u.state='gather';u.tgt=o;u.gtype=rtOf(o);if(u.carry.t&&u.carry.t!==u.gtype)u.carry={t:null,n:0}}
function cmdBuild(u,b){if(u.type!=='villager')return;resetU(u);u.state='build';u.tgt=b}
function cmdReturn(u,b){resetU(u);u.state='return';u.dropT=b}
function cmdAmove(u,x,y){resetU(u);u.state='amove';u.dest={x,y};pathTo(u,null,x,y)}
function stopU(u){resetU(u);u.state='idle'}
function queueItem(b,item){
  const o=b.owner,isT=!!TD[item],P=G.players[o];
  if(b.queue.length>=5){if(o===0)toast('대기열이 가득 찼습니다');return false}
  if(isT){const st=techState(o,item);if(st!=='ok'){if(o===0)toast(st==='req'?TD[item].reqTxt+'이 필요합니다':st==='locked'?AGE_N[TD[item].age]+'가 필요합니다':'지금은 연구할 수 없습니다',true);return false}}
  else if(UD[item].age>P.age){if(o===0)toast(AGE_N[UD[item].age]+'가 필요합니다',true);return false}
  const c=isT?TD[item].cost:UD[item].cost;
  if(!afford(o,c)){if(o===0)toast(lack(o,c),true);return false}
  pay(o,c);b.queue.push(item);return true;
}
function cancelQueue(b,i){
  const it=b.queue[i];if(it===undefined)return;
  const c=TD[it]?TD[it].cost:UD[it].cost,P=G.players[b.owner];for(const k in c)P[k]+=c[k];
  b.queue.splice(i,1);if(i===0)b.qt=0;
}

// ---------- combat ----------
function damage(o,dmg,src){
  if(o.dead)return;
  o.hp-=dmg;
  if(o.owner===0&&src&&foe(0,src.owner)&&G.t-G.alertT>10){G.alertT=G.t;toast('공격받고 있습니다!',true);play('alert');const c=center(o);G.pings.push({x:c.x,y:c.y,t:3})}
  o.hitT=performance.now();
  if(o.owner===0&&src&&foe(0,src.owner)&&!G.tipAttack){G.tipAttack=true;setTimeout(()=>toast('팁: 종 울리기(B)로 일꾼을 마을회관에 대피시키면 화살이 늘어납니다'),1800)}
  if(o.kind==='unit'&&src&&src.kind==='unit'&&!o.dead&&o.type!=='villager'&&!UD[o.type].onlyBld&&!UD[o.type].noAtk&&!src.gar&&!(o.stance==='hold'&&entDist(o,src)>rangeOf(o)*T+4)){
    if(o.state==='idle'){const lp={x:o.x,y:o.y};cmdAttack(o,src);o.leash=lp}
    else if(o.state==='amove'){const d=o.dest;o.path=[];o.tgt=src;o.state='attack';o.resume=d;o.gspd=0}
    else if(o.state==='attack'&&o.tgt&&o.tgt.kind==='bld'&&!UD[o.type].siege){o.path=[];o.tgt=src}
    else if(o.state==='attack'&&o.tgt&&o.tgt.kind==='unit'&&o.tgt!==src&&entDist(o,o.tgt)>rangeOf(o)*T+T&&entDist(o,src)<entDist(o,o.tgt)){o.path=[];o.tgt=src}
  }
  if(o.hp<=0)kill(o,src);
}
function kill(o,src){
  o.dead=true;
  if(src&&src.owner!==undefined)G.stats[src.owner].kills++;
  if(o.owner!==undefined)G.stats[o.owner].lost++;
  const c=center(o);
  if(o.kind==='bld'&&o.garrison&&o.garrison.length)ungarrison(o);
  if(o.kind==='bld'&&o.type!=='farm'&&knownTo0(o))play('collapse',c.x,c.y);else if(o.kind==='unit'&&(o.owner===0||visibleTo0(o)))play('death',c.x,c.y);
  if(o.kind==='bld'){occupy(o,false);if(o.type!=='farm')G.decals.push({x:c.x,y:c.y,type:'rubble',r:o.w*14,t:45});for(let i=0;i<18;i++)G.fx.push({x:c.x+(Math.random()-.5)*o.w*T,y:c.y+(Math.random()-.5)*o.h*T,z:10+Math.random()*30,vz:20+Math.random()*40,g:120,vx:(Math.random()-.5)*20,vy:(Math.random()-.5)*20,t:1.4,c:Math.random()<.5?'#6b5a46':'#8a7a62'});for(let i=0;i<8;i++)G.fx.push({x:c.x+(Math.random()-.5)*o.w*T,y:c.y+(Math.random()-.5)*o.h*T,z:10,vz:12+Math.random()*10,t:2.5,l:2.5,smoke:true})}
  else G.fx.push({x:c.x,y:c.y,corpse:true,t:4,c:OWN[o.owner].c});
}
function hit(u,o){
  const D=UD[u.type],c=center(o);u.face=Math.atan2(c.y-u.y,c.x-u.x);
  if(u.owner===0||visibleTo0(u))play(D.at==='p'?'arrow':D.siege?'collapse':'sword',u.x,u.y);
  if(D.proj==='stone')G.proj.push({x0:u.x,y0:u.y,z0:30,x1:c.x,y1:c.y,z1:20,t:0,d:Math.hypot(c.x-u.x,c.y-u.y)/260,stone:true});
  if(D.at==='p')G.proj.push({x0:u.x,y0:u.y,z0:13,x1:c.x,y1:c.y,z1:o.kind==='unit'?10:22,t:0,d:Math.hypot(c.x-u.x,c.y-u.y)/420});
  const dmg=calcDmg(u,o);
  if((u.owner===0||o.owner===0)&&G.fx.length<160&&visibleTo0(o)){const bon=o.kind==='unit'?bonusOf(u,o):0,c2=center(o);
    G.fx.push({x:c2.x+(Math.random()-.5)*8,y:c2.y,z:o.kind==='unit'?30:(BH[o.type]||20)*0.6,vz:22,t:0.9,txt:(bon?'!':'')+Math.round(dmg),sz:bon?12:10,c:bon?'#ffd34d':o.owner===0?'#ff9a8c':'#f4ecd4'})}
  damage(o,dmg,u);
}
function bonusOf(src,tgt){const D=UD[src.type];return D&&D.bonus&&tgt.kind==='unit'?(D.bonus[UD[tgt.type].cls]||0):0}
const leashOf=u=>u.stance==='def'?4*T:10*T;
function acquire(u,incB){
  const D=UD[u.type],los=(D.los+(D.at==='p'?G.players[u.owner].m.prng:0))*T;let best=null,bd=los;
  if(!D.onlyBld)for(const e of G.units){if(e.dead||e.gar||ally(e.owner,u.owner))continue;const d=Math.hypot(e.x-u.x,e.y-u.y);if(d<bd){bd=d;best=e}}
  if(!best&&(incB||D.onlyBld&&u.aggr))for(const b of G.blds){if(b.dead||ally(b.owner,u.owner))continue;const d=rectDist(u.x,u.y,b);if(d<bd){bd=d;best=b}}
  return best;
}

// ---------- unit update ----------
function follow(u,dt){
  if(!u.path.length)return false;
  let step=speedOf(u)*dt;
  while(step>0&&u.path.length){
    const p=u.path[0],dx=p.x-u.x,dy=p.y-u.y,d=Math.hypot(dx,dy);
    if(d<=step){u.x=p.x;u.y=p.y;u.path.shift();step-=d}
    else{u.x+=dx/d*step;u.y+=dy/d*step;u.face=Math.atan2(dy,dx);step=0}
  }
  u.moving=true;return u.path.length>0;
}
function approach(u,o,range,dt){
  if(entDist(u,o)<=range){u.path.length=0;u.stuck=0;u.work=true;return 1}
  u.work=false;u.repath-=dt;
  if(!u.path.length||(o.kind==='unit'&&u.repath<=0)){
    if(!u.path.length){u.stuck++;if(u.stuck>4){u.stuck=0;return -1}}
    const ok=pathTo(u,o);u.repath=Math.min(5,0.8+entDist(u,o)/(8*T))*(ok?1:2.5);
  }
  follow(u,dt);return 0;
}
function unstick(u){
  const tx=Math.floor(u.x/T),ty=Math.floor(u.y/T);
  if(walk(tx,ty))return;
  for(let r=1;r<10;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    if(walk(tx+dx,ty+dy)){u.x=(tx+dx)*T+T/2;u.y=(ty+dy)*T+T/2;u.path=[];return}
  }
}
function updUnit(u,dt){
  const D=UD[u.type];PO=u.owner;
  u.cd=Math.max(0,u.cd-dt);u.moving=false;
  unstick(u);
  switch(u.state){
    case 'idle':
      u.work=false;
      if(u.type!=='villager'&&!D.noAtk){u.acq-=dt;if(u.acq<=0){u.acq=0.4;const e=acquire(u,u.aggr);if(e&&!(u.stance==='hold'&&entDist(u,e)>rangeOf(u)*T+4)){u.tgt=e;u.state='attack';u.leash={x:u.x,y:u.y}}}}
      break;
    case 'move':if(!follow(u,dt)){u.state='idle';u.gspd=0}break;
    case 'amove':{
      u.acq-=dt;
      if(u.acq<=0){u.acq=0.4;const e=acquire(u,true);if(e){const d=u.dest;u.path=[];u.tgt=e;u.state='attack';u.resume=d;u.gspd=0;break}}
      if(!follow(u,dt)){
        let blk=null;
        if(u.dest&&!D.noAtk&&Math.hypot(u.x-u.dest.x,u.y-u.dest.y)>4*T){let bd=7*T;
          for(const b of G.blds){if(b.dead||ally(b.owner,u.owner))continue;const d=rectDist(u.x,u.y,b)-(b.type==='wall'||b.type==='gate'?T:0);if(d<bd){bd=d;blk=b}}}
        if(blk){const d=u.dest;u.path=[];u.tgt=blk;u.state='attack';u.resume=d;u.gspd=0}
        else{u.state='idle';u.aggr=true;u.gspd=0}
      }
      break;}
    case 'attack':{
      const o=u.tgt;
      if(!o||o.dead||o.gar||(u.leash&&Math.hypot(u.x-u.leash.x,u.y-u.leash.y)>leashOf(u))||(u.stance==='hold'&&u.leash&&entDist(u,o)>rangeOf(u)*T+4)){
        const back=u.leash;const res=u.resume;const ag=u.aggr;resetU(u);
        if(res)cmdAmove(u,res.x,res.y);else if(back&&o&&!o.dead)cmdMove(u,back.x,back.y);else{u.state='idle';u.aggr=ag}
        break;
      }
      if(D.onlyBld&&o.kind==='unit'){resetU(u);u.state='idle';break}
      const r=approach(u,o,rangeOf(u)*T+(o.kind==='unit'?0:2),dt);
      if(r===-1){const res=u.resume;resetU(u);if(res)cmdAmove(u,res.x,res.y);else u.state='idle';break}
      if(r===1&&u.cd<=0){hit(u,o);u.cd=D.rate}
      break;}
    case 'trade':{
      let A=u.ta;const B=u.tb;
      if(!B||B.dead||B.built<1){resetU(u);u.state='idle';break}
      if(!A||A.dead){A=u.ta=otherMarket(u.owner,B,u.x,u.y);if(!A){resetU(u);u.state='idle';break}}
      const r=approach(u,B,T,dt);
      if(r===-1){resetU(u);u.state='idle';break}
      if(r===1){const ca=center(A),cb=center(B),g=tradeGold(ca,cb);
        G.players[u.owner].gold+=g;G.stats[u.owner].gathered+=g;
        if(u.owner===0){G.fx.push({x:u.x,y:u.y,z:34,vz:18,txt:'+'+g,c:RCOL.gold,t:1.3});play('coin',u.x,u.y)}
        u.ta=B;u.tb=A;u.path=[];u.stuck=0;u.work=false}
      break;}
    case 'enter':{
      const b=u.tgt;
      if(!b||b.dead||b.built<1||b.garrison.length>=BD[b.type].gar){resetU(u);u.state='idle';break}
      const r=approach(u,b,T,dt);
      if(r===-1){resetU(u);u.state='idle';break}
      if(r===1){u.gar=b;b.garrison.push(u);u.state='garrison';u.path=[];u.work=false;if(sel.includes(u))sel=sel.filter(x=>x!==u)}
      break;}
    case 'gather':{
      let o=u.tgt;
      const gone=!o||o.dead||(o.kind==='bld'&&o.food<=0);
      if(gone){
        if(o&&o.kind==='bld'&&o.type==='farm'){
          // reseed the exhausted farm in place when wood allows
          if(afford(u.owner,BD.farm.cost)&&canPlace('farm',o.tx,o.ty,u.owner,false)){pay(u.owner,BD.farm.cost);const nf=placeBld('farm',u.owner,o.tx,o.ty,false);cmdBuild(u,nf);break}
          o=null;
        }
        const prevSub=o&&o.kind==='res'?o.sub:null;
        o=prevSub?nearestRes(u.gtype,u.x,u.y,8*T,prevSub):null;
        if(!o&&u.gtype)o=nearestRes(u.gtype,u.x,u.y,14*T,u.gtype==='food'?'berry':null);
        if(!o&&u.gtype==='food')o=freeFarm(u.owner,u,14*T);
        if(!o){if(u.carry.n>0){u.state='return';u.path=[];u.tgt=null}else{resetU(u);u.state='idle'}break}
        u.tgt=o;u.path=[];
      }
      if(u.carry.t&&u.carry.t!==rtOf(o))u.carry={t:null,n:0};
      if(u.carry.n>=capOfU(u)){u.state='return';u.path=[];u.dropT=null;break}
      const farm=o.kind==='bld';
      const r=approach(u,o,farm?0.5:T,dt);
      if(r===-1){const alt=farm?null:nearestRes(u.gtype,u.x,u.y,10*T,o.sub,o);if(alt){u.tgt=alt;u.path=[]}else{resetU(u);u.state='idle'}break}
      if(r===1){
        const c=center(o);u.face=Math.atan2(c.y-u.y,c.x-u.x);
        const mul=u.owner!==0?DIFF[G.aiDiff[u.owner]].gather:1;
        const m=G.players[u.owner].m,rm=farm?1:o.rt==='wood'?m.gw:o.rt==='gold'?m.gg:1;
        const amt=Math.min(GRATE[farm?'farm':o.sub]*mul*rm*dt,farm?o.food:o.amount);
        if(farm)o.food-=amt;else o.amount-=amt;
        u.carry.t=rtOf(o);u.carry.n+=amt;
        u.sfx=(u.sfx||0)-dt;if(u.sfx<=0){u.sfx=0.9+Math.random()*0.5;if(u.owner===0&&!farm&&o.sub!=='berry')play(o.sub==='tree'?'chop':'mine',u.x,u.y)}
        if(farm&&o.food<=0.01)kill(o,null),G.stats[o.owner].lost--;
        else if(!farm&&o.amount<=0.01){o.dead=true;occupy(o,false);if(o.sub==='tree'&&G.decals.length<600)G.decals.push({x:(o.tx+.5)*T,y:(o.ty+.5)*T,type:'stump',t:1e9})}
      }
      break;}
    case 'return':{
      if(!u.carry.n){u.state=u.tgt&&!u.tgt.dead?'gather':'idle';break}
      let d=u.dropT;
      if(!d||d.dead)d=u.dropT=nearestDrop(u.owner,u.carry.t,u.x,u.y);
      if(!d){u.state='idle';break}
      const r=approach(u,d,T,dt);
      if(r===-1){u.dropT=null;u.state='idle';break}
      if(r===1){
        const n=Math.round(u.carry.n);G.players[u.owner][u.carry.t]+=n;G.stats[u.owner].gathered+=n;
        if(u.owner===0){const c=center(d);G.fx.push({x:u.x,y:u.y,z:30,vz:18,txt:'+'+n,c:RCOL[u.carry.t],t:1.1})}
        u.carry={t:null,n:0};u.dropT=null;u.path=[];
        if(u.tgt&&!u.tgt.dead&&!(u.tgt.kind==='bld'&&u.tgt.food<=0))u.state='gather';
        else{const o=u.gtype&&u.gtype!=='food'?nearestRes(u.gtype,u.x,u.y,10*T):u.gtype==='food'?nearestRes('food',u.x,u.y,10*T,'berry'):null;if(o){u.tgt=o;u.state='gather'}else{u.state='idle'}}
      }
      break;}
    case 'build':{
      const b=u.tgt;
      if(!b||b.dead){resetU(u);u.state='idle';break}
      if(b.built>=1){afterBuild(u,b);break}
      const r=approach(u,b,T,dt);
      if(r===-1){resetU(u);u.state='idle';break}
      if(r===1){
        const D2=BD[b.type];const inc=dt/D2.time;
        b.built=Math.min(1,b.built+inc);u.sfx=(u.sfx||0)-dt;if(u.sfx<=0){u.sfx=0.7+Math.random()*0.3;if(u.owner===0)play('hammer',u.x,u.y)}b.hp=Math.min(b.maxHp,b.hp+b.maxHp*0.9*inc);
        u.face=Math.atan2(center(b).y-u.y,center(b).x-u.x);
        if(b.built>=1)onComplete(b);
      }
      break;}
  }
  if(u.moving)u.anim+=dt;
}
function onComplete(b){
  b.hp=Math.max(b.hp,b.maxHp*0.999);b.hp=b.maxHp;
  if(b.owner===0){toast(BD[b.type].name+' 건설 완료');const c=center(b);play('build',c.x,c.y)}
  if(b.owner!==0&&BD[b.type].train&&b.type!=='tc'){const tc=G.blds.find(x=>x.owner===b.owner&&x.type==='tc'&&!x.dead);if(tc){const c=center(tc),m={x:MW*T/2,y:MH*T/2};const dx=m.x-c.x,dy=m.y-c.y,d=Math.hypot(dx,dy);b.rally={x:c.x+dx/d*6*T,y:c.y+dy/d*6*T}}}
}
function afterBuild(u,b){
  const c=center(b);let o=null;
  if(b.type==='farm'&&b.food>0&&b.owner===u.owner){cmdGather(u,b);return}
  if(b.type==='lumber')o=nearestRes('wood',c.x,c.y,8*T);
  else if(b.type==='mill')o=nearestRes('food',c.x,c.y,8*T,'berry');
  else if(b.type==='mine')o=nearestRes('gold',c.x,c.y,8*T);
  if(o){cmdGather(u,o);return}
  let next=null,nd=8*T;for(const x of G.blds){if(x.dead||x.owner!==u.owner||x.built>=1)continue;const d=rectDist(u.x,u.y,x);if(d<nd){nd=d;next=x}}
  if(next){cmdBuild(u,next);return}
  resetU(u);u.state='idle';
}

// ---------- building update ----------
function updBld(b,dt){
  if(b.built<1)return;
  if(b.type!=='farm'&&b.hp<b.maxHp*0.6&&Math.random()<dt*3){const c=center(b);G.fx.push({x:c.x+(Math.random()-.5)*20,y:c.y+(Math.random()-.5)*20,z:(BH[b.type]||20)*0.7,vz:16,t:2.4,l:2.4,smoke:true})}
  const D=BD[b.type];
  if(b.owner===0&&b.repeat&&!b.queue.length){const ut=b.repeat;if(UD[ut].age<=G.players[0].age&&afford(0,UD[ut].cost)&&popOf(0)<capOf(0))queueItem(b,ut)}
  if(b.queue.length){
    const t=b.queue[0],isT=!!TD[t];
    if(!isT&&popOf(b.owner)>=capOf(b.owner)){b.blocked=true;if(b.owner===0&&!b.warned){b.warned=true;toast('인구 한도에 도달했습니다. 집을 지으세요',true)}}
    else{
      b.blocked=false;b.warned=false;b.qt+=dt;
      const need=(isT?TD[t].time:UD[t].time)*(b.owner!==0?DIFF[G.aiDiff[b.owner]].train:1);
      if(b.qt>=need){
        b.qt=0;b.queue.shift();
        if(isT)applyTech(b.owner,t);
        else{
          const p=freeAround(b,Math.floor(Math.random()*4));const u=spawnUnit(t,b.owner,p.x,p.y);G.stats[b.owner].trained++;if(t==='cart')u.homeM=b;if(b.owner===0)play('train',p.x,p.y);
          if(b.rally){
            const ro=b.rally.obj;
            if(ro&&!ro.dead&&u.type==='villager'&&(ro.kind==='res'||ro.type==='farm'))cmdGather(u,ro);
            else cmdMove(u,b.rally.x+(Math.random()-.5)*20,b.rally.y+(Math.random()-.5)*20);
          }else if(b.owner===0&&u.type==='villager')autoTask(u);
        }
      }
    }
  }
  if(D.atk){
    b.cd-=dt;
    if(b.cd<=0){
      const c=center(b),rng2=(D.atk.range+G.players[b.owner].m.prng)*T,tg=[];
      for(const e of G.units){if(e.dead||e.gar||ally(e.owner,b.owner))continue;const d=Math.hypot(e.x-c.x,e.y-c.y);if(d<rng2)tg.push([d,e])}
      if(tg.length){tg.sort((a,b2)=>a[0]-b2[0]);b.cd=D.atk.rate;
        const n=(D.atk.n||1)+b.garrison.length,k=Math.min(3,tg.length);
        if(b.owner===0||visibleTo0(b))play('arrow',c.x,c.y);
        for(let i=0;i<n;i++){const [d,e]=tg[i%k];G.proj.push({x0:c.x+(Math.random()-.5)*16,y0:c.y+(Math.random()-.5)*16,z0:b.type==='tower'?68:52,x1:e.x,y1:e.y,z1:10,t:-i*0.05,d:d/420});damage(e,calcDmg(b,e),b)}}
    }
  }
  for(const u of b.garrison)u.hp=Math.min(u.maxHp,u.hp+dt*0.8);
}
// ---------- garrison ----------
function garFree(b){return BD[b.type].gar-b.garrison.length-G.units.filter(x=>!x.dead&&x.state==='enter'&&x.tgt===b).length}
function canGar(u,b){return!!BD[b.type].gar&&b.owner===u.owner&&b.built>=1&&!b.dead&&!u.gar&&['vil','inf','arch'].includes(UD[u.type].cls)&&garFree(b)>0}
function cmdGarrison(u,b){resetU(u);u.state='enter';u.tgt=b}
function ungarrison(b){
  const us=b.garrison.splice(0);
  us.forEach((u,i)=>{u.gar=null;const p=freeAround(b,i%10);u.x=p.x;u.y=p.y;resetU(u);u.state='idle';
    const bl=u.bell;u.bell=null;
    if(bl){const t=bl.tgt;
      if(bl.state==='gather'&&t&&!t.dead)cmdGather(u,t);
      else if(bl.state==='build'&&t&&!t.dead&&t.built<1)cmdBuild(u,t);
      else if(u.carry.n>0){u.state='return';u.dropT=null}}});
}
function ringBell(o){
  const sh=G.blds.filter(b=>b.owner===o&&!b.dead&&b.built>=1&&BD[b.type].gar);let n=0;
  for(const u of G.units){
    if(u.dead||u.owner!==o||u.type!=='villager'||u.gar||u.state==='enter')continue;
    let best=null,bd=24*T;for(const b of sh){if(garFree(b)<=0)continue;const d=rectDist(u.x,u.y,b)+(b.type==='tc'?0:2*T);if(d<bd){bd=d;best=b}}
    if(best){u.bell={state:u.state,tgt:u.tgt,gtype:u.gtype};cmdGarrison(u,best);n++}
  }
  if(o===0){play('bell');toast(n?'종을 울렸습니다. 일꾼 '+n+'명이 대피합니다':'대피할 일꾼이 없거나 자리가 없습니다',!n)}
  return n;
}
function allClear(o){
  let n=0;for(const b of G.blds)if(b.owner===o&&!b.dead&&b.garrison&&b.garrison.length){n+=b.garrison.length;ungarrison(b)}
  for(const u of G.units)if(u.owner===o&&u.state==='enter'&&u.bell){const bl=u.bell;u.bell=null;if(bl.state==='gather'&&bl.tgt&&!bl.tgt.dead)cmdGather(u,bl.tgt);else stopU(u)}
  if(o===0)toast(n?'모두 밖으로 나왔습니다':'주둔한 유닛이 없습니다');
}
// ---------- trade carts ----------
const tradeGold=(a,b)=>Math.round(Math.hypot(a.x-b.x,a.y-b.y)/T*0.7);
function otherMarket(o,not,x,y){let best=null,bd=1e9;for(const b of G.blds){if(b.dead||b.owner!==o||b.type!=='market'||b.built<1||b===not)continue;const d=rectDist(x,y,b);if(d<bd){bd=d;best=b}}return best}
function cmdTrade(u,B){
  let A=u.homeM&&!u.homeM.dead&&u.homeM!==B?u.homeM:otherMarket(u.owner,B,u.x,u.y);
  if(!A){if(u.owner===0)toast('교역하려면 시장이 두 곳 필요합니다',true);return false}
  if(Math.hypot(center(A).x-center(B).x,center(A).y-center(B).y)<12*T){if(u.owner===0)toast('더 멀리 떨어진 시장과 교역하세요 (12칸 이상)',true);return false}
  resetU(u);u.state='trade';u.ta=A;u.tb=B;return true;
}
// ---------- market ----------
function trade(o,r,buy){
  const P=G.players[o],pr=P.price[r];
  if(buy){if(P.gold<pr){if(o===0)toast('금이 부족합니다',true);return false}P.gold-=pr;P[r]+=100;P.price[r]=Math.min(300,pr+6)}
  else{if(P[r]<100){if(o===0)toast(RNS[r]+' 부족합니다',true);return false}P[r]-=100;P.gold+=Math.round(pr*0.7);P.price[r]=Math.max(25,pr-6)}
  if(o===0)play('coin');return true;
}
function autoTask(u){
  const vs=G.units.filter(v=>v.owner===u.owner&&v.type==='villager'&&v!==u),cnt={food:0,wood:0,gold:0};
  for(const v of vs)if(v.gtype&&(v.state==='gather'||v.state==='return'))cnt[v.gtype]++;
  const tot=Math.max(1,vs.length),want={food:0.45,wood:0.35,gold:0.2};
  for(const t of ['food','wood','gold'].sort((a,b)=>(cnt[a]/tot-want[a])-(cnt[b]/tot-want[b]))){
    const o=t==='food'?(nearestRes('food',u.x,u.y,14*T,'berry')||freeFarm(u.owner,u,16*T)):nearestRes(t,u.x,u.y,18*T);
    if(o){cmdGather(u,o);return true}
  }
  return false;
}
function freeFarm(owner,u,maxD){
  let best=null,bd=maxD;
  for(const b of G.blds){if(b.dead||b.owner!==owner||b.type!=='farm'||b.built<1||b.food<=0||(b.unr&&G.t-b.unr<120))continue;
    if(G.units.some(v=>v!==u&&v.owner===owner&&v.tgt===b&&(v.state==='gather'||v.state==='return')))continue;
    const d=rectDist(u.x,u.y,b);if(d<bd){bd=d;best=b}}
  return best;
}

// ---------- separation ----------
let SEP_DT=1/30;
function separate(){
  const C=24,grid=new Map();
  for(const u of G.units){if(u.dead||u.gar)continue;const k=((u.x/C)|0)*8192+((u.y/C)|0);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(u)}
  const pair=(a,b)=>{let dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>22||Math.abs(dy)>22)return;
    const mn=RAD[UD[a.type].cls]+RAD[UD[b.type].cls];let d=Math.hypot(dx,dy);if(d>=mn)return;
    if(d<0.01){dx=Math.random()-.5;dy=Math.random()-.5;d=Math.hypot(dx,dy)}
    const push=Math.min((mn-d)*0.5,SEP_DT*30),nx=dx/d,ny=dy/d;
    const wt=u=>u.moving?0.25:u.work?0.5:1;const wa=wt(a),wb=wt(b);
    shift(a,-nx*push*wa,-ny*push*wa);shift(b,nx*push*wb,ny*push*wb)};
  for(const [k,a] of grid){const gx=Math.floor(k/8192),gy=k-gx*8192;
    for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)pair(a[i],a[j]);
    for(const [ox,oy] of [[1,-1],[1,0],[1,1],[0,1]]){const b=grid.get((gx+ox)*8192+gy+oy);if(b)for(const u of a)for(const v of b)pair(u,v)}}
}
function shift(u,dx,dy){PO=u.owner;const nx=u.x+dx,ny=u.y+dy;if(walkPx(nx,ny)){u.x=nx;u.y=ny}}

// ---------- vision ----------
const fogC=document.createElement('canvas');fogC.width=MW;fogC.height=MH;const fogX=fogC.getContext('2d');let fogImg=fogX.createImageData(MW,MH);
function computeVis(){
  const v=G.vis;v.fill(0);
  const mark=(cx,cy,r)=>{const x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(MW-1,Math.ceil(cx+r)),y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(MH-1,Math.ceil(cy+r));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if((x+.5-cx)**2+(y+.5-cy)**2<=r*r){v[idx(x,y)]=1;G.exp[idx(x,y)]=1}};
  for(const u of G.units)if(ally(0,u.owner)&&!u.dead&&!u.gar)mark(u.x/T,u.y/T,UD[u.type].los);
  for(const b of G.blds)if(ally(0,b.owner)&&!b.dead)mark(b.tx+b.w/2,b.ty+b.h/2,BD[b.type].los+b.w/2);
  const d=fogImg.data;
  for(let i=0;i<N;i++){d[i*4]=9;d[i*4+1]=12;d[i*4+2]=19;d[i*4+3]=!G.exp[i]?255:!v[i]?120:0}
  fogX.putImageData(fogImg,0,0);
}
const visibleTo0=o=>{if(o.owner!==undefined&&ally(0,o.owner))return true;if(o.kind==='unit')return!!G.vis[idx(Math.floor(o.x/T),Math.floor(o.y/T))];
  for(let y=o.ty;y<o.ty+o.h;y++)for(let x=o.tx;x<o.tx+o.w;x++)if(o.kind==='bld'?G.vis[idx(x,y)]:G.exp[idx(x,y)])return true;return false};
const knownTo0=o=>{if(o.owner!==undefined&&ally(0,o.owner))return true;if(o.kind==='unit')return visibleTo0(o);for(let y=o.ty;y<o.ty+o.h;y++)for(let x=o.tx;x<o.tx+o.w;x++)if(G.exp[idx(x,y)])return true;return false};
