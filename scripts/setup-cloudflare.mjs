import fs from "node:fs";
import {spawnSync} from "node:child_process";
import {createInterface} from "node:readline/promises";
import {randomBytes,pbkdf2Sync} from "node:crypto";
const configPath="wrangler.jsonc",config=JSON.parse(fs.readFileSync(configPath,"utf8"));
const prompt=createInterface({input:process.stdin,output:process.stdout});
function run(args,{input,capture=false}={}){
 const result=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js",...args],{encoding:"utf8",input,stdio:input!==undefined||capture?["pipe","pipe","pipe"]:"inherit",env:{...process.env,WRANGLER_SEND_METRICS:"false",WRANGLER_WRITE_LOGS:"false"}});
 if(result.status!==0)throw Error(input!==undefined?"Cloudflare could not save the secrets. No credentials were printed.":"Wrangler failed. Sign in and check your account permissions.");
 return result.stdout||"";
}
function parsed(output){for(const start of [output.indexOf("["),output.indexOf("{")].filter(n=>n>=0).sort((a,b)=>a-b)){try{return JSON.parse(output.slice(start));}catch{}}throw Error("Cloudflare did not return readable JSON.");}
function secretQuestion(label){
 return new Promise((resolve,reject)=>{if(!process.stdin.isTTY)return reject(Error("Run setup in an interactive terminal so the password stays hidden."));process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();let value="";const listener=chunk=>{for(const c of chunk.toString()){if(c==="\u0003"){cleanup();reject(Error("Cancelled"));return;}if(c==="\r"||c==="\n"){cleanup();resolve(value);return;}if(c==="\u007f"||c==="\b")value=value.slice(0,-1);else if(c>=" "&&value.length<256)value+=c;}};function cleanup(){process.stdin.off("data",listener);process.stdin.setRawMode(false);process.stdout.write("\n");}process.stdin.on("data",listener);});
}
try{
 console.log("This creates a private Cloudflare Worker and transfers the saved stories. The existing site is untouched.");
 try{run(["whoami","--json"],{capture:true});}catch{run(["login"]);}
 const user=parsed(run(["whoami","--json"],{capture:true}));
 if(user.accounts.length===1)config.account_id=user.accounts[0].id;
 else {console.log(user.accounts.map(x=>`${x.name}: ${x.id}`).join("\n"));const id=(await prompt.question("Cloudflare account ID: ")).trim();if(!user.accounts.some(x=>x.id===id))throw Error("Choose one of your own accounts.");config.account_id=id;}
 const destination=(await prompt.question("Your destination URL (https://cruising-with-wendy.YOUR-SUBDOMAIN.workers.dev): ")).trim();
 const url=new URL(destination);if(url.protocol!=="https:"||url.username||url.password||url.pathname!=="/"||url.search||url.hash||!/^cruising-with-wendy\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname))throw Error("Use this Worker's exact workers.dev URL from your Cloudflare account.");
 config.vars.SITE_ORIGIN=url.origin;config.vars.ACCESS_MODE="private";config.vars.SITE_PUBLIC="false";
 fs.writeFileSync(configPath,JSON.stringify(config,null,2)+"\n");
 if(config.d1_databases[0].database_id.startsWith("00000000")){
  const name="cruising-with-wendy-"+Date.now();const output=run(["d1","create",name],{capture:true});const match=/"database_id"\s*:\s*"([a-f0-9-]{36})"/.exec(output);if(!match)throw Error("Database created, but its ID could not be read. Find it in Cloudflare D1 before retrying.");
  config.d1_databases[0].database_name=name;config.d1_databases[0].database_id=match[1];fs.writeFileSync(configPath,JSON.stringify(config,null,2)+"\n");
 }
 run(["d1","migrations","apply","DB","--remote"]);
 const existing=parsed(run(["d1","execute","DB","--remote","--command","SELECT count(*) AS count FROM content","--json"],{capture:true}))[0].results[0].count;
 const backup=JSON.parse(fs.readFileSync("transfer-data/site-backup.json","utf8"));
 if(existing===0)run(["d1","execute","DB","--remote","--file","transfer-data/site-backup.sql"]);
 // Read back every transferred row, not just the count. A nonmatching existing database is never overwritten.
 for(const [table,expected]of Object.entries(backup)){
  const results=parsed(run(["d1","execute","DB","--remote","--command",`SELECT * FROM ${table}`,"--json"],{capture:true}))[0].results;
  const order=rows=>rows.map(row=>Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)))).map(row=>JSON.stringify(row)).sort();
  if(JSON.stringify(order(results))!==JSON.stringify(order(expected)))throw Error(`Read-back verification failed for ${table}. Existing data was preserved; do not deploy until resolved.`);
 }
 prompt.close();
 const password=await secretQuestion("Choose a unique admin password (at least 16 characters; hidden): ");if(password.length<16)throw Error("Use at least 16 characters.");
 if(password!==await secretQuestion("Repeat the admin password (hidden): "))throw Error("The passwords did not match.");
 const salt=randomBytes(16),hash=pbkdf2Sync(password,salt,100000,32,"sha256");
 run(["secret","bulk"],{input:JSON.stringify({ADMIN_PASSWORD_HASH:`pbkdf2-sha256$100000$${salt.toString("hex")}$${hash.toString("hex")}`,UPDATE_TOKEN:randomBytes(32).toString("hex")})});
 prompt.close();
 const result=spawnSync(process.execPath,["scripts/deploy.mjs"],{stdio:"inherit"});if(result.status!==0)process.exit(result.status||1);
 console.log(`Database rows verified. Open ${url.origin}/admin/login and sign in. Leave the old site running until this check passes.`);
 console.log("The three-hour collector queues source links for review. Reconnect researched updates and daily AI drafts separately; they are not generated by the collector.");
}finally{prompt.close();}
