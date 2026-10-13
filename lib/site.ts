import { env } from "cloudflare:workers";
export const SITE_NAME = "Cruising with Wendy";
export { LINES, dateLabel, parseSources } from "./client-utils";
import { LINES } from "./client-utils";
export function origin(){ return (env.SITE_ORIGIN || "https://example.invalid").replace(/\/$/,""); }
export function isPublic(){return env.SITE_PUBLIC === "true";}
export function absolute(path:string){return origin()+path;}
export function lineName(slug:string){return LINES.find(x=>x.slug===slug)?.name||"Cruise life";}
export function safeUrl(value:string){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password?u.href:"";}catch{return "";}}
export function normalUrl(value:string){const valid=safeUrl(value);if(!valid)return "";const u=new URL(valid);[...u.searchParams.keys()].forEach(k=>{if(k.startsWith("utm_")||["fbclid","gclid","msockid"].includes(k))u.searchParams.delete(k);});u.hash="";return u.href.replace(/\/$/,"");}
export function slugify(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,110);}
export function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c");}
