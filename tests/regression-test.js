const { createHarness } = require("./test-harness");

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failures.push(`${name}: ${error.message}`); }
}
function assert(ok, message) { if (!ok) throw new Error(message); }
function base(overrides = {}) { return { xp:0, clears:0, boss:false, tier:0, gear:{}, hist:[], dates:[], total:0, ...overrides }; }
function sessionCode(kind, count, wrong, date) {
  return `kind=${JSON.stringify(kind)};qs=Array.from({length:${count}},(_,n)=>({x:20+n%70,y:10,o:"+",a:30+n%70}));w=qs.slice(0,${wrong}).map(q=>({...q,g:"0"}));t0=Date.now();finish(new Date(${JSON.stringify(date)}))`;
}

test("問題数100",()=>{const h=createHarness();assert(h.context.gen(100).length===100,"問題数")});
test("足し算50",()=>{const h=createHarness(),q=h.context.gen(100);assert(q.filter(x=>x.o==="+").length===50,"足し算")});
test("引き算50",()=>{const h=createHarness(),q=h.context.gen(100);assert(q.filter(x=>x.o==="−").length===50,"引き算")});
test("全て2桁",()=>{const h=createHarness(),q=h.context.gen(100);assert(q.every(x=>x.x>=10&&x.x<=99&&x.y>=10&&x.y<=99),"2桁")});
test("引き算非負",()=>{const h=createHarness(),q=h.context.gen(100);assert(q.filter(x=>x.o==="−").every(x=>x.a>=0),"負数")});
test("完全重複なし",()=>{const h=createHarness(),q=h.context.gen(100),u=new Set(q.map(x=>`${x.o}:${x.x}:${x.y}`));assert(u.size===100,"重複")});

test("空欄決定で進まない",()=>{const h=createHarness();h.run('qs=[{x:10,y:10,o:"+",a:20}];i=0;v="";key("E")');assert(h.run("i")===0,"進行した")});
test("最大3桁入力",()=>{const h=createHarness();h.run('qs=[{x:10,y:10,o:"+",a:20}];i=0;v="";key("1");key("2");key("3");key("4")');assert(h.run("v")==="123","桁数")});
test("戻るキー",()=>{const h=createHarness();h.run('qs=[{x:10,y:10,o:"+",a:20}];i=0;v="12";key("B")');assert(h.run("v")==="1","削除")});
test("正答判定",()=>{const h=createHarness();h.run('qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21}];i=0;w=[];v="20";key("E")');assert(h.run("i")===1&&h.run("w.length")===0,"正答")});
test("誤答判定",()=>{const h=createHarness();h.run('qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21}];i=0;w=[];v="19";key("E")');assert(h.run("i")===1&&h.run("w.length")===1,"誤答")});

for(const [score,gain] of [[0,100],[89,100],[90,120],[94,120],[95,130],[99,130],[100,150]])
  test(`EXP境界 ${score}点`,()=>{const h=createHarness();assert(h.context.normalGain(score,1)===gain,`${gain}でない`)});

for(const [xp,lv,current] of [[0,1,0],[299,1,299],[300,2,0],[301,2,1],[599,2,299],[600,3,0]])
  test(`Lv境界 ${xp}`,()=>{const h=createHarness(),v=h.context.levelInfo(xp);assert(v.level===lv&&v.current===current,"Lv/ゲージ")});

for(const [days,bonus] of [[1,0],[2,10],[3,20],[4,30],[5,40],[6,50],[7,50]])
  test(`連続${days}日`,()=>{const h=createHarness();assert(h.context.streakBonus(days)===bonus,"ボーナス")});
test("連続中断",()=>{const h=createHarness();assert(h.context.streak(base({dates:["2026-08-01","2026-08-03"]}))===1,"中断後")});
test("同日重複は1日",()=>{const h=createHarness();assert(h.context.streak(base({dates:["2026-08-01","2026-08-01"]}))===1,"重複")});
test("昨日から継続予定の表示",()=>{const h=createHarness();assert(h.context.bonusStreak(base({dates:["2026-08-12"]}),new Date(2026,7,13))===2,"翌日表示")});
test("数日休んだ後の表示",()=>{const h=createHarness();assert(h.context.bonusStreak(base({dates:["2026-08-01","2026-08-02"]}),new Date(2026,7,13))===1,"休止表示")});

test("通常完了は1回だけ加算",()=>{const h=createHarness(base());h.run(sessionCode("normal",100,8,"2026-08-13T03:00:00Z"));const s=h.getState();assert(s.clears===1&&s.total===100&&s.hist.length===1,"通常完了")});
test("同日2回は履歴2件・冒険1日",()=>{const h=createHarness(base());h.run(sessionCode("normal",100,0,"2026-08-13T03:00:00Z"));h.run(sessionCode("normal",100,0,"2026-08-13T05:00:00Z"));const s=h.getState();assert(s.clears===2&&s.hist.length===2&&new Set(s.dates).size===1,"同日複数")});
test("3回でボス出現",()=>{const h=createHarness(base());for(let n=0;n<3;n++)h.run(sessionCode("normal",100,0,`2026-08-${13+n}T03:00:00Z`));const s=h.getState();assert(s.clears===3&&s.boss,"ボス出現")});
test("1・2回目はボス未出現",()=>{const h=createHarness(base());h.run(sessionCode("normal",100,0,"2026-08-13T03:00:00Z"));assert(!h.getState().boss&&h.getState().clears===1,"1回目");h.run(sessionCode("normal",100,0,"2026-08-14T03:00:00Z"));assert(!h.getState().boss&&h.getState().clears===2,"2回目")});
test("ボス状態をTOPで維持",()=>{const h=createHarness(base({boss:true}));h.context.home();assert(!h.nodes.get("bossBtn").classList.contains("hide"),"挑戦ボタン")});

test("復習は二重進行なし",()=>{const h=createHarness(base());h.run(sessionCode("normal",100,8,"2026-08-13T03:00:00Z"));const before=h.getState();h.nodes.get("retry").onclick();assert(h.run("kind")==="review"&&h.run("qs.length")===8,"review開始");h.run('w=[];i=qs.length;t0=Date.now();finish(new Date("2026-08-13T04:00:00Z"))');const after=h.getState();assert(after.xp===before.xp&&after.clears===1&&after.hist.length===1&&after.total===108&&!after.boss,"二重加算")});
test("復習タイマー再開",()=>{const h=createHarness(base());h.run(sessionCode("normal",100,2,"2026-08-13T03:00:00Z"));const n=h.timerStats.started;h.nodes.get("retry").onclick();assert(h.timerStats.started===n+1&&h.nodes.get("timer").textContent==="0分00秒","タイマー")});

test("ボス19点は失敗",()=>{const h=createHarness(base({boss:true}));h.run(sessionCode("boss",20,1,"2026-08-13T03:00:00Z"));const s=h.getState();assert(s.boss&&s.xp===0&&s.total===0&&Object.keys(s.gear).length===0&&s.hist.length===0,"19/20")});
test("ボス0点は失敗",()=>{const h=createHarness(base({boss:true}));h.run(sessionCode("boss",20,20,"2026-08-13T03:00:00Z"));assert(h.getState().boss,"0/20")});
test("ボス再挑戦は20問",()=>{const h=createHarness(base({boss:true}));h.run(sessionCode("boss",20,1,"2026-08-13T03:00:00Z"));h.nodes.get("retry").onclick();assert(h.run('kind==="boss"&&qs.length===20'),"フル再挑戦")});
test("ボス20点は成功",()=>{const h=createHarness(base({boss:true}));h.setRandom(0);h.run(sessionCode("boss",20,0,"2026-08-13T03:00:00Z"));const s=h.getState();assert(!s.boss&&s.xp===100&&s.total===20&&s.hist.length===1,"成功")});

for(const [part,random] of [[0,0],[1,.25],[2,.5],[3,.75]])
  test(`防具部位${part}ドロップ`,()=>{const h=createHarness(base({boss:true}));h.setRandom(random);h.run(sessionCode("boss",20,0,"2026-08-13T03:00:00Z"));assert(h.getState().gear[`0-${part}`]===1,"部位")});
test("防具重複",()=>{const h=createHarness(base({boss:true,gear:{"0-0":1}}));h.setRandom(0);h.run(sessionCode("boss",20,0,"2026-08-13T03:00:00Z"));assert(h.getState().gear["0-0"]===2&&h.getState().tier===0,"重複")});

for(const tier of [0,1,2,3])
  test(`ランク解放 ${tier}→${tier+1}`,()=>{const gear={};for(let p=0;p<3;p++)gear[`${tier}-${p}`]=1;const h=createHarness(base({boss:true,tier,gear}));h.setRandom(.99);h.run(sessionCode("boss",20,0,"2026-08-13T03:00:00Z"));const s=h.getState();assert(s.tier===tier+1&&s.gear[`${tier}-3`]===1,"解放")});
test("最高ランク上限",()=>{const gear={"4-0":1,"4-1":1,"4-2":1};const h=createHarness(base({boss:true,tier:4,gear}));h.setRandom(.99);h.run(sessionCode("boss",20,0,"2026-08-13T03:00:00Z"));assert(h.getState().tier===4,"tier上限")});
test("解放武器表示",()=>{const h=createHarness(base({tier:2}));h.context.renderTopEquipment(h.context.state());assert(h.nodes.get("equipOverlay").innerHTML.includes("鉄の剣"),"武器")});
test("図鑑重複表示",()=>{const h=createHarness(base({gear:{"0-0":2}}));h.context.showGear();assert(h.nodes.get("gear").innerHTML.includes("×2"),"図鑑")});

test("今日未完了",()=>{const h=createHarness(base());assert(h.context.todayNormal(h.context.state(),new Date("2026-08-13T03:00:00Z"))===null,"未完了")});
test("今日完了は最新通常",()=>{const s=base({hist:[{kind:"normal",total:100,date:"2026-08-13",score:80,time:1},{kind:"boss",total:20,date:"2026-08-13",score:20,time:2},{kind:"normal",total:100,date:"2026-08-13",score:96,time:342000}]});const h=createHarness(s),v=h.context.todayNormal(h.context.state(),new Date(2026,7,13));assert(v.score===96,"最新通常")});
test("通常完了で日次成立",()=>{const h=createHarness(base());h.run(sessionCode("normal",100,4,"2026-08-13T03:00:00Z"));assert(h.context.todayNormal(h.context.state(),new Date(2026,7,13)).score===96,"日次成立")});
test("復習後も通常の日次結果を維持",()=>{const h=createHarness(base());h.run(sessionCode("normal",100,8,"2026-08-13T03:00:00Z"));h.run(sessionCode("review",8,0,"2026-08-13T04:00:00Z"));assert(h.context.todayNormal(h.context.state(),new Date(2026,7,13)).score===92,"日次維持")});
test("復習は通常履歴に入らない",()=>{const h=createHarness(base());h.run(sessionCode("review",8,0,"2026-08-13T03:00:00Z"));assert(h.getState().hist.length===0,"復習履歴")});
test("ボス失敗は履歴なし",()=>{const h=createHarness(base({boss:true}));h.run(sessionCode("boss",20,1,"2026-08-13T03:00:00Z"));assert(h.getState().hist.length===0,"失敗履歴")});

test("途中離脱キャンセル",()=>{const h=createHarness(base());h.nodes.get("startHot").onclick();h.setConfirm(false);h.nodes.get("quizBack").onclick();assert(!h.nodes.get("quiz").classList.contains("hide")&&h.getState().clears===0,"キャンセル")});
test("途中離脱OKは記録なし",()=>{const h=createHarness(base());h.nodes.get("startHot").onclick();h.setConfirm(true);h.nodes.get("quizBack").onclick();const s=h.getState();assert(s.clears===0&&s.hist.length===0&&s.xp===0,"途中記録")});

test("localStorage空",()=>{const h=createHarness();assert(h.context.state().xp===0&&h.context.state().hist.length===0,"空")});
test("localStorage旧形式",()=>{const h=createHarness({xp:420,hist:[{kind:"normal"}]});const s=h.context.state();assert(s.xp===420&&s.hist.length===1&&s.clears===0&&s.gear&&s.dates,"旧形式")});
test("localStorage壊れたJSON",()=>{const h=createHarness("{broken");assert(h.context.state().xp===0,"破損")});

const total = passed + failures.length;
if (failures.length) {
  console.error(`Regression tests: ${passed}/${total} passed`);
  failures.forEach(f => console.error(`FAIL ${f}`));
  process.exit(1);
}
console.log(`Regression tests: ${passed}/${total} passed`);
