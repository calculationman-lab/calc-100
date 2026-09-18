/* v31: v28 rules and storage; UI hooks only. */
const APP_VERSION="v31";
const $=x=>document.getElementById(x),T=["革","石","鉄","ダイヤ","ネザライト"],TK=["leather","stone","iron","diamond","nether"],P=["頭","胴","脚","足"],PK=["head","body","legs","feet"],W=["木の剣","石の剣","鉄の剣","ダイヤの剣","ネザライトの剣"];
const BOSSES=[
  {id:"starter_dragon",tier:0,name:"はじまりの竜",image:"./boss_leather.webp"},
  {id:"rock_golem",tier:1,name:"岩石ゴーレム",image:"./boss_stone.webp"},
  {id:"black_iron_knight",tier:2,name:"黒鉄の騎士",image:"./boss_iron.webp"},
  {id:"azure_crystal_dragon",tier:3,name:"蒼晶のドラゴン",image:"./boss_diamond.webp"},
  {id:"nether_demon_king",tier:4,name:"冥界の魔王",image:"./boss_nether.webp"}
];
const ENEMIES=[
  {id:"slime",name:"アクアスライム",image:"./enemy_slime.webp"},
  {id:"goblin",name:"森のゴブリン",image:"./enemy_goblin.webp"},
  {id:"wolf",name:"シルバーウルフ",image:"./enemy_wolf.webp"},
  {id:"bat",name:"ナイトバット",image:"./enemy_bat.webp"},
  {id:"mushroom",name:"どくキノコ",image:"./enemy_mushroom.webp"}
];
const SOUND_FILES={digit:"./digit.mp3",confirm:"./confirm.mp3"};
const SOUND_PROFILES={
  normalDigit:{attackGain:.10,bodyGain:.045,noiseGain:.035,attackHz:1050,bodyHz:420,duration:.052,noiseDuration:.025},
  normalConfirm:{attackGain:.18,bodyGain:.11,noiseGain:.07,attackHz:1250,bodyHz:340,duration:.085,noiseDuration:.045},
  bossDigit:{attackGain:.15,bodyGain:.09,noiseGain:.06,attackHz:900,bodyHz:300,duration:.065,noiseDuration:.035},
  bossConfirm:{attackGain:.25,bodyGain:.16,noiseGain:.10,attackHz:1050,bodyHz:230,duration:.115,noiseDuration:.06},
  backspace:{attackGain:.085,bodyGain:0,noiseGain:0,attackHz:230,bodyHz:0,duration:.04,noiseDuration:0}
};
class SoundManager{
  constructor(){this.context=null;this.masterGain=null;this.compressor=null;this.noiseBuffer=null;this.audioPools={};this.poolSize=4;this.enabled=this.load().soundEnabled;this.createdContexts=0}
  load(){try{const value=JSON.parse(localStorage.getItem("calcRPGSettings")||"{}");return{soundEnabled:value.soundEnabled!==false}}catch(e){return{soundEnabled:true}}}
  save(){try{localStorage.setItem("calcRPGSettings",JSON.stringify({soundEnabled:this.enabled}))}catch(e){}}
  setEnabled(value){this.enabled=Boolean(value);this.save();if(!this.enabled)Object.values(this.audioPools).flat().forEach(a=>{try{a.pause();a.currentTime=0}catch(e){}});return this.enabled}
  toggle(){return this.setEnabled(!this.enabled)}
  resume(){if(!this.enabled)return null;try{const AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioCtor)return null;if(!this.context){this.context=new AudioCtor();this.createdContexts++;this.setupOutput()}if(this.context.state==="suspended"){const resumed=this.context.resume();if(resumed&&resumed.catch)resumed.catch(()=>{})}return this.context}catch(e){return null}}
  setupOutput(){const ctx=this.context;this.masterGain=ctx.createGain();this.masterGain.gain.value=.78;this.compressor=ctx.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.knee.value=12;this.compressor.ratio.value=4;this.compressor.attack.value=.003;this.compressor.release.value=.09;this.masterGain.connect(this.compressor);this.compressor.connect(ctx.destination);const length=Math.ceil(ctx.sampleRate*.065);this.noiseBuffer=ctx.createBuffer(1,length,ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let n=0;n<length;n++)data[n]=(Math.random()*2-1)*(1-n/length)}
  oscillatorLayer(frequency,duration,gain,type="triangle",drop=.55){const ctx=this.context,now=ctx.currentTime,osc=ctx.createOscillator(),amp=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(90,frequency*drop),now+duration);amp.gain.setValueAtTime(.0001,now);amp.gain.exponentialRampToValueAtTime(gain,now+.003);amp.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(amp);amp.connect(this.masterGain);osc.start(now);osc.stop(now+duration+.008)}
  noiseLayer(duration,gain,centerHz){if(!gain||!this.noiseBuffer)return;const ctx=this.context,now=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();source.buffer=this.noiseBuffer;filter.type="bandpass";filter.frequency.value=centerHz;filter.Q.value=.8;amp.gain.setValueAtTime(gain,now);amp.gain.exponentialRampToValueAtTime(.0001,now+duration);source.connect(filter);filter.connect(amp);amp.connect(this.masterGain);source.start(now);source.stop(now+duration+.005)}
  playProfile(profile,variation=1){if(!this.resume())return;try{this.oscillatorLayer(profile.attackHz*variation,Math.min(.05,profile.duration),profile.attackGain,"triangle",.62);if(profile.bodyGain)this.oscillatorLayer(profile.bodyHz*variation,profile.duration,profile.bodyGain,"sawtooth",.68);this.noiseLayer(profile.noiseDuration,profile.noiseGain,variation<1?850:1150)}catch(e){}}
  poolFor(key){if(this.audioPools[key])return this.audioPools[key];const AudioCtor=globalThis.Audio;if(!AudioCtor||!SOUND_FILES[key])return null;try{const pool=Array.from({length:this.poolSize},()=>{const audio=new AudioCtor(SOUND_FILES[key]);audio.preload="auto";audio.__failed=false;audio.__fallback=null;if(audio.addEventListener)audio.addEventListener("error",()=>{audio.__failed=true;const fallback=audio.__fallback;audio.__fallback=null;if(fallback&&this.enabled)fallback()});return audio});pool.next=0;this.audioPools[key]=pool;return pool}catch(e){return null}}
  playMp3(key,fallback){if(!this.enabled)return true;const pool=this.poolFor(key);if(!pool)return false;const audio=pool[pool.next++%pool.length];if(audio.__failed)return false;try{audio.currentTime=0;audio.__fallback=fallback;const failed=()=>{audio.__failed=true;const retry=audio.__fallback;audio.__fallback=null;if(retry&&this.enabled)retry()};const result=audio.play();if(result&&result.then)result.then(()=>audio.__fallback=null,failed);return true}catch(e){audio.__failed=true;audio.__fallback=null;return false}}
  playDigit(mode="normal"){const fallback=()=>{const variation=.95+Math.random()*.10;this.playProfile(mode==="boss"?SOUND_PROFILES.bossDigit:SOUND_PROFILES.normalDigit,variation)};if(!this.playMp3("digit",fallback))fallback()}
  playConfirm(mode="normal"){const fallback=()=>this.playProfile(mode==="boss"?SOUND_PROFILES.bossConfirm:SOUND_PROFILES.normalConfirm,1);if(!this.playMp3("confirm",fallback))fallback()}
  playBackspace(){this.playProfile(SOUND_PROFILES.backspace,1)}
}
const soundManager=new SoundManager();
let qs=[],i=0,w=[],v="",t0=0,tick,kind="normal",activeBoss=null,activeEnemy=null;
function bossForTier(tier){return BOSSES[Math.min(4,Math.max(0,tier||0))]}
function soundMode(){return kind==="boss"?"boss":"normal"}
function chooseEnemy(mode){if(mode==="boss"){const boss=activeBoss||bossForTier(state().tier);return{id:boss.id,name:boss.name,image:boss.image,boss:true}}return{...ENEMIES[Math.floor(Math.random()*ENEMIES.length)],boss:false}}
function renderBattleHud(){if(!activeEnemy)return;const max=qs.length,hp=Math.max(0,max-i),ratio=max?hp/max:0;$("enemyName").textContent=activeEnemy.name;$("enemyImage").src=activeEnemy.image;$("enemyImage").alt=activeEnemy.name;$("enemyHpText").textContent=hp+" / "+max;$("enemyHpFill").style.width=(ratio*100)+"%";$("enemyHpFill").classList.toggle("mid",ratio<=.5&&ratio>.2);$("enemyHpFill").classList.toggle("low",ratio<=.2);$("enemyHud").classList.toggle("boss",Boolean(activeEnemy.boss))}
function battleFeedback(confirmAttack=false){const effect=$("battleFeedback"),stage=$("battleStage"),enemy=$("enemyImage"),hero=$("heroFighter"),boss=soundMode()=="boss";effect.className="battleFeedback";stage.classList.remove("shake","bossShake");enemy.classList.remove("hit");hero.classList.remove("attacking","bossAttacking");if(!confirmAttack)return;void effect.offsetWidth;void hero.offsetWidth;effect.classList.add("fire");if(boss)effect.classList.add("boss");stage.classList.add(boss?"bossShake":"shake");enemy.classList.add("hit");hero.classList.add(boss?"bossAttacking":"attacking");setTimeout(()=>hero.classList.remove("attacking","bossAttacking"),260)}
function renderSoundSetting(){const on=soundManager.enabled,top=$("soundToggle"),quiz=$("quizSoundToggle");top.textContent=on?"🔊 操作音 ON":"🔇 操作音 OFF";top.setAttribute&&top.setAttribute("aria-pressed",String(on));quiz.textContent=on?"🔊 ON":"🔇 OFF";quiz.setAttribute&&quiz.setAttribute("aria-pressed",String(on))}
function dk(d=new Date()){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function state(){const base={xp:0,clears:0,boss:false,tier:0,gear:{},hist:[],dates:[],total:0,bossWins:{}};try{const old=JSON.parse(localStorage.getItem("calcRPG")||"{}");const s={...base,...old};s.gear=s.gear&&typeof s.gear==="object"?s.gear:{};s.hist=Array.isArray(s.hist)?s.hist:[];s.dates=Array.isArray(s.dates)?s.dates:[];s.bossWins=s.bossWins&&typeof s.bossWins==="object"&&!Array.isArray(s.bossWins)?s.bossWins:{};BOSSES.forEach(b=>s.bossWins[b.id]=Math.max(0,Number.isFinite(s.bossWins[b.id])?s.bossWins[b.id]:0));s.xp=Number.isFinite(s.xp)?s.xp:0;s.clears=Number.isFinite(s.clears)?s.clears:0;s.tier=Math.min(4,Math.max(0,Number.isFinite(s.tier)?s.tier:0));s.total=Number.isFinite(s.total)?s.total:0;s.boss=Boolean(s.boss);return s}catch(e){return base}}
function save(s){localStorage.setItem("calcRPG",JSON.stringify(s))}
function sh(a){for(let j=a.length-1;j;j--){let k=Math.floor(Math.random()*(j+1));[a[j],a[k]]=[a[k],a[j]]}return a}
function gen(n){let a=[],u=new Set(),p=Math.ceil(n/2);while(a.length<p){let x=10+Math.floor(Math.random()*90),y=10+Math.floor(Math.random()*90),k=`+${x},${y}`;if(!u.has(k)){u.add(k);a.push({x,y,o:"+",a:x+y})}}while(a.length<n){let x=10+Math.floor(Math.random()*90),y=10+Math.floor(Math.random()*90);if(y>x)[x,y]=[y,x];let k=`-${x},${y}`;if(!u.has(k)){u.add(k);a.push({x,y,o:"−",a:x-y})}}return sh(a)}
function hide(){if(globalThis.AppUI)AppUI.beforeNavigate();["home","quiz","result","history","gearbook","bossbook","rulesPage","memoryMenu","memoryPage","memoryResult","memoryCards","equipmentPage","settingsPage"].forEach(x=>{if($(x))$(x).classList.add("hide")})}
function fmt(ms){let s=Math.floor(ms/1000);return Math.floor(s/60)+"分"+String(s%60).padStart(2,"0")+"秒"}
function streak(s){let ds=[...new Set(s.dates)].sort().reverse();if(!ds.length)return 0;let cur=new Date(ds[0]+"T12:00:00"),n=1;for(let j=1;j<ds.length;j++){let d=new Date(ds[j]+"T12:00:00"),dif=Math.round((cur-d)/86400000);if(dif===1){n++;cur=d}else break}return n}
function bonusStreak(s,date=new Date()){let ds=[...new Set(s.dates)].sort().reverse();if(!ds.length)return 1;const latest=new Date(ds[0]+"T12:00:00"),today=new Date(dk(date)+"T12:00:00"),gap=Math.round((today-latest)/86400000),current=streak(s);return gap===0?current:gap===1?current+1:1}
function streakBonus(days){return Math.min(Math.max(days-1,0)*10,50)}
function scoreBonus(score){return(score>=90?20:0)+(score>=95?10:0)+(score===100?20:0)}
function normalGain(score,days){return 100+scoreBonus(score)+streakBonus(days)}
function levelInfo(xp){return{level:Math.floor(xp/300)+1,current:xp%300}}
function todayNormal(s,date=new Date()){return s.hist.filter(x=>x.kind==="normal"&&x.total===100&&x.date===dk(date)).slice(-1)[0]||null}


function eqName(tier,part){
  if(part==="weapon") return W[tier];
  const suffix={head:"のかぶと",body:"のよろい",legs:"のズボン",feet:"のブーツ"}[part];
  return T[tier]+suffix;
}
function renderTopEquipment(s){
  const tier=Math.min(s.tier,4), cards=[];
  cards.push({part:"weapon",label:"武器",owned:true,count:1});
  PK.forEach((part,pi)=>{const count=s.gear[tier+"-"+pi]||0;cards.push({part,label:P[pi],owned:count>0,count})});
  $("equipOverlay").innerHTML=cards.map(c=>{
    const src="./eq_"+TK[tier]+"_"+c.part+".png";
    const count=c.part!=="weapon"&&c.count>1?` ×${c.count}`:"";
    return `<div class="eqCard ${c.owned?"owned":"missing"}"><div class="eqHead">${c.label}</div><div class="eqIconWrap"><img class="eqIcon" src="${src}" alt=""></div><div class="eqName">${eqName(tier,c.part)}${count}</div><div class="eqState ${c.owned?"":"missing"}">${c.owned?"所持中":"未入手"}</div></div>`;
  }).join("");
  const armorCount=PK.reduce((n,_,pi)=>n+((s.gear[tier+"-"+pi]||0)>0?1:0),0);
  $("completeValue").innerHTML=`<div class="completeMetric">現在装備<b>${1+armorCount} / 5</b></div><div class="completeMetric">防具コンプリート<b>${armorCount} / 4</b></div>`;
}
function renderRecent(s){
  const a=s.hist.filter(x=>x&&x.kind==="normal"&&x.date&&Number.isFinite(x.score)&&Number.isFinite(x.time)).slice(-5).reverse();
  if(!a.length){$("recentOverlay").innerHTML='<div class="recentEmpty">まだ記録はありません</div>';return}
  $("recentOverlay").innerHTML=a.map(x=>{
    const gain=x.xp?("EXP +"+x.xp):"";
    return `<div class="recentRow"><span>${x.date.slice(5)}</span><b>${x.score}点</b><span>${fmt(x.time).replace("分",":").replace("秒","")}</span><b style="color:#ffd43b">${gain}</b></div>`;
  }).join("");
}

function home(){if(globalThis.MemoryUI)MemoryUI.stop();if(globalThis.LearningGuard)LearningGuard.release();document.body.classList.remove("lock");hide();$("home").classList.remove("hide");
  let s=state(),level=levelInfo(s.xp),lv=level.level,x=level.current,st=bonusStreak(s),daily=todayNormal(s),currentBoss=bossForTier(s.tier);
  $("lvLive").textContent=lv;
  $("xpLive").textContent=x+" / 300";
  $("xpFill").style.width=(x/3)+"%";
  $("dailyStatus").classList.toggle("complete",Boolean(daily));
  $("dailyStatus").textContent=daily?`今日の100問：完了　${daily.score}/100点　${fmt(daily.time)}`:"今日の100問：まだ終わっていません";
  $("daysLive").textContent=new Set(s.dates).size+"日";
  $("totalLive").textContent=s.total.toLocaleString()+"問";
  $("bonusLive").textContent=st>1?"+"+streakBonus(st)+" EXP（"+st+"日連続）":"なし";
  $("bossLive").textContent=s.boss?"出現中！":"あと "+(3-(s.clears%3))+"回";
  $("bossSummary").textContent=s.boss?"BOSS出現中！":"次のボスまであと "+(3-(s.clears%3))+"回";
  $("bossImage").src=currentBoss.image;$("bossImage").alt=currentBoss.name;$("bossName").textContent=currentBoss.name;
  $("bossWins").textContent=currentBoss.name+" 撃破数 "+(s.bossWins[currentBoss.id]||0)+"体";
  $("rankPath").innerHTML=T.map((name,n)=>`<span class="rankStep ${n===s.tier?"active":""}">${name}</span>${n<T.length-1?"<span>›</span>":""}`).join("");
  renderTopEquipment(s);renderRecent(s);renderSoundSetting();
  $("bossBtn").classList.toggle("hide",!s.boss);if(globalThis.AppUI)AppUI.home(s)
}
function startSession(questions,k){if(globalThis.LearningGuard&&!LearningGuard.owned){LearningGuard.acquire().then(ok=>{if(ok)startSession(questions,k)});return;}kind=k;qs=sh(questions.slice());i=0;w=[];v="";activeEnemy=chooseEnemy(k);hide();$("quiz").classList.remove("hide");document.body.classList.add("lock");$("mode").textContent=k==="boss"?"BOSS":k==="review"?"復習":"通常";battleFeedback(false);t0=Date.now();$("timer").textContent=fmt(0);clearInterval(tick);tick=setInterval(()=>$("timer").textContent=fmt(Date.now()-t0),500);show();if(globalThis.AppUI)AppUI.sessionStarted(k)}
function begin(n,k){if(k==="boss")activeBoss={...bossForTier(state().tier)};startSession(gen(n),k)}
function show(){renderBattleHud();if(i>=qs.length)return finish();let q=qs[i];$("prog").textContent=(i+1)+" / "+qs.length+"問";$("prob").textContent=q.x+" "+q.o+" "+q.y+" = ?";v="";$("disp").textContent="　"}
function key(k){if(globalThis.AppUI&&AppUI.inputBlocked())return;if(k==="B"){soundManager.playBackspace();v=v.slice(0,-1)}else if(k==="E"){if(v==="")return;soundManager.playConfirm(soundMode());battleFeedback(true);let q=qs[i];if(+v!==q.a)w.push({...q,g:v});i++;return show()}else{if(v.length<3)v+=k}$("disp").textContent=v||"　"}
function finish(now=new Date()){clearInterval(tick);document.body.classList.remove("lock");let tm=Math.max(0,Date.now()-t0),s=state(),score=qs.length-w.length,earnedXp=0,streakExtra=0;hide();$("result").classList.remove("hide");$("loot").classList.add("hide");$("rtitle").textContent=kind==="boss"?"ボス戦結果":kind==="review"?"復習結果":"今日の冒険、よくがんばりました！";$("score").textContent=score+" / "+qs.length+"点";$("rinfo").textContent=fmt(tm);$("wrongs").innerHTML=w.length?"<h2>間違えた問題 "+w.length+"問</h2>":"<h2>間違えた問題</h2><p style='text-align:center'>全問正解！</p>";w.forEach(q=>$("wrongs").innerHTML+=`<div class=row><span>${q.x} ${q.o} ${q.y} = <s>${q.g}</s></span><b>${q.a}</b></div>`);$("retry").classList.toggle("hide",!w.length);$("retry").textContent=kind==="boss"?"⚔ ボス20問にもう一度挑戦":kind==="review"?"⚔ 残り"+w.length+"問をもう一度":"⚔ 間違えた"+w.length+"問をもう一度";
 if(kind==="normal"){s.total+=qs.length;const date=dk(now);if(!s.dates.includes(date))s.dates.push(date);let st=streak(s),bonus=streakBonus(st),gain=normalGain(score,st);earnedXp=gain;streakExtra=bonus;s.xp+=gain;s.clears++;if(s.clears%3===0)s.boss=true;s.hist.push({date,at:now.toISOString(),kind:"normal",score,total:100,time:tm,xp:gain})}
 else if(kind==="review"){s.total+=qs.length;$("rinfo").textContent+="　復習完了（EXP・クリア回数・ボス進行への加算なし）"}
 else if(kind==="boss"&&score===20){const defeated=activeBoss||bossForTier(s.tier),tier=defeated.tier;s.boss=false;s.total+=qs.length;earnedXp=100;s.xp+=100;s.bossWins[defeated.id]=(s.bossWins[defeated.id]||0)+1;let part=Math.floor(Math.random()*4),key=tier+"-"+part;s.gear[key]=(s.gear[key]||0)+1;let complete=P.every((_,p)=>s.gear[tier+"-"+p]>0),msg=defeated.name+" 撃破！　"+T[tier]+"の"+P[part]+"装備 GET！";$("rtitle").textContent=defeated.name+" 撃破！";if(complete&&tier<4){s.tier=tier+1;const next=bossForTier(s.tier);msg+="　"+T[tier]+"装備 COMPLETE！　新ランク："+T[s.tier]+"　新しい武器："+W[s.tier]+"　次のボス："+next.name}else if(complete&&tier===4)msg+="　最高ランク COMPLETE！";$("loot").textContent=msg;$("loot").classList.remove("hide");s.hist.push({date:dk(now),at:now.toISOString(),kind:"boss",score:20,total:20,time:tm,bossId:defeated.id,bossName:defeated.name,tier})}
 else if(kind==="boss"){$("loot").textContent="ボスに逃げられた！ 20問すべて一発正解でもう一度挑戦！";$("loot").classList.remove("hide")}save(s);if(globalThis.LearningGuard)LearningGuard.release();const level=levelInfo(s.xp);$("resultXp").textContent="+"+earnedXp+" EXP";$("resultBonus").textContent=streakExtra?"連続ボーナス：+"+streakExtra+" EXP":kind==="review"?"復習ではEXPは増えません":"";$("resultLevel").textContent="冒険者レベル　Lv. "+level.level+"（EXP "+level.current+" / 300）";$("resultRank").textContent="現在の装備ランク　"+T[s.tier];if(globalThis.AppUI)AppUI.result()}
function showHist(){hide();$("history").classList.remove("hide");if(globalThis.AppUI)AppUI.enter("history");let a=state().hist.slice().reverse();$("hist").innerHTML=a.length?"":"記録はまだありません。";a.forEach(x=>{const date=x&&x.date||"日付不明",score=Number.isFinite(x&&x.score)?x.score:"-",total=Number.isFinite(x&&x.total)?x.total:"-",time=Number.isFinite(x&&x.time)?fmt(x.time):"時間不明",label=x&&x.kind==="boss"?(x.bossName||"BOSS"):"通常";$("hist").innerHTML+=`<div class=row><span>${date} ${label}</span><b>${score}/${total}　${time}</b></div>`})}
function showBossBook(){hide();$("bossbook").classList.remove("hide");if(globalThis.AppUI)AppUI.enter("bossbook");const s=state();$("bossCatalog").innerHTML=BOSSES.map(b=>{const unlocked=b.tier<=s.tier,current=b.tier===s.tier,name=unlocked?b.name:"？？？",status=current?"現在のボス":b.tier<s.tier?"解放済み":"未解放";return `<article class="bossBookEntry ${current?"current":""} ${unlocked?"":"future"}"><img src="${b.image}" alt="${unlocked?b.name:"未解放のボス"}"><h2>${name}</h2><p>${T[b.tier]}ランク</p><p><b>${status}</b></p><p>討伐数：${unlocked?s.bossWins[b.id]:"－"}体</p></article>`}).join("")}
function showGear(){hide();$("gearbook").classList.remove("hide");if(globalThis.AppUI)AppUI.enter("gearbook");let s=state(),z="";
  T.forEach((tierName,ti)=>{
    const tierUnlocked=ti<=s.tier;
    const tierMark=ti<s.tier?"✓ COMPLETE":ti===s.tier?"← 現在のランク":"未解放";
    z+=`<section class="gearTier ${tierUnlocked?"unlocked":"locked"}"><h3>${tierName}装備 <span>${tierMark}</span></h3><div class="geargrid">`;

    const weaponSrc=`./eq_${TK[ti]}_weapon.png`;
    z+=gearBookCard({label:"武器",name:W[ti],src:weaponSrc,owned:tierUnlocked,count:1,tierUnlocked});

    PK.forEach((part,pi)=>{
      const count=s.gear[ti+"-"+pi]||0;
      const owned=tierUnlocked&&count>0;
      const src=`./eq_${TK[ti]}_${part}.png`;
      z+=gearBookCard({label:P[pi],name:eqName(ti,part),src,owned,count,tierUnlocked});
    });
    z+="</div></section>";
  });
  $("gear").innerHTML=z;if(globalThis.AppUI)AppUI.gearBook(s)
}
function gearBookCard({label,name,src,owned,count,tierUnlocked}){
  const stateClass=owned?"owned":tierUnlocked?"missing":"locked";
  const status=owned?"所持中":tierUnlocked?"未入手":"未解放";
  const countBadge=owned&&count>1?`<span class="gearCount">×${count}</span>`:"";
  return `<article class="gear ${stateClass}"><div class="gearPart">${label}</div><div class="gearImageWrap"><img class="gearImage" src="${src}" alt="${owned?name:"未入手の装備"}">${countBadge}<span class="gearQuestion">？</span></div><div class="gearName">${tierUnlocked?name:"？？？"}</div><div class="gearStatus">${status}</div></article>`
}
$("startHot").onclick=()=>begin(100,"normal");$("bossBtn").onclick=()=>begin(20,"boss");document.querySelectorAll(".key").forEach(b=>b.onclick=()=>key(b.dataset.k));
$("quizBack").onclick=()=>{if(confirm("途中の計算結果は記録されません。\nトップページに戻りますか？")){clearInterval(tick);home()}};$("retry").onclick=()=>{if(kind==="boss")startSession(gen(20),"boss");else{const missed=w.map(({g,...q})=>q);startSession(missed,"review")}};$("historyHot").onclick=showHist;$("gearHot").onclick=showGear;
$("bossBookHot").onclick=showBossBook;
$("appVersion").textContent="100問計算RPG "+APP_VERSION;const toggleSound=()=>{soundManager.toggle();renderSoundSetting()};$("soundToggle").onclick=toggleSound;$("quizSoundToggle").onclick=toggleSound;$("resultHistory").onclick=showHist;$("rulesHot").onclick=()=>{hide();$("rulesPage").classList.remove("hide");if(globalThis.AppUI)AppUI.enter("rulesPage")};document.querySelectorAll(".back").forEach(b=>b.onclick=home);home();if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
