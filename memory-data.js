(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MemoryData = api;
})(globalThis, function () {
  'use strict';
  const categories = { square:'平方数', decimal:'小数と分数', percent:'分数と百分率', product:'100・1000の組み合わせ', time:'時間' };
  const fractions = [
    ['1/2','0.5','50'],['1/4','0.25','25'],['3/4','0.75','75'],
    ['1/5','0.2','20'],['2/5','0.4','40'],['3/5','0.6','60'],['4/5','0.8','80'],
    ['1/8','0.125','12.5'],['3/8','0.375','37.5'],['5/8','0.625','62.5'],['7/8','0.875','87.5'],
    ['1/10','0.1','10'],['3/10','0.3','30'],['7/10','0.7','70'],['9/10','0.9','90'],
    ['1/20','0.05'],['3/20','0.15'],['1/25','0.04'],['2/25','0.08'],['3/25','0.12']
  ];
  const products = [[25,4,100],[20,5,100],[50,2,100],[125,8,1000],[250,4,1000],[200,5,1000],[500,2,1000],[40,25,1000],[50,20,1000],[100,10,1000]];
  const times = [[6,'0.1'],[10,'1/6'],[12,'0.2'],[15,'1/4'],[20,'1/3'],[24,'0.4'],[30,'0.5'],[40,'2/3'],[45,'0.75'],[48,'0.8'],[50,'5/6'],[54,'0.9'],[60,'1'],[90,'1.5'],[120,'2']];
  function rational(value) {
    const text=String(value); let n,d;
    if (/^\d+\/\d+$/.test(text)) [n,d]=text.split('/').map(BigInt);
    else if (/^\d+(\.\d+)?$/.test(text)) { const [a,b='']=text.split('.'); n=BigInt(a+b); d=10n**BigInt(b.length); }
    else throw Error('不正な数値: '+text);
    if(d===0n)throw Error('分母が0です');
    let a=n,b=d;while(b){const t=a%b;a=b;b=t;}return [n/a,d/a];
  }
  function valueKey(value,unit='') { let [n,d]=rational(value); if(unit==='％')d*=100n;if(unit==='時間')n*=60n;let a=n,b=d;while(b){const t=a%b;a=b;b=t;}return `${n/a}/${d/a}:${unit==='時間'||unit==='分'?'time':'number'}`; }
  function equal(a,b,unitA='',unitB=unitA){return valueKey(a,unitA)===valueKey(b,unitB);}
  const questions=[];
  function add(category,pair,direction,prompt,answer,unit,form,correction,source){questions.push({id:`${category}-${pair}-${direction}`,category,pair:`${category}-${pair}`,direction,prompt,answer:String(answer),unit,form,correction,source});}
  for(let n=11;n<=25;n++){
    const correction=`${n}×${n}＝${n*n}`;
    add('square',String(n),'A',`${n}×${n}＝？`,n*n,'','integer',correction,[n,n*n]);
    add('square',String(n),'B',`□×□＝${n*n}`,n,'','integer',correction,[n,n*n]);
  }
  fractions.forEach(([f,d,p],i)=>{
    const id='F'+String(i+1).padStart(2,'0');
    add('decimal',id,'A',`${f}＝？（小数）`,d,'','decimal',`${f}＝${d}`,[f,d]);
    add('decimal',id,'B',`${d}＝？（分数）`,f,'','fraction',`${d}＝${f}`,[f,d]);
    if(p){add('percent',id,'A',`${f}＝？％`,p,'％','decimal',`${f}＝${p}％`,[f,p]);add('percent',id,'B',`${p}％＝？（分数）`,f,'','fraction',`${p}％＝${f}`,[f,p]);}
  });
  products.forEach(([a,b,p],i)=>{const id='P'+String(i+1).padStart(2,'0'),correction=`${a}×${b}＝${p}`;add('product',id,'A',`${a}×□＝${p}`,b,'','integer',correction,[a,b,p]);add('product',id,'B',`□×${b}＝${p}`,a,'','integer',correction,[a,b,p]);});
  times.forEach(([m,h],i)=>{const id='T'+String(i+1).padStart(2,'0'),correction=`${m}分＝${h}時間`;add('time',id,'A',`${m}分＝？時間`,h,'時間',h.includes('/')?'fraction':'decimal',correction,[m,h]);add('time',id,'B',`${h}時間＝？分`,m,'分','integer',correction,[m,h]);});
  function shuffle(a,rng=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  // Candidates share category, direction, representation and unit. Compare exact values, not labels.
  for(const q of questions){
    const pool=questions.filter(x=>x.category===q.category&&x.direction===q.direction&&x.form===q.form&&x.unit===q.unit).map(x=>x.answer);
    // The fixed time bank has only one single-digit minute, one three-digit
    // minute and one two-decimal hour. Add nearby false values for fair choices.
    if(q.category==='time'&&q.unit==='分')pool.push('3','5','8','9','100','150','180');
    if(q.category==='time'&&q.unit==='時間'&&q.form==='decimal')pool.push('0.25','1.25','1.75');
    const distinct=[...new Map(pool.map(v=>[valueKey(v,q.unit),v])).values()];
    const num=v=>{const [n,d]=rational(v);return Number(n)/Number(d);};
    q.distractors=distinct.filter(v=>!equal(v,q.answer,q.unit)).sort((a,b)=>{
      // Prefer equal-length notation so the correct option does not stand out
      // solely because it has three decimal places or a longer denominator.
      const shapeA=Number(a.length!==q.answer.length),shapeB=Number(b.length!==q.answer.length);
      return shapeA-shapeB||Math.abs(num(a)-num(q.answer))-Math.abs(num(b)-num(q.answer));
    }).slice(0,3);
    if(q.distractors.length<3)throw Error('選択肢不足: '+q.id);
  }
  function choices(q,rng=Math.random){return shuffle([q.answer,...shuffle(q.distractors,rng).slice(0,3)],rng);}
  function validate(){
    if(questions.length!==150||new Set(questions.map(q=>q.id)).size!==150)throw Error('問題数またはID');
    const expected={square:30,decimal:40,percent:30,product:20,time:30};
    for(const [cat,n] of Object.entries(expected))if(questions.filter(q=>q.category===cat).length!==n)throw Error('分類の問題数');
    for(const q of questions){
      const [a,b,c]=q.source;
      if(q.category==='square'&&a*a!==b)throw Error(q.id);
      if(q.category==='decimal'&&!equal(a,b))throw Error(q.id);
      if(q.category==='percent'&&!equal(a,b,'','％'))throw Error(q.id);
      if(q.category==='product'&&a*b!==c)throw Error(q.id);
      if(q.category==='time'&&!equal(a,b,'分','時間'))throw Error(q.id);
      const expectedAnswer=q.category==='square'?(q.direction==='A'?b:a):q.category==='product'?(q.direction==='A'?b:a):(q.direction==='A'?b:a);
      if(!equal(q.answer,expectedAnswer))throw Error('正答: '+q.id);
      if(new Set([q.answer,...q.distractors].map(v=>valueKey(v,q.unit))).size!==q.distractors.length+1)throw Error('同値の選択肢: '+q.id);
    }
    return true;
  }
  validate();
  return {categories,questions,byId:Object.fromEntries(questions.map(q=>[q.id,q])),rational,valueKey,equal,choices,shuffle,validate};
});
