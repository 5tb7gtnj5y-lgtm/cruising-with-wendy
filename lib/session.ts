export const COOKIE_NAME="__Host-wendy_admin", SESSION_MS=8*60*60*1000;
const encoder=new TextEncoder();
const authSchemaReady=new WeakMap<D1Database,Promise<void>>();
export async function ensureAuthSchema(db:D1Database){
 let pending=authSchemaReady.get(db);
 if(!pending){
  pending=Promise.resolve().then(()=>db.batch([
   db.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY NOT NULL, expires_at INTEGER NOT NULL)"),
   db.prepare("CREATE INDEX IF NOT EXISTS admin_session_expiry ON admin_sessions(expires_at)"),
   db.prepare("CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY NOT NULL, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)"),
   db.prepare("CREATE INDEX IF NOT EXISTS login_attempt_expiry ON login_attempts(expires_at)")
  ])).then(()=>undefined);
  authSchemaReady.set(db,pending);
 }
 try{await pending;}catch(error){if(authSchemaReady.get(db)===pending)authSchemaReady.delete(db);throw error;}
}
export function hex(bytes:ArrayBuffer|Uint8Array){return Array.from(new Uint8Array(bytes as ArrayBuffer),x=>x.toString(16).padStart(2,"0")).join("");}
export async function digest(value:string){return hex(await crypto.subtle.digest("SHA-256",encoder.encode(value)));}
export function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function verifyPassword(password:string,encoded:string){
 const m=/^pbkdf2-sha256\$100000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded);if(!m||password.length<16||password.length>256)return false;
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]),salt=Uint8Array.from(m[1].match(/../g)!,x=>parseInt(x,16));
 return equal(hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:100000},key,256)),m[2]);
}
export function tokenFromCookie(cookie:string|null){const v=(cookie||"").split(";").map(x=>x.trim()).filter(x=>x.startsWith(COOKIE_NAME+"="));if(v.length!==1)return null;const token=v[0].slice(COOKIE_NAME.length+1);return /^[a-f0-9]{64}$/.test(token)?token:null;}
export async function validSession(db:D1Database|undefined,cookie:string|null){const token=tokenFromCookie(cookie);if(!db||!token)return false;await ensureAuthSchema(db);return !!await db.prepare("SELECT token_hash FROM admin_sessions WHERE token_hash=? AND expires_at>? LIMIT 1").bind(await digest(token),Date.now()).first();}
export async function createSession(db:D1Database){await ensureAuthSchema(db);const token=hex(crypto.getRandomValues(new Uint8Array(32)));await db.prepare("INSERT INTO admin_sessions(token_hash,expires_at) VALUES (?,?)").bind(await digest(token),Date.now()+SESSION_MS).run();return token;}
export function sessionCookie(token:string,clear=false){return `${COOKIE_NAME}=${clear?"":token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${clear?0:SESSION_MS/1000}`;}
export async function loginAllowed(db:D1Database,ip:string){await ensureAuthSchema(db);const window=Math.floor(Date.now()/900000),key=await digest("login:"+ip+":"+window);const row=await db.prepare("INSERT INTO login_attempts(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(key,(window+2)*900000).first<{count:number}>();await db.batch([db.prepare("DELETE FROM login_attempts WHERE expires_at<?").bind(Date.now()),db.prepare("DELETE FROM admin_sessions WHERE expires_at<?").bind(Date.now())]);return !!row&&row.count<=5;}
