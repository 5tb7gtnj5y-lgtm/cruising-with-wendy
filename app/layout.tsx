import type { Metadata } from "next";
import { Header, Footer } from "@/components/site-shell";
import { Analytics } from "@/components/analytics";
import { absolute, origin, jsonLd } from "@/lib/site";
import {HOME_TITLE,HOME_DESCRIPTION,pageMetadata} from "@/lib/seo";
import "./globals.css";
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{return {...pageMetadata({title:HOME_TITLE,description:HOME_DESCRIPTION,path:"/"}),metadataBase:new URL(origin()),title:{default:HOME_TITLE,template:"%s | Cruising with Wendy"},icons:{icon:"/favicon.svg"},category:"Cruise travel"};}
export default function RootLayout({children}:{children:React.ReactNode}){const organisation=absolute("/#organisation"),website=absolute("/#website");return <html lang="en-GB"><head><meta name="impact-site-verification" {...{value:"06890457-2bb9-457d-a5cc-b2d5b023bbbb"}}/></head><body><a className="skip-link" href="#main">Skip to content</a><Header/>{children}<Footer/><Analytics/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":organisation,name:"Cruising with Wendy",url:absolute("/"),logo:{"@type":"ImageObject",url:absolute("/brand/wendy-logo.webp"),width:1336,height:1177}},{"@type":"WebSite","@id":website,name:"Cruising with Wendy",url:absolute("/"),inLanguage:"en-GB",description:HOME_DESCRIPTION,publisher:{"@id":organisation}}]})}}/></body></html>;}

