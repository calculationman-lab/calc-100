(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./memory-data.js'):root.MemoryData);if(typeof module==='object'&&module.exports)module.exports=api;else root.MemoryCore=api;})(globalThis,function(D){
  'use strict';
  const courses={recommended:'おすすめ（平方数＋小数と分数）',...D.categories,mix:'全問ミックス',weak:'苦手復習'};
  function memory(s){
    if(s.memoryTraining&&s.memoryTraining.version!==1)throw Error('この暗記記録は新しい版のアプリで開いてください。');
    return s.memoryTraining||{version:1,stats:{},attempts:0,completions:0,history:[],active:null};
  }
  function status(stat){return !stat||!(stat.correct+stat.wrong+stat.timeout)?'未挑戦':stat.streak>=3?'覚えた':'練習中';}
  function weakIds(m){return D.questions.filter(q=>{const s=m.stats[q.id];return s&&(s.wrong+s.timeout)>0&&s.streak<3;}).map(q=>q.id);}
  function pool(course,m){
    if(course==='weak'){const ids=weakIds(m),cats=new Set(ids.map(id=>D.byId[id].category));return ids.length?D.questions.filter(q=>cats.has(q.category)):[];}
    return D.questions.filter(q=>course==='mix'||(course==='recommended'?['square','decimal'].includes(q.category):q.category===course));
  }
  function nextQuestion(course,m,answers,rng=Math.random){
    const recentPairs=new Set(answers.slice(-3).map(a=>D.byId[a.id].pair));
    const eligible=pool(course,m).filter(q=>!recentPairs.has(q.pair));
    if(!eligible.length)throw Error('出題できる問題がありません。');
    // An error is eligible only after at least three intervening presentations.
    const due=answers.find((a,index)=>a.outcome!=='correct'&&answers.length-index>=4&&!answers.slice(index+1).some(b=>b.id===a.id)&&eligible.some(q=>q.id===a.id));
    if(due)return D.byId[due.id];
    const weak=new Set(weakIds(m));
    const ranked=eligible.map(q=>{
      const stat=m.stats[q.id],seen=answers.filter(a=>a.id===q.id).length,catCount=answers.filter(a=>D.byId[a.id].category===q.category).length;
      let weight=!stat?5:stat.streak>=3?1:3;
      if(weak.has(q.id))weight*=course==='weak'?12:2;
      weight/=1+seen*5;weight/=1+catCount/4;
      return {q,score:-Math.log(Math.max(1e-10,rng()))/weight};
    });
    ranked.sort((a,b)=>a.score-b.score);return ranked[0].q;
  }
  function clone(s){return JSON.parse(JSON.stringify(s));}
  function start(s,id,course){const out=clone(s),m=memory(out);out.memoryTraining=m;m.active={id,course,seq:0,failed:[],success:[],completed:false};return out;}
  function record(s,id,seq,questionId,outcome,at){
    if(!D.byId[questionId]||!['correct','wrong','timeout'].includes(outcome))throw Error('不正な回答記録');
    const out=clone(s),m=memory(out),a=m.active;
    if(!a||a.id!==id||a.completed)throw Error('学習セッションが変わりました。');
    if(seq<=a.seq)return out;
    if(seq!==a.seq+1||seq>20)throw Error('回答順が一致しません。');
    const stat=m.stats[questionId]||{correct:0,wrong:0,timeout:0,lastAsked:null,streak:0,lastSuccessSession:null};
    stat[outcome]++;stat.lastAsked=at;
    if(outcome==='correct'){if(!a.success.includes(questionId))a.success.push(questionId);}
    else {stat.streak=0;if(!a.failed.includes(questionId))a.failed.push(questionId);}
    m.stats[questionId]=stat;m.attempts++;a.seq=seq;out.memoryTraining=m;return out;
  }
  function complete(s,id,answers,at){
    const out=clone(s),m=memory(out),a=m.active;
    if(m.history.some(h=>h.id===id)||a&&a.id===id&&a.completed)return out;
    if(!a||a.id!==id||a.seq!==20||answers.length!==20)throw Error('20問の保存が完了していません。');
    const correct=answers.filter(x=>x.outcome==='correct').length;
    for(const qid of a.success){const stat=m.stats[qid];if(!a.failed.includes(qid)&&stat.lastSuccessSession!==id){stat.streak=Math.min(3,stat.streak+1);stat.lastSuccessSession=id;}}
    m.completions++;a.completed=true;
    m.history.push({id,course:a.course,at,correct,timeout:answers.filter(x=>x.outcome==='timeout').length,xp:correct,wrong:[...new Set(answers.filter(x=>x.outcome!=='correct').map(x=>x.id))]});
    m.history=m.history.slice(-40);out.xp=(out.xp||0)+correct;out.memoryTraining=m;return out;
  }
  class Deadline {
    constructor(now=()=>performance.now()){this.now=now;this.phase='idle';this.remaining=0;this.deadline=0;this.token=0;}
    enter(phase,duration){this.phase=phase;this.remaining=duration;this.deadline=this.now()+duration;return ++this.token;}
    left(){return this.phase==='paused'?this.remaining:Math.max(0,this.deadline-this.now());}
    resolve(token){if(this.phase!=='question'||token!==this.token)return null;const result=this.now()<this.deadline?'answer':'timeout';this.phase='saving';this.token++;return result;}
    pause(){if(!['question','feedback'].includes(this.phase))return false;this.savedPhase=this.phase;this.remaining=this.left();this.phase='paused';this.token++;return true;}
    resume(){if(this.phase!=='paused')return;return this.enter(this.savedPhase,this.remaining);}
    stop(){this.phase='idle';this.token++;}
  }
  return {courses,memory,status,weakIds,pool,nextQuestion,start,record,complete,Deadline};
});
