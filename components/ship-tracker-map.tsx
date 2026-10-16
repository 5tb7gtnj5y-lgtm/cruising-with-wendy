"use client";
import {useState} from "react";
import {ArrowUpRight, MapPin, Ship} from "lucide-react";
import {TRACKER_PROVIDER,TRACKER_SHIPS,trackerShip,trackerMapUrl,trackerDetailsUrl} from "@/lib/ship-tracker";

export function ShipTrackerMap(){
 const [shipId,setShipId]=useState<string>(TRACKER_SHIPS[0].id);
 const ship=trackerShip(shipId);
 return <section className="ship-tracker-panel" aria-labelledby="tracker-map-heading">
  <div className="tracker-toolbar">
   <div><p className="eyebrow"><MapPin size={16} aria-hidden="true"/>A LITTLE SHIP SPOTTING</p><h2 id="tracker-map-heading">Where’s your ship?</h2></div>
   <label htmlFor="tracker-ship">Choose a ship<select id="tracker-ship" value={shipId} onChange={event=>setShipId(event.target.value)} aria-describedby="tracker-map-help">{TRACKER_SHIPS.map(item=><option key={item.id} value={item.id}>{item.name} · {item.line}</option>)}</select></label>
  </div>
  <div className="tracker-ship-label" aria-live="polite"><Ship size={20} aria-hidden="true"/><strong>{ship.name}</strong><span>{ship.line}</span></div>
  <div className="tracker-map-frame"><iframe key={ship.id} src={trackerMapUrl(ship.id)} title={ship.name+" latest reported position map"} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div>
  <div className="tracker-map-credit"><p>Ship tracking by <a href={TRACKER_PROVIDER} target="_blank" rel="noopener noreferrer">CruiseShipTracking.com</a></p><a href={trackerDetailsUrl(ship.id)} target="_blank" rel="noopener noreferrer">Position details <ArrowUpRight size={15} aria-hidden="true"/></a></div>
  <p id="tracker-map-help" className="tracker-map-help">Use + and − to zoom, and drag the map to explore. Open position details to check the latest report time. If the map is unavailable, the same link opens the provider’s ship page.</p>
 </section>;
}
