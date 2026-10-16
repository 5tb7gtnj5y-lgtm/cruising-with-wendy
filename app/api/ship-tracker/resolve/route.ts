import {resolveShipImo} from "@/lib/ship-identity";
import {TRACKER_SHIPS} from "@/lib/ship-tracker";
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("ship")||"";
 if(!TRACKER_SHIPS.some(ship=>ship.id===id))return Response.json({error:"Choose a ship from the search results."},{status:400});
 const key=new Request(new URL("/api/ship-tracker/resolve?ship="+encodeURIComponent(id),request.url));
 const cache=typeof caches!=="undefined"?await caches.open("wendy-ship-identities-v1"):null;
 try{
  const saved=await cache?.match(key);if(saved)return saved;
  const imo=await resolveShipImo(id);
  if(!imo)return Response.json({error:"We couldn’t confirm this ship’s IMO number. Please check the ship on VesselFinder."},{status:404});
  const response=Response.json({ship:id,imo},{headers:{"Cache-Control":"public, max-age=86400"}});
  await cache?.put(key,response.clone());return response;
 }catch{return Response.json({error:"The ship identity lookup is temporarily unavailable. Please try again or search on VesselFinder."},{status:503});}
}
