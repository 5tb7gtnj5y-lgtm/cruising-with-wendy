import { ArrowUpRight, ArrowRight, Waves, Ship, Compass, Music, Palmtree } from "lucide-react";
import type { Entry } from "@/lib/content";
import { dateLabel, lineName } from "@/lib/site";
import { SeaArt, type SeaScene } from "./sea-art";
import { NewsPhoto } from "./news-photo";
import { newsPhoto } from "@/lib/news-photos";
export function Card({item}:{item:Entry}){
 const news=item.kind==="news",musical=/music|entertainment|pete tong/i.test(item.title);
 const scene:SeaScene=item.line==="royal-caribbean"?"island":item.line==="po"?"sunset":"ship";
 const icon=musical?<Music size={21}/>:item.kind==="guide"?<Compass size={21}/>:scene==="island"?<Palmtree size={21}/>:<Ship size={21}/>;
 const href=news?item.sourceUrl:"/read/"+item.slug;
 const external=news?{target:"_blank",rel:"noopener noreferrer"}:{};
 return <article className={"story-card "+(news?"news-card ":"")+"story-"+item.line}>
  {news?<NewsPhoto photo={newsPhoto(item)} href={href} lineName={lineName(item.line)}/>:<div className="card-visual"><SeaArt small scene={scene}/><span className="card-stamp" aria-hidden="true">{icon}</span><span className="visual-label"><Waves size={12}/>{lineName(item.line)}</span></div>}
  <div className="card-copy"><div className="card-meta"><span>{news?"Cruise news":item.kind==="guide"?"Your cruise companion":"The journal"}</span><span>{item.publishedAt?dateLabel(item.publishedAt):"Official update"}</span></div>
   <h3><a href={href} {...external}>{item.title}</a></h3><p>{item.excerpt}</p>
   <div className="card-bottom"><span>{news?item.sourceName:"Cruising with Wendy"}</span><a className="icon-link" href={href} aria-label={(news?"Read at source: ":"Read: ")+item.title} {...external}>{news?<ArrowUpRight size={21}/>:<ArrowRight size={21}/>}</a></div>
  </div>
 </article>;
}

