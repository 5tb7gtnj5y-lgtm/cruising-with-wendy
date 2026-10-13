export type FeedStory={title:string;url:string;date:string};
// Only the RSS headline, original link and publication date are used. Article
// bodies, images, scripts and external entity declarations are never imported.
export function rssText(value:string){return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/<[^>]*>/g,"").replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(_,entity:string)=>{if(entity[0]==="#"){const n=entity[1].toLowerCase()==="x"?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);return n>31&&n<=0x10ffff?String.fromCodePoint(n):"";}return ({amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" "} as Record<string,string>)[entity.toLowerCase()]||"";}).replace(/\s+/g," ").trim();}
export function parseRss(xml:string):FeedStory[]{
 if(!/<rss\b/i.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))return [];
 const items:FeedStory[]=[];
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const field=(tag:string)=>rssText(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,"i").exec(match[1])?.[1]||"");
  const title=field("title"),url=field("link"),date=field("pubDate")||field("dc:date");
  if(title&&url&&date)items.push({title,url,date});if(items.length>=30)break;
 }
 return items;
}
