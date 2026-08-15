const fs=require("fs"),path=require("path");
const {createHarness}=require("./test-harness");
const html=fs.readFileSync(path.resolve(__dirname,"..","index.html"),"utf8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
let passed=0;const failures=[];
function test(name,fn){try{fn();passed++}catch(e){failures.push(`${name}: ${e.message}`)}}
function assert(ok,msg){if(!ok)throw new Error(msg)}
test("完成画像を画面背景にしない",()=>assert(!/background(?:-image)?\s*:[^;]*(10_52_19|10_52_26|10_52_38)/i.test(css),"参照画像が背景です"));
test("TOPを独立部品で構築",()=>assert(/class="rpgGrid"/.test(html)&&/class="startButton startQuest"/.test(html)&&/class="menuGrid topMenuGrid"/.test(html),"TOP構造"));
test("学習ヘッダー要素",()=>["mode","prog","timer","quizSoundToggle","quizBack"].forEach(id=>assert(html.includes(`id="${id}"`),id)));
test("敵HPと対向する冒険者",()=>assert(/id="enemyHpFill"/.test(html)&&/class="heroFighter"/.test(html),"戦闘フィールド"));
test("結果3指標と導線",()=>["score","rinfo","resultXp","retry","resultHistory"].forEach(id=>assert(html.includes(`id="${id}"`),id)));
test("4画面幅レスポンシブ基盤",()=>assert(/max-width:1040px/.test(css)&&/max-width:600px/.test(css)&&/clamp\(/.test(css),"responsive"));
test("数字では斬撃せず決定で斬撃",()=>{const h=createHarness();h.run('kind="normal";v="";key("7")');assert(!h.nodes.has("battleFeedback"),"数字斬撃");h.run('qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21}];i=0;w=[];v="20";key("E")');assert(h.nodes.get("battleFeedback").classList.contains("fire"),"決定斬撃")});
const total=passed+failures.length;
if(failures.length){console.error(`UI rebuild tests: ${passed}/${total} passed`);failures.forEach(f=>console.error(`FAIL ${f}`));process.exit(1)}
console.log(`UI rebuild tests: ${passed}/${total} passed`);
