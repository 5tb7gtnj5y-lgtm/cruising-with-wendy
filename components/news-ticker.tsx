"use client";
import {useState,type CSSProperties} from "react";
import {ArrowUpRight,Pause,Play,Radio} from "lucide-react";

type Headline={id:string;title:string;sourceUrl:string};
export function NewsTicker({items}:{items:Headline[]}){
 const [paused,setPaused]=useState(false);
 const stories=items.filter(item=>{try{const url=new URL(item.sourceUrl);return url.protocol==="https:"&&!url.username&&!url.password&&(url.hostname==="breakingtravelnews.com"||url.hostname==="www.breakingtravelnews.com")&&url.pathname.startsWith("/news/article/");}catch{return false;}}).slice(0,10);
 if(!stories.length)return <aside className="news-ticker ticker-empty" aria-label="Breaking Travel News cruise headlines"><span className="ticker-label"><Radio size={16}/>Breaking Travel News</span><a href="https://www.breakingtravelnews.com/news/category/cruise/" target="_blank" rel="noopener noreferrer">Read the latest cruise headlines <ArrowUpRight size={16}/></a></aside>;
 const duration={"--ticker-duration":`${Math.max(40,stories.length*10)}s`} as CSSProperties;
 return <aside className={"news-ticker"+(paused?" ticker-paused":"")} aria-label="Breaking Travel News cruise headlines">
  <span className="ticker-label"><Radio size={16}/><span>Breaking Travel News<small>Cruise headlines</small></span></span>
  <div className="ticker-window"><div className="ticker-track" style={duration}>
   <div className="ticker-group">{stories.map(story=><a key={story.id} href={story.sourceUrl} target="_blank" rel="noopener noreferrer"><span className="ticker-dot" aria-hidden="true"/>{story.title}<ArrowUpRight size={14}/></a>)}</div>
   <div className="ticker-group ticker-duplicate" aria-hidden="true">{stories.map(story=><a key={story.id} href={story.sourceUrl} tabIndex={-1} target="_blank" rel="noopener noreferrer"><span className="ticker-dot"/>{story.title}<ArrowUpRight size={14}/></a>)}</div>
  </div></div>
  <button className="ticker-pause" type="button" aria-label={paused?"Resume scrolling news":"Pause scrolling news"} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button>
 </aside>;
}
