/* v29: local-only memorization mode. Existing calculation data stays in calcRPG. */
(function(){
  'use strict';
  const D=MemoryData,C=MemoryCore,el=id=>document.getElementById(id);
  let unlock=null,acquiring=false;
  const guard=globalThis.LearningGuard={
    owned:false,
    async acquire(){
      if(acquiring||this.owned)return false;
      if(!navigator.locks){alert('このブラウザでは同時学習の保護が使えません。最新のSafari・Chrome・Edgeで開いてください。');return false;}
      acquiring=true;
      return new Promise(resolve=>{
        navigator.locks.request('calcRPG-learning',{ifAvailable:true},lock=>{
          acquiring=false;
          if(!lock){alert('別のタブで学習中です。その学習を終えるか、TOPへ戻ってから始めてください。');resolve(false);return;}
          this.owned=true;resolve(true);
          return new Promise(done=>{unlock=done;});
        }).catch(()=>{acquiring=false;resolve(false);alert('学習を開始できませんでした。もう一度お試しください。');});
      });
    },
    release(){this.owned=false;if(unlock){const done=unlock;unlock=null;done();}}
  };
  const panels=`
<section id="memoryMenu" class="hide page browse-page memPanel">
  <header class="page-header"><button id="memMenuHome" class="icon-button" aria-label="ホームへ"><svg><use href="#i-back"/></svg></button><h1>3秒暗記</h1><span></span></header>
  <div class="memory-intro"><svg><use href="#i-book"/></svg><p>1問3秒・20問に挑戦</p></div>
  <label class="memLabel" for="memCourse">コース</label><select id="memCourse"></select>
  <div class="memory-start paper"><p id="memCourseInfo"></p><button id="memStart" class="primary wide"><svg><use href="#i-sword"/></svg>20問に挑戦<svg class="chevron"><use href="#i-next"/></svg></button><button id="memCards" class="apricot"><svg><use href="#i-brain"/></svg>覚えるカード<svg class="chevron"><use href="#i-next"/></svg></button></div>
  <div class="memory-progress"><p id="memProgress"></p><div class="meter"><div id="memMasteredFill"></div></div></div>
  <details class="disclosure"><summary>最近の暗記記録</summary><div id="memHistory"></div></details>
  <details class="disclosure"><summary>覚えた数について</summary><p>異なる3回の完了した挑戦で正解すると「覚えた」の目安になります。間違い・時間切れで練習中に戻ります。</p><p>途中でやめても練習記録は残ります。EXPは20問を終えたときにもらえます。</p><p>キーボードは1・2・3・4で回答できます。</p></details><p id="memMenuError" class="error-message" role="alert"></p>
</section>
<section id="memoryPage" class="hide page memPanel memPlay">
  <header class="page-header"><button id="memExit" class="icon-button" aria-label="ホームへ戻る"><svg><use href="#i-back"/></svg></button><h1>3秒暗記</h1><button id="memSound" class="icon-button"></button></header><div class="memory-meta"><strong id="memNumber"></strong></div>
  <div id="memActive"><div class="memTime"><div class="memTrack"><div id="memBar"></div></div><span id="memSeconds">3.0秒</span></div><div class="memQuestionArea"><p id="memHint"></p><h2 id="memQuestion"></h2></div><div id="memOptions" class="memOptions"></div><div id="memFeedback" class="memFeedback" role="status" aria-live="polite"></div></div>
  <div id="memPaused" class="hide pause-panel memPause"><img src="./hero-rest.webp" alt="休んでいる冒険者"><h2>ひと休み中</h2><p>残り時間から続けます。</p><button id="memResume" class="primary"><svg><use href="#i-play"/></svg>再開する</button></div>
  <div id="memSaveError" class="hide pause-panel memPause" role="alert"><svg class="error-icon"><use href="#i-book"/></svg><h2>保存できませんでした</h2><p>この回答・報酬はまだ保存されていません。<br>保存を再試行してください。</p><p id="memSaveDetail" class="subtle"></p><button id="memSaveRetry" class="primary">保存を再試行</button></div>
</section>
<section id="memoryResult" class="hide page memPanel memory-result">
  <header class="page-header"><span></span><h1>暗記トレーニング完了</h1><span></span></header><div class="result-illustration"><img src="./hero-celebrate.webp" alt="喜ぶ冒険者"></div><div class="memResultStats"><div class="stat-score"><span>正解</span><strong id="memResultScore"></strong></div><div class="stat-exp"><span>獲得EXP</span><strong id="memResultXp"></strong></div><div class="stat-timeout"><span>時間切れ</span><strong id="memResultTimeout"></strong></div></div><p id="memResultLevel" class="subtle"></p><h2 class="memory-mistakes-title">もう一度覚えよう</h2><div id="memMistakes"></div><div class="memActions"><button id="memAgain" class="primary">もう一度20問</button><button id="memSelect" class="apricot">コースを選ぶ</button><button id="memResultHome" class="text-button">ホームへ</button></div>
</section>
<section id="memoryCards" class="hide page memPanel memory-cards"><header class="page-header"><button id="memCardsBack" class="icon-button" aria-label="コースへ戻る"><svg><use href="#i-back"/></svg></button><h1>覚えるカード</h1><span></span></header><p class="centered">時間を気にせず、声に出して覚えよう。</p><div id="memCardList" class="memCardList"></div><button id="memCardsBottomBack" class="secondary wide">コースへ戻る</button></section>
`;
  document.querySelector('main > .card').insertAdjacentHTML('beforeend',panels);
  const timer=new C.Deadline();let course='recommended',session=null,current=null,options=[],answers=[],frame=0,pending=null,questionToken=0,pointerToken=null;
  const fractionHTML=text=>String(text).replace(/(\d+)\/(\d+)/g,'<span class="memFraction"><span>$1</span><span>$2</span></span>');
  function read(){const raw=localStorage.getItem('calcRPG');const s=raw===null?state():JSON.parse(raw);if(!s||typeof s!=='object'||Array.isArray(s)||(s.xp!==undefined&&!Number.isFinite(s.xp)))throw Error('保存データを読み込めません。元の記録は変更していません。');const full={...state(),...s};if(full.xp===undefined)full.xp=0;C.memory(full);return full;}
  function write(transform){if(!guard.owned)throw Error('学習の保護が解除されました。');const next=transform(read());localStorage.setItem('calcRPG',JSON.stringify(next));return next;}
  function stop(){cancelAnimationFrame(frame);timer.stop();session=null;pending=null;pointerToken=null;}
  globalThis.MemoryUI={stop,pause,resume,openMenu,get active(){return Boolean(session);},get phase(){return timer.phase;}};
  function showPanel(id){hide();document.body.classList.remove('lock');el(id).classList.remove('hide');window.scrollTo(0,0);if(globalThis.AppUI)AppUI.enter(id);}
  function soundLabel(){el('memSound').textContent=soundManager.enabled?'🔊 ON':'🔇 OFF';el('memSound').setAttribute('aria-pressed',String(soundManager.enabled));if(globalThis.AppUI)AppUI.soundButton(el('memSound'));}
  function openMenu(){stop();guard.release();showPanel('memoryMenu');el('memMenuError').textContent='';try{updateCourse();}catch(e){el('memMenuError').textContent=e.message;el('memStart').disabled=true;}}
  function updateCourse(){
    course=el('memCourse').value;const m=C.memory(read()),list=C.pool(course,m),weak=C.weakIds(m),learned=D.questions.filter(q=>C.status(m.stats[q.id])==='覚えた').length;
    el('memCourseInfo').textContent=course==='weak'?`苦手 ${weak.length}問${weak.length?'・同じ分類の確認問題も出ます':'。ほかのコースから始めよう！'}`:`${list.length}問から20問を出題します。`;
    el('memStart').disabled=list.length===0;el('memCards').disabled=list.length===0;
    el('memProgress').textContent=`覚えた ${learned} / 150問`;el('memMasteredFill').style.width=(learned/150*100)+'%';
    el('memHistory').replaceChildren();if(!m.history.length)el('memHistory').textContent='まだ記録はありません。';
    for(const h of m.history.slice(-8).reverse()){const p=document.createElement('p');p.textContent=`${new Date(h.at).toLocaleDateString('ja-JP')}　${C.courses[h.course]}　${h.correct}/20　+${h.xp} EXP`;el('memHistory').append(p);}
  }
  async function start(){
    if(globalThis.AppUI&&AppUI.inputBlocked())return;if(!await guard.acquire())return;
    stop();course=el('memCourse').value;answers=[];
    session=crypto.randomUUID();
    try{if(!C.pool(course,C.memory(read())).length)throw Error('苦手は0件です。ほかのコースを選んでください。');write(s=>C.start(s,session,course));}
    catch(e){guard.release();session=null;el('memMenuError').textContent=e.message;return;}
    showPanel('memoryPage');if(globalThis.AppUI)AppUI.requestPortraitLock();soundLabel();el('memSaveError').classList.add('hide');el('memExit').disabled=false;next();
  }
  function next(){
    cancelAnimationFrame(frame);
    if(answers.length===20){persist(()=>write(s=>C.complete(s,session,answers,new Date().toISOString())),showResult);return;}
    current=C.nextQuestion(course,C.memory(read()),answers);options=D.choices(current);pointerToken=null;
    el('memNumber').textContent=`${answers.length+1} / 20問`;
    el('memQuestion').innerHTML=fractionHTML(current.prompt);
    el('memHint').textContent=current.category==='square'&&current.direction==='B'?'2つの□に同じ正の整数':'4つから選ぼう';
    el('memFeedback').textContent='';el('memFeedback').className='memFeedback';
    el('memSeconds').textContent='3.0秒';el('memBar').style.width='100%';
    el('memOptions').replaceChildren();
    options.forEach((value,index)=>{
      const b=document.createElement('button');b.type='button';b.className='memOption';b.disabled=true;b.setAttribute('aria-label',`${index+1}: ${value}${current.unit}`);
      b.innerHTML=`<small>${index+1}</small><span>${fractionHTML(value)}${current.unit}</span>`;
      b.addEventListener('pointerdown',()=>{pointerToken=questionToken;});
      b.addEventListener('click',event=>{if(event.detail>0&&pointerToken!==questionToken)return;answer(index,questionToken);});el('memOptions').append(b);
    });
    // Paint the new prompt and choices before opening the answer window.
    timer.stop();timer.phase='preparing';el('memActive').classList.remove('hide');el('memPaused').classList.add('hide');
    const preparingToken=timer.token;
    frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
      if(timer.phase!=='preparing'||timer.token!==preparingToken)return;
      questionToken=timer.enter('question',3000);enableOptions(true);
      if(document.hidden||(globalThis.AppUI&&AppUI.isLandscape()))pause();else pulse();
    });});
  }
  function enableOptions(enabled){el('memOptions').querySelectorAll('button').forEach(b=>b.disabled=!enabled);}
  function pulse(){
    cancelAnimationFrame(frame);const token=timer.token;
    frame=requestAnimationFrame(()=>{
      if(token!==timer.token)return;
      const left=timer.left();
      if(timer.phase==='question'){el('memBar').style.width=`${left/30}%`;el('memSeconds').textContent=(left/1000).toFixed(1)+'秒';if(left<=0){answer(null,questionToken);return;}}
      else if(timer.phase==='feedback'&&left<=0){next();return;}
      if(['question','feedback'].includes(timer.phase))pulse();
    });
  }
  function answer(index,token){
    if(globalThis.AppUI&&AppUI.inputBlocked())return;
    const resolution=timer.resolve(token);if(!resolution)return;
    cancelAnimationFrame(frame);enableOptions(false);
    const outcome=resolution==='timeout'||index===null?'timeout':D.equal(options[index],current.answer,current.unit)?'correct':'wrong';
    const item={id:current.id,outcome},seq=answers.length+1,at=new Date().toISOString();
    persist(()=>write(s=>C.record(s,session,seq,current.id,outcome,at)),()=>{
      answers.push(item);el('memFeedback').className='memFeedback '+outcome;
      el('memFeedback').innerHTML=outcome==='correct'?'正解！':`${outcome==='timeout'?'時間切れ':'おしい！'}　${fractionHTML(current.correction)}`;
      try{soundManager.playConfirm();}catch(e){/* Audio is optional; timing and scoring remain independent. */}
      timer.enter('feedback',outcome==='correct'?300:2000);
      if(document.hidden||(globalThis.AppUI&&AppUI.isLandscape()))pause();else pulse();
    });
  }
  function persist(action,success){
    pending={action,success};
    try{action();pending=null;el('memSaveError').classList.add('hide');el('memActive').classList.remove('hide');el('memExit').disabled=false;success();}
    catch(e){cancelAnimationFrame(frame);timer.phase='error';el('memActive').classList.add('hide');el('memPaused').classList.add('hide');el('memSaveError').classList.remove('hide');el('memSaveDetail').textContent=e.message;el('memExit').disabled=true;}
  }
  function pause(){
    if(timer.phase==='preparing'){cancelAnimationFrame(frame);timer.enter('question',3000);}
    if(!timer.pause())return;
    cancelAnimationFrame(frame);enableOptions(false);el('memActive').classList.add('hide');el('memPaused').classList.remove('hide');
  }
  function resume(){if(document.hidden||(globalThis.AppUI&&AppUI.inputBlocked())||timer.phase!=='paused')return;timer.resume();questionToken=timer.token;pointerToken=null;el('memPaused').classList.add('hide');el('memActive').classList.remove('hide');enableOptions(timer.phase==='question');pulse();}
  async function exit(){if(pending)return;const wasPaused=timer.phase==='paused';pause();const leave=globalThis.AppUI?await AppUI.confirmExit('memory'):confirm('TOPへ戻りますか？\n練習記録は残りますが、途中終了ではEXPはもらえません。');if(leave){stop();guard.release();home();}else if(!wasPaused&&!document.hidden)resume();}
  function showResult(){
    const m=C.memory(read()),h=m.history.find(x=>x.id===session);timer.stop();cancelAnimationFrame(frame);guard.release();showPanel('memoryResult');
    el('memResultScore').textContent=`${h.correct} / 20`;el('memResultTimeout').textContent=h.timeout+'問';el('memResultXp').textContent='+'+h.xp;
    const level=levelInfo(read().xp);el('memResultLevel').textContent=`Lv. ${level.level}（EXP ${level.current} / 300）`;
    const unique=[...new Map(h.wrong.map(id=>[D.byId[id].pair,D.byId[id]])).values()];
    el('memMistakes').innerHTML=unique.length?unique.map(q=>`<p class="memCorrection">${fractionHTML(q.correction)}</p>`).join(''):'<p>全問正解！</p>';
  }
  function cards(){const m=C.memory(read());showPanel('memoryCards');let list=C.pool(course,m);if(course==='weak'){const weak=new Set(C.weakIds(m));list=list.filter(q=>weak.has(q.id));}const pairs=[...new Map(list.map(q=>[q.pair,q])).values()];el('memCardList').innerHTML=pairs.map(q=>{const states=D.questions.filter(x=>x.pair===q.pair).map(x=>`${x.direction==='A'?'→':'←'} ${C.status(m.stats[x.id])}`).join('　');return `<article><small>${D.categories[q.category]}</small><strong>${fractionHTML(q.correction)}</strong><span>${states}</span></article>`;}).join('');}
  el('memCourse').innerHTML=Object.entries(C.courses).map(([key,name])=>`<option value="${key}">${name}</option>`).join('');
  el('memoryHot').onclick=openMenu;el('memCourse').onchange=()=>{try{updateCourse();el('memMenuError').textContent='';}catch(e){el('memMenuError').textContent=e.message;}};
  el('memStart').onclick=start;el('memAgain').onclick=()=>{showPanel('memoryMenu');start();};el('memSelect').onclick=openMenu;
  el('memMenuHome').onclick=home;el('memResultHome').onclick=home;el('memCardsBack').onclick=openMenu;el('memCardsBottomBack').onclick=openMenu;el('memCards').onclick=cards;
  el('memExit').onclick=exit;el('memResume').onclick=resume;el('memSaveRetry').onclick=()=>{if(pending){const {action,success}=pending;persist(action,success);}};
  el('memSound').onclick=()=>{soundManager.toggle();soundLabel();renderSoundSetting();};
  document.addEventListener('keydown',event=>{if(!session||el('memoryPage').classList.contains('hide'))return;if(/^[1-4]$/.test(event.key)){event.preventDefault();if(!event.repeat)answer(Number(event.key)-1,questionToken);}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&session)pause();});
  window.addEventListener('pagehide',()=>{stop();guard.release();});
  window.addEventListener('pageshow',event=>{if(event.persisted)home();});
})();
