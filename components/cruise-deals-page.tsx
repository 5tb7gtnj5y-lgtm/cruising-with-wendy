import {ArrowRight, Compass, Ship, Sun, Waves} from "lucide-react";
import {CruiseDeals} from "@/components/cruise-deals";
import {NewsPhoto} from "@/components/news-photo";
import {harbourPhoto} from "@/lib/news-photos";
import {nextDealOrder} from "@/lib/cruise-deals";

export function CruiseDealsPage() {
  return <main id="main" className="page-container cruise-deals-page">
    <section className="deals-hero">
      <div className="deals-hero-copy">
        <p className="eyebrow"><Sun size={18}/> A LITTLE DAYDREAMING STARTS HERE</p>
        <h1>Hot Cruise Deals<span>Your next escape<br/><em>is calling.</em></span></h1>
        <p>Sea air, new horizons and something to look forward to. Explore cruise offers with three travel partners and find a sailing that feels like you.</p>
        <a className="button primary" href="#cruise-offers">Explore the offers <ArrowRight size={19}/></a>
      </div>
      <div className="deals-hero-photo"><NewsPhoto photo={harbourPhoto}/><span className="deals-holiday-note"><Waves size={23}/> More sea. More smiles.</span></div>
    </section>

    <div className="deals-perks" aria-label="Ways to explore"><span><Ship size={20}/> Ocean escapes</span><span><Waves size={20}/> River discoveries</span><span><Compass size={20}/> Book with the provider</span></div>

    <section id="cruise-offers" className="cruise-offers-section" aria-labelledby="cruise-offers-title">
      <div className="deals-section-heading"><div><p className="eyebrow">FIND YOUR NEXT HORIZON</p><h2 id="cruise-offers-title">Three ways to sail away.</h2></div><p>Pick a partner. Explore their current offers.<br/>Let the holiday daydreaming begin.</p></div>
      <p className="deals-affiliate-note">Advertisement · These are affiliate links. We may earn a commission if you book through them. <a href="/affiliate-disclosure">How our links work</a></p>
      <CruiseDeals initialOrder={nextDealOrder(null)}/>
      <p className="deals-availability">Check live prices, sailing dates, inclusions and availability on the provider’s website. Photos are destination inspiration, not a promise of a particular ship or itinerary.</p>
    </section>

    <section className="deals-booking-tips" aria-labelledby="deals-tips-title"><div><p className="eyebrow"><Compass size={18}/> BEFORE YOU SET SAIL</p><h2 id="deals-tips-title">Find the right fit<br/>for your holiday.</h2></div><ol><li><strong>Choose your journey</strong><span>Think about your departure port, time away and where you would love to go.</span></li><li><strong>Check what’s included</strong><span>Compare cabin types, meals, drinks, transfers and any extra costs with the provider.</span></li><li><strong>Book with the provider</strong><span>Your chosen travel company handles your booking, payment and holiday arrangements.</span></li></ol></section>
  </main>;
}
