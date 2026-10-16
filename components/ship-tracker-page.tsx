import {ArrowUpRight, Clock3, Compass, Waves} from "lucide-react";
import {PageHeading} from "@/components/site-shell";
import {ShipTrackerMap} from "@/components/ship-tracker-map";
import {TRACKER_PROVIDER} from "@/lib/ship-tracker";

export function ShipTrackerPage(){return <main id="main" className="page-container ship-tracker-page">
 <PageHeading label="FOLLOW THE HORIZON" title="Cruise ship tracker" description="A little closer to life at sea. Search for a cruise ship and explore its latest reported position on the map."/>
 <ShipTrackerMap/>
 <div className="tracker-notes">
  <section><Clock3 size={26} aria-hidden="true"/><h2>How fresh is the position?</h2><p>The free map refreshes automatically about every 30 minutes. The underlying AIS report may be older: reception gaps at sea can last hours or days. A refresh does not mean a new position was received.</p></section>
  <section><Compass size={26} aria-hidden="true"/><h2>Find your favourite ship</h2><p>Search by ship name or cruise line, then choose a result to update the map. The catalogue covers the provider’s cruise fleet; tracking coverage varies and a listed ship may have no position report.</p><a className="text-link" href={TRACKER_PROVIDER+"/map"} target="_blank" rel="noopener noreferrer">Explore the full fleet map <ArrowUpRight size={16} aria-hidden="true"/></a></section>
 </div>
 <p className="tracker-footnote"><Waves size={18} aria-hidden="true"/>For curiosity and cruise inspiration. Positions are supplied by CruiseShipTracking.com and are not suitable for navigation.</p>
 </main>;}
