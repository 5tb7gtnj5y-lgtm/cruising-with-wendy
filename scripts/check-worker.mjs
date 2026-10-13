import assert from "node:assert/strict";
import fs from "node:fs";
const backup=JSON.parse(fs.readFileSync("transfer-data/site-backup.json","utf8"));const expectedCount=backup.content.length,expectedNews=backup.content.filter(x=>x.kind==="news").length;
import https from "node:https";
import {spawn} from "node:child_process";
import {randomBytes,pbkdf2Sync,createHmac} from "node:crypto";
const password=randomBytes(24).toString("hex"),salt=randomBytes(16),hash=`pbkdf2-sha256$100000$${salt.toString("hex")}$${pbkdf2Sync(password,salt,100000,32,"sha256").toString("hex")}`;
const port=8791,origin=`https://127.0.0.1:${port}`,token=randomBytes(32).toString("hex");
const child=spawn(process.execPath,["node_modules/wrangler/bin/wrangler.js","dev","--config","dist/server/wrangler.json","--local","--persist-to",process.env.TEST_D1_DIR||".wrangler/state","--ip","127.0.0.1","--port",String(port),"--local-protocol","https","--upstream-protocol","https","--inspector-port","0","--var",`ADMIN_PASSWORD_HASH:${hash}`,"--var",`UPDATE_TOKEN:${token}`,"--var",`SITE_ORIGIN:${origin}`],{stdio:["ignore","pipe","pipe"]});
let log="";child.stdout.on("data",chunk=>log+=chunk.toString());child.stderr.on("data",chunk=>log+=chunk.toString());
const request=(path,{method="GET",headers={},body=""}={})=>new Promise((resolve,reject)=>{const req=https.request(origin+path,{method,headers,rejectUnauthorized:false},res=>{let text="";res.on("data",chunk=>text+=chunk);res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on("error",reject);req.end(body);});
try{
 let ready=false;for(let n=0;n<80;n++){try{await request("/admin/login");ready=true;break;}catch{if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,250));}}
 assert.ok(ready,"Local Worker did not start");
 let response=await request("/");assert.equal(response.status,303);assert.equal(response.headers.location,"/admin/login");
 response=await request("/admin/login");assert.equal(response.status,200);assert.ok(response.text.includes("Site administrator password"));assert.equal(response.headers['x-wendy-login-version'],'worker-proof-20261013');assert.ok(response.text.includes('nonce='));assert.ok(response.headers['content-security-policy'].includes("frame-ancestors 'none'"));
 assert.equal((await request("/api/system/state")).status,403);
 if(!process.env.TEST_EMPTY_RESTORE){ const stateResponse=await request("/api/system/state",{headers:{"X-Update-Token":token}});assert.equal(stateResponse.status,200,JSON.stringify({status:stateResponse.status,body:stateResponse.text.slice(0,120)}));assert.ok(stateResponse.text.length,"Empty state response: "+log.replaceAll(token,"[redacted]").replaceAll(hash,"[redacted]"));const state=JSON.parse(stateResponse.text);assert.equal(state.items.length,expectedCount);assert.equal(state.items.filter(x=>x.kind==="news").length,expectedNews);
 }
 assert.equal((await request("/api/admin",{headers:{"oai-authenticated-user-id":"owner","oai-authenticated-user-email":"owner@example.invalid"}})).status,401);
 response=await request("/api/admin/sign-in",{headers:{'X-Wendy-Login':'1','CF-Connecting-IP':'192.0.2.20'}});assert.equal(response.status,200,response.text.slice(0,500));const challenge=JSON.parse(response.text);assert.equal(challenge.salt,salt.toString('hex'));assert.ok(!response.text.includes(hash.split('$')[3]));
 const proof=createHmac('sha256',pbkdf2Sync(password,salt,100000,32,'sha256')).update('wendy-login-v1|'+origin+'|'+challenge.challenge).digest('hex');
 response=await request("/api/admin/sign-in",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json","CF-Connecting-IP":"192.0.2.20"},body:JSON.stringify({challenge:challenge.challenge,proof})});assert.equal(response.status,200,response.text.slice(0,500));assert.equal(JSON.parse(response.text).redirect,"/admin");const cookie=response.headers["set-cookie"][0].split(";")[0];
 if(process.env.TEST_EMPTY_RESTORE){
  response=await request('/api/admin',{headers:{cookie}});assert.equal(response.status,503);assert.equal(JSON.parse(response.text).code,'database_setup');
  response=await request('/admin/restore',{headers:{cookie}});assert.equal(response.status,200);assert.equal(response.headers['x-wendy-restore-version'],'safe-restore-20261013');
  const boundary='WendyLocalRecoveryBoundary',multipart=`--${boundary}\r\nContent-Disposition: form-data; name="backup"; filename="site-backup.json"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(backup)}\r\n--${boundary}--\r\n`;
  response=await request('/admin/restore',{method:'POST',headers:{cookie,Origin:origin,'Content-Type':'multipart/form-data; boundary='+boundary},body:multipart});assert.equal(response.status,200,response.text.slice(-1500));assert.ok(response.text.includes('33 saved records added'));
  response=await request('/admin/restore',{method:'POST',headers:{cookie,Origin:origin,'Content-Type':'multipart/form-data; boundary='+boundary},body:multipart});assert.equal(response.status,200);assert.ok(response.text.includes('0 saved records added'));
 }
 response=await request("/api/admin",{headers:{cookie}});assert.equal(response.status,200,response.text.slice(0,500));assert.equal(response.headers['x-wendy-admin-version'],'native-data-20261013');assert.equal(JSON.parse(response.text).items.length,expectedCount);
 response=await request('/api/admin?export=1',{headers:{cookie}});assert.equal(response.status,200);assert.equal(JSON.parse(response.text).content.length,expectedCount);
 response=await request("/",{headers:{cookie}});assert.equal(response.status,200);assert.ok(response.text.includes("Cruising with Wendy"));assert.ok(response.text.includes("Virgin Voyages"));
 response=await request("/api/admin/session",{method:"POST",headers:{Origin:origin,"Content-Type":"application/x-www-form-urlencoded",cookie},body:"action=logout"});assert.equal(response.status,303);assert.equal((await request("/api/admin",{headers:{cookie}})).status,401);
 console.log("PASS: built Cloudflare Worker serves native sign-in, keeps pages private, rejects unauthorised APIs and spoofed identity, reads all restored records, authenticates via browser-derived proof, renders news and revokes sign-out.");
}catch(error){console.error(error.stack);process.exitCode=1;}
finally{child.kill("SIGTERM");}
