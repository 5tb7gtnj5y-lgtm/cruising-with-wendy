import {CRUISE_SHIP_CATALOGUE} from "@/lib/cruise-ship-catalogue";
export const TRACKER_PATH = "/ship-tracker";
export const TRACKER_TITLE = "Cruise Ship Tracker & Latest Positions";
export const TRACKER_DESCRIPTION = "Search cruise ships by name or cruise line and explore their latest reported positions on a free interactive map. Tracking coverage and report times vary.";
export const TRACKER_PROVIDER = "https://www.cruiseshiptracking.com";
export const TRACKER_SHIPS = CRUISE_SHIP_CATALOGUE;
export const DEFAULT_TRACKER_SHIP_ID = "marella-voyager";
export const TRACKER_QUICK_PICKS = [DEFAULT_TRACKER_SHIP_ID,"iona","queen-mary-2"];
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
export function trackerMapUrl(id:string){return TRACKER_PROVIDER+"/embed/map?"+new URLSearchParams({ship:trackerShip(id).id,zoom:"6",theme:"light"}).toString();}
export function trackerDetailsUrl(id:string){return TRACKER_PROVIDER+"/ships/"+trackerShip(id).id+"/where-is";}
