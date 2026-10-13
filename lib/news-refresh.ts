import {trustedSources} from "./content";
import {digest} from "./session";
import {normalUrl,slugify} from "./site";
type Source=typeof trustedSources[number];
export function approvedForSource(value:string,source:Source){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&source.hosts.some(h=>u.hostname===h||u.hostname.endsWith("."+h));}catch{return false;}}
export function recentDate(value:string,now=Date.now()){const time=Date.parse(value);return Number.isFinite(time)&&time<=now+86400000&&time>=now-60*86400000?new Date(time).toISOString():null;}
const clean=(s:string)=>s.replace(/\s+/g," ").trim();
export function announcementPath(value:string){return /\/(newsroom\/[^/?]+|news\/[^/?]+|news-releases\/[^/?]+|press-releases\/[^/?]+|press\/latest-releases\/[^/?]+|ahoy\/stories\/[^/?]+|en\/newsroom\/news\/[^/?]+)/i.test(new URL(value).pathname);}
async function readPage(url:string,source:Source){
 for(let n=0;n<3;n++){
  if(!approvedForSource(url,source))throw Error("Unapproved redirect");
  const response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(10000),headers:{"User-Agent":"CruisingWithWendy-NewsCollector/1.0","Accept":"text/html, application/rss+xml, application/atom+xml"}});
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
async function saveCandidate(db:D1Database,source:Source,url:string,title:string,date:string){
 const canonical=normalUrl(url);if(!canonical||!approvedForSource(canonical,source))return false;
 const words=clean(title).split(" ");if(words.length>24)return false;title=clean(title);if(title.length<8||title.length>180)return false;
 const hash=await digest(canonical),id="news-"+hash.slice(0,24);
 if(await db.prepare("SELECT id FROM content WHERE id=? OR source_url=? LIMIT 1").bind(id,canonical).first())return false;
 const timestamp=new Date().toISOString();
 // Publisher metadata is a review candidate. A person approves the headline and facts before publication.
 const result=await db.prepare("INSERT OR IGNORE INTO content(id,slug,kind,status,title,excerpt,body,line,source_url,source_name,sources,published_at,created_at,updated_at,group_key) VALUES (?,?, 'news','draft',?,?,'',?,?,?,?,?,?,?,?)").bind(id,slugify(title)+"-"+hash.slice(0,6),title,`A recent official announcement from ${source.name}. Review the primary source before publishing.`,source.line,canonical,source.name,JSON.stringify([{name:source.name,url:canonical}]),date,timestamp,timestamp,"collector:"+hash).run();
 return (result.meta?.changes||0)>0;
}
export async function runNewsRefresh(env:Cloudflare.Env){
 const db=env.DB;if(!db)throw Error("Missing D1 binding");
 const get=async(key:string)=>(await db.prepare("SELECT value FROM settings WHERE key=?").bind(key).first<{value:string}>())?.value;
 const set=async(key:string,value:string)=>db.prepare("INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key,value).run();
 if(await get("paused")==="true")return {paused:true,added:0};
 const lease=String(Date.now()+180000);const lock=await db.prepare("INSERT INTO settings(key,value) VALUES ('collector_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS INTEGER)<? RETURNING value").bind(lease,Date.now()).first();if(!lock)return {busy:true,added:0};
 let added=0;const failures:string[]=[];
 try{
  // Sequential sources bound memory and stay within the free-plan subrequest budget.
  for(const source of trustedSources){
   if(await get("paused")==="true")break;
   try{
    const page=await readPage(source.url,source),data=await pageData(page.body,page.url);
    const candidates=[...new Set(data.links)].filter(u=>approvedForSource(u,source)&&announcementPath(u)).slice(0,2);
    if(!candidates.length){failures.push(source.name+": no readable announcement links");continue;}
    for(const url of candidates){
     if(await get("paused")==="true")break;
     const story=await readPage(url,source),metadata=await pageData(story.body,story.url),date=recentDate(metadata.date);
     if(date&&metadata.title)added+=Number(await saveCandidate(db,source,story.url,metadata.title,date));
    }
   }catch{failures.push(source.name+": source could not be read");}
  }
  await set("last_collector_report",JSON.stringify({at:new Date().toISOString(),added,failures}));
  await set("last_error",failures.join("; ").slice(0,500));
  if(!failures.length)await set("last_refresh",new Date().toISOString());
  return {added,failures};
 }finally{await db.prepare("DELETE FROM settings WHERE key='collector_lock' AND value=?").bind(lease).run();}
}
