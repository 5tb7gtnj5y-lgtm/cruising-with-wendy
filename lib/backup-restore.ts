import {z} from "zod";
import {validSession} from "./session";
import {contentSchemaStatements} from "./content-schema";

const small=z.string().max(1000),id=z.string().min(1).max(200),time=z.string().datetime(),flag=z.number().int().min(0).max(1);
const rowSchema=z.object({id,slug:z.string().min(1).max(200),kind:z.enum(["news","article","guide"]),status:z.enum(["draft","published","scheduled","archived"]),title:z.string().min(1).max(300),excerpt:z.string().max(1000),body:z.string().max(50000),line:small,ship:small,destination:small,source_url:small,source_name:small,sources:z.string().max(12000),seo_title:small,seo_description:small,ai:flag,featured:flag,published_at:time.nullable(),created_at:time,updated_at:time,revision:z.number().int().min(1),group_key:small,hidden:flag});
const aliases:Record<string,string>={source_url:"sourceUrl",source_name:"sourceName",seo_title:"seoTitle",seo_description:"seoDescription",published_at:"publishedAt",created_at:"createdAt",updated_at:"updatedAt",group_key:"groupKey",content_id:"contentId"};
const normalise=(value:unknown)=>{if(!value||typeof value!=="object"||Array.isArray(value))return value;const out={...value} as Record<string,unknown>;for(const [snake,camel] of Object.entries(aliases))if(!(snake in out)&&camel in out)out[snake]=out[camel];return out;};
const restoreSchema=z.object({content:z.array(z.preprocess(normalise,rowSchema)).min(1).max(500),settings:z.array(z.object({key:z.string().min(1).max(120),value:z.string().max(30000)})).max(100).default([]),revisions:z.array(z.preprocess(normalise,z.object({id,content_id:id,snapshot:z.string().max(80000),created_at:time}))).max(500).default([]),views:z.array(z.object({id,day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),path:small,count:z.number().int().min(0)})).max(500).default([]),audit:z.array(z.preprocess(normalise,z.object({id,action:small,content_id:id.nullable(),created_at:time}))).max(500).default([])});
const settingsAllowed=new Set(["initialised","paused","last_draft","last_refresh","last_error","affiliate_links","last_collector_report"]);
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const page=(message="",status=200)=>new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Restore saved news | Cruising with Wendy</title><style>body{margin:0;background:#e9f6f6;color:#123e49;font:17px/1.6 system-ui}main{max-width:620px;margin:8vh auto;padding:32px;background:white;border-radius:20px;box-shadow:0 12px 40px #12465315}h1{line-height:1.2}label{display:block;margin:22px 0}input{display:block;max-width:100%;margin-top:10px}button,a{font:inherit}button{border:0;border-radius:10px;background:#126878;color:white;padding:12px 22px;cursor:pointer}a{color:#126878}.message{padding:16px;background:#e6f5ee;border-radius:10px}</style></head><body><main><p>CRUISING WITH WENDY · ADMINISTRATOR</p><h1>Restore your saved news</h1><p>This creates any missing database tables and adds saved records. Existing records, settings and sign-in details are preserved. Drafts keep their saved approval status.</p>${message?`<p role="status" class="message">${escape(message)}</p>`:""}<form method="post" enctype="multipart/form-data" action="/admin/restore"><label>Saved site backup<input type="file" name="backup" accept="application/json,.json" required></label><button type="submit">Restore saved news</button></form><p><a href="/admin">Return to your editorial desk</a></p></main></body></html>`,{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'","X-Wendy-Restore-Version":"safe-restore-20261013"}});

export async function restoreBackup(request:Request,env:Cloudflare.Env){
 try{
  const db=env.DB;if(!db)return page("The DB binding is missing in Cloudflare.",503);
  if(!await validSession(db,request.headers.get("cookie")))return new Response(null,{status:303,headers:{Location:"/admin/login","Cache-Control":"private, no-store"}});
  if(request.method==="GET")return page();
  if(request.method!=="POST")return page("This request is not supported.",405);
  if(request.headers.get("origin")!==new URL(request.url).origin||request.headers.get("sec-fetch-site")==="cross-site")return page("Restore must be submitted from this administrator page.",403);
  if(!request.headers.get("content-type")?.startsWith("multipart/form-data")||Number(request.headers.get("content-length"))>1100000)return page("Choose a saved JSON backup smaller than 1 MB.",413);
  const form=await request.formData(),file=form.get("backup");
  if(!file||typeof file==="string"||file.size>1000000)return page("Choose a saved JSON backup smaller than 1 MB.",400);
  let parsed;try{parsed=restoreSchema.parse(JSON.parse(await file.text()));}catch{return page("This file is not a valid Cruising with Wendy content backup. No saved content has been changed.",400);}
  // Never import secrets or credentials. Only known editorial settings are eligible.
  await db.batch(contentSchemaStatements.map(sql=>db.prepare(sql)));
  const fields=Object.keys(rowSchema.shape);
  // JSON-bound bulk inserts keep this within the Free plan's query budget.
  // Unique ID/slug and source URL checks keep newer edits and suppressed news.
  const statements=[db.prepare(`INSERT OR IGNORE INTO content (${fields.join(",")}) SELECT ${fields.map(key=>`json_extract(j.value,'$.${key}')`).join(",")} FROM json_each(?) AS j WHERE NOT EXISTS (SELECT 1 FROM content AS c WHERE c.id=json_extract(j.value,'$.id') OR c.slug=json_extract(j.value,'$.slug') OR (c.source_url<>'' AND c.source_url=json_extract(j.value,'$.source_url')))` ).bind(JSON.stringify(parsed.content))];
  const append=(table:string,fields:string[],rows:unknown[],where="")=>{if(rows.length)statements.push(db.prepare(`INSERT OR IGNORE INTO ${table} (${fields.join(",")}) SELECT ${fields.map(key=>`json_extract(j.value,'$.${key}')`).join(",")} FROM json_each(?) AS j ${where}`).bind(JSON.stringify(rows)));};
  append("settings",["key","value"],parsed.settings.filter(x=>settingsAllowed.has(x.key)));
  append("revisions",["id","content_id","snapshot","created_at"],parsed.revisions,"WHERE EXISTS (SELECT 1 FROM content WHERE id=json_extract(j.value,'$.content_id'))");
  append("views",["id","day","path","count"],parsed.views);
  append("audit",["id","action","content_id","created_at"],parsed.audit);
  statements.push(db.prepare("INSERT INTO audit (id,action,content_id,created_at) VALUES (?,?,NULL,?)").bind(crypto.randomUUID(),"Saved site backup restored",new Date().toISOString()));
  const results=await db.batch(statements);
  const after=await db.prepare("SELECT count(*) AS count FROM content").first<{count:number}>();
  return page(`Restore complete. ${results[0].meta.changes} saved records added; ${after!.count} records are now in your news database. Return to your editorial desk to review them.`);
 }catch{console.error("Wendy saved backup restore failed");return page("The restore could not be completed. Existing records and sign-in details have been preserved. Check the Cloudflare Worker logs before trying again.",503);}
}
