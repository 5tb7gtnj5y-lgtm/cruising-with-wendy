import {trustedSources,type NewsSource} from "./content";
import {digest} from "./session";
import {normalUrl,slugify} from "./site";
import {parseRss,type FeedStory} from "./rss";
type Source=NewsSource;
const COLLECTOR_VERSION="expanded-rss-20261013-v2",INTERVAL_MS=3*60*60*1000;
type Budget={remaining:number;deadline:number};
export function approvedForSource(value:string,source:Source){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&source.hosts.some(h=>u.hostname===h||u.hostname.endsWith("."+h));}catch{return false;}}
export function recentDate(value:string,now=Date.now()){const time=Date.parse(value);return Number.isFinite(time)&&time<=now&&time>=now-60*86400000?new Date(time).toISOString():null;}
const clean=(s:string)=>s.replace(/\s+/g," ").trim();
export function announcementPath(value:string){return /\/(newsroom\/[^/?]+|news\/[^/?]+|news-releases\/[^/?]+|press-releases?\/[^/?]+|press\/latest-releases\/[^/?]+|ahoy\/stories\/[^/?]+|en\/newsroom\/news\/[^/?]+|contact-us\/media-centre\/[^/?]+|\d{4}\/\d{2}\/\d{2}\/[^/?]+)/i.test(new URL(value).pathname);}
export function sourceAnnouncement(value:string,source:Source){
 if(!approvedForSource(value,source))return false;
 const path=new URL(value).pathname;
 if(source.line==="carnival")return /^\/20\d{2}\/\d{2}\/\d{2}\/[^/]+\/?$/.test(path);
 if(source.line==="viking")return /^\/press\/press-releases\/20\d{2}-\d{2}-\d{2}-.+\.html$/.test(path);
 return announcementPath(value);
}
async function readPage(url:string,source:Source,budget:Budget){
 for(let n=0;n<3;n++){
  if(!approvedForSource(url,source)&&!source.feedHosts?.some(host=>{try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password&&u.hostname===host;}catch{return false;}}))throw Error("Unapproved redirect");
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
 if(!data.date){const date=new URL(base).pathname.match(/\/(20\d{2})[/-](\d{2})[/-](\d{2})(?:[/-]|\.html)/);if(date)data.date=`${date[1]}-${date[2]}-${date[3]}T00:00:00Z`;}
 data.title=data.title.replace(/-(?:20\d{2})-\d{2}-\d{2}-.+$/,"").replace(/\s+\|\s+Carnival Cruise Line$/,"");
 return data;
}
async function publishNewsLinks(db:D1Database,source:Source,candidates:FeedStory[]){
 const rows:Record<string,string>[]=[];const seen=new Set<string>();
 for(const candidate of candidates){
  const canonical=normalUrl(candidate.url),date=recentDate(candidate.date),title=clean(candidate.title);
  if(!canonical||!approvedForSource(canonical,source)||!date||seen.has(canonical)||title.split(" ").length>24||title.length<8||title.length>180)continue;
  if(source.publisher&&!new URL(canonical).pathname.startsWith("/news/article/"))continue;
  seen.add(canonical);const hash=await digest(canonical),timestamp=new Date().toISOString();
  rows.push({id:"news-"+hash.slice(0,24),slug:slugify(title)+"-"+hash.slice(0,6),title,excerpt:source.publisher?`Cruise news from ${source.name}. Follow the publisher's link for the full story and details.`:`An official cruise announcement from ${source.name}. Follow the source link for the full story and details.`,line:source.line,source_url:canonical,source_name:source.name,sources:JSON.stringify([{name:source.name,url:canonical}]),published_at:date,created_at:timestamp,updated_at:timestamp,group_key:"collector:"+hash});
 }
 if(!rows.length)return 0;
 // One guarded bulk statement per source stays within the Free plan query budget.
 const fields=["id","slug","title","excerpt","line","source_url","source_name","sources","published_at","created_at","updated_at","group_key"];
 const result=await db.prepare(`INSERT INTO content (${fields.join(",")},kind,status,body) SELECT ${fields.map(key=>`json_extract(j.value,'$.${key}')`).join(",")},'news','published','' FROM json_each(?) AS j WHERE COALESCE((SELECT value FROM settings WHERE key='paused'),'false')<>'true' AND NOT EXISTS (SELECT 1 FROM content AS c WHERE c.source_url=json_extract(j.value,'$.source_url') AND c.id<>json_extract(j.value,'$.id')) ON CONFLICT(id) DO UPDATE SET status='published',title=excluded.title,excerpt=excluded.excerpt,published_at=excluded.published_at,updated_at=excluded.updated_at WHERE content.kind='news' AND content.status='draft' AND content.hidden=0 AND content.revision=1 AND content.created_at=content.updated_at AND content.group_key=excluded.group_key`).bind(JSON.stringify(rows)).run();
 return result.meta?.changes||0;
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
  const ordered=[...trustedSources.filter(source=>source.feedUrls?.length),...trustedSources.filter(source=>["carnival","viking"].includes(source.line)),...trustedSources.filter(source=>!source.feedUrls?.length&&!["carnival","viking"].includes(source.line))];
  for(const source of ordered){
   if(await get("paused")==="true")break;
   try{
    let candidates:string[]=[],sourceReadable=false;const stories:FeedStory[]=[];
    if(source.feedUrls?.length){
     for(const feed of source.feedUrls){
      try{const page=await readPage(feed,source,budget),parsed=parseRss(page.body);if(!parsed.length)continue;readable++;sourceReadable=true;stories.push(...parsed.filter(story=>approvedForSource(story.url,source)&&recentDate(story.date)).slice(0,10));break;}catch{/* Preserve saved feed items on failure. */}
     }
     if(!sourceReadable){failures.push(source.name+": RSS feed could not be read");continue;}
     added+=await publishNewsLinks(db,source,stories);continue;
    }
    const portals=[source.url,...(source.additionalUrls||[])];
    for(const portal of portals){
     try{const page=await readPage(portal,source,budget),data=await pageData(page.body,page.url);readable++;sourceReadable=true;
      candidates=[...new Set(data.links)].filter(u=>sourceAnnouncement(u,source)&&normalUrl(u)!==normalUrl(page.url)).slice(0,2);
      if(candidates.length)break;
     }catch{/* Try only the other explicitly approved newsroom, when available. */}
    }
    if(!candidates.length){failures.push(source.name+(sourceReadable?": no readable announcement links":": source could not be read"));continue;}
    const fetched=await Promise.allSettled(candidates.map(async url=>{
     const story=await readPage(url,source,budget),metadata=await pageData(story.body,story.url),date=recentDate(metadata.date);
     return date&&metadata.title?{url:story.url,title:metadata.title,date}:null;
    }));
    for(const result of fetched)if(result.status==="fulfilled"&&result.value)stories.push(result.value);
    if(fetched.some(result=>result.status==="rejected"))failures.push(source.name+": an announcement could not be read");
    added+=await publishNewsLinks(db,source,stories);
   }catch{failures.push(source.name+": source could not be read");}
  }
  await set("last_collector_report",JSON.stringify({at:new Date().toISOString(),version:COLLECTOR_VERSION,added,failures}));
  await set("last_error",failures.join("; ").slice(0,500));
  if(readable>0)await set("last_refresh",new Date().toISOString());
  return {added,failures};
 }finally{await db.prepare("DELETE FROM settings WHERE key='collector_lock' AND value=?").bind(lease).run();}
}
