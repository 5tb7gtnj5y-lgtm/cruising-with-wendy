import {ArrowUpRight, Clock3, Compass, Waves} from "lucide-react";
import {PageHeading} from "@/components/site-shell";
import {ShipTrackerMap} from "@/components/ship-tracker-map";
import {TRACKER_PROVIDER} from "@/lib/ship-tracker";

export function ShipTrackerPage(){return <main id="main" className="page-container ship-tracker-page">
 <PageHeading label="FOLLOW THE HORIZON" title="Cruise ship tracker" description="A little closer to life at sea. Search for a cruise ship and explore its latest reported position on the map."/>
 <ShipTrackerMap/>
 <div className="tracker-notes">
  <section><Clock3 size={26} aria-hidden="true"/><h2>How fresh is the position?</h2><p>The map now uses VesselFinder’s AIS network. A marker shows the last reported position, which may be older than the map refresh. Open position details and check “Position received”. Coastal reception gaps can last hours or days, especially offshore.</p></section>
  <section><Compass size={26} aria-hidden="true"/><h2>Find your favourite ship</h2><p>Search by ship name or cruise line, then choose a result. We match the ship’s permanent IMO number before opening its map. If that identity cannot be confirmed, we show a message rather than another ship’s position.</p><a className="text-link" href={TRACKER_PROVIDER} target="_blank" rel="noopener noreferrer">Explore the VesselFinder map <ArrowUpRight size={16} aria-hidden="true"/></a></section>
 </div>
 <p className="tracker-footnote"><Waves size={18} aria-hidden="true"/>For curiosity and cruise inspiration. Maps and positions are supplied by VesselFinder and are not suitable for navigation. Public ship identities may be checked using Wikidata.</p>
 </main>;}
