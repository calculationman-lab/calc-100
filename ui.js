/* Presentation and portrait-only lifecycle. Calculation and rewards live in game.js. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const landscape = matchMedia('(orientation: landscape)');
  const dialog = el('exitDialog');
  let normalPausedAt = null;
  let historyTab = 'normal';
  let lastFocus = null;
  const isLandscape = () => landscape.matches;
  const inputBlocked = () => isLandscape() || document.hidden || dialog.open || (document.body.dataset.page === 'quiz' && normalPausedAt !== null);

  function beforeNavigate() {
    normalPausedAt = null;
    el('quizPaused').classList.add('hide');
    el('quizContent').classList.remove('hide');
    el('quizContent').inert = false;
    document.body.classList.remove('lock');
  }
  function enter(page) {
    document.body.dataset.page = page;
    document.body.classList.toggle('lock', page === 'quiz' || page === 'memoryPage');
    const selected = ['bossbook','gearbook'].includes(page) ? 'gearbook' : ['memoryMenu','rulesPage','settingsPage'].includes(page) ? 'home' : page;
    document.querySelectorAll('[data-nav]').forEach(button => {
      if (button.dataset.nav === selected) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    window.scrollTo(0,0);
    soundSetting();
  }
  function soundButton(button) {
    if (!button) return;
    const on = soundManager.enabled;
    button.innerHTML = icon(on ? 'sound' : 'muted');
    button.setAttribute('aria-label', `操作音 ${on ? 'ON' : 'OFF'}`);
    button.setAttribute('aria-pressed', String(on));
  }
  function soundSetting() {
    const on = soundManager.enabled;
    el('soundToggle').innerHTML = `${icon(on ? 'sound':'muted')}<span>操作音</span><span class="toggle">${on ? 'ON':'OFF'}</span>`;
    el('soundToggle').setAttribute('aria-pressed', String(on));
    soundButton(el('quizSoundToggle'));
    soundButton(el('memSound'));
  }
  function renderHome(s) {
    enter('home');
    const progress = s.boss ? 3 : s.clears % 3;
    const points = [[21,51],[32,58],[52,60]];
    document.querySelectorAll('.map-step').forEach((node,index) => {
      node.classList.toggle('done', index < progress);
      node.classList.toggle('upcoming', index > progress);
      node.classList.toggle('current', index === Math.min(progress,2));
      node.innerHTML = index < progress ? icon('check') : '<span></span>';
      node.setAttribute('aria-label',`${index+1}回目 ${index<progress?'クリア済み':index===progress?'次の冒険':'未クリア'}`);
    });
    document.querySelectorAll('.map-trail path').forEach((path,index)=>path.classList.toggle('done',index<progress));
    const [x,y] = points[Math.min(progress,2)];
    el('mapHero').style.left = `${x}%`;
    el('mapHero').style.top = `${y}%`;
    el('bossLive').innerHTML = s.boss ? '<span>ボスに</span><strong>挑戦しよう！</strong>' : `<span>ボスまで</span><strong>あと <b>${3-progress}</b> 回</strong>`;
    document.querySelector('.map-boss').classList.toggle('ready',s.boss);
    const daily = todayNormal(s);
    el('dailyStatus').textContent = daily ? `今日はクリア済み · ${daily.score} / 100点` : '足し算50問 ＋ 引き算50問';
    el('equipmentLevel').textContent = `Lv. ${levelInfo(s.xp).level}`;
    el('equipmentRank').textContent = `${T[s.tier]}ランク`;
    const count = PK.filter((_,index) => (s.gear[`${s.tier}-${index}`] || 0) > 0).length;
    el('armorPips').innerHTML = PK.map((_,index) => `<span class="${index<count?'filled':''}"></span>`).join('');
    el('armorPips').setAttribute('aria-label',`防具 ${count} / 4`);
    el('nextRankText').textContent = s.tier < 4 ? `あと${4-count}つで${T[s.tier+1]}ランクへ` : count === 4 ? 'すべての防具をコンプリート！' : `あと${4-count}つで全ランクコンプリート`;
  }
  function showEquipment() {
    home();
    hide();
    el('equipmentPage').classList.remove('hide');
    enter('equipmentPage');
  }
  function showSettings() {
    hide();
    el('settingsPage').classList.remove('hide');
    enter('settingsPage');
    el('appVersion').textContent = `100問計算RPG ${APP_VERSION}`;
  }
  function selectTier(tier) {
    el('gear').querySelectorAll('.gearTier').forEach((node,index) => node.classList.toggle('selected',index===tier));
    el('gearRanks').querySelectorAll('button').forEach((node,index) => {
      node.classList.toggle('active', index===tier);
      node.setAttribute('aria-pressed',String(index===tier));
    });
  }
  function gearBook(s) {
    el('gearRanks').replaceChildren();
    T.forEach((name,index) => {
      const button = document.createElement('button');
      button.innerHTML = `${index>s.tier ? icon('lock') : ''}${name}`;
      button.setAttribute('aria-label',`${name}装備${index>s.tier ? '・未解放':''}`);
      button.onclick = () => selectTier(index);
      el('gearRanks').append(button);
    });
    selectTier(s.tier);
  }
  function history() {
    const s = state();
    el('historySummary').innerHTML = `<div>冒険<strong>${new Set(s.dates).size}<small>日</small></strong></div><div>合計<strong>${s.total.toLocaleString()}<small>問</small></strong></div><div>Lv.<strong>${levelInfo(s.xp).level}</strong></div>`;
    el('historyNormal').classList.toggle('selected',historyTab==='normal');
    el('historyMemory').classList.toggle('selected',historyTab==='memory');
    el('historyNormal').setAttribute('aria-pressed',String(historyTab==='normal'));
    el('historyMemory').setAttribute('aria-pressed',String(historyTab==='memory'));
    let list;
    if (historyTab === 'memory') {
      try { list = MemoryCore.memory(s).history.slice().reverse().map(x => ({label:MemoryCore.courses[x.course]||'3秒暗記',date:new Date(x.at).toLocaleDateString('ja-JP'),score:x.correct,total:20,extra:`+${x.xp} EXP`})); }
      catch (error) { el('hist').textContent = error.message; return; }
    } else {
      list = s.hist.slice().reverse().map(x => ({label:x.kind==='boss' ? x.bossName||'ボス戦' : '今日の100問',date:x.date||'日付不明',score:x.score,total:x.total,extra:Number.isFinite(x.time) ? fmt(x.time):'時間不明'}));
    }
    el('hist').innerHTML = list.length ? list.map(x => `<article class="history-row"><span class="history-label">${escape(x.label)}</span><span class="history-meta">${escape(x.date)} · ${escape(x.extra)}</span><strong class="history-score">${escape(x.score)}<small> / ${escape(x.total)}</small></strong></article>`).join('') : `<div class="empty-state">${icon('book')}まだ記録はありません。<br>最初の冒険に出かけよう。</div>`;
  }
  function result() {
    enter('result');
    const level = levelInfo(state().xp);
    el('resultExpFill').style.width = `${level.current/3}%`;
    el('wrongSummary').textContent = w.length ? `間違えた問題 ${w.length}問` : '答えの確認';
    el('wrongDetails').open = w.length > 0;
    if (kind==='normal') el('rtitle').textContent='よくがんばったね！';
    if (kind==='review') el('rinfo').textContent=el('rinfo').textContent.split('　')[0];
    el('retry').textContent = kind==='boss' ? 'ボス20問にもう一度挑戦' : `${w.length}問を復習する`;
  }
  function sessionStarted(mode) {
    normalPausedAt = null;
    enter('quiz');
    el('quiz').dataset.kind = mode;
    el('quizTitle').textContent = mode==='boss' ? 'ボス戦' : mode==='review' ? '間違えた問題を復習' : '今日の100問';
    requestPortraitLock();
    if (isLandscape() || document.hidden) pauseQuiz();
  }
  function pauseQuiz() {
    if (document.body.dataset.page!=='quiz' || normalPausedAt!==null) return false;
    normalPausedAt = Date.now();
    clearInterval(tick);
    el('quizContent').classList.add('hide');
    el('quizContent').inert = true;
    el('quizPaused').classList.remove('hide');
    return true;
  }
  function resumeQuiz() {
    if (isLandscape() || document.hidden || dialog.open || normalPausedAt===null || document.body.dataset.page!=='quiz') return;
    t0 += Date.now()-normalPausedAt;
    normalPausedAt=null;
    el('quizContent').classList.remove('hide');
    el('quizContent').inert=false;
    el('quizPaused').classList.add('hide');
    el('timer').textContent=fmt(Date.now()-t0);
    clearInterval(tick);
    tick=setInterval(()=>el('timer').textContent=fmt(Date.now()-t0),500);
  }
  function confirmExit(mode) {
    if (dialog.open) return Promise.resolve(false);
    lastFocus=document.activeElement;
    el('exitMessage').textContent=mode==='memory' ? '練習記録は残ります。\n途中終了ではEXPはもらえません。' : '途中の計算結果は記録されません。';
    return new Promise(resolve => {
      dialog.addEventListener('close', () => {
        const answer=dialog.returnValue==='leave';
        if (lastFocus?.isConnected && !isLandscape()) lastFocus.focus({preventScroll:true});
        resolve(answer);
      },{once:true});
      dialog.showModal();
      el('exitContinue').focus();
    });
  }
  async function exitQuiz() {
    const wasPaused=normalPausedAt!==null;
    pauseQuiz();
    if (await confirmExit('normal')) { clearInterval(tick); home(); }
    else if (!wasPaused) resumeQuiz();
  }
  function requestPortraitLock() {
    if (screen.orientation?.lock) screen.orientation.lock('portrait-primary').catch(()=>{});
  }
  function updateOrientation() {
    const blocked=isLandscape();
    el('orientationGuard').hidden=!blocked;
    el('appShell').inert=blocked;
    el('bottomNav').inert=blocked;
    if (blocked) {
      pauseQuiz();
      globalThis.MemoryUI?.pause();
      if (dialog.open) dialog.close('rotation');
    }
  }
  globalThis.AppUI={enter,beforeNavigate,home:renderHome,result,sessionStarted,gearBook,inputBlocked,isLandscape,soundSetting,soundButton,confirmExit,requestPortraitLock,pauseQuiz,resumeQuiz};

  // Keep every map marker and character in the same coordinate system as the artwork.
  const map=document.querySelector('.adventure-map');
  const world=document.createElement('div');world.className='map-world';
  while(map.firstChild)world.append(map.firstChild);
  map.append(world);
  // Fit the entire 3:2 map into its allocated space, including shorter Safari viewports.
  function fitMap() {
    const availableWidth=map.clientWidth,availableHeight=map.clientHeight;
    if(!availableWidth||!availableHeight)return;
    const width=Math.min(availableWidth,availableHeight*1.5);
    world.style.width=`${width}px`;
    world.style.height=`${width/1.5}px`;
  }
  new ResizeObserver(fitMap).observe(map);
  window.addEventListener('resize',fitMap);
  const originalShowHist=showHist;
  showHist=function(){originalShowHist();history();};
  const originalSound=renderSoundSetting;
  renderSoundSetting=function(){originalSound();soundSetting();};
  el('historyHot').onclick=()=>{historyTab='normal';showHist();};
  el('resultHistory').onclick=()=>{historyTab='normal';showHist();};
  el('historyNormal').onclick=()=>{historyTab='normal';history();};
  el('historyMemory').onclick=()=>{historyTab='memory';history();};
  el('settingsHot').onclick=showSettings;
  document.querySelectorAll('[data-settings]').forEach(button=>button.onclick=showSettings);
  el('navHome').onclick=home;
  el('navEquipment').onclick=showEquipment;
  el('navBooks').onclick=showGear;
  el('gearBookTab').onclick=showGear;
  el('quizBack').onclick=exitQuiz;
  el('quizPauseExit').onclick=exitQuiz;
  el('quizResume').onclick=resumeQuiz;
  el('exitContinue').onclick=()=>dialog.close('continue');
  el('exitConfirm').onclick=()=>dialog.close('leave');
  dialog.addEventListener('cancel',event=>{event.preventDefault();dialog.close('continue');});
  document.querySelectorAll('#rulesPage details').forEach(details=>details.addEventListener('toggle',()=>{
    if(details.open)document.querySelectorAll('#rulesPage details').forEach(other=>{if(other!==details)other.open=false;});
  }));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseQuiz();});
  document.addEventListener('keydown',event=>{
    if(document.body.dataset.page!=='quiz'||inputBlocked())return;
    const value=/^\d$/.test(event.key)?event.key:event.key==='Backspace'?'B':event.key==='Enter'?'E':null;
    if(value===null)return;
    event.preventDefault();if(!event.repeat)key(value);
  });
  landscape.addEventListener('change',updateOrientation);
  window.addEventListener('resize',updateOrientation);
  home();
  updateOrientation();
})();
