import { Fragment } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Entry } from "@/lib/content";
import { safeUrl } from "@/lib/site";
import { Card } from "./cards";

const products=[
 {key:"packing",label:"Packing organisers",search:"packing+cubes"},
 {key:"cables",label:"Cable pouch",search:"cable+organiser+pouch"},
 {key:"bag",label:"Lightweight day bag",search:"lightweight+day+bag"}
];
function ShoppingRow({links,slot,className=""}:{links:Record<string,string>;slot:number;className?:string}){
 const selected=[products[slot%products.length],products[(slot+1)%products.length]],affiliate=selected.some(p=>!!links[p.key]);
 return <aside className={"news-shopping-row"+(className?" "+className:"")} aria-label={affiliate?"Affiliate shopping links":"Amazon shopping links"}>
  <span className="shopping-intro">Cruise essentials</span>
  <div className="shopping-links">{selected.map(product=><span className="shopping-product" key={product.key}><a href={links[product.key]||"https://www.amazon.co.uk/s?k="+product.search} target="_blank" rel={links[product.key]?"sponsored noopener noreferrer":"noopener noreferrer"}>{product.label}<ArrowUpRight size={13}/></a>{links[product.key]&&<small className="shopping-link-label">Affiliate</small>}</span>)}</div>
  <small>{affiliate?<>Affiliate links · We may earn a commission. <a href="/affiliate-disclosure">Details</a></>:"Amazon search links"}</small>
 </aside>;
}
export function NewsFeed({items,affiliateLinks="[]"}:{items:Entry[];affiliateLinks?:string}){
 let links:Record<string,string>={};
 try{const saved:unknown=JSON.parse(affiliateLinks);if(Array.isArray(saved))for(const value of saved){if(value&&typeof value.key==="string"&&typeof value.url==="string")links[value.key]=safeUrl(value.url);}}catch{/* Keep the news readable if a saved setting cannot be read. */}
 return <div className="card-grid news-grid expanding-news-feed">
  {items.length>0&&<ShoppingRow links={links} slot={0}/>}
  {items.map((item,index)=><Fragment key={item.id}>
   <Card item={item}/>
   {(index+1)%3===0&&index+1<items.length&&<ShoppingRow links={links} slot={Math.floor(index/3)+1} className="desktop-shopping-row"/>}
   {(index+1)%2===0&&index+1<items.length&&<ShoppingRow links={links} slot={Math.floor(index/2)+1} className="mobile-shopping-row"/>}
  </Fragment>)}
  {items.length>0&&<ShoppingRow links={links} slot={Math.ceil(items.length/3)}/>}
 </div>;
}
