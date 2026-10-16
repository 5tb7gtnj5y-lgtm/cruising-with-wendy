"use client";
import {useState} from "react";
import {ArrowUpRight, MapPin, Search, Ship} from "lucide-react";
import {DEFAULT_TRACKER_SHIP_ID,TRACKER_PROVIDER,TRACKER_QUICK_PICKS,TRACKER_SHIPS,findTrackerShips,trackerShip,trackerMapUrl,trackerDetailsUrl} from "@/lib/ship-tracker";

export function ShipTrackerMap(){
 const [shipId,setShipId]=useState(DEFAULT_TRACKER_SHIP_ID);
 const [query,setQuery]=useState("");
 const [searchOpen,setSearchOpen]=useState(false);
 const ship=trackerShip(shipId),matches=findTrackerShips(query);
 const showResults=searchOpen&&query.trim().length>=2;
 function chooseShip(id:string){setShipId(trackerShip(id).id);setSearchOpen(false);}
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
   {matches.length?<ul>{matches.slice(0,10).map(item=><li key={item.id}><button type="button" onClick={()=>chooseShip(item.id)} aria-label={"Show "+item.name+" on map"}><Ship size={20} aria-hidden="true"/><span><strong>{item.name}</strong><small>{item.line}</small></span><span className="tracker-result-action">Show on map →</span></button></li>)}</ul>:<a className="text-link" href={TRACKER_PROVIDER+"/ships"} target="_blank" rel="noopener noreferrer">Check the provider’s latest directory <ArrowUpRight size={15} aria-hidden="true"/></a>}
  </div>:null}
  <div className="tracker-quick-picks"><span>Quick picks</span>{TRACKER_QUICK_PICKS.map(id=><button key={id} type="button" onClick={()=>chooseShip(id)} aria-pressed={ship.id===id}>{trackerShip(id).name}</button>)}</div>
  <div className="tracker-ship-label" aria-live="polite"><Ship size={20} aria-hidden="true"/><strong>{ship.name}</strong><span>{ship.line}</span></div>
  <div className="tracker-map-frame"><iframe key={ship.id} src={trackerMapUrl(ship.id)} title={ship.name+" latest reported position map"} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>
  <div className="tracker-map-credit"><p>Ship tracking by <a href={TRACKER_PROVIDER} target="_blank" rel="noopener noreferrer">CruiseShipTracking.com</a></p><a href={trackerDetailsUrl(ship.id)} target="_blank" rel="noopener noreferrer">Position details <ArrowUpRight size={15} aria-hidden="true"/></a></div>
  <p id="tracker-map-help" className="tracker-map-help">Use + and − to zoom, and drag the map to explore. Open position details to check the latest report time. Some ships have no available position. If the map is unavailable, the same link opens the provider’s ship page.</p>
 </section>;
}
