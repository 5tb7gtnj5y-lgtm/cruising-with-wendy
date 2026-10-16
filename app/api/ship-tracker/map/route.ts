import {validImo} from "@/lib/ship-tracker";
export function GET(request:Request){
 const imo=new URL(request.url).searchParams.get("imo")||"";
 if(!validImo(imo))return new Response("A valid ship IMO number is required.",{status:400});
 // Use VesselFinder's published embedding script so it supplies its own iframe parameters.
 const nonce=crypto.randomUUID().replaceAll("-","");
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VesselFinder ship map</title><style nonce="${nonce}">html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#d8edf0}iframe{display:block;border:0}p{font:14px Arial;padding:20px}</style></head><body><script nonce="${nonce}">var width="100%",height=String(window.innerHeight),names=true,imo="${imo}",show_track=true,store_pos=false;</script><script src="https://www.vesselfinder.com/aismap.js"></script><noscript><p>Enable JavaScript or <a href="https://www.vesselfinder.com/vessels/details/${imo}" target="_blank" rel="noopener noreferrer">open this ship on VesselFinder</a>.</p></noscript></body></html>`;
 return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow","Content-Security-Policy":`default-src 'none'; script-src 'nonce-${nonce}' https://www.vesselfinder.com; style-src 'nonce-${nonce}'; frame-src https://www.vesselfinder.com; base-uri 'none'; frame-ancestors 'self'`}});
}
