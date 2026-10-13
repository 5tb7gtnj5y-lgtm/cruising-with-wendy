import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { content, settings, revisions, views, audit } from "@/db/schema";
import { and, or, eq, like, desc, lte, sql } from "drizzle-orm";
import { normalUrl, slugify, safeUrl, parseSources } from "./site";
import { z } from "zod";
import { CRUISE_LINE_SLUGS } from "./client-utils";
export type Entry=typeof content.$inferSelect;
export const inputSchema=z.object({title:z.string().trim().min(8).max(180),slug:z.string().max(110).optional(),kind:z.enum(["article","guide","news"]).default("article"),excerpt:z.string().trim().min(10).max(300),body:z.string().max(25000).default(""),line:z.enum(["general",...CRUISE_LINE_SLUGS]).default("general"),ship:z.string().max(100).default(""),destination:z.string().max(100).default(""),sourceUrl:z.string().max(1000).default(""),sourceName:z.string().max(100).default(""),sources:z.array(z.object({name:z.string().max(120),url:z.string().url().max(1000)})).max(8).default([]),seoTitle:z.string().max(100).default(""),seoDescription:z.string().max(180).default(""),ai:z.boolean().default(false),publishedAt:z.string().datetime().nullable().optional()});
export type Input=z.infer<typeof inputSchema>;
const now=()=>new Date().toISOString();
const publicWhere=()=>and(eq(content.hidden,0),or(eq(content.status,"published"),and(eq(content.status,"scheduled"),lte(content.publishedAt,now()))));
export async function publicEntries(options:{q?:string,line?:string,kind?:string,ship?:string,destination?:string,page?:number,limit?:number,all?:boolean}={}){
 const conditions=[publicWhere()];if(options.line)conditions.push(eq(content.line,options.line));if(options.kind)conditions.push(eq(content.kind,options.kind));
 const q=(options.q||"").trim().slice(0,100);if(q){const term="%"+q.replace(/[\\%_]/g,"\\$&")+"%";conditions.push(or(like(content.title,term),like(content.body,term),like(content.excerpt,term),like(content.ship,term),like(content.destination,term)));}
 if(options.ship)conditions.push(eq(content.ship,options.ship));if(options.destination)conditions.push(eq(content.destination,options.destination));
 const db=getDb(),where=and(...conditions),limit=options.limit||12,page=Math.max(1,Math.min(options.page||1,100));
 const query=db.select().from(content).where(where).orderBy(desc(content.featured),desc(content.publishedAt));
 const [items,total]=await Promise.all([options.all?query:query.limit(limit).offset((page-1)*limit),db.select({count:sql<number>`count(*)`}).from(content).where(where)]);
 return {items,total:total[0]?.count||0,page:options.all?1:page,limit:options.all?items.length:limit};
}
export async function bySlug(slug:string){return (await getDb().select().from(content).where(and(eq(content.slug,slug),publicWhere())).limit(1))[0]||null;}
export async function allContent(){return getDb().select().from(content).orderBy(desc(content.updatedAt)).limit(250);}
export async function setting(key:string,fallback=""){return (await getDb().select().from(settings).where(eq(settings.key,key)).limit(1))[0]?.value??fallback;}
export async function setSetting(key:string,value:string){await getDb().insert(settings).values({key,value}).onConflictDoUpdate({target:settings.key,set:{value}});}
export async function state(){
 const [items,lastRefresh,paused,lastDraft,links,stats,history]=await Promise.all([allContent(),setting("last_refresh"),setting("paused","false"),setting("last_draft"),setting("affiliate_links","[]"),getDb().select({path:views.path,views:sql<number>`sum(${views.count})`}).from(views).where(sql`${views.day} >= date('now','-30 days')`).groupBy(views.path).orderBy(desc(sql`sum(${views.count})`)).limit(30),getDb().select().from(audit).orderBy(desc(audit.createdAt)).limit(20)]);
 const lastError=await setting("last_error"),lastCollectorReport=await setting("last_collector_report");
 return {lastError,lastCollectorReport,items,lastRefresh,paused:paused==="true",lastDraft,affiliateLinks:JSON.parse(links),analytics:stats,history,indexing:env.SITE_PUBLIC==="true"};
}
export async function addDraft(input:Input,groupKey="",kind?:string){
 const db=getDb(),id=crypto.randomUUID(),time=now(),base=slugify(input.slug||input.title)||"cruise-story";
 let slug=base;const exists=await db.select({id:content.id}).from(content).where(eq(content.slug,slug)).limit(1);if(exists.length)slug=base+"-"+id.slice(0,8);
 const row={...input,id,slug,kind:kind||input.kind,status:"draft",ai:input.ai?1:0,sources:JSON.stringify(input.sources.filter(s=>safeUrl(s.url))),sourceUrl:normalUrl(input.sourceUrl),createdAt:time,updatedAt:time,publishedAt:null,groupKey};
 await db.insert(content).values(row);await db.insert(audit).values({id:crypto.randomUUID(),action:"Draft created",contentId:id,createdAt:time});return id;
}
export async function saveEdit(id:string,input:Input,expectedRevision:number){
 const db=getDb(),old=(await db.select().from(content).where(eq(content.id,id)).limit(1))[0];if(!old)throw Error("Article not found.");if(old.revision!==expectedRevision)throw Error("This article has changed. Reload it before saving.");
 const data={title:input.title,excerpt:input.excerpt,body:input.body,line:input.line,ship:input.ship,destination:input.destination,sourceUrl:normalUrl(input.sourceUrl),sourceName:input.sourceName,sources:JSON.stringify(input.sources.filter(s=>safeUrl(s.url))),seoTitle:input.seoTitle,seoDescription:input.seoDescription,ai:input.ai?1:0,updatedAt:now(),revision:old.revision+1};
 if(["published","scheduled"].includes(old.status)&&old.kind!=="news"){const draftId=await addDraft({...input,slug:old.slug+"-revision",kind:old.kind as Input["kind"]},"revision:"+old.id);return {id:draftId,message:"Revision saved for review. The live article is unchanged."};}
 const r=await db.update(content).set(data).where(and(eq(content.id,id),eq(content.revision,expectedRevision))).returning({id:content.id});if(!r.length)throw Error("Another edit was saved first. Reload before saving.");
 await db.insert(revisions).values({id:crypto.randomUUID(),contentId:id,snapshot:JSON.stringify(old),createdAt:now()});return {id,message:"Draft saved."};
}
export async function publish(id:string,schedule:string|null=null){
 const db=getDb(),item=(await db.select().from(content).where(eq(content.id,id)).limit(1))[0];if(!item)throw Error("Article not found.");
 if(item.kind!=="news"&&(item.body.length<200||parseSources(item.sources).length===0))throw Error("Add article text and at least one source before publishing.");
 if(schedule&&(!Number.isFinite(Date.parse(schedule))||Date.parse(schedule)<=Date.now()))throw Error("Choose a future publication time.");
 const pub=schedule||now(),status=schedule?"scheduled":"published";
 if(item.groupKey.startsWith("revision:")){
  const baseId=item.groupKey.slice(9),base=(await db.select().from(content).where(eq(content.id,baseId)).limit(1))[0];if(!base)throw Error("The original article is missing.");
  const {id:unusedId,slug:unusedSlug,createdAt:unusedCreated,...copy}=item;void unusedId;void unusedSlug;void unusedCreated;
  await db.batch([db.insert(revisions).values({id:crypto.randomUUID(),contentId:baseId,snapshot:JSON.stringify(base),createdAt:now()}),db.update(content).set({...copy,groupKey:base.groupKey,status,publishedAt:pub,updatedAt:now(),revision:base.revision+1}).where(eq(content.id,baseId)),db.delete(content).where(eq(content.id,id))]);
 }else{await db.update(content).set({status,publishedAt:pub,hidden:0,updatedAt:now()}).where(eq(content.id,id));}
 await db.insert(audit).values({id:crypto.randomUUID(),action:schedule?"Article scheduled":"Article published",contentId:id,createdAt:now()});
}
export async function setStatus(id:string,status:string){if(!["archived","draft"].includes(status))throw Error("Invalid status.");await getDb().update(content).set({status,hidden:status==="archived"?1:0,updatedAt:now()}).where(eq(content.id,id));}
export async function feature(id:string){const db=getDb();await db.batch([db.update(content).set({featured:0}),db.update(content).set({featured:1}).where(and(eq(content.id,id),publicWhere()))]);}
export async function remove(id:string){const db=getDb(),item=(await db.select().from(content).where(eq(content.id,id)).limit(1))[0];if(!item)return;if(item.kind==="news"){await setStatus(id,"archived");return;}await db.batch([db.delete(revisions).where(eq(revisions.contentId,id)),db.delete(content).where(eq(content.id,id))]);}
export async function restoreDraft(revisionId:string){const saved=(await getDb().select().from(revisions).where(eq(revisions.id,revisionId)).limit(1))[0];if(!saved)throw Error("Revision not found.");const old=JSON.parse(saved.snapshot) as Entry;return addDraft(inputSchema.parse({...old,kind:old.kind,sources:parseSources(old.sources),ai:!!old.ai,slug:old.slug+"-restored"}),"revision:"+saved.contentId);}
export async function revisionList(id:string){return getDb().select().from(revisions).where(eq(revisions.contentId,id)).orderBy(desc(revisions.createdAt)).limit(20);}
export const trustedSources=[
 {name:"TUI / Marella",line:"marella",url:"https://www.tuigroup.com/en/newsroom/tui-uki",hosts:["tuigroup.com","tui.co.uk"]},
 {name:"P&O Cruises",line:"po",url:"https://www.pocruises.com/press",hosts:["pocruises.com","carnivalukcareers.co.uk"]},
 {name:"MSC Cruises press office",line:"msc",url:"https://www.mscpressarea.com/en_INT/press-releases/",hosts:["mscpressarea.com","msccruises.co.uk","msccruises.com"]},
 {name:"Royal Caribbean Group",line:"royal-caribbean",url:"https://www.royalcaribbeangroup.com/news/",hosts:["royalcaribbeangroup.com","royalcaribbean.com"]},
 {name:"Cunard press office",line:"cunard",url:"https://www.cunard.com/en-gb/contact-us/media-centre",hosts:["cunard.com"]},
 {name:"Princess Cruises newsroom",line:"princess",url:"https://www.princess.com/en-int/news/news-releases",hosts:["princess.com"]},
 {name:"Norwegian Cruise Line newsroom",line:"norwegian",url:"https://www.ncl.com/newsroom",hosts:["ncl.com"]},
 {name:"Celebrity Cruises official updates",line:"celebrity",url:"https://www.celebritycruises.com/captains-club/newsletter",additionalUrls:["https://royalcaribbeangrouppresscenter.com/celebrity/"],hosts:["celebritycruises.com","royalcaribbeangrouppresscenter.com"]},
 {name:"Holland America Line newsroom",line:"holland-america",url:"https://www.hollandamerica.com/en/us/newsroom",hosts:["hollandamerica.com"]},
 {name:"Virgin Voyages press office",line:"virgin-voyages",url:"https://www.virginvoyages.com/press/latest-releases",additionalUrls:["https://www.virginvoyages.com/ahoy/stories"],hosts:["virginvoyages.com"]},
];
export function trusted(url:string){try{const hostname=new URL(url).hostname.toLowerCase();return trustedSources.some(s=>s.hosts.some(h=>hostname===h||hostname.endsWith("."+h)));}catch{return false;}}
export async function ingestNews(inputs:Input[]){
 let added=0,duplicates=0;const db=getDb();
 for(const input of inputs.slice(0,20)){
  const sourceUrl=normalUrl(input.sourceUrl);if(!sourceUrl||!trusted(sourceUrl))throw Error("News must link to an approved primary source.");
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(sourceUrl)))).map(x=>x.toString(16).padStart(2,"0")).join("");const id="news-"+hash.slice(0,24);
  const existing=await db.select({id:content.id}).from(content).where(or(eq(content.sourceUrl,sourceUrl),eq(content.id,id))).limit(1);if(existing.length){duplicates++;continue;}
  const titleKey=slugify(input.title).split("-").filter(w=>w.length>3).sort().join("-");
  const time=now();await db.insert(content).values({id,slug:slugify(input.title)+"-"+hash.slice(0,6),kind:"news",status:"published",title:input.title,excerpt:input.excerpt.slice(0,240),line:input.line,ship:input.ship,destination:input.destination,sourceUrl,sourceName:input.sourceName,sources:JSON.stringify(input.sources),groupKey:titleKey,publishedAt:input.publishedAt||null,createdAt:time,updatedAt:time}).onConflictDoNothing();added++;
 }
 return {added,duplicates};
}
export function seoIssues(item:Entry){const issues:string[]=[];const title=item.seoTitle||item.title,description=item.seoDescription||item.excerpt;if(title.length>65)issues.push("Shorten the search title to about 60 characters.");if(title.length<20)issues.push("Make the search title more descriptive.");if(description.length<70||description.length>160)issues.push("Aim for a search description of 70–160 characters.");if(item.kind!=="news"&&!/^## /m.test(item.body))issues.push("Add descriptive section headings.");if(item.kind!=="news"&&parseSources(item.sources).length===0)issues.push("Add source references.");return issues;}

