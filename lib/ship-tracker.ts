import {CRUISE_SHIP_CATALOGUE} from "@/lib/cruise-ship-catalogue";
export const TRACKER_PATH = "/ship-tracker";
export const TRACKER_TITLE = "Cruise Ship Tracker & Latest Positions";
export const TRACKER_DESCRIPTION = "Search cruise ships by name or cruise line and explore their latest reported positions on a free interactive map. Tracking coverage and report times vary.";
export const TRACKER_PROVIDER = "https://www.vesselfinder.com";
// Stable vessel identities; positions always come from the official VesselFinder widget.
// Checked against public vessel particulars and Deck7's sourced ship index, 16 October 2026.
export const TRACKER_IMOS:Readonly<Record<string,string>> = {
 "marella-voyager":"9106302","marella-explorer":"9106297","marella-explorer-2":"9072446",
 "marella-discovery":"9070632","marella-discovery-2":"9070620","iona":"9826548",
 "queen-mary-2":"9241061","msc-virtuosa":"9803625","sky-princess":"9802396",
};
export function validImo(value:unknown):value is string{
 if(typeof value!=="string"||!/^\d{7}$/.test(value))return false;
 return [...value.slice(0,6)].reduce((total,digit,index)=>total+Number(digit)*(7-index),0)%10===Number(value[6]);
}
export const TRACKER_SHIPS = CRUISE_SHIP_CATALOGUE;
export const DEFAULT_TRACKER_SHIP_ID = "marella-voyager";
export function trackerShip(id:string){return TRACKER_SHIPS.find(ship=>ship.id===id)||TRACKER_SHIPS.find(ship=>ship.id===DEFAULT_TRACKER_SHIP_ID)!;}
function searchText(value:string){return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();}
export function findTrackerShips(query:string){
 const text=searchText(query).slice(0,100),words=text.split(/\s+/);
 if(text.length<2)return [];
 return TRACKER_SHIPS.filter(ship=>{const haystack=searchText(ship.name+" "+ship.line);return words.every(word=>haystack.includes(word));}).sort((a,b)=>{
  const score=(name:string)=>{const n=searchText(name);return n===text?0:n.startsWith(text)?1:n.includes(text)?2:3;};
  return score(a.name)-score(b.name)||a.name.localeCompare(b.name);
 });
}
export function trackerMapUrl(imo:string){return validImo(imo)?"/api/ship-tracker/map?imo="+imo:null;}
export function trackerDetailsUrl(imo:string){return validImo(imo)?TRACKER_PROVIDER+"/vessels/details/"+imo:TRACKER_PROVIDER+"/vessels";}
