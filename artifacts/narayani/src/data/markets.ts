/**
 * Market landing pages — spec point 29.
 *
 * ─── THE CONSTRAINT THAT SHAPES EVERY WORD HERE ─────────────────────────────
 * Spec point 29: "Do NOT claim existing exports to a country unless verified. Use
 * language such as 'Indian Food Products for Buyers in the UAE' rather than
 * 'Leading Indian Food Exporter to UAE' unless that claim is genuinely supported."
 *
 * Narayani has supplied no evidence of shipping to any market. So every page below
 * addresses a buyer IN that market and describes what we can do for them. Not one
 * says we already export there, names a client there, or quotes a volume.
 *
 * ─── AND THE ONE THAT MATTERS MORE ──────────────────────────────────────────
 * These pages do NOT explain that market's import rules. It is tempting — a page
 * about the UAE feels incomplete without a paragraph on shelf-life-on-arrival and
 * Arabic labelling — and it is exactly how a website ends up giving an importer
 * regulatory advice that is out of date or simply wrong, on the basis of which
 * they clear a container. What each page does instead is NAME the authority and
 * LINK to it, which is verifiable and useful, and say that requirements are
 * confirmed against the specific product at quotation.
 *
 * `authority` is a real regulator with a real URL. Check the link still resolves
 * before adding a market; do not add a market you cannot name the authority for.
 */

export interface Market {
  slug: string;
  /** The country as a buyer there would write it. */
  country: string;
  /** How a person from there describes themselves — "in the UAE", "in the UK". */
  inCountry: string;
  demonym: string;
  /** Ports and hubs a buyer would recognise. Geography, not a shipping claim. */
  gateways: string[];
  authority: { name: string; abbr: string; url: string };
  /** Why an importer there might be looking at Indian snacks. Market context, not a claim. */
  context: string;
}

export const MARKETS: readonly Market[] = [
  {
    slug: "uae",
    country: "United Arab Emirates",
    inCountry: "in the UAE",
    demonym: "UAE",
    gateways: ["Jebel Ali", "Port Rashid", "Khalifa Port", "Sharjah"],
    authority: {
      name: "Ministry of Climate Change and Environment",
      abbr: "MoCCAE",
      url: "https://www.moccae.gov.ae/",
    },
    context:
      "The UAE is one of the largest re-export hubs for Indian food in the world, and a large resident South Asian population means Indian snacks sell to both the diaspora and a wider local market.",
  },
  {
    slug: "uk",
    country: "United Kingdom",
    inCountry: "in the UK",
    demonym: "UK",
    gateways: ["Felixstowe", "Southampton", "London Gateway"],
    authority: {
      name: "Food Standards Agency",
      abbr: "FSA",
      url: "https://www.food.gov.uk/",
    },
    context:
      "Indian snacks have moved well beyond specialist grocers in the UK, and better-for-you formats — baked rather than fried, millet and pulse bases — sit naturally alongside the health-led snacking that already sells there.",
  },
  {
    slug: "usa",
    country: "United States",
    inCountry: "in the United States",
    demonym: "US",
    gateways: ["New York/Newark", "Los Angeles", "Savannah", "Houston"],
    authority: {
      name: "Food and Drug Administration",
      abbr: "FDA",
      url: "https://www.fda.gov/food/importing-food-products-united-states",
    },
    context:
      "Makhana, millet and pulse-based snacks land squarely in the high-protein, better-for-you category that US retail buyers are actively looking for, and Indian brands are increasingly stocked outside the ethnic aisle.",
  },
  {
    slug: "canada",
    country: "Canada",
    inCountry: "in Canada",
    demonym: "Canadian",
    gateways: ["Vancouver", "Montreal", "Toronto"],
    authority: {
      name: "Canadian Food Inspection Agency",
      abbr: "CFIA",
      url: "https://inspection.canada.ca/en/importing-food-plants-or-animals/food-imports",
    },
    context:
      "A large and growing South Asian population across Ontario, British Columbia and Alberta supports steady demand for Indian packaged foods, in both dedicated grocers and mainstream retail.",
  },
  {
    slug: "australia",
    country: "Australia",
    inCountry: "in Australia",
    demonym: "Australian",
    gateways: ["Sydney", "Melbourne", "Brisbane", "Fremantle"],
    authority: {
      name: "Department of Agriculture, Fisheries and Forestry",
      abbr: "DAFF",
      url: "https://www.agriculture.gov.au/biosecurity-trade/import/goods/food",
    },
    context:
      "Australia's snacking market has shifted hard toward provenance and ingredient transparency, which suits a range that can show the manufacturer, the licence and the panel behind every product.",
  },
  {
    slug: "saudi-arabia",
    country: "Saudi Arabia",
    inCountry: "in Saudi Arabia",
    demonym: "Saudi",
    gateways: ["Jeddah Islamic Port", "King Abdulaziz Port, Dammam"],
    authority: {
      name: "Saudi Food and Drug Authority",
      abbr: "SFDA",
      url: "https://www.sfda.gov.sa/en",
    },
    context:
      "A large expatriate South Asian workforce and a rapidly modernising grocery sector make Saudi Arabia a substantial market for Indian packaged foods.",
  },
];

export function findMarket(slug: string | undefined): Market | undefined {
  return MARKETS.find((m) => m.slug === slug);
}
