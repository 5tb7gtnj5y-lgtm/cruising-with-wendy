import { Compass, Search, ArrowUpRight, Waves, Ship, Sun } from "lucide-react";
import { LINES } from "@/lib/site";

export function Header(){return <>
 <div className="masthead-strip"><Sun size={14}/> A little inspiration. A lot of sea air. <Waves size={16}/></div>
 <header className="site-header">
  <a className="brand brand-new" href="/" aria-label="Cruising with Wendy home"><img className="brand-logo" src="/brand/wendy-logo.webp" width="1336" height="1177" alt="Cruising with Wendy — your friendly captain at sea"/></a>
  <nav aria-label="Main navigation"><a href="/news">Latest news</a><a href="/hot-cruise-deals">Hot Cruise deals</a><a href="/ship-tracker">Ship tracker</a><details className="line-menu"><summary>Cruise lines <span>⌄</span></summary><div>{LINES.map(l=><a key={l.slug} href={"/cruise-lines/"+l.slug}><Ship size={15}/>{l.name}</a>)}</div></details><a href="/essentials">Essentials</a></nav>
  <div className="header-actions"><details className="search-menu"><summary aria-label="Open article search"><Search size={21}/></summary><form action="/news"><label htmlFor="global-search">What’s on your horizon?</label><div className="input-combo"><input id="global-search" name="q" placeholder="Ship, destination or topic…" maxLength={100}/><button aria-label="Search"><Search size={19}/></button></div></form></details><a className="about-link" href="/about">About <ArrowUpRight size={14}/></a></div>
 </header>
 </>;}
export function WaveDivider(){return <svg className="wave-divider" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 25C180 70 300-10 480 27S790 72 970 32S1260 5 1440 38V90H0Z" fill="currentColor" opacity=".24"/><path d="M0 47C170 8 340 85 550 49S850 8 1080 49S1300 75 1440 45V90H0Z" fill="currentColor" opacity=".45"/><path d="M0 64C170 94 330 42 510 63S800 89 1010 65S1260 43 1440 69V90H0Z" fill="currentColor"/></svg>;}
export function Footer(){return <footer>
 <div className="footer-horizon" aria-hidden="true"><Ship size={37}/><span/><Waves size={34}/><span/><Sun size={33}/></div>
 <div className="footer-top">
  <div><a className="brand footer-brand brand-new" href="/" aria-label="Cruising with Wendy home"><img className="brand-logo" src="/brand/wendy-logo.webp" width="1336" height="1177" loading="lazy" alt="Cruising with Wendy"/></a><p>News, thoughtful guides and<br/>a little inspiration for life at sea.</p></div>
  <div><span className="footer-label">Keep exploring</span><a href="/news">Cruise news</a><a href="/hot-cruise-deals">Hot Cruise deals</a><a href="/ship-tracker">Ship tracker</a><a href="/essentials">Cruise essentials</a></div>
  <div><span className="footer-label">Good to know</span><a href="/about">About & editorial policy</a><a href="/about#contact">Contact us</a><a href="/privacy">Privacy</a><a href="/affiliate-disclosure">Affiliate disclosure</a><a href="/admin" target="_top">Administrator</a></div>
  <div className="footer-note"><Compass size={43} strokeWidth={1.4}/><p>Until next time,<br/><em>sea you soon.</em></p></div>
 </div>
 <div className="footer-bottom"><span>© {new Date().getUTCFullYear()} Cruising with Wendy</span><span>An independent cruise website <Waves size={17}/></span></div>
 </footer>;}
export function PageHeading({label,title,description}:{label:string,title:string,description:string}){return <div className="page-heading"><p className="eyebrow"><Waves size={18}/>{label}</p><h1>{title}</h1><p>{description}</p><span className="heading-wave" aria-hidden="true"/></div>;}
export function Empty({title,text,href,label}:{title:string,text:string,href?:string,label?:string}){return <div className="empty"><span className="empty-compass"><Compass size={34} strokeWidth={1.4}/></span><h3>{title}</h3><p>{text}</p>{href&&<a className="text-link" href={href}>{label} →</a>}</div>;}

