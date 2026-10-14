import type {Metadata} from "next";
import {absolute,isPublic,SITE_NAME} from "./site";
export const HOME_TITLE="Cruising with Wendy | Cruise News & UK Cruise Guides";
export const HOME_DESCRIPTION="Latest cruise news, ship updates and practical guides for UK travellers. Explore Marella, P&O, Carnival, Viking and more with Cruising with Wendy.";
export const sharingImage=()=>({url:absolute("/brand/wendy-logo.webp"),width:1336,height:1177,alt:"Cruising with Wendy: a friendly captain, cruise ship and turquoise waves"});
type PageSEO={title:string;description:string;path:string;noindex?:boolean;article?:{publishedTime?:string;modifiedTime?:string}};
export function pageMetadata({title,description,path,noindex=false,article}:PageSEO):Metadata{
 const index=isPublic()&&!noindex,image=sharingImage();
 return {title,description,alternates:{canonical:absolute(path)},robots:{index,follow:isPublic(),googleBot:{index,follow:isPublic(),"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}},
  openGraph:{title,description,url:absolute(path),siteName:SITE_NAME,locale:"en_GB",type:article?"article":"website",images:[image],...article},
  twitter:{card:"summary",title,description,images:[{url:image.url,alt:image.alt}]}
 };
}
