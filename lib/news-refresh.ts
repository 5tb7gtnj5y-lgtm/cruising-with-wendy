import {trustedSources} from "./content";
import {digest} from "./session";
import {normalUrl,slugify} from "./site";
type Source=typeof trustedSources[number];
const COLLECTOR_VERSION="auto-publish-20261013",INTERVAL_MS=3*60*60*1000;
type Budget={remaining:number;deadline:number};
export function approvedForSource(value:string,source:Source){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&source.hosts.some(h=>u.hostname===h||u.hostname.endsWith("."+h));}catch{return false;}}
export function recentDate(value:string,now=Date.now()){const time=Date.parse(value);return Number.isFinite(time)&&time<=now&&time>=now-60*86400000?new Date(time).toISOString():null;}
const clean=(s:string)=>s.replace(/\s+/g," ").trim();
export function announcementPath(value:string){return /\/(newsroom\/[^/?]+|news\/[^/?]+|news-releases\/[^/?]+|press-releases?\/[^/?]+|press\/latest-releases\/[^/?]+|ahoy\/stories\/[^/?]+|en\/newsroom\/news\/[^/?]+|contact-us\/media-centre\/[^/?]+)/i.test(new URL(value).pathname);}
async function readPage(url:string,source:Source,budget:Budget){
 for(let n=0;n<3;n++){
  if(!approvedForSource(url,source))throw Error("Unapproved redirect");
  if(budget.remaining--<=0||Date.now()>=budget.deadline)throw Error("Collection budget reached");
  const response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(Math.max(1,Math.min(10000,budget.deadline-Date.now()))),headers:{"User-Agent":"CruisingWithWendy-NewsCollector/1.0","Accept":"text/html, application/rss+xml, application/atom+xml"}});
  if(response.status>=300&&response.status<400){const target=response.headers.get("location");if(!target)throw Error("Redirect without location");url=new URL(target,url).href;await response.body?.cancel();continue;}
  if(!response.ok)throw Error("HTTP "+response.status);
  const reader=response.body?.getReader();if(!reader)throw Error("Empty response");let size=0;const decoder=new TextDecoder();let body="";
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1000000){await reader.cancel();throw Error("Page exceeds collection limit");}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();return {body,url};
 }throw Error("Too many redirects");
}
async function pageData(html:string,base:string){
 const data={title:"",date:"",links:[] as string[],feeds:[] as string[]};
 await new HTMLRewriter().on("meta",{element(el){const key=el.getAttribute("property")||el.getAttribute("name");if(key==="og:title")data.title=el.getAttribute("content")||"";if(["article:published_time","datePublished","pubdate"].includes(key||""))data.date=el.getAttribute("content")||"";}}).on("a[href]",{element(el){try{data.links.push(new URL(el.getAttribute("href")!,base).href);}catch{}}}).on('link[rel="alternate"]',{element(el){if(/rss|atom/.test(el.getAttribute("type")||"")){try{data.feeds.push(new URL(el.getAttribute("href")!,base).href);}catch{}}}}).transform(new Response(html)).text();
 if(!data.date){const match=html.match(/"datePublished"\s*:\s*"([^"]+)"/);if(match)data.date=match[1];}
 return data;
}
async function publishNewsLink(db:D1Database,source:Source,url:string,title:string,date:string){
 const canonical=normalUrl(url);if(!canonical||!approvedForSource(canonical,source)||!recentDate(date))return false;
 title=clean(title);if(title.split(" ").length>24||title.length<8||title.length>180)return false;
 const hash=await digest(canonical),id="news-"+hash.slice(0,24),timestamp=new Date().toISOString();
 // The source's dated announcement is the story; we publish a link and attribution,
 // never invented reporting or copied article text. One query also checks pause,
 // exact duplicates, archived suppression and untouched legacy collector drafts.
 const result=await db.prepare("INSERT INTO content(id,slug,kind,status,title,excerpt,body,line,source_url,source_name,sources,published_at,created_at,updated_at,group_key) SELECT ?,?, 'news','published',?,?,'',?,?,?,?,?,?,?,? WHERE COALESCE((SELECT value FROM settings WHERE key='paused'),'false')<>'true' AND NOT EXISTS (SELECT 1 FROM content WHERE source_url=? AND id<>?) ON CONFLICT(id) DO UPDATE SET status='published',title=excluded.title,excerpt=excluded.excerpt,published_at=excluded.published_at,updated_at=excluded.updated_at WHERE content.kind='news' AND content.status='draft' AND content.hidden=0 AND content.revision=1 AND content.created_at=content.updated_at AND content.group_key=excluded.group_key").bind(id,slugify(title)+"-"+hash.slice(0,6),title,`An official cruise announcement from ${source.name}. Follow the source link for the full story and details.`,source.line,canonical,source.name,JSON.stringify([{name:source.name,url:canonical}]),date,timestamp,timestamp,"collector:"+hash,canonical,id).run();
 return (result.meta?.changes||0)>0;
}
// A public page can catch up a missed check in the background. The database lease
// and persisted report prevent repeated scans; the regular cron remains in place.
export async function refreshNewsIfDue(env:Cloudflare.Env){
 const db=env.DB;if(!db)return;
 const rows=await db.prepare("SELECT key,value FROM settings WHERE key IN ('paused','last_collector_report')").all<{key:string;value:string}>();
 const saved=Object.fromEntries(rows.results.map(x=>[x.key,x.value]));if(saved.paused==="true")return;
 try{const report=JSON.parse(saved.last_collector_report||"{}");const age=Date.now()-Date.parse(report.at);if(report.version===COLLECTOR_VERSION&&age>=0&&age<INTERVAL_MS)return;}catch{}
 return runNewsRefresh(env,{timeBudgetMs:22000});
}
export async function runNewsRefresh(env:Cloudflare.Env,options:{timeBudgetMs?:number}={}){
 const db=env.DB;if(!db)throw Error("Missing D1 binding");
 const get=async(key:string)=>(await db.prepare("SELECT value FROM settings WHERE key=?").bind(key).first<{value:string}>())?.value;
 const set=async(key:string,value:string)=>db.prepare("INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key,value).run();
 if(await get("paused")==="true")return {paused:true,added:0};
 const lease=String(Date.now()+180000);const lock=await db.prepare("INSERT INTO settings(key,value) VALUES ('collector_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS INTEGER)<? RETURNING value").bind(lease,Date.now()).first();if(!lock)return {busy:true,added:0};
 let added=0,readable=0;const failures:string[]=[];
 const budget:Budget={remaining:40,deadline:Date.now()+Math.min(options.timeBudgetMs||135000,135000)};
 try{
  // Sequential sources bound memory and stay within the free-plan subrequest budget.
  for(const source of trustedSources){
   if(await get("paused")==="true")break;
   try{
    let candidates:string[]=[],sourceReadable=false;
    const portals=[source.url,...("additionalUrls" in source?(source.additionalUrls||[]):[])];
    for(const portal of portals){
     try{const page=await readPage(portal,source,budget),data=await pageData(page.body,page.url);readable++;sourceReadable=true;
      candidates=[...new Set(data.links)].filter(u=>approvedForSource(u,source)&&announcementPath(u)&&normalUrl(u)!==normalUrl(page.url)).slice(0,2);
      if(candidates.length)break;
     }catch{/* Try only the other explicitly approved newsroom, when available. */}
    }
    if(!candidates.length){failures.push(source.name+(sourceReadable?": no readable announcement links":": source could not be read"));continue;}
    for(const url of candidates){
     const story=await readPage(url,source,budget),metadata=await pageData(story.body,story.url),date=recentDate(metadata.date);
     if(date&&metadata.title)added+=Number(await publishNewsLink(db,source,story.url,metadata.title,date));
    }
   }catch{failures.push(source.name+": source could not be read");}
  }
  await set("last_collector_report",JSON.stringify({at:new Date().toISOString(),version:COLLECTOR_VERSION,added,failures}));
  await set("last_error",failures.join("; ").slice(0,500));
  if(readable>0)await set("last_refresh",new Date().toISOString());
  return {added,failures};
 }finally{await db.prepare("DELETE FROM settings WHERE key='collector_lock' AND value=?").bind(lease).run();}
}
