const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = html.match(/<script>([\s\S]*)<\/script>/)[1];
const store = new Map();
const nodes = new Map();

function node() {
  return {
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    innerHTML: "",
    textContent: "",
    onclick: null,
  };
}

const context = {
  console,
  Date,
  Math,
  JSON,
  Set,
  clearInterval() {},
  setInterval() { return 1; },
  addEventListener() {},
  confirm() { return true; },
  navigator: {},
  localStorage: {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
  },
  document: {
    body: node(),
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, node());
      return nodes.get(id);
    },
    querySelectorAll() { return []; },
  },
};

vm.createContext(context);
vm.runInContext(source, context);

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

const questions = context.gen(100);
assert(questions.length === 100, "100問を生成できません");
assert(questions.filter(q => q.o === "+").length === 50, "足し算が50問ではありません");
assert(questions.filter(q => q.o === "−").length === 50, "引き算が50問ではありません");
assert(questions.every(q => q.x >= 10 && q.x <= 99 && q.y >= 10 && q.y <= 99), "2桁以外の数があります");
assert(questions.filter(q => q.o === "−").every(q => q.x >= q.y && q.a >= 0), "負数の引き算があります");

store.set("calcRPG", JSON.stringify({ xp: 420, hist: [{ kind: "normal" }] }));
const legacy = context.state();
assert(legacy.xp === 420, "旧EXPを継承できません");
assert(legacy.clears === 0 && legacy.tier === 0 && legacy.total === 0, "不足フィールドの補完に失敗しました");
assert(Array.isArray(legacy.dates) && legacy.gear && typeof legacy.gear === "object", "旧データ補完が不完全です");
context.save(legacy);
assert(store.has("calcRPG"), "保存キーcalcRPGが維持されていません");

for (const id of ["startHot", "historyHot", "gearHot", "bossBookHot", "rulesHot", "quizBack"]) {
  assert(typeof nodes.get(id).onclick === "function", `${id}のクリック処理がありません`);
}
nodes.get("startHot").onclick();
assert(nodes.get("prog").textContent === "1/100", "通常100問を開始できません");
assert(nodes.get("prob").textContent.includes("="), "問題表示に失敗しました");

store.set("calcRPG", JSON.stringify({ xp: 0, clears: 0, boss: false, tier: 0, gear: {}, hist: [], dates: [], total: 0 }));
for (let n = 0; n < 3; n++) {
  vm.runInContext('kind="normal";qs=Array.from({length:100},()=>({x:10,y:10,o:"+",a:20}));w=[];t0=Date.now();finish()', context);
}
const afterThree = JSON.parse(store.get("calcRPG"));
assert(afterThree.clears === 3 && afterThree.boss === true, "100問×3回でボスが出現しません");

vm.runInContext('kind="boss";qs=Array.from({length:20},()=>({x:10,y:10,o:"+",a:20}));w=[{x:10,y:10,o:"+",a:20,g:"19"}];t0=Date.now();finish()', context);
assert(JSON.parse(store.get("calcRPG")).boss === true, "ボス戦1問誤答でボス状態が失われました");

context.Math = Object.create(Math);
context.Math.random = () => 0;
vm.runInContext('kind="boss";qs=Array.from({length:20},()=>({x:10,y:10,o:"+",a:20}));w=[];t0=Date.now();finish()', context);
const afterBoss = JSON.parse(store.get("calcRPG"));
assert(afterBoss.boss === false && afterBoss.gear["0-0"] === 1, "ボス撃破時の防具ドロップに失敗しました");

console.log("Smoke tests passed: questions, difficulty, navigation, boss progression, drops, and calcRPG compatibility");
