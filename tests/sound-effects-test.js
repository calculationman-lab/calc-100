const { createHarness } = require("./test-harness");

let passed=0;const failures=[];
function test(name,fn){try{fn();passed++}catch(e){failures.push(`${name}: ${e.message}`)}}
function assert(ok,msg){if(!ok)throw new Error(msg)}
function spyHarness(settings=null){const h=createHarness(null,settings);h.run('soundCalls=[];soundManager.playDigit=mode=>soundCalls.push(["digit",mode]);soundManager.playConfirm=mode=>soundCalls.push(["confirm",mode]);soundManager.playBackspace=()=>soundCalls.push(["backspace"])');return h}

test("初期値ON",()=>{const h=createHarness();assert(h.run("soundManager.enabled")===true,"初期値")});
test("OFF保存",()=>{const h=createHarness();h.run("soundManager.setEnabled(false)");assert(JSON.parse(h.store.get("calcRPGSettings")).soundEnabled===false,"OFF")});
test("再読込後OFF維持",()=>{const h=createHarness(null,{soundEnabled:false});assert(h.run("soundManager.enabled")===false,"再読込")});
test("ON保存",()=>{const h=createHarness(null,{soundEnabled:false});h.run("soundManager.setEnabled(true)");assert(JSON.parse(h.store.get("calcRPGSettings")).soundEnabled===true,"ON")});
test("数字キー音",()=>{const h=spyHarness();h.run('kind="normal";v="";key("7")');assert(h.run('JSON.stringify(soundCalls)')==='[["digit","normal"]]',"数字")});
test("決定キー音",()=>{const h=spyHarness();h.run('kind="normal";qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21}];i=0;w=[];v="20";key("E")');assert(h.run('soundCalls[0][0]')==="confirm","決定")});
test("空欄決定も操作音",()=>{const h=spyHarness();h.run('kind="normal";qs=[{x:10,y:10,o:"+",a:20}];i=0;v="";key("E")');assert(h.run('soundCalls[0][0]')==="confirm"&&h.run("i")===0,"空欄")});
test("戻るキー音",()=>{const h=spyHarness();h.run('v="12";key("B")');assert(h.run('soundCalls[0][0]')==="backspace"&&h.run("v")==="1","戻る")});
test("boss音ルート",()=>{const h=spyHarness();h.run('kind="boss";v="";key("1")');assert(h.run('soundCalls[0][1]')==="boss","boss")});
test("reviewはnormal音ルート",()=>{const h=spyHarness();h.run('kind="review";v="";key("1")');assert(h.run('soundCalls[0][1]')==="normal","review")});
test("OFF時はAudio生成なし",()=>{const h=createHarness(null,{soundEnabled:false});h.run('audioCreations=0;globalThis.AudioContext=function(){audioCreations++;this.state="running"};soundManager.playDigit("normal");soundManager.playConfirm("boss");soundManager.playBackspace()');assert(h.run("audioCreations")===0&&h.run("soundManager.createdContexts")===0,"生成された")});
test("正誤で決定音は同一",()=>{const h=spyHarness();h.run('kind="normal";qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21},{x:12,y:10,o:"+",a:22}];i=0;w=[];v="20";key("E");v="99";key("E")');assert(h.run('JSON.stringify(soundCalls)')==='[["confirm","normal"],["confirm","normal"]]',"音差分")});
test("エフェクトDOMを再利用",()=>{const h=spyHarness();h.run('kind="normal";v="";key("1");key("2")');assert(h.nodes.get("battleFeedback").classList.contains("fire"),"斬撃");h.run('qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21}];i=0;v="20";key("E")');assert(h.nodes.get("battleStage").classList.contains("shake"),"揺れ")});

const total=passed+failures.length;
if(failures.length){console.error(`Sound/effect tests: ${passed}/${total} passed`);failures.forEach(f=>console.error(`FAIL ${f}`));process.exit(1)}
console.log(`Sound/effect tests: ${passed}/${total} passed`);
