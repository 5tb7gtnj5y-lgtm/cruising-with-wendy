"use client";

import {useEffect, useState} from "react";
import {ArrowUpRight, Check, Ship} from "lucide-react";
import {nextDealOrder, orderedCruiseDeals} from "@/lib/cruise-deals";
import {newsPhoto} from "@/lib/news-photos";
import {NewsPhoto} from "@/components/news-photo";

const ORDER_KEY = "wendy-cruise-partners-order-v1";

export function CruiseDeals({initialOrder}: {initialOrder: number}) {
  const [order, setOrder] = useState(initialOrder);
  useEffect(() => {
    function rearrange() {
      let previous: number | null = null;
      try {
        const saved = sessionStorage.getItem(ORDER_KEY);
        if (saved !== null) previous = Number(saved);
      } catch { /* Browsing still works when storage is unavailable. */ }
      const next = previous === null ? initialOrder : nextDealOrder(previous);
      setOrder(next);
      try { sessionStorage.setItem(ORDER_KEY, String(next)); } catch { /* Optional visit memory. */ }
    }
    rearrange();
    function restored(event: PageTransitionEvent) { if (event.persisted) rearrange(); }
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, [initialOrder]);

  return <div className="cruise-deal-grid">
    {orderedCruiseDeals(order).map(deal => <article key={deal.id} className={"cruise-deal-card deal-accent-" + deal.accent} data-deal-id={deal.id}>
      <div className="cruise-deal-photo">
        <NewsPhoto photo={newsPhoto({title: deal.photoSubject, line: "general", sourceUrl: ""})} priority={false}/>
        <span className="deal-photo-label">{deal.photoLabel}</span>
      </div>
      <div className="cruise-deal-copy">
        <p className="deal-category"><Ship size={15}/>{deal.category}</p>
        <h3>{deal.name}</h3>
        <p className="deal-tagline">{deal.title}</p>
        <p className="deal-description">{deal.description}</p>
        <ul>{deal.highlights.map(highlight => <li key={highlight}><Check size={16}/>{highlight}</li>)}</ul>
        <div className="deal-card-action">
          <a className="button primary" href={deal.url} target="_blank" rel="sponsored noopener noreferrer" aria-label={"View cruise offers with " + deal.name + " (opens in a new tab)"}>View offers <ArrowUpRight size={19}/></a>
          <small>Affiliate link · Opens {deal.name}</small>
        </div>
      </div>
    </article>)}
  </div>;
}
