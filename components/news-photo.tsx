"use client";
import { useEffect, useRef, useState } from "react";
import type { NewsPhotoData } from "@/lib/news-photos";
import { harbourPhoto } from "@/lib/news-photos";

export function NewsPhoto({photo,href,lineName}:{photo:NewsPhotoData;href?:string;lineName?:string}){
 const [failedSrc,setFailedSrc]=useState<string|null>(null),imageRef=useRef<HTMLImageElement>(null);
 const shown=failedSrc===photo.src?harbourPhoto:photo;
 useEffect(()=>{const image=imageRef.current;if(image?.complete&&image.naturalWidth===0&&shown.src!==harbourPhoto.src)setFailedSrc(photo.src);},[photo.src,shown.src]);
 const picture=<img ref={imageRef} className="news-photo-image" src={shown.src} alt={shown.alt} width={shown.width} height={shown.height} loading={href?"lazy":"eager"} fetchPriority={href?undefined:"high"} decoding="async" style={{objectPosition:shown.position||"center"}} onError={()=>{if(shown.src!==harbourPhoto.src)setFailedSrc(photo.src);}}/>;
 return <figure className={"news-photo"+(href?"":" hero-photo")}>
  {href?<a className="card-visual" href={href} target="_blank" rel="noopener noreferrer" aria-label={"Read cruise news from "+lineName}>{picture}<span className="visual-label">{lineName}</span></a>:<div className="hero-photo-frame">{picture}</div>}
  <figcaption className="photo-info"><details><summary aria-label="Photo details" title="Photo details"><span aria-hidden="true">i</span></summary><div className="photo-info-copy"><strong>{shown.caption}</strong><span><a href={shown.creditUrl} target="_blank" rel="noopener noreferrer">Photo: {shown.credit}</a></span>{shown.license&&<a href={shown.licenseUrl} target="_blank" rel="noopener noreferrer">{shown.license}</a>}{shown.license?.startsWith("CC BY")&&<span>Resized and displayed cropped.</span>}</div></details></figcaption>
 </figure>;
}
