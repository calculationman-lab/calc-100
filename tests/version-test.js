const fs=require("fs"),path=require("path");
const {createHarness}=require("./test-harness");
let passed=0;const failures=[];
function test(name,fn){try{fn();passed++}catch(e){failures.push(`${name}: ${e.message}`)}}
function assert(ok,msg){if(!ok)throw new Error(msg)}

test("APP_VERSIONはv17",()=>{const h=createHarness();assert(h.run("APP_VERSION")==="v17","APP_VERSION")});
test("TOP表示は100問計算RPG v17",()=>{const h=createHarness();assert(h.nodes.get("appVersion").textContent==="100問計算RPG v17","TOP表示")});
test("Service Workerはv17",()=>{const sw=fs.readFileSync(path.resolve(__dirname,"..","sw.js"),"utf8");assert(sw.includes('const CACHE="calc-rpg-v17"'),"SW")});
test("3か所の番号が一致",()=>{const h=createHarness(),shown=h.nodes.get("appVersion").textContent.match(/v\d+/)?.[0],app=h.run("APP_VERSION"),sw=fs.readFileSync(path.resolve(__dirname,"..","sw.js"),"utf8").match(/calc-rpg-(v\d+)/)?.[1];assert(shown===app&&app===sw,"不一致")});
test("バージョンはTOP内のfooter",()=>{const html=fs.readFileSync(path.resolve(__dirname,"..","index.html"),"utf8");assert(/<footer id="appVersion" class="appVersion"><\/footer>[\s\S]*<\/div><\/div>[\s\S]*<div id="quiz"/.test(html),"配置")});

const total=passed+failures.length;
if(failures.length){console.error(`Version tests: ${passed}/${total} passed`);failures.forEach(f=>console.error(`FAIL ${f}`));process.exit(1)}
console.log(`Version tests: ${passed}/${total} passed`);
