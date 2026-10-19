import {validSession} from "./session";
import {trustedSources,seoIssues,type Entry} from "./content";
import {safeUrl} from "./site";
import {SHOPPING_PRODUCTS} from "./shopping";

const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow","X-Wendy-Admin-Version":"native-data-20261013"}});
const columns="id,slug,kind,status,title,excerpt,body,line,ship,destination,source_url AS sourceUrl,source_name AS sourceName,sources,seo_title AS seoTitle,seo_description AS seoDescription,ai,featured,published_at AS publishedAt,created_at AS createdAt,updated_at AS updatedAt,revision,group_key AS groupKey,hidden";

export function readAffiliateLinks(value:string){
 try{
  const parsed:unknown=JSON.parse(value);if(!Array.isArray(parsed))return [];
  return parsed.filter((x):x is {key:string;url:string}=>!!x&&typeof x==="object"&&typeof x.key==="string"&&SHOPPING_PRODUCTS.some(p=>p.key===x.key)&&typeof x.url==="string"&&!!safeUrl(x.url)).slice(0,SHOPPING_PRODUCTS.length).map(x=>({key:x.key,url:safeUrl(x.url)}));
 }catch{return [];}
}

// Dashboard reads bypass the framework route and its request context. D1
// returns the app's field names directly; no data or settings are rewritten.
export async function adminData(request:Request,env:Cloudflare.Env){
 if(request.method!=="GET")return json({error:"This data request is not supported."},405);
 if(!env.DB)return json({code:"database_binding",error:"The news database is not connected. Check the DB binding in Cloudflare."},503);
 try{
  if(!await validSession(env.DB,request.headers.get("cookie")))return json({code:"sign_in",error:"Your administrator session has ended. Please sign in again."},401);
  const url=new URL(request.url);
  if(url.searchParams.has("revisions")){
   const result=await env.DB.prepare("SELECT id,content_id AS contentId,snapshot,created_at AS createdAt FROM revisions WHERE content_id=? ORDER BY created_at DESC LIMIT 20").bind(url.searchParams.get("revisions")).all();return json(result.results);
  }
  if(url.searchParams.has("export")){
   const result=await env.DB.batch([
    env.DB.prepare("SELECT "+columns+" FROM content"),
    env.DB.prepare("SELECT id,content_id AS contentId,snapshot,created_at AS createdAt FROM revisions"),
    env.DB.prepare("SELECT key,value FROM settings")
   ]);return json({content:result[0].results,revisions:result[1].results,settings:result[2].results,exportedAt:new Date().toISOString()});
  }
  const result=await env.DB.batch([
   env.DB.prepare("SELECT "+columns+" FROM content ORDER BY updated_at DESC LIMIT 250"),
   env.DB.prepare("SELECT key,value FROM settings"),
   env.DB.prepare("SELECT path,sum(count) AS views FROM views WHERE day>=date('now','-30 days') GROUP BY path ORDER BY sum(count) DESC LIMIT 30"),
   env.DB.prepare("SELECT id,action,content_id AS contentId,created_at AS createdAt FROM audit ORDER BY created_at DESC LIMIT 20")
  ]);
  const items=result[0].results as Entry[],settings=Object.fromEntries((result[1].results as {key:string;value:string}[]).map(x=>[x.key,x.value]));
  return json({items,lastRefresh:settings.last_refresh||"",lastDraft:settings.last_draft||"",lastError:settings.last_error||"",lastCollectorReport:settings.last_collector_report||"",paused:settings.paused==="true",affiliateLinks:readAffiliateLinks(settings.affiliate_links||"[]"),analytics:result[2].results,history:result[3].results,indexing:env.SITE_PUBLIC==="true",sources:trustedSources,seo:items.filter(x=>x.status==="published"&&x.kind!=="news").map(x=>({id:x.id,title:x.title,slug:x.slug,issues:seoIssues(x)}))});
 }catch(error){
  const message=error&&typeof error==="object"&&"message" in error&&typeof error.message==="string"?error.message:"";
  if(/no such table: (content|settings|views|audit|revisions)\b/i.test(message))return json({code:"database_setup",error:"The news database setup is incomplete. Restore your saved news using the database step in the setup helper."},503);
  console.error("Wendy dashboard data read failed");
  return json({code:"database_unavailable",error:"The news database could not be read. Your saved content has not been changed. Please try again or check the Worker logs in Cloudflare."},503);
 }
}
