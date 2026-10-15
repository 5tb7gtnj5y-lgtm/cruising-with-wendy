import { Fragment } from "react";
import type { Entry } from "@/lib/content";
import { shoppingOffers } from "@/lib/shopping";
import { ShoppingRow, ShoppingOffersProvider } from "./shopping-offers";
import { Card } from "./cards";

export function NewsFeed({items,affiliateLinks="[]"}:{items:Entry[];affiliateLinks?:string}){
 const offers=shoppingOffers(affiliateLinks);
 return <ShoppingOffersProvider offers={offers}><div className="card-grid news-grid expanding-news-feed">
  {items.length>0&&<ShoppingRow slot={0}/>}
  {items.map((item,index)=><Fragment key={item.id}>
   <Card item={item}/>
   {(index+1)%3===0&&index+1<items.length&&<ShoppingRow slot={Math.floor(index/3)+1} className="desktop-shopping-row"/>}
   {(index+1)%2===0&&index+1<items.length&&<ShoppingRow slot={Math.floor(index/2)+1} className="mobile-shopping-row"/>}
  </Fragment>)}
  {items.length>0&&<ShoppingRow slot={Math.ceil(items.length/3)}/>}
 </div></ShoppingOffersProvider>;
}
