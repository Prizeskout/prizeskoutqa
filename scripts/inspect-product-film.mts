import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const source=process.argv[2];
if(!source) throw new Error("Pass a video path.");
const out="output/product-film-final-frames";
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
await page.goto(pathToFileURL(source).href,{waitUntil:"commit"});
const video=page.locator("video");
const metadata=await page.evaluate(`new Promise((resolve,reject)=>{
  const node=document.querySelector("video");
  const read=()=>resolve({duration:node.duration,width:node.videoWidth,height:node.videoHeight});
  if(node.readyState>=1) read(); else {node.addEventListener("loadedmetadata",read,{once:true});node.addEventListener("error",()=>reject(node.error),{once:true});}
})`) as {duration:number;width:number;height:number};
await page.evaluate(`(()=>{const node=document.querySelector("video");node.controls=false;node.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;background:#071a35"})()`);
const times:number[]=[0,2.5,5,7.5].filter(time=>time<metadata.duration);
for(let time=10;time<metadata.duration;time+=5)times.push(time);
if(!times.includes(Math.max(0,metadata.duration-.1)))times.push(Math.max(0,metadata.duration-.1));
for(const [index,time] of times.entries()){
  await page.evaluate(`new Promise(resolve=>{const node=document.querySelector("video");node.addEventListener("seeked",()=>resolve(),{once:true});node.currentTime=${time}})`);
  await page.screenshot({path:`${out}/${String(index+1).padStart(2,"0")}-${time.toFixed(1).replace(".","_")}s.png`});
}
console.log(JSON.stringify({...metadata,frames:times.length,times},null,2));
await browser.close();
