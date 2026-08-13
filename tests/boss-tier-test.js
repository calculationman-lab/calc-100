const { createHarness } = require("./test-harness");

let passed = 0;
const failures = [];
function test(name, fn) { try { fn(); passed++; } catch (error) { failures.push(`${name}: ${error.message}`); } }
function assert(ok, message) { if (!ok) throw new Error(message); }
function base(overrides = {}) { return { xp:0, clears:0, boss:true, tier:0, gear:{}, hist:[], dates:[], total:0, ...overrides }; }
function win(h, date="2026-08-13T03:00:00Z") { h.run(`qs=Array.from({length:20},()=>({x:20,y:10,o:"+",a:30}));w=[];t0=Date.now();kind="boss";finish(new Date(${JSON.stringify(date)}))`); }

const expected = [
  ["starter_dragon","はじまりの竜"], ["rock_golem","岩石ゴーレム"],
  ["black_iron_knight","黒鉄の騎士"], ["azure_crystal_dragon","蒼晶のドラゴン"],
  ["nether_demon_king","冥界の魔王"],
];

test("5ランクとボスの対応",()=>{const h=createHarness();expected.forEach(([id,name],tier)=>{const b=h.context.bossForTier(tier);assert(b.id===id&&b.name===name&&b.tier===tier,`tier ${tier}`)})});
for(const tier of [0,2,4]) test(`旧セーブ互換 tier ${tier}`,()=>{const h=createHarness({xp:40,tier,gear:{},hist:[],dates:[],total:0});const s=h.context.state();assert(s.tier===tier&&Object.keys(s.bossWins).length===5&&Object.values(s.bossWins).every(n=>n===0),"初期化")});

expected.forEach(([id,name],tier)=>test(`${name} 討伐記録`,()=>{const h=createHarness(base({tier}));h.setRandom(0);h.run(`activeBoss={...bossForTier(${tier})}`);win(h);const s=h.getState(),r=s.hist[0];assert(s.bossWins[id]===1,"討伐数");assert(r.bossId===id&&r.bossName===name&&r.tier===tier,"履歴");assert(s.xp===100&&s.total===20&&s.gear[`${tier}-0`]===1,"報酬")}));

test("失敗では討伐数を加算しない",()=>{const h=createHarness(base({tier:3}));h.run('activeBoss={...bossForTier(3)};qs=Array.from({length:20},()=>({x:20,y:10,o:"+",a:30}));w=[{x:20,y:10,o:"+",a:30,g:"0"}];t0=Date.now();kind="boss";finish(new Date())');const s=h.getState();assert(s.bossWins.azure_crystal_dragon===0&&s.hist.length===0&&s.boss,"失敗時")});
test("戦闘開始時のボスを固定",()=>{const h=createHarness(base({tier:1}));h.run('activeBoss={...bossForTier(1)};let s=state();s.tier=2;save(s)');win(h);const s=h.getState();assert(s.hist[0].bossId==="rock_golem"&&s.hist[0].tier===1&&s.bossWins.rock_golem===1,"固定されていない")});
test("ランクアップ結果に次ボスと武器",()=>{const gear={"0-0":1,"0-1":1,"0-2":1};const h=createHarness(base({gear}));h.setRandom(.99);h.run('activeBoss={...bossForTier(0)}');win(h);const s=h.getState(),text=h.nodes.get("loot").textContent;assert(s.tier===1&&text.includes("COMPLETE")&&text.includes("石の剣")&&text.includes("岩石ゴーレム"),"結果文")});
test("最高ランクは4で停止",()=>{const gear={"4-0":1,"4-1":1,"4-2":1};const h=createHarness(base({tier:4,gear}));h.setRandom(.99);h.run('activeBoss={...bossForTier(4)}');win(h);assert(h.getState().tier===4,"上限")});
test("図鑑に現在・未来・5体",()=>{const h=createHarness(base({tier:2,bossWins:{black_iron_knight:2}}));h.context.showBossBook();const html=h.nodes.get("bossCatalog").innerHTML;assert((html.match(/bossBookEntry/g)||[]).length===5&&html.includes("黒鉄の騎士")&&html.includes("現在のボス")&&html.includes("？？？")&&html.includes("討伐数：2体"),"図鑑")});

const total = passed + failures.length;
if (failures.length) { console.error(`Boss tier tests: ${passed}/${total} passed`); failures.forEach(f=>console.error(`FAIL ${f}`)); process.exit(1); }
console.log(`Boss tier tests: ${passed}/${total} passed`);
