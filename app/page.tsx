import { ArrowRight, ArrowUpRight, Compass, Waves, Ship, Sun, Anchor, Palmtree, Luggage } from "lucide-react";
import { publicEntries, setting } from "@/lib/content";
import { absolute, LINES, dateLabel } from "@/lib/site";
import { NewsFeed } from "@/components/news-feed";
import { Empty, WaveDivider } from "@/components/site-shell";

export async function generateMetadata(){return {alternates:{canonical:absolute("/")}};}
export default async function Home(){
 const [latest,lastRefresh,affiliateLinks]=await Promise.all([
  publicEntries({kind:"news",all:true}),setting("last_refresh"),setting("affiliate_links","[]")
 ]);
 return <main id="main" className="ocean-home">
  <div className="hero-ocean">
   <section className="hero">
    <div className="hero-copy">
     <p className="eyebrow hero-eyebrow"><Ship size={17}/> ALL ABOARD, ADVENTURE AHEAD</p>
     <h1>Come aboard.<br/><em>Let’s make<br/>some waves.</em></h1>
     <p>Cruise news, brilliant ideas and a little holiday daydreaming. Welcome to your happy place at sea.</p>
     <div className="hero-buttons">
      <a className="button primary" href="/news">Let’s explore <ArrowRight size={19}/></a>
      <a className="text-link" href="/guides">Find a cruise guide <Compass size={18}/></a>
     </div>
     <div className="hero-bottom">
      <span className="mini-life-ring" aria-hidden="true"/>
      <span>First cruise or fiftieth?<br/><strong>There’s always more to sea.</strong></span>
     </div>
    </div>
    <div className="hero-visual hero-brand" aria-label="Welcome aboard with Wendy">
     <span className="logo-sun" aria-hidden="true"/>
     <img className="hero-logo" src="/brand/wendy-logo.webp" width="1336" height="1177" fetchPriority="high" alt="Cruising with Wendy: a smiling captain, cruise ship and turquoise waves"/>
     <span className="hero-welcome"><Sun size={17}/> Your next adventure starts here</span>
    </div>
   </section>
   <WaveDivider/>
  </div>
  <section className="line-strip" aria-label="Explore cruise lines">
   <span className="eyebrow"><Anchor size={15}/> CHOOSE YOUR CREW</span>
   {LINES.map(l=><a href={"/cruise-lines/"+l.slug} key={l.slug}>{l.name}<ArrowUpRight size={16}/></a>)}
  </section>
  <section className="section">
   <div className="section-head">
    <div><p className="eyebrow"><Waves size={17}/> FRESH FROM THE HORIZON</p><h2>Cruise news making waves</h2></div>
    <a href="/news" className="text-link section-link">All cruise news <ArrowRight size={18}/></a>
   </div>
   <p className="section-intro">New ships, sunny escapes and stories from the sea. Follow each one straight to the source.</p>
   {latest.items.length?<NewsFeed items={latest.items} affiliateLinks={affiliateLinks}/>:<Empty title="A fresh horizon is on its way" text="New, sourced cruise news will appear here as it is collected."/>}
   <p className="update-note"><span className="status-dot"/> {lastRefresh?"Last checked "+dateLabel(lastRefresh)+", "+new Date(lastRefresh).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/London"}):"News collection is being set up"} · News updates automatically every three hours · Source dates shown on each story</p>
  </section>
  <section className="section line-section">
   <div className="section-head">
    <div><p className="eyebrow"><Ship size={17}/> FIND YOUR KIND OF CRUISE</p><h2>Which way will you sail?</h2></div>
    <span className="section-head-note">Ten cruise lines. Plenty of possibilities.</span>
   </div>
   <div className="line-grid">{LINES.map((l,i)=><a className={"line-card line-card-"+l.slug} key={l.slug} href={"/cruise-lines/"+l.slug}>
    <span className="line-card-doodle" aria-hidden="true">{i%4===0?<Sun size={57}/>:i%4===1?<Anchor size={57}/>:i%4===2?<Compass size={57}/>:<Palmtree size={57}/>}</span>
    <div className="line-monogram" style={{backgroundColor:l.color}}>{l.mark}</div>
    <h3>{l.name}</h3><p>{l.description}</p>
    <span className="text-link">Come aboard <ArrowRight size={17}/></span>
   </a>)}</div>
  </section>
  <section className="essentials-banner">
   <div><p className="eyebrow"><Luggage size={16}/> PACK THE GOOD STUFF</p><h2>Less suitcase chaos.<br/><em>More holiday mode.</em></h2><p>A few thoughtful essentials for your next adventure.</p></div>
   <a className="button primary" href="/essentials">Cruise essentials <ArrowUpRight size={17}/></a>
   <div className="banner-compass" aria-hidden="true"><Compass size={165} strokeWidth={1.3}/></div>
  </section>
 </main>;
}

