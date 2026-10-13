"use client";
import { useEffect } from "react";
export function Analytics(){useEffect(()=>{if(navigator.webdriver)return;fetch("/api/visit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:location.pathname}),keepalive:true}).catch(()=>{});},[]);return null;}

