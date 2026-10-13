"use client";
import { useState } from "react";
import { Share2, Check } from "lucide-react";
export function Share({title}:{title:string}){const [message,setMessage]=useState("");async function share(){try{if(navigator.share)await navigator.share({title,url:location.href});else{await navigator.clipboard.writeText(location.href);setMessage("Link copied");}}catch(e){if((e as DOMException).name!=="AbortError")setMessage("Copy the address from your browser to share.");}}return <div className="share-row"><button className="button ghost" onClick={share}>{message==="Link copied"?<Check size={17}/>:<Share2 size={17}/>} Share article</button><span role="status">{message}</span></div>;}

