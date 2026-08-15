const fs=require("fs"),path=require("path");
const {createHarness}=require("./test-harness");
let passed=0;const failures=[];
function test(name,fn){try{fn();passed++}catch(e){failures.push(`${name}: ${e.message}`)}}
function assert(ok,msg){if(!ok)throw new Error(msg)}
const html=fs.readFileSync(path.resolve(__dirname,"..","index.html"),"utf8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];

test("敵ステージ内に斬撃とHIT",()=>{assert(/id="enemyStage"[\s\S]*id="enemyImage"[\s\S]*id="battleFeedback"[\s\S]*class="slashEffect"[\s\S]*class="hitText"/.test(html),"DOM配置")});
test("斬撃は赤系",()=>{const rule=css.match(/\.slashEffect\{([^}]*)\}/)?.[1]||"";assert(/#ff3b30|#ff4d4f|#8b0000/.test(rule),"赤色")});
test("HITは旧20pxの約3倍",()=>{const rule=css.match(/\.hitText\{([^}]*)\}/)?.[1]||"";assert(/60px/.test(rule),"HIT寸法")});
test("斬撃は旧5pxの約3倍",()=>{const rule=css.match(/\.slashEffect\{([^}]*)\}/)?.[1]||"";assert(/height:14px/.test(rule)&&/width:135%/.test(rule),"斬撃寸法")});
test("表示時間は140msの3倍",()=>{assert(/slashFlash 420ms/.test(css)&&/hitFlash 420ms/.test(css),"表示時間")});
test("数字入力では敵上演出なし",()=>{const h=createHarness();h.run('kind="normal";v="";key("7")');assert(!h.nodes.has("battleFeedback")||!h.nodes.get("battleFeedback").classList.contains("fire"),"数字発火")});
test("決定で演出と進行を待たない",()=>{const h=createHarness();h.run('kind="normal";qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21}];i=0;w=[];v="20";key("E")');assert(h.nodes.get("battleFeedback").classList.contains("fire")&&h.run("i")===1,"決定発火")});
test("正誤で同じ演出クラス",()=>{const h=createHarness();h.run('kind="normal";qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21},{x:12,y:10,o:"+",a:22}];i=0;w=[];v="20";key("E")');const right=h.nodes.get("battleFeedback").classList.contains("fire");h.run('v="99";key("E")');assert(right&&h.nodes.get("battleFeedback").classList.contains("fire"),"正誤差")});

const total=passed+failures.length;
if(failures.length){console.error(`Slash timing tests: ${passed}/${total} passed`);failures.forEach(f=>console.error(`FAIL ${f}`));process.exit(1)}
console.log(`Slash timing tests: ${passed}/${total} passed`);
