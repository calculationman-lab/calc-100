const { createHarness } = require("./test-harness");

let passed=0;const failures=[];
function test(name,fn){try{fn();passed++}catch(e){failures.push(`${name}: ${e.message}`)}}
function assert(ok,msg){if(!ok)throw new Error(msg)}
function audioHarness(){const h=createHarness();h.run(`
audioStats={osc:0,noise:0,gain:0,compressor:0,connections:0};
function param(){return{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}}
function node(){return{connect(){audioStats.connections++},start(){},stop(){}}}
globalThis.AudioContext=function(){this.state="running";this.currentTime=0;this.sampleRate=8000;this.destination=node();this.resume=()=>Promise.resolve();this.createGain=()=>{audioStats.gain++;return{...node(),gain:param()}};this.createDynamicsCompressor=()=>{audioStats.compressor++;return{...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}};this.createBuffer=(c,l)=>({getChannelData:()=>new Float32Array(l)});this.createOscillator=()=>{audioStats.osc++;return{...node(),type:"",frequency:param()}};this.createBufferSource=()=>{audioStats.noise++;return{...node(),buffer:null}};this.createBiquadFilter=()=>({...node(),type:"",frequency:param(),Q:param()})};
`);return h}

test("通常数字は旧値より大幅増",()=>{const h=createHarness();assert(h.run("SOUND_PROFILES.normalDigit.attackGain")>.014*5,"増幅不足")});
test("通常決定は通常数字より強い",()=>{const h=createHarness();assert(h.run("SOUND_PROFILES.normalConfirm.attackGain>SOUND_PROFILES.normalDigit.attackGain&&SOUND_PROFILES.normalConfirm.bodyGain>SOUND_PROFILES.normalDigit.bodyGain"),"通常相対")});
test("ボス数字は通常数字より強い",()=>{const h=createHarness();assert(h.run("SOUND_PROFILES.bossDigit.attackGain>SOUND_PROFILES.normalDigit.attackGain&&SOUND_PROFILES.bossDigit.noiseGain>SOUND_PROFILES.normalDigit.noiseGain"),"boss数字")});
test("ボス決定が最強",()=>{const h=createHarness();assert(h.run("SOUND_PROFILES.bossConfirm.attackGain>SOUND_PROFILES.normalConfirm.attackGain&&SOUND_PROFILES.bossConfirm.bodyGain>SOUND_PROFILES.bossDigit.bodyGain&&SOUND_PROFILES.bossConfirm.noiseGain>SOUND_PROFILES.normalConfirm.noiseGain"),"最強")});
test("Master GainとCompressorを生成",()=>{const h=audioHarness();h.run('soundManager.playDigit("normal")');assert(h.run("audioStats.compressor")===1&&h.run("soundManager.masterGain.gain.value")===.78&&h.run("soundManager.compressor.ratio.value")===4,"共通出力")});
test("Attack Body Noiseの3層",()=>{const h=audioHarness();h.run('soundManager.playConfirm("normal")');assert(h.run("audioStats.osc")===2&&h.run("audioStats.noise")===1,"3層")});
test("OFF時は全ノード非生成",()=>{const h=audioHarness();h.run('soundManager.setEnabled(false);soundManager.playConfirm("boss")');assert(h.run("audioStats.osc+audioStats.noise+audioStats.compressor")===0,"OFF発音")});
test("reviewはnormalプロファイル",()=>{const h=createHarness();h.run('profileSeen=null;soundManager.playProfile=p=>profileSeen=p;kind="review";soundManager.playDigit(soundMode())');assert(h.run("profileSeen===SOUND_PROFILES.normalDigit"),"review")});
test("正誤でプロファイル分岐なし",()=>{const h=createHarness();h.run('profiles=[];soundManager.playProfile=p=>profiles.push(p);kind="normal";qs=[{x:10,y:10,o:"+",a:20},{x:11,y:10,o:"+",a:21},{x:12,y:10,o:"+",a:22}];i=0;w=[];v="20";key("E");v="99";key("E")');assert(h.run("profiles.length===2&&profiles[0]===SOUND_PROFILES.normalConfirm&&profiles[1]===SOUND_PROFILES.normalConfirm"),"正誤差")});
test("再生はPromiseを返さない",()=>{const h=audioHarness();assert(h.run('soundManager.playConfirm("boss")')===undefined,"待機可能値")});

const total=passed+failures.length;
if(failures.length){console.error(`Sound pressure tests: ${passed}/${total} passed`);failures.forEach(f=>console.error(`FAIL ${f}`));process.exit(1)}
console.log(`Sound pressure tests: ${passed}/${total} passed`);
