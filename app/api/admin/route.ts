import { adminApi, sameOrigin } from "@/lib/auth";
import { state, inputSchema, addDraft, saveEdit, publish, setStatus, feature, remove, revisionList, restoreDraft, setSetting, trustedSources, seoIssues, allContent } from "@/lib/content";
import { getDb } from "@/db";import { content,revisions,settings } from "@/db/schema";
import { safeUrl } from "@/lib/site";
import { SHOPPING_PRODUCTS } from "@/lib/shopping";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){if(!await adminApi())return json({error:"Administrator sign-in required."},403);const u=new URL(request.url);if(u.searchParams.has("revisions"))return json(await revisionList(u.searchParams.get("revisions")!));if(u.searchParams.has("export")){const db=getDb();return json({content:await db.select().from(content),revisions:await db.select().from(revisions),settings:await db.select().from(settings),exportedAt:new Date().toISOString()});}const data=await state();return json({...data,sources:trustedSources,seo:data.items.filter(x=>x.status==="published"&&x.kind!=="news").map(x=>({id:x.id,title:x.title,slug:x.slug,issues:seoIssues(x)}))});}
export async function POST(request:Request){
 if(!await adminApi())return json({error:"Administrator sign-in required."},403);if(!sameOrigin(request))return json({error:"This request must come from the administrator page."},403);
 const raw=await request.text();if(raw.length>80000)return json({error:"The request is too large."},413);
 try{const p=JSON.parse(raw),id=typeof p.id==="string"?p.id:"";let result:unknown={message:"Saved."};
 switch(p.action){
 case "create":result={id:await addDraft(inputSchema.parse(p.article)),message:"Draft created."};break;
 case "save":result=await saveEdit(id,inputSchema.parse(p.article),Number(p.revision));break;
 case "publish":await publish(id,typeof p.schedule==="string"?p.schedule:null);result={message:p.schedule?"Article scheduled.":"Article published."};break;
 case "archive":await setStatus(id,"archived");result={message:"Unpublished and archived."};break;
 case "reopen":await setStatus(id,"draft");result={message:"Returned to the review queue."};break;
 case "feature":await feature(id);result={message:"Featured story updated."};break;
 case "delete":await remove(id);result={message:"Removed. News suppression is kept to prevent re-import."};break;
 case "restore":result={id:await restoreDraft(id),message:"Previous version restored as a review draft."};break;
 case "pause":await setSetting("paused",p.paused?"true":"false");result={message:p.paused?"Automatic updates paused.":"Automatic updates enabled."};break;
 case "affiliates":{if(!Array.isArray(p.links)||p.links.length>SHOPPING_PRODUCTS.length)throw Error("Invalid links.");const clean=p.links.map((x:{key:string,url:string})=>{if(!SHOPPING_PRODUCTS.some(product=>product.key===x.key))throw Error("Invalid product.");if(x.url&&!safeUrl(x.url))throw Error("Use a valid HTTPS product URL.");return {key:x.key,url:safeUrl(x.url)};}).filter((x:{url:string})=>x.url);await setSetting("affiliate_links",JSON.stringify(clean));result={message:"Product links saved."};break;}
 default:return json({error:"Unknown action."},400);
 }return json(result);}catch(e){return json({error:e instanceof Error?e.message:"Unable to save this change."},400);}
}

