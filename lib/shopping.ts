export type ShoppingOffer={key:string;label:string;title:string;description:string;thumbnail:string;url:string;affiliate:boolean};
const products=[
 {key:"packing",label:"Packing organisers",title:"Packing organisers",description:"Keep your cabin drawers tidy and make unpacking a little simpler.",search:"packing+cubes",thumbnail:"/shopping/packing.svg"},
 {key:"cables",label:"Cable pouch",title:"A tidy cable pouch",description:"Keep charging leads together. Check your cruise line’s electrical-item policy before buying accessories.",search:"cable+organiser+pouch",thumbnail:"/shopping/cables.svg"},
 {key:"bag",label:"Lightweight day bag",title:"A lightweight day bag",description:"A comfortable bag for the little things you take ashore.",search:"lightweight+day+bag",thumbnail:"/shopping/bag.svg"}
];
export function shoppingOffers(raw="[]"):ShoppingOffer[]{
 const links:Record<string,string>={};
 try{const saved:unknown=JSON.parse(raw);if(Array.isArray(saved))for(const item of saved){if(!item||typeof item.key!=="string"||typeof item.url!=="string")continue;try{const url=new URL(item.url);if(url.protocol==="https:"&&!url.username&&!url.password)links[item.key]=url.href;}catch{}}}catch{/* Keep shopping and news usable when settings are invalid. */}
 return products.map(({search,...product})=>({...product,url:links[product.key]||"https://www.amazon.co.uk/s?k="+search,affiliate:!!links[product.key]}));
}
export function offerPair(offers:ShoppingOffer[],slot:number,tick:number){return [offers[(slot+tick)%offers.length],offers[(slot+tick+1)%offers.length]].filter(Boolean);}
