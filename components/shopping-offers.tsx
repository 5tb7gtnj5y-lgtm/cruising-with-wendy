"use client";
import {createContext,useContext,useEffect,useId,useState,type ReactNode} from "react";
import {ArrowUpRight} from "lucide-react";
import {offerPair,type ShoppingOffer} from "@/lib/shopping";
type Rotation={offers:ShoppingOffer[];tick:number;hold:(key:string,active:boolean)=>void};
const RotationContext=createContext<Rotation|null>(null);
export function ShoppingOffersProvider({offers,children}:{offers:ShoppingOffer[];children:ReactNode}){
 const [tick,setTick]=useState(0),[allowed,setAllowed]=useState(false),[held,setHeld]=useState<Set<string>>(()=>new Set());
 useEffect(()=>{const motion=window.matchMedia("(prefers-reduced-motion: reduce)"),sync=()=>setAllowed(!motion.matches&&!document.hidden);sync();motion.addEventListener("change",sync);document.addEventListener("visibilitychange",sync);return()=>{motion.removeEventListener("change",sync);document.removeEventListener("visibilitychange",sync);};},[]);
 useEffect(()=>{if(!allowed||held.size||offers.length<2)return;const timer=window.setInterval(()=>setTick(old=>(old+1)%offers.length),8000);return()=>window.clearInterval(timer);},[allowed,held.size,offers.length]);
 function hold(key:string,active:boolean){setHeld(old=>{if(old.has(key)===active)return old;const next=new Set(old);if(active)next.add(key);else next.delete(key);return next;});}
 return <RotationContext.Provider value={{offers,tick,hold}}>{children}</RotationContext.Provider>;
}
function useRotation(){const value=useContext(RotationContext);if(!value)throw Error("Shopping offers need a rotation provider");return value;}
function useHold(){const {hold}=useRotation(),id=useId();return {onPointerEnter:()=>hold(id+"pointer",true),onPointerLeave:()=>hold(id+"pointer",false),onFocusCapture:()=>hold(id+"focus",true),onBlurCapture:(event:React.FocusEvent<HTMLElement>)=>{if(!event.currentTarget.contains(event.relatedTarget))hold(id+"focus",false);}};}
function Thumbnail({offer}:{offer:ShoppingOffer}){return <img className="shopping-thumbnail" src={offer.thumbnail} width="44" height="44" alt="" decoding="async" loading="lazy"/>;}
export function ShoppingRow({slot,className=""}:{slot:number;className?:string}){
 const {offers,tick}=useRotation(),hold=useHold(),selected=offerPair(offers,slot,tick),affiliate=selected.some(p=>p.affiliate);
 return <aside className={"news-shopping-row"+(className?" "+className:"")} aria-label={affiliate?"Affiliate shopping links":"Amazon shopping links"} {...hold}>
  <span className="shopping-intro">Cruise essentials</span>
  <div className="shopping-links">{selected.map(product=><span className="shopping-product" key={product.key}><a href={product.url} target="_blank" rel={product.affiliate?"sponsored noopener noreferrer":"noopener noreferrer"}><Thumbnail offer={product}/><span>{product.label}</span><ArrowUpRight size={13}/></a>{product.affiliate&&<small className="shopping-link-label">Affiliate</small>}</span>)}</div>
  <small>{affiliate?<>Affiliate links · We may earn a commission. <a href="/affiliate-disclosure">Details</a></>:"Amazon search links"}</small>
 </aside>;
}
function ProductCards(){const {offers,tick}=useRotation(),hold=useHold();return <section className="essentials-offers" aria-label="Cruise essentials shopping links" {...hold}><div className="product-grid">{offers.map((_,slot)=>{const product=offers[(slot+tick)%offers.length];return <article key={slot} className="product-card"><Thumbnail offer={product}/><h3>{product.title}</h3><p>{product.description}</p><a className="button ghost" href={product.url} target="_blank" rel={product.affiliate?"sponsored noopener noreferrer":"noopener noreferrer"}>{product.buttonLabel||(product.affiliate?"Shop on Amazon":"Browse Amazon")}<ArrowUpRight size={15}/></a>{product.affiliate&&<p className="disclosure">Affiliate link — we may earn a commission.</p>}</article>;})}</div><div className="essentials-rotation-note"><span>Browse cruise essentials</span></div></section>;}
export function EssentialsOffers({offers}:{offers:ShoppingOffer[]}){return <ShoppingOffersProvider offers={offers}><ProductCards/></ShoppingOffersProvider>;}
