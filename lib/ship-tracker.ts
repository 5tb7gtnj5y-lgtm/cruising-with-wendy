export const TRACKER_PATH = "/ship-tracker";
export const TRACKER_TITLE = "Cruise Ship Tracker & Latest Positions";
export const TRACKER_DESCRIPTION = "See the latest reported positions of cruise ships on a free interactive map, with quick choices for Marella Voyager, Iona and Queen Mary 2.";
export const TRACKER_PROVIDER = "https://www.cruiseshiptracking.com";
export const TRACKER_SHIPS = [
 {id:"marella-voyager",name:"Marella Voyager",line:"Marella Cruises"},
 {id:"iona",name:"Iona",line:"P&O Cruises"},
 {id:"queen-mary-2",name:"Queen Mary 2",line:"Cunard"},
] as const;
export function trackerShip(id:string){return TRACKER_SHIPS.find(ship=>ship.id===id)||TRACKER_SHIPS[0];}
export function trackerMapUrl(id:string){return TRACKER_PROVIDER+"/embed/map?"+new URLSearchParams({ship:trackerShip(id).id,zoom:"6",theme:"light"}).toString();}
export function trackerDetailsUrl(id:string){return TRACKER_PROVIDER+"/ships/"+trackerShip(id).id+"/where-is";}
