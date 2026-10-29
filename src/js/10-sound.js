'use strict';
// ---------- sound (synthesised, no audio files) ----------
const SFX={ac:null,out:null,on:true,vol:0.7,last:{},noise:null,birdT:6};
try{const v=JSON.parse(localStorage.getItem('dawn.sfx')||'null');if(v){SFX.on=!!v.on;SFX.vol=Math.max(0,Math.min(1,+v.vol||0))}}catch(e){}
function audioInit(){
  if(SFX.ac){if(SFX.ac.state==='suspended')SFX.ac.resume().catch(()=>{});return}
  try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ac=new AC();SFX.ac=ac;
    SFX.out=ac.createGain();SFX.out.gain.value=SFX.on?SFX.vol:0;const comp=ac.createDynamicsCompressor();SFX.out.connect(comp);comp.connect(ac.destination);
    const buf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SFX.noise=buf;
  }catch(e){SFX.ac=null}
}
function sfxSave(){try{localStorage.setItem('dawn.sfx',JSON.stringify({on:SFX.on,vol:SFX.vol}))}catch(e){}}
function sfxApply(){if(SFX.out)SFX.out.gain.value=SFX.on?SFX.vol:0;const b=$('#b-snd');if(b){b.textContent=SFX.on?'소리 켬':'소리 끔';b.setAttribute('aria-pressed',SFX.on?'true':'false')}}
const GAP={chop:90,mine:90,hammer:110,sword:70,arrow:70,death:120,select:60,cmd:60,collapse:300,alert:500,error:250,coin:60,train:150,build:200,research:200,ageup:500,bell:400,place:80,win:0,lose:0,bird:0};
function play(name,wx,wy){
  const ac=SFX.ac;if(!ac||!SFX.on||SFX.vol<=0||ac.state!=='running')return;
  const now=performance.now();if(now-(SFX.last[name]||0)<(GAP[name]===undefined?60:GAP[name]))return;
  let g=1,pan=0;
  if(wx!==undefined&&G){const q=isoW(wx,wy),cx=cam.x+W/Z/2,cy=cam.y+viewCenterY()/Z,dx=(q.x-cx)*Z,dy=(q.y-cy)*Z;
    const R=Math.max(W,H)*0.85;g=Math.pow(Math.max(0,1-Math.hypot(dx,dy*1.4)/R),1.5);if(g<0.04)return;pan=Math.max(-0.8,Math.min(0.8,dx/(W/2)))}
  SFX.last[name]=now;
  const t=ac.currentTime;let dest=SFX.out;
  if(pan&&ac.createStereoPanner){const pn=ac.createStereoPanner();pn.pan.value=pan;pn.connect(dest);dest=pn}
  const env=(node,peak,a,dcy,st)=>{const gn=ac.createGain();gn.gain.setValueAtTime(0.0001,st);gn.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak*g),st+a);gn.gain.exponentialRampToValueAtTime(0.0001,st+a+dcy);node.connect(gn);gn.connect(dest)};
  const osc=(type,f0,f1,dur,peak,a,st)=>{a=a||0.005;st=st||t;const o=ac.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,st);if(f1)o.frequency.exponentialRampToValueAtTime(f1,st+dur);env(o,peak,a,dur,st);o.start(st);o.stop(st+a+dur+0.05)};
  const noise=(ft,f,q,dur,peak,a,st,f1)=>{a=a||0.003;st=st||t;const sr=ac.createBufferSource();sr.buffer=SFX.noise;const fl=ac.createBiquadFilter();fl.type=ft;fl.frequency.setValueAtTime(f,st);if(f1)fl.frequency.exponentialRampToValueAtTime(f1,st+dur);fl.Q.value=q;sr.connect(fl);env(fl,peak,a,dur,st);sr.start(st,Math.random()*0.5);sr.stop(st+a+dur+0.05)};
  switch(name){
    case 'select':osc('sine',740,980,0.06,0.12);break;
    case 'cmd':osc('triangle',520,0,0.05,0.12);osc('triangle',700,0,0.06,0.1,0.005,t+0.05);break;
    case 'chop':noise('bandpass',1800,1.2,0.05,0.22);osc('sine',160,90,0.06,0.22);break;
    case 'mine':osc('triangle',2400,2200,0.08,0.1);noise('highpass',3000,0.7,0.03,0.1);break;
    case 'hammer':osc('square',300,200,0.03,0.06);noise('bandpass',900,1.5,0.04,0.18);break;
    case 'sword':osc('square',1300+Math.random()*400,900,0.09,0.05);osc('triangle',2600,1800,0.12,0.05);noise('highpass',4000,0.8,0.05,0.1);break;
    case 'arrow':noise('bandpass',3200,3,0.13,0.16,0.01,t,700);break;
    case 'death':osc('sine',220,110,0.14,0.1);break;
    case 'collapse':noise('lowpass',380,0.8,1.1,0.55,0.02,t,90);osc('sine',70,40,0.9,0.3,0.02);break;
    case 'alert':osc('sawtooth',233,0,0.35,0.12,0.04);osc('sawtooth',196,0,0.45,0.12,0.04,t+0.38);break;
    case 'error':osc('square',140,0,0.12,0.06);break;
    case 'coin':osc('triangle',1568,0,0.08,0.12);osc('triangle',2093,0,0.15,0.12,0.005,t+0.06);break;
    case 'place':noise('lowpass',600,0.8,0.08,0.28);osc('sine',150,90,0.08,0.22);break;
    case 'train':osc('triangle',392,0,0.12,0.11);osc('triangle',523,0,0.18,0.11,0.005,t+0.1);break;
    case 'build':[523,659,784].forEach((f,i)=>osc('sine',f,0,0.35,0.12,0.005,t+i*0.08));break;
    case 'research':[587,740,880,1175].forEach((f,i)=>osc('triangle',f,0,0.3,0.09,0.005,t+i*0.07));break;
    case 'ageup':[[392,0],[523,.18],[659,.36],[784,.54],[1047,.74]].forEach(([f,d])=>{osc('sawtooth',f,0,0.5,0.06,0.02,t+d);osc('sine',f*2,0,0.4,0.05,0.02,t+d)});break;
    case 'bell':for(let i=0;i<3;i++){osc('sine',880,0,1.2,0.14,0.005,t+i*0.45);osc('sine',1320,0,0.8,0.07,0.005,t+i*0.45);osc('sine',2210,0,0.4,0.035,0.005,t+i*0.45)}break;
    case 'win':[523,659,784,1047,784,1047].forEach((f,i)=>osc('triangle',f,0,0.4,0.13,0.01,t+i*0.16));break;
    case 'lose':[392,349,311,262].forEach((f,i)=>osc('triangle',f,0,0.55,0.12,0.01,t+i*0.3));break;
    case 'bird':{const f=2400+Math.random()*1200,n=2+Math.floor(Math.random()*3);for(let i=0;i<n;i++)osc('sine',f,f*1.25,0.07,0.03,0.005,t+i*0.11)}break;
  }
}
