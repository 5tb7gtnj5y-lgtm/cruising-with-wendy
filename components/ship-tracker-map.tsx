"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowUpRight, MapPin, Search, Ship} from "lucide-react";
import {DEFAULT_TRACKER_SHIP_ID,TRACKER_IMOS,TRACKER_PROVIDER,TRACKER_SHIPS,findTrackerShips,trackerShip,trackerMapUrl,trackerDetailsUrl,validImo} from "@/lib/ship-tracker";

export function ShipTrackerMap(){
 const [shipId,setShipId]=useState(DEFAULT_TRACKER_SHIP_ID);
 const [query,setQuery]=useState("");
 const [searchOpen,setSearchOpen]=useState(false);
 const [imo,setImo]=useState<string|null>(TRACKER_IMOS[DEFAULT_TRACKER_SHIP_ID]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const activeRequest=useRef<AbortController|null>(null);
 useEffect(()=>()=>activeRequest.current?.abort(),[]);
 const ship=trackerShip(shipId),matches=findTrackerShips(query);
 const showResults=searchOpen&&query.trim().length>=2;
 async function chooseShip(id:string){
  activeRequest.current?.abort();const controller=new AbortController();activeRequest.current=controller;
  setShipId(id);setSearchOpen(false);setError("");setImo(null);
  if(TRACKER_IMOS[id]){setImo(TRACKER_IMOS[id]);setLoading(false);return;}
  setLoading(true);
  try{
   const response=await fetch("/api/ship-tracker/resolve?ship="+encodeURIComponent(id),{signal:controller.signal});
   const raw=await response.json(),data=(raw&&typeof raw==="object"?raw:{}) as {ship?:unknown;imo?:unknown;error?:unknown};if(controller.signal.aborted)return;
   if(!response.ok||data.ship!==id||!validImo(data.imo))throw Error(typeof data.error==="string"?data.error:"This ship’s identity could not be confirmed.");
   setImo(data.imo);
  }catch(reason){if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"The ship identity lookup is unavailable.");}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 return <section className="ship-tracker-panel" aria-labelledby="tracker-map-heading">
  <div className="tracker-toolbar">
   <div><p className="eyebrow"><MapPin size={16} aria-hidden="true"/>A LITTLE SHIP SPOTTING</p><h2 id="tracker-map-heading">Where’s your ship?</h2></div>
   <form className="tracker-search" role="search" aria-label="Find a cruise ship" onSubmit={event=>{event.preventDefault();if(matches.length)chooseShip(matches[0].id);else setSearchOpen(true);}}>
    <label htmlFor="tracker-ship-search">Search cruise ships</label>
    <div className="tracker-search-input"><Search size={19} aria-hidden="true"/><input id="tracker-ship-search" type="search" value={query} onChange={event=>{setQuery(event.target.value);setSearchOpen(true);}} onFocus={()=>setSearchOpen(true)} onKeyDown={event=>{if(event.key==="Escape")setSearchOpen(false);}} placeholder="Ship name or cruise line…" maxLength={100} autoComplete="off" aria-describedby="tracker-search-help" aria-controls={showResults?"tracker-search-results":undefined}/><button type="submit">Find ship</button></div>
    <p id="tracker-search-help">Search {TRACKER_SHIPS.length} cruise ships. Try “Marella”, “MSC” or a ship’s name.</p>
   </form>
  </div>
  {showResults?<div className="tracker-search-results" id="tracker-search-results">
   <p role="status">{matches.length?matches.length+" matching "+(matches.length===1?"ship":"ships")+(matches.length>10?" · Showing the first 10. Keep typing to narrow your search.":" · Choose a ship to show it on the map."):"No matching ship in this catalogue. Try a shorter name or a cruise line. The map below still shows "+ship.name+"."}</p>
   {matches.length?<ul>{matches.slice(0,10).map(item=><li key={item.id}><button type="button" onClick={()=>chooseShip(item.id)} aria-label={"Show "+item.name+" on map"}><Ship size={20} aria-hidden="true"/><span><strong>{item.name}</strong><small>{item.line}</small></span><span className="tracker-result-action">Show on map →</span></button></li>)}</ul>:<a className="text-link" href={TRACKER_PROVIDER+"/vessels"} target="_blank" rel="noopener noreferrer">Search on VesselFinder <ArrowUpRight size={15} aria-hidden="true"/></a>}
  </div>:null}
  <div className="tracker-ship-label" aria-live="polite"><Ship size={20} aria-hidden="true"/><strong>{ship.name}{imo?" · IMO "+imo:""}</strong><span>{ship.line}</span></div>
  <p className="tracker-position-notice">Last reported AIS position · This may be out of date. <a href={trackerDetailsUrl(imo||"")} target="_blank" rel="noopener noreferrer">Check the report time on VesselFinder ↗</a></p>
  <div className="tracker-map-frame" aria-busy={loading}>{imo?<iframe key={imo} src={trackerMapUrl(imo)!} title={ship.name+" latest reported position map"} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<div className="tracker-map-message"><p role={error?"alert":"status"}>{loading?"Confirming the ship’s IMO number…":error||"Choose a ship to view its map."}</p>{error?<><button type="button" className="button primary" onClick={()=>chooseShip(ship.id)}>Try again</button><a className="text-link" href={TRACKER_PROVIDER+"/vessels"} target="_blank" rel="noopener noreferrer">Search on VesselFinder <ArrowUpRight size={15} aria-hidden="true"/></a></>:null}</div>}</div>
  <div className="tracker-map-credit"><p>Ship tracking by <a href={TRACKER_PROVIDER} target="_blank" rel="noopener noreferrer">VesselFinder</a></p><a href={trackerDetailsUrl(imo||"")} target="_blank" rel="noopener noreferrer">Position details & report time <ArrowUpRight size={15} aria-hidden="true"/></a></div>
  <p id="tracker-map-help" className="tracker-map-help">Drag the map and use + and − to zoom. VesselFinder supplies the map and position reports. Check “Position received” on its details page before treating a location as current. Free coastal AIS coverage can have gaps; some ships may have no recent position.</p>
 </section>;
}
