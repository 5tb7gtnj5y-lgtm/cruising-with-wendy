export const DEALS_PATH = "/hot-cruise-deals";
export const DEALS_TITLE = "Hot Cruise Deals";
export const DEALS_DESCRIPTION = "Find your next escape with Ambassador Cruise Line, Fred. Olsen Cruise Lines and Riviera Travel. Browse current cruise offers directly with our travel partners.";

// Partner identities and descriptions checked against Awin's public advertiser profiles:
// https://ui.awin.com/merchant-profile/68716
// https://ui.awin.com/merchant-profile/5919
// https://ui.awin.com/merchant-profile/60697
export const cruiseDeals = [
  {
    id: "ambassador", name: "Ambassador Cruise Line", category: "No-fly ocean cruises",
    title: "Set sail without the airport.",
    description: "Discover Ambassador’s no-fly cruises and explore your next holiday at sea, starting closer to home.",
    highlights: ["No-fly sailing inspiration", "Ocean cruise holidays", "Browse offers with Ambassador"],
    url: "https://www.awin1.com/cread.php?awinmid=68716&awinaffid=3125110",
    photoSubject: "Cozumel Caribbean coast", photoLabel: "Destination inspiration · Caribbean coast", accent: "coral",
  },
  {
    id: "fred-olsen", name: "Fred. Olsen Cruise Lines", category: "Smaller-ship ocean cruises",
    title: "A smaller ship. A bigger adventure.",
    description: "Explore Fred. Olsen’s smaller-ship cruises, with a choice of UK departure ports and destinations around the world.",
    highlights: ["Smaller-ship cruising", "UK departure options", "Browse offers with Fred. Olsen"],
    url: "https://www.awin1.com/cread.php?awinmid=5919&awinaffid=3125110",
    photoSubject: "Alaska fjord", photoLabel: "Destination inspiration · Alaska", accent: "teal",
  },
  {
    id: "riviera", name: "Riviera Travel", category: "River cruises & discovery",
    title: "Take the scenic route.",
    description: "Find a different view of the world with Riviera Travel’s river cruises and curated holidays, from days on the water to discoveries ashore.",
    highlights: ["River cruise inspiration", "Curated travel experiences", "Browse offers with Riviera Travel"],
    url: "https://www.awin1.com/cread.php?awinmid=60697&awinaffid=3125110",
    photoSubject: "Nile river", photoLabel: "Destination inspiration · The Nile", accent: "sun",
  },
] as const;

// The three cyclic orders ensure every partner moves when the order changes.
export function nextDealOrder(previous: number | null, random = Math.random): number {
  return previous !== null && Number.isInteger(previous) && previous >= 0 && previous < 3
    ? (previous + 1 + Math.floor(random() * 2)) % 3
    : Math.floor(random() * 3);
}
export function orderedCruiseDeals(order: number) {
  return cruiseDeals.map((_, index) => cruiseDeals[(index + order) % cruiseDeals.length]);
}
