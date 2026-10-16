import {TRACKER_IMOS,TRACKER_SHIPS,validImo} from "@/lib/ship-tracker";
type Entity={labels?:Record<string,{value?:string}>;aliases?:Record<string,{value?:string}[]>;claims?:Record<string,{rank?:string;mainsnak?:{datavalue?:{value?:unknown}}}[]>};
const identityName=(name:string)=>name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/^(?:ms|mv|rms|ss)\s+/,"").replace(/[^a-z0-9]/g,"");
export function matchingImo(name:string,entities:Record<string,Entity>){
 const found=new Set<string>();
 for(const entity of Object.values(entities)){
  const names=[...Object.values(entity.labels||{}),...Object.values(entity.aliases||{}).flat()].map(x=>x.value||"");
  if(!names.some(candidate=>identityName(candidate)===identityName(name)))continue;
  for(const claim of entity.claims?.P458||[]){const value=claim.mainsnak?.datavalue?.value;if(claim.rank!=="deprecated"&&validImo(value))found.add(value);}
 }
 return found.size===1?[...found][0]:null;
}
export async function resolveShipImo(id:string,fetcher:typeof fetch=fetch){
 const ship=TRACKER_SHIPS.find(item=>item.id===id);if(!ship)return null;
 if(TRACKER_IMOS[id])return TRACKER_IMOS[id];
 async function wikidata(params:Record<string,string>){
  const response=await fetcher("https://www.wikidata.org/w/api.php?"+new URLSearchParams({format:"json",...params}),{headers:{"User-Agent":"CruisingWithWendy/1.0 (https://cruisingwithwendy.co.uk/about#contact)",Accept:"application/json"},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error("Ship identity service unavailable");return response.json() as Promise<Record<string,unknown>>;
 }
 const result=await wikidata({action:"wbsearchentities",search:ship.name,language:"en",limit:"50",type:"item"});
 if(result.error)throw Error("Ship identity service unavailable");
 const search=(Array.isArray(result.search)?result.search:[]) as {id?:string;description?:string}[];
 const cruiseMatches=search.filter(item=>/cruise/i.test(item.description||""));
 const vesselMatches=search.filter(item=>/ship|vessel|liner/i.test(item.description||""));
 const candidates=cruiseMatches.length?cruiseMatches:vesselMatches.length?vesselMatches:search;
 const ids=candidates.slice(0,20).map(item=>item.id||"").filter(id=>/^Q\d+$/.test(id));
 if(!ids.length)return null;
 const data=await wikidata({action:"wbgetentities",ids:ids.join("|"),props:"labels|aliases|claims",languages:"en"});
 return matchingImo(ship.name,(data.entities||{}) as Record<string,Entity>);
}
