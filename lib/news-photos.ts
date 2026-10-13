export type NewsPhotoData={src:string;alt:string;width:number;height:number;caption:string;credit:string;creditUrl:string;license?:string;licenseUrl?:string;position?:string};

export const harbourPhoto:NewsPhotoData={
 src:"/photos/cruise-harbour.webp",alt:"Real aerial photograph of cruise ships beside bright turquoise water in Nassau harbour",width:1400,height:842,
 caption:"File photo · Nassau harbour",credit:"Unsplash",creditUrl:"https://images.unsplash.com/photo-1548574505-5e239809ee19",license:"Unsplash licence",licenseUrl:"https://unsplash.com/license"
};
const arvia:NewsPhotoData={src:"/photos/arvia.webp",alt:"Real photograph of P&O Cruises ship Arvia leaving Marseille",width:1200,height:675,caption:"File photo · Arvia",credit:"Gérard / Wikimedia Commons",creditUrl:"https://commons.wikimedia.org/wiki/File:P%26O_Arvia_(16x9).jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"};
const euribia:NewsPhotoData={src:"/photos/msc-euribia.webp",alt:"Real photograph of MSC Euribia in Copenhagen",width:1200,height:904,caption:"File photo · MSC Euribia",credit:"AleWi / Wikimedia Commons",creditUrl:"https://commons.wikimedia.org/wiki/File:MSC_Euribia.jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"};
const cozumel:NewsPhotoData={src:"/photos/cozumel.webp",alt:"Real photograph of the shore at Punta Morena in Cozumel",width:1200,height:900,caption:"File photo · Cozumel; not the cleanup event",credit:"Felipe de la Fuente Díaz / Wikimedia Commons",creditUrl:"https://commons.wikimedia.org/wiki/File:Cozumel_playa.jpg",license:"CC BY-SA 3.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/"};
export const voyagerPhoto:NewsPhotoData={src:"/photos/marella-voyager.webp",alt:"Real photograph of Marella Voyager leaving Rhodes",width:1200,height:579,caption:"File photo · Marella Voyager",credit:"Pjotr Mahhonin / Wikimedia Commons",creditUrl:"https://commons.wikimedia.org/wiki/File:Marella_Voyager_leaving_Rhodes_14_September_2026_(cropped).jpg",license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/"};
const worldEuropa:NewsPhotoData={src:"/photos/msc-world-europa.webp",alt:"Real photograph of MSC World Europa, a sister ship in MSC's World Class",width:750,height:1000,caption:"File photo · MSC World Europa, a sister ship",credit:"Jjooorgeeee1 / Wikimedia Commons",creditUrl:"https://commons.wikimedia.org/wiki/File:MSC_World_Europa.jpg",license:"CC0",licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/"};
const ovation:NewsPhotoData={src:"/photos/royal-ovation.webp",alt:"Real photograph of Royal Caribbean's Ovation of the Seas",width:1200,height:753,caption:"File photo · Ovation of the Seas",credit:"Bernard Spragg. NZ / Wikimedia Commons",creditUrl:"https://commons.wikimedia.org/wiki/File:Ovation_of_the_Seas_(52933210658).jpg",license:"Public domain",licenseUrl:"https://creativecommons.org/publicdomain/mark/1.0/"};
const tui="https://www.tuigroup.com/en/newsroom/news/";
const storyPhotos:Record<string,NewsPhotoData>={
 [tui+"im-a-cruise-director-for-marella-cruises-and-these-are-my-top-tips-for-first-time-cruisers"]:{src:"/photos/marella-director.webp",alt:"Marella's cruise director pictured on an outdoor deck in the original TUI announcement",width:960,height:639,caption:"Photo from the original announcement",credit:"TUI / Marella Cruises",creditUrl:tui+"im-a-cruise-director-for-marella-cruises-and-these-are-my-top-tips-for-first-time-cruisers",position:"50% 42%"},
 [tui+"marella-cruises-expands-0-drinks-range-with-18-non-alcoholic-cocktails-and-alcohol-free-spirits"]:{src:"/photos/alcohol-free-drink.webp",alt:"An alcohol-free cocktail with lime and mint pictured against a blue sea",width:960,height:640,caption:"Photo from the original announcement",credit:"TUI / Marella Cruises",creditUrl:tui+"marella-cruises-expands-0-drinks-range-with-18-non-alcoholic-cocktails-and-alcohol-free-spirits"},
 [tui+"marella-cruises-launches-summer-28-sailings-featuring-brand-new-greek-port"]:{src:"/photos/patras.webp",alt:"A panoramic photograph of Patras with the Gulf of Patras and mountains beyond",width:960,height:640,caption:"Patras · from the original announcement",credit:"TUI / Marella Cruises",creditUrl:tui+"marella-cruises-launches-summer-28-sailings-featuring-brand-new-greek-port"},
 "https://www.royalcaribbeangroup.com/protecting-cozumels-coastline":cozumel,
 "https://www.pocruises.com/dam/marketing-assets/press-centre/Pete-Tong-event-round-up-FINAL.pdf":arvia,
 "https://www.mscpressarea.com/press-releases/msc-euribia-to-offer-canary-islands-winter-sun-escapes-for-2027-28-season":euribia,
 "https://www.mscpressarea.com/press-releases/msc-cruises-marks-float-out-of-the-cruiselines-next-us-flagship-msc-world-atlanti":worldEuropa,
 "https://www.mscpressarea.com/press-releases/msc-cruises-reveals-spectacular-entertainment-programme-coming-to-msc-world-asia":worldEuropa
};
const additionalPhotos:Record<string,NewsPhotoData>={
 "carnival-freedom": {
  "src": "/photos/carnival-freedom.webp",
  "alt": "Carnival Freedom docked at Katakolon in Greece",
  "width": 1200,
  "height": 803,
  "caption": "File photo · Carnival Freedom (2008)",
  "credit": "Rapidfire / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Carnival-Freedom-Cruise-Ship.jpg",
  "license": "CC BY-SA 3.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0"
 },
 "antarctic-iceberg": {
  "src": "/photos/antarctic-iceberg.webp",
  "alt": "An iceberg in Antarctic waters",
  "width": 1200,
  "height": 800,
  "caption": "File photo · Antarctic waters",
  "credit": "Ben Stephenson / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Iceberg_Antarctica.jpg",
  "license": "CC BY 2.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/2.0"
 },
 "virgin-resilient-lady": {
  "src": "/photos/virgin-resilient-lady.webp",
  "alt": "Virgin Voyages ship Resilient Lady in Puerto Rico",
  "width": 1200,
  "height": 900,
  "caption": "File photo · Resilient Lady",
  "credit": "Darth Stabro / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Resilient_Lady_Feb_2025.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 },
 "viking-sigrun": {
  "src": "/photos/viking-sigrun.webp",
  "alt": "Viking Sigrun river cruise ship on the Rhine at Cologne",
  "width": 1200,
  "height": 675,
  "caption": "File photo · Viking Sigrun",
  "credit": "© Raimond Spekking / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:River_cruise_ship_Viking_Sigrun_-_ENI_07002109_-_on_the_Rhine_in_Cologne-9796.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 },
 "alaska-fjord": {
  "src": "/photos/alaska-fjord.webp",
  "alt": "Mountains and a waterfall beside Endicott Arm fjord in Alaska",
  "width": 960,
  "height": 640,
  "caption": "File photo · Endicott Arm, Alaska",
  "credit": "Larry Syverson from Richmond, VA, USA / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Alaska_-_Endicott_Arm_Fjord_(50573523438).jpg",
  "license": "CC BY-SA 2.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0"
 },
 "celebrity-apex": {
  "src": "/photos/celebrity-apex.webp",
  "alt": "Celebrity Apex docked in Southampton",
  "width": 960,
  "height": 640,
  "caption": "File photo · Celebrity Apex",
  "credit": "Matt Taylor / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Celebrity_Apex,_Southampton,_May_10th_2025.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 },
 "holland-zuiderdam": {
  "src": "/photos/holland-zuiderdam.webp",
  "alt": "Holland America ship Zuiderdam in Venice",
  "width": 960,
  "height": 720,
  "caption": "File photo · Zuiderdam",
  "credit": "Yair Haklai / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:MS_Zuiderdam.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 },
 "norwegian-escape": {
  "src": "/photos/norwegian-escape.webp",
  "alt": "Norwegian Escape docked in New York",
  "width": 960,
  "height": 720,
  "caption": "File photo · Norwegian Escape",
  "credit": "Aude / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Norwegian_Escape_docked_in_NYC_on_April_8,_2024.jpg",
  "license": "CC BY-SA 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0"
 },
 "cunard-queen-mary-2": {
  "src": "/photos/cunard-queen-mary-2.webp",
  "alt": "Cunard ocean liner Queen Mary 2 in Barbados",
  "width": 960,
  "height": 720,
  "caption": "File photo · Queen Mary 2",
  "credit": "Corgi5623 at English Wikipedia / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Queen_Mary_2.jpg",
  "license": "CC BY 3.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/3.0"
 },
 "royal-princess": {
  "src": "/photos/royal-princess.webp",
  "alt": "Royal Princess alongside Sydney’s Overseas Passenger Terminal",
  "width": 960,
  "height": 520,
  "caption": "File photo · Royal Princess",
  "credit": "Dicklyon / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Royal_Princess_at_Sydney.jpg",
  "license": "CC BY 4.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/4.0"
 },
 "river-nile": {
  "src": "/photos/river-nile.webp",
  "alt": "The River Nile between Luxor and Aswan, seen from a cruise boat",
  "width": 800,
  "height": 600,
  "caption": "File photo · River Nile, Egypt",
  "credit": "Ian Sewell / Wikimedia Commons",
  "creditUrl": "https://commons.wikimedia.org/wiki/File:Nile.jpg",
  "license": "CC BY 1.0",
  "licenseUrl": "https://creativecommons.org/licenses/by/1.0/"
 }
};
const linePhotos:Record<string,NewsPhotoData>={
 marella:voyagerPhoto,po:arvia,msc:euribia,"royal-caribbean":ovation,
 cunard:additionalPhotos["cunard-queen-mary-2"],princess:additionalPhotos["royal-princess"],
 norwegian:additionalPhotos["norwegian-escape"],celebrity:additionalPhotos["celebrity-apex"],
 "holland-america":additionalPhotos["holland-zuiderdam"],"virgin-voyages":additionalPhotos["virgin-resilient-lady"],
 carnival:additionalPhotos["carnival-freedom"],viking:additionalPhotos["viking-sigrun"]
};
const shipPhotos:[RegExp,NewsPhotoData][]=[
 [/\bcarnival freedom\b/i,additionalPhotos["carnival-freedom"]],
 [/\bresilient lady\b/i,additionalPhotos["virgin-resilient-lady"]],
 [/\bviking sigrun\b/i,additionalPhotos["viking-sigrun"]],
 [/\bqueen mary 2\b/i,additionalPhotos["cunard-queen-mary-2"]],
 [/\broyal princess\b/i,additionalPhotos["royal-princess"]],
 [/\bnorwegian escape\b/i,additionalPhotos["norwegian-escape"]],
 [/\bcelebrity apex\b/i,additionalPhotos["celebrity-apex"]],
 [/\bzuiderdam\b/i,additionalPhotos["holland-zuiderdam"]],
 [/\bmarella voyager\b/i,voyagerPhoto],[/\barvia\b/i,arvia],
 [/\bmsc euribia\b/i,euribia],[/\bovation of the seas\b/i,ovation]
];
const brandPhotos:[RegExp,string][]=[
 [/\bvirgin voyages\b/i,"virgin-voyages"],[/\bholland america\b/i,"holland-america"],
 [/\broyal caribbean\b/i,"royal-caribbean"],[/\bnorwegian(?: cruise)?\b/i,"norwegian"],
 [/\bcelebrity(?: cruises)?\b/i,"celebrity"],[/\bprincess(?: cruises)?\b/i,"princess"],
 [/\bcarnival\b/i,"carnival"],[/\bviking\b/i,"viking"],[/\bcunard\b/i,"cunard"],
 [/\bmarella\b/i,"marella"],[/\bmsc\b/i,"msc"],[/\bp&o\b/i,"po"]
];
const destinationPhotos:NewsPhotoData[]=[harbourPhoto,cozumel,{...storyPhotos[tui+"marella-cruises-launches-summer-28-sailings-featuring-brand-new-greek-port"],caption:"File photo · Patras, Greece; illustrative cruise destination"}];
export function newsPhoto(item:{sourceUrl:string;line:string;title?:string;destination?:string}):NewsPhotoData{
 const exact=storyPhotos[item.sourceUrl.replace(/\/$/,"")];if(exact)return exact;
 const subject=[item.title||"",item.destination||"",new URL(item.sourceUrl,"https://example.invalid").pathname.replace(/[-_]/g," ")].join(" ");
 const named=shipPhotos.find(([pattern])=>pattern.test(subject));if(named)return named[1];
 if(/\bantarctic(?:a)?\b/i.test(subject))return additionalPhotos["antarctic-iceberg"];
 if(/\balaska\b/i.test(subject))return additionalPhotos["alaska-fjord"];
 if(/\begypt|\bnile\b|\bluxor\b|\baswan\b/i.test(subject))return additionalPhotos["river-nile"];
 if(/\bcozumel\b/i.test(subject))return cozumel;
 if(/\bpatras\b|\bgreek port\b/i.test(subject))return destinationPhotos[2];
 if(/\bcocktails?\b|\balcohol free\b/i.test(subject))return {...storyPhotos[tui+"marella-cruises-expands-0-drinks-range-with-18-non-alcoholic-cocktails-and-alcohol-free-spirits"],caption:"File photo · Alcohol-free cocktail"};
 const brand=brandPhotos.find(([pattern])=>pattern.test(subject));if(brand)return linePhotos[brand[1]];
 if(linePhotos[item.line])return linePhotos[item.line];
 // Keep a varied, stable file photo for a story without a more specific match.
 let hash=0;for(const char of item.sourceUrl)hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
 return destinationPhotos[hash%destinationPhotos.length];
}
