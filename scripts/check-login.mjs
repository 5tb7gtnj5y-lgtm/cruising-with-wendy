import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,pbkdf2Sync,createHmac} from 'node:crypto';
import ts from 'typescript';

const context=vm.createContext({console,Request,Response,Headers,URL,URLSearchParams,TextEncoder,crypto,Date,Uint8Array});
const session=new vm.SourceTextModule(ts.transpileModule(fs.readFileSync('lib/session.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,{context});await session.link(()=>{});await session.evaluate();
const brand=new vm.SourceTextModule(ts.transpileModule(fs.readFileSync('lib/brand.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,{context});await brand.link(()=>{});await brand.evaluate();
const login=new vm.SourceTextModule(ts.transpileModule(fs.readFileSync('lib/worker-login.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,{context});await login.link(spec=>spec==="./brand"?brand:session);await login.evaluate();
const api=login.namespace;
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync('drizzle/0000_kind_mister_sinister.sql','utf8'));sqlite.exec(fs.readFileSync('transfer-data/site-backup.sql','utf8'));
class Statement{constructor(query,values=[]){this.query=query;this.values=values;}bind(...values){return new Statement(this.query,values);}async first(){return sqlite.prepare(this.query).get(...this.values)||null;}async run(){sqlite.prepare(this.query).run(...this.values);return {success:true};}}
const DB={prepare:q=>new Statement(q),async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>({success:true,results:sqlite.prepare(s.query).all(...s.values)}));sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const origin='https://example.invalid',password=randomBytes(24).toString('hex'),salt=randomBytes(16),key=pbkdf2Sync(password,salt,100000,32,'sha256');
const env={DB,ADMIN_PASSWORD_HASH:`pbkdf2-sha256$100000$${salt.toString('hex')}$${key.toString('hex')}`};
const snapshot=()=>Object.fromEntries(['content','settings','views','audit','revisions'].map(t=>[t,sqlite.prepare('SELECT * FROM '+t).all()]));const saved=snapshot();
const begin=(ip='192.0.2.80',bindings=env)=>api.handleSignIn(new Request(origin+'/api/admin/sign-in',{headers:{'X-Wendy-Login':'1','CF-Connecting-IP':ip}}),bindings);
const prove=(challenge,passwordValue=password,ip='192.0.2.80',headers={})=>api.handleSignIn(new Request(origin+'/api/admin/sign-in',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':ip,...headers},body:JSON.stringify({challenge,proof:createHmac('sha256',pbkdf2Sync(passwordValue,salt,100000,32,'sha256')).update('wendy-login-v1|'+origin+'|'+challenge).digest('hex')})}),env);
assert.equal((await begin('192.0.2.80',{DB})).status,503);assert.equal((await begin('192.0.2.80',{ADMIN_PASSWORD_HASH:env.ADMIN_PASSWORD_HASH})).status,503);
assert.equal((await api.handleSignIn(new Request(origin+'/api/admin/sign-in',{headers:{'CF-Connecting-IP':'192.0.2.80'}}),env)).status,403);
let response=await begin();assert.equal(response.status,200);const first=await response.json();assert.equal(first.salt,salt.toString('hex'));assert.ok(!JSON.stringify(first).includes(key.toString('hex')));assert.deepEqual(Object.keys(first).sort(),['challenge','iterations','salt']);
assert.equal((await prove(first.challenge,password,'192.0.2.80',{Origin:'https://attacker.invalid'})).status,403);
assert.equal((await prove(first.challenge,password,'192.0.2.81')).status,400);
response=await prove(first.challenge);assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.ok(cookie.includes('Secure; HttpOnly; SameSite=Strict'));assert.equal(await session.namespace.validSession(DB,cookie),true);
assert.equal((await prove(first.challenge)).status,400);
const wrong=await (await begin()).json();assert.equal((await prove(wrong.challenge,'Wrong test-only long password')).status,401);assert.equal((await prove(wrong.challenge)).status,400);
const expired=await (await begin('192.0.2.82')).json();sqlite.prepare('UPDATE login_challenges SET expires_at=0 WHERE token_hash=?').run(await session.namespace.digest(expired.challenge));assert.equal((await prove(expired.challenge,password,'192.0.2.82')).status,400);
for(let i=0;i<5;i++){const q=await (await begin('192.0.2.83')).json();assert.equal((await prove(q.challenge,'Wrong test-only long password','192.0.2.83')).status,401);}const blocked=await (await begin('192.0.2.83')).json();assert.equal((await prove(blocked.challenge,password,'192.0.2.83')).status,429);
for(let i=0;i<10;i++)assert.equal((await begin('192.0.2.84')).status,200);assert.equal((await begin('192.0.2.84')).status,429);
const broken={...env,DB:{prepare(){throw Error('fixture DB unavailable');}}};assert.equal((await begin('192.0.2.85',broken)).status,503);
const html=await api.loginPage(new Request(origin+'/admin/login?error=database')).text();assert.ok(html.includes('Site administrator password'));assert.ok(html.includes('database is unavailable'));assert.ok(!html.includes('name="password"'));assert.ok(!html.includes(env.ADMIN_PASSWORD_HASH));
const logout=await api.handleSignOut(new Request(origin+'/api/admin/session',{method:'POST',headers:{Origin:origin,cookie},body:'action=logout'}),env);assert.equal(logout.status,303);assert.equal(await session.namespace.validSession(DB,cookie),false);
assert.deepEqual(snapshot(),saved);
for(const file of ['0001_standalone_auth.sql','0002_login_challenges.sql'])sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));assert.deepEqual(snapshot(),saved);
console.log('PASS: browser-proof sign-in, wrong-password rejection, single-use challenges, IP binding, expiry, CSRF, secure cookies, request/guess rate limits, missing/broken configuration, sign-out revocation and preservation of all saved news.');

// Optional DOM harness: point LOGIN_DOM_PACKAGE at an installed jsdom module.
if(process.env.LOGIN_DOM_PACKAGE){
 const {JSDOM,VirtualConsole}=await import(process.env.LOGIN_DOM_PACKAGE);
 async function checkForm(value,bindings,expected,ip){
  const dom=new JSDOM(await api.loginPage(new Request(origin+'/admin/login')).text(),{url:origin+'/admin/login',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
  Object.defineProperty(dom.window,'crypto',{value:crypto});dom.window.TextEncoder=TextEncoder;
  let outgoing=[],signedCookie;
  dom.window.fetch=async(path,options={})=>{
   if(options.body)outgoing.push(options.body);
   const result=await api.handleSignIn(new Request(origin+path,{...options,headers:{...options.headers,Origin:origin,'CF-Connecting-IP':ip}}),bindings);
   if(result.headers.has('set-cookie'))signedCookie=result.headers.get('set-cookie');
   return result;
  };
  dom.window.eval(api.loginScript);
  const input=dom.window.document.getElementById('password'),show=dom.window.document.getElementById('show-password');input.value=value;show.checked=true;show.dispatchEvent(new dom.window.Event('change'));assert.equal(input.type,'text');show.checked=false;show.dispatchEvent(new dom.window.Event('change'));assert.equal(input.type,'password');
  dom.window.document.getElementById('sign-in').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  let status='';for(let i=0;i<100;i++){status=dom.window.document.getElementById('status').textContent;if(status.includes(expected))break;await new Promise(r=>setTimeout(r,20));}assert.ok(status.includes(expected),status);
  assert.ok(outgoing.every(x=>!x.includes(value)&&!x.includes(key.toString('hex'))));
  if(signedCookie){assert.equal(await session.namespace.validSession(DB,signedCookie),true);assert.equal(input.value,'');}else assert.equal(dom.window.document.getElementById('submit').disabled,false);
  dom.window.close();
 }
 await checkForm(password,env,'Signed in.','192.0.2.90');
 await checkForm('Wrong test-only long password',env,'was not recognised','192.0.2.91');
 await checkForm(password,{DB},'not been configured correctly','192.0.2.92');
 assert.deepEqual(snapshot(),saved);
 console.log('PASS: actual login form JavaScript derives the key in the browser, submits only a single-use proof, signs in, clears the password on success, shows errors, restores the button for retry and supports Show password.');
}
