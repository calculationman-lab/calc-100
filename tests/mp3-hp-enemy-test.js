const fs=require("fs"),path=require("path");
const {createHarness}=require("./test-harness");
let passed=0;const failures=[];
function test(name,fn){try{fn();passed++}catch(e){failures.push(`${name}: ${e.message}`)}}
function assert(ok,msg){if(!ok)throw new Error(msg)}
function questions(n){return Array.from({length:n},(_,i)=>({x:20+i%70,y:10,o:"+",a:30+i%70}))}
function installAudio(h,{fail=false}={}){h.run(`audioPlays=[];audioPauses=0;globalThis.Audio=function(src){this.src=src;this.currentTime=0;this.preload="";this.__failed=false;this.addEventListener=()=>{};this.pause=()=>audioPauses++;this.play=()=>{audioPlays.push(src);${fail?'throw new Error("load failed")':'return Promise.resolve()'}}}`)}

test("指定MP3ファイルが存在",()=>{const root=path.resolve(__dirname,"..");assert(fs.statSync(path.join(root,"assets/sounds/digit.mp3")).size===25076,"digit");assert(fs.statSync(path.join(root,"assets/sounds/confirm.mp3")).size===54144,"confirm")});
test("digitはMP3のみで二重再生なし",()=>{const h=createHarness();installAudio(h);h.run('fallbacks=0;soundManager.playProfile=()=>fallbacks++;soundManager.playDigit("normal")');assert(h.run('audioPlays[0].endsWith("assets/sounds/digit.mp3")&&fallbacks===0'),"digit経路")});
test("confirmはMP3のみで二重再生なし",()=>{const h=createHarness();installAudio(h);h.run('fallbacks=0;soundManager.playProfile=()=>fallbacks++;soundManager.playConfirm("boss")');assert(h.run('audioPlays[0].endsWith("assets/sounds/confirm.mp3")&&fallbacks===0'),"confirm経路")});
test("数字0～9はすべて同じdigit音",()=>{const h=createHarness();installAudio(h);h.run('v="";kind="normal";for(const k of "0123456789")key(k)');assert(h.run('audioPlays.length===10&&audioPlays.every(x=>x.endsWith("assets/sounds/digit.mp3"))'),"数字音")});
test("正誤とも同じconfirm音",()=>{const h=createHarness();installAudio(h);h.run(`kind="normal";qs=${JSON.stringify(questions(3))};i=0;w=[];v="30";key("E");v="99";key("E")`);assert(h.run('audioPlays.length===2&&audioPlays.every(x=>x.endsWith("assets/sounds/confirm.mp3"))'),"正誤分岐")});
test("MP3失敗時のみWeb Audioフォールバック",()=>{const h=createHarness();installAudio(h,{fail:true});h.run('fallbacks=0;soundManager.playProfile=()=>fallbacks++;soundManager.playDigit("normal")');assert(h.run("fallbacks")===1,"fallback")});
test("sound OFF時はMP3も生成音も鳴らない",()=>{const h=createHarness(null,{soundEnabled:false});installAudio(h);h.run('fallbacks=0;soundManager.playProfile=()=>fallbacks++;soundManager.playDigit("normal");soundManager.playConfirm("boss")');assert(h.run("audioPlays.length===0&&fallbacks===0"),"OFF")});
test("MP3 poolは固定数で再利用",()=>{const h=createHarness();installAudio(h);h.run('for(let n=0;n<20;n++)soundManager.playDigit("normal")');assert(h.run("soundManager.audioPools.digit.length")===4&&h.run("audioPlays.length")===20,"pool")});

test("通常開始HP 100/100",()=>{const h=createHarness();h.context.startSession(questions(100),"normal");assert(h.nodes.get("enemyHpText").textContent==="100 / 100","開始HP")});
test("通常1問後HP 99/100",()=>{const h=createHarness();h.context.startSession(questions(100),"normal");h.run('v=String(qs[0].a);key("E")');assert(h.nodes.get("enemyHpText").textContent==="99 / 100","1問後")});
test("通常完了時HP 0/100",()=>{const h=createHarness();h.context.startSession(questions(100),"normal");h.run('i=99;v=String(qs[99].a);key("E")');assert(h.nodes.get("enemyHpText").textContent==="0 / 100","完了HP")});
test("ボス開始HP 20/20",()=>{const h=createHarness({xp:0,clears:3,boss:true,tier:1,gear:{},hist:[],dates:[],total:0});h.run('activeBoss={...bossForTier(1)}');h.context.startSession(questions(20),"boss");assert(h.nodes.get("enemyHpText").textContent==="20 / 20","boss開始")});
test("ボス1問後HP 19/20",()=>{const h=createHarness({tier:1,boss:true});h.run('activeBoss={...bossForTier(1)}');h.context.startSession(questions(20),"boss");h.run('v=String(qs[0].a);key("E")');assert(h.nodes.get("enemyHpText").textContent==="19 / 20","boss1問")});
test("ボス完了時HP 0/20",()=>{const h=createHarness({tier:1,boss:true});h.run('activeBoss={...bossForTier(1)}');h.context.startSession(questions(20),"boss");h.run('i=19;v=String(qs[19].a);key("E")');assert(h.nodes.get("enemyHpText").textContent==="0 / 20","boss完了")});

test("通常敵を1体選びセッション中固定",()=>{const h=createHarness();h.context.startSession(questions(100),"normal");const before=h.nodes.get("enemyName").textContent;assert(h.run("ENEMIES.some(e=>e.name===activeEnemy.name)"),"通常敵");h.run('v=String(qs[0].a);key("E")');assert(h.nodes.get("enemyName").textContent===before,"固定")});
test("tier対応ボス名と画像",()=>{const h=createHarness({tier:2,boss:true});h.run('activeBoss={...bossForTier(2)}');h.context.startSession(questions(20),"boss");assert(h.nodes.get("enemyName").textContent==="黒鉄の騎士"&&h.nodes.get("enemyImage").src.endsWith("boss_iron.png"),"tier boss")});
test("Service WorkerにMP3と敵画像",()=>{const sw=fs.readFileSync(path.resolve(__dirname,"..","sw.js"),"utf8");assert(sw.includes('assets/sounds/digit.mp3')&&sw.includes('assets/sounds/confirm.mp3')&&sw.includes('ENEMY_ASSETS')&&sw.includes('calc-rpg-v13'),"SW")});

const total=passed+failures.length;
if(failures.length){console.error(`MP3/HP/enemy tests: ${passed}/${total} passed`);failures.forEach(f=>console.error(`FAIL ${f}`));process.exit(1)}
console.log(`MP3/HP/enemy tests: ${passed}/${total} passed`);
