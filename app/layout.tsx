import type { Metadata } from "next";
import { Header, Footer } from "@/components/site-shell";
import { Analytics } from "@/components/analytics";
import { absolute, origin, isPublic, jsonLd } from "@/lib/site";
import "./globals.css";
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{return {metadataBase:new URL(origin()),title:{default:"Cruising with Wendy | Cruise News, Guides & Inspiration",template:"%s | Cruising with Wendy"},description:"Discover cruise news, practical ship and destination guides, and original articles covering Marella, P&O, MSC and Royal Caribbean.",robots:{index:isPublic(),follow:isPublic()},icons:{icon:"/favicon.svg"},openGraph:{siteName:"Cruising with Wendy",locale:"en_GB",type:"website",images:[{url:absolute("/social-card.png"),width:1200,height:630}]},twitter:{card:"summary_large_image"}};}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-GB"><body><a className="skip-link" href="#main">Skip to content</a><Header/>{children}<Footer/><Analytics/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({"@context":"https://schema.org","@type":"WebSite",name:"Cruising with Wendy",url:origin()})}}/></body></html>;}

