import {publicEntries,type Entry} from "@/lib/content";
import {absolute,LINES,isPublic} from "@/lib/site";
export const dynamic="force-dynamic";
const escape=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
function lastModified(items:Entry[]){const dates=items.map(x=>Date.parse(x.updatedAt)).filter(Number.isFinite);return dates.length?new Date(dates.reduce((max,date)=>Math.max(max,date),0)).toISOString():"";}
export async function GET(){
 if(!isPublic())return new Response("",{status:404,headers:{"X-Robots-Tag":"noindex, nofollow"}});
 const [news,articles,guides]=await Promise.all([publicEntries({kind:"news",all:true}),publicEntries({kind:"article",all:true}),publicEntries({kind:"guide",all:true})]);
 const originals=[...articles.items,...guides.items],all=[...news.items,...originals];
 const pages=[{path:"/",modified:lastModified(all)},{path:"/news",modified:lastModified(news.items)},{path:"/articles",modified:lastModified(articles.items)},{path:"/hot-cruise-deals",modified:""},...["/about","/essentials","/privacy","/affiliate-disclosure"].map(path=>({path,modified:""})),...LINES.map(line=>({path:"/cruise-lines/"+line.slug,modified:lastModified(all.filter(x=>x.line===line.slug))})),...originals.map(item=>({path:"/read/"+item.slug,modified:lastModified([item])}))];
 const links=pages.map(({path,modified})=>"<url><loc>"+escape(absolute(path))+"</loc>"+(modified?"<lastmod>"+escape(modified)+"</lastmod>":"")+"</url>");
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+links.join("")+'</urlset>',{headers:{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=300"}});
}
