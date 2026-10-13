export const CRUISE_LINE_SLUGS=["marella","po","msc","royal-caribbean","cunard","princess","norwegian","celebrity","holland-america","virgin-voyages"] as const;
export const LINES = [
 {slug:"marella",name:"Marella",description:"All-inclusive escapes and familiar favourites.",mark:"M",color:"#096c80"},
 {slug:"po",name:"P&O Cruises",description:"From Southampton to somewhere special.",mark:"P&O",color:"#162f57"},
 {slug:"msc",name:"MSC Cruises",description:"Mediterranean spirit, worldwide adventures.",mark:"MSC",color:"#303f60"},
 {slug:"royal-caribbean",name:"Royal Caribbean",description:"Big ships, bold adventures and new horizons.",mark:"RC",color:"#5b4292"},
 {slug:"cunard",name:"Cunard",description:"Ocean journeys aboard the iconic Queens.",mark:"C",color:"#8d3542"},
 {slug:"princess",name:"Princess Cruises",description:"Ships, destinations and ideas for your next escape.",mark:"PC",color:"#245c8e"},
 {slug:"norwegian",name:"Norwegian Cruise Line",description:"New sailings and fresh discoveries at sea.",mark:"NCL",color:"#226b91"},
 {slug:"celebrity",name:"Celebrity Cruises",description:"Fleet updates and journeys worth exploring.",mark:"X",color:"#364973"},
 {slug:"holland-america",name:"Holland America",description:"Worldwide voyages and news from the fleet.",mark:"HAL",color:"#325473"},
 {slug:"virgin-voyages",name:"Virgin Voyages",description:"Adults-only sailings and a different take on sea days.",mark:"VV",color:"#9b384a"}
];
export function dateLabel(value:string|null){return value?new Date(value).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Europe/London"}):"Date not supplied";}
export function parseSources(value:string):{name:string,url:string}[]{try{return JSON.parse(value);}catch{return [];}}
