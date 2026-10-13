import {nativeBrandHeader,nativeBrandStyles} from "./brand";
import {createSession,digest,ensureAuthSchema,equal,hex,loginAllowed,sessionCookie,tokenFromCookie} from "./session";

export const LOGIN_VERSION="worker-proof-20261013";
const encoder=new TextEncoder();
const responseHeaders={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow","X-Wendy-Login-Version":LOGIN_VERSION};
const error=(code:string,message:string,status=400)=>Response.json({code,error:message},{status,headers:responseHeaders});
const passwordParts=(encoded:string|undefined)=>typeof encoded==="string"?/^pbkdf2-sha256\$100000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded.trim()):null;
const sameOrigin=(request:Request)=>request.headers.get("origin")===new URL(request.url).origin&&request.headers.get("sec-fetch-site")!=="cross-site";

// The browser derives a non-extractable HMAC key from the password. Only a proof
// for this short-lived, single-use, IP-bound challenge reaches the server.
export async function handleSignIn(request:Request,env:Cloudflare.Env){
 if(request.method!=="GET"&&request.method!=="POST")return error("method","This sign-in request is not supported.",405);
 if(request.method==="POST"&&!sameOrigin(request))return error("origin","Open the sign-in page on this site.",403);
 if(request.method==="GET"&&(request.headers.get("X-Wendy-Login")!=="1"||request.headers.get("sec-fetch-site")==="cross-site"))return error("origin","Open the sign-in page on this site.",403);
 const parts=passwordParts(env.ADMIN_PASSWORD_HASH);
 if(!parts)return error("password_configuration","The site administrator password has not been configured correctly. Check ADMIN_PASSWORD_HASH in Cloudflare.",503);
 if(!env.DB||typeof env.DB.prepare!=="function")return error("database_binding","The news database is not connected. Check the DB binding in Cloudflare.",503);
 const ip=request.headers.get("CF-Connecting-IP");
 if(!ip)return error("client","Open the deployed site to sign in.",403);
 try{
  await ensureAuthSchema(env.DB);
  if(request.method==="GET"){
   if(!await loginAllowed(env.DB,ip,"login-challenge",10))return error("rate_limit","Too many sign-in requests. Try again in 15 minutes.",429);
   const challenge=hex(crypto.getRandomValues(new Uint8Array(32)));
   await env.DB.batch([
    env.DB.prepare("DELETE FROM login_challenges WHERE expires_at<=?").bind(Date.now()),
    env.DB.prepare("INSERT INTO login_challenges(token_hash,ip_hash,expires_at) VALUES (?,?,?)").bind(await digest(challenge),await digest("auth-ip:"+ip),Date.now()+120000)
   ]);
   return Response.json({challenge,salt:parts[1],iterations:100000},{headers:responseHeaders});
  }
  if(!request.headers.get("content-type")?.startsWith("application/json"))return error("form","Invalid sign-in request.");
  const text=await request.text();if(text.length>2048)return error("form","Sign-in request is too large.",413);
  let data:{challenge?:unknown;proof?:unknown};try{data=JSON.parse(text);}catch{return error("form","Invalid sign-in request.");}
  if(!data||typeof data.challenge!=="string"||typeof data.proof!=="string"||!/^([a-f0-9]{64})$/.test(data.challenge)||!/^([a-f0-9]{64})$/.test(data.proof))return error("form","Invalid sign-in request.");
  if(!await loginAllowed(env.DB,ip))return error("rate_limit","Too many attempts. Try again in 15 minutes.",429);
  const used=await env.DB.prepare("DELETE FROM login_challenges WHERE token_hash=? AND ip_hash=? AND expires_at>? RETURNING token_hash").bind(await digest(data.challenge),await digest("auth-ip:"+ip),Date.now()).first();
  if(!used)return error("challenge","This sign-in attempt expired. Please try again.");
  const key=await crypto.subtle.importKey("raw",Uint8Array.from(parts[2].match(/../g)!,x=>parseInt(x,16)),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const proof=hex(await crypto.subtle.sign("HMAC",key,encoder.encode("wendy-login-v1|"+new URL(request.url).origin+"|"+data.challenge)));
  if(!equal(data.proof,proof))return error("password","The site administrator password was not recognised. Please try again.",401);
  const token=await createSession(env.DB);
  return Response.json({redirect:"/admin"},{headers:{...responseHeaders,"Set-Cookie":sessionCookie(token)}});
 }catch{
  // Never log a password, proof, challenge, hash, token or request body.
  console.error("Wendy sign-in failed: authentication database operation unavailable");
  return error("database_unavailable","The sign-in database is unavailable. Your saved news has not been changed. Check the Worker logs and DB binding in Cloudflare.",503);
 }
}

export async function handleSignOut(request:Request,env:Cloudflare.Env){
 if(request.method!=="POST")return new Response(null,{status:303,headers:{...responseHeaders,Location:"/admin/login"}});
 if(!sameOrigin(request))return error("origin","Open the sign-in page on this site.",403);
 try{
  const text=await request.text();if(text.length>2048||new URLSearchParams(text).get("action")!=="logout")return new Response(null,{status:303,headers:{...responseHeaders,Location:"/admin/login"}});
  const token=tokenFromCookie(request.headers.get("cookie"));
  if(token){if(!env.DB)return error("database_binding","The sign-in database is not connected.",503);await ensureAuthSchema(env.DB);await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await digest(token)).run();}
  return new Response(null,{status:303,headers:{...responseHeaders,Location:"/admin/login","Set-Cookie":sessionCookie("",true)}});
 }catch{return error("database_unavailable","Sign-out could not be completed. Please try again.",503);}
}

export const loginScript=String.raw`
const form=document.getElementById('sign-in'),password=document.getElementById('password'),button=document.getElementById('submit'),status=document.getElementById('status');
document.getElementById('show-password').addEventListener('change',event=>{password.type=event.target.checked?'text':'password';});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(button.disabled||!form.reportValidity())return;
 button.disabled=true;button.textContent='Signing in…';status.textContent='Checking your site password…';
 try{
  if(!window.crypto?.subtle)throw new Error('This browser cannot complete secure sign-in. Open this page in an up-to-date browser using HTTPS.');
  const start=await fetch('/api/admin/sign-in',{headers:{'X-Wendy-Login':'1'},cache:'no-store',credentials:'same-origin'});
  const challenge=await start.json().catch(()=>{throw new Error('The new sign-in service has not loaded. Check the latest Cloudflare deployment.');});
  if(!start.ok)throw new Error(challenge.error||'Sign-in is temporarily unavailable.');
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password.value),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(challenge.salt.match(/../g),x=>parseInt(x,16)),iterations:challenge.iterations},base,{name:'HMAC',hash:'SHA-256',length:256},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('wendy-login-v1|'+location.origin+'|'+challenge.challenge));
  const proof=Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,'0')).join('');
  const result=await fetch('/api/admin/sign-in',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({challenge:challenge.challenge,proof})});
  const data=await result.json().catch(()=>{throw new Error('The sign-in service did not respond. Check the latest Cloudflare deployment.');});
  if(!result.ok)throw new Error(data.error||'Sign-in could not be completed.');
  if(data.redirect!=='/admin')throw new Error('The sign-in service returned an unexpected response.');
  password.value='';status.textContent='Signed in. Opening your editorial desk…';location.assign('/admin');
 }catch(error){status.textContent=error instanceof Error?error.message:'Sign-in could not be completed. Please try again.';button.disabled=false;button.textContent='Sign in';}
});`;

export function loginPage(request:Request){
 const nonce=hex(crypto.getRandomValues(new Uint8Array(16)));
 const problem=new URL(request.url).searchParams.get("error");
 const message=problem==="database"?"The sign-in database is unavailable. Check the DB binding and Worker logs in Cloudflare.":problem?"The site administrator password was not recognised. Please try again.":"";
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/favicon.svg"><title>Administrator sign-in | Cruising with Wendy</title><style nonce="${nonce}">
*{box-sizing:border-box}body{margin:0;background:#edf7f8;color:#123c4a;font:17px/1.55 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{width:min(100%,460px);background:#fff;border:1px solid #d4e7eb;border-radius:24px;padding:34px;box-shadow:0 18px 60px #123c4a12}a{color:#12768a}.brand{font-size:24px;font-weight:650;text-decoration:none}.brand span{color:#087b87}h1{font-size:32px;line-height:1.2;margin:24px 0 12px}.intro{margin:0 0 24px;color:#526e78}label{display:block;font-weight:600}input[type=password],input[type=text]{width:100%;font:inherit;padding:13px;border:1px solid #83aab4;border-radius:9px;margin:8px 0 14px}.show{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:400}button{margin-top:20px;width:100%;padding:14px;border:0;border-radius:10px;background:#087b87;color:#fff;font:600 17px system-ui;cursor:pointer}button:disabled{opacity:.65;cursor:wait}:focus-visible{outline:3px solid #f1b15e;outline-offset:3px}#status{color:#9b3c24;font-size:15px;min-height:24px;margin:15px 0 0}.note{font-size:14px;color:#526e78;margin:20px 0 0}
${nativeBrandStyles}</style></head><body><main>${nativeBrandHeader}<h1>Your editorial desk.</h1><p class="intro">Sign in to review stories and manage cruise news.</p><form id="sign-in" action="/admin/login" method="get"><label for="password">Site administrator password</label><input id="password" type="password" autocomplete="current-password" required minlength="16" maxlength="256"><label class="show"><input id="show-password" type="checkbox">Show password</label><button id="submit" type="submit">Sign in</button><p id="status" role="status" aria-live="polite">${message}</p><noscript>Enable JavaScript in your browser to sign in securely.</noscript></form><p class="note">Use the password you chose in the site setup helper. Your Cloudflare account has its own separate sign-in.</p></main><script nonce="${nonce}">${loginScript}</script></body></html>`;
 return new Response(html,{headers:{...responseHeaders,"Content-Type":"text/html; charset=utf-8","Referrer-Policy":"no-referrer","Content-Security-Policy":`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`}});
}
