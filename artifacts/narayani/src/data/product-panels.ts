/**
 * Pack panels — what is physically printed on the back of the product.
 *
 * ─── WHERE THIS COMES FROM ──────────────────────────────────────────────────
 * `product-panels.json` is a transcription of photographs of the physical packs.
 * It is the source of record: every ingredient sentence, every figure, every
 * address and licence number in it was read off the pack and typed in verbatim,
 * including the pack's own mistakes. Nothing in this file computes, rounds,
 * corrects, unit-converts or infers a value, and nothing supplies a default.
 * A product that is not a key in that JSON has no panel and renders none.
 *
 * ─── WHY THERE IS A SECOND TABLE BELOW ──────────────────────────────────────
 * The JSON's `manufacturer` object holds exactly one entity, and its `notes`
 * field is a single prose blob written for a human reviewer — it carries MD5
 * hashes, "DO NOT PUBLISH WITHOUT SOURCE VERIFICATION" flags and internal QA
 * chatter alongside facts a shopper genuinely needs. Neither shape can be put on
 * a storefront as-is:
 *
 *   1. Two of the packs print TWO entities with TWO FSSAI licences — a packer
 *      and a separate manufacturer. `manufacturer` can only hold one of them, so
 *      the other lives in `notes`. Rendering `manufacturer` alone would silently
 *      credit the packer with making the food.
 *   2. Some `notes` record real inconsistencies on the packaging that change how
 *      a shopper should read the table (units printed as mg where g is meant, a
 *      footnote citing a serving weight the figures do not use, an ingredient
 *      list that does not match the flavour on the front).
 *
 * `PACK_DISCLOSURES` below is that content lifted out of `notes` into a typed
 * shape, quoting the JSON rather than adding to it. Every string here is
 * traceable to the `notes` field of the same slug in `product-panels.json`; if
 * you change one, change the other. No slug gets a disclosure that its own
 * `notes` does not support, and a slug with no disclosure simply renders less.
 */
import rawPanels from "./product-panels.json";

export interface PackNutritionRow {
  readonly nutrient: string;
  readonly per100g: string;
  readonly perServe: string;
  readonly rda: string;
}

/** A named legal entity printed on the pack, with the licence that is its own. */
export interface PackEntity {
  readonly name: string;
  readonly address: string;
  readonly fssaiLicence: string;
}

/** The shape of one entry in product-panels.json. */
export interface PackPanelRecord {
  readonly sheetName: string;
  readonly brand: string;
  readonly ingredients: string;
  readonly servingSize: string;
  readonly nutrition: readonly PackNutritionRow[];
  readonly manufacturer: PackEntity & {
    readonly customerCare: string;
    readonly email: string;
    readonly website: string;
  };
  readonly notes: string;
  readonly slug: string;
}

/**
 * What role the pack actually gives the entity in `manufacturer`.
 *
 * "manufacturer" — the pack names it as the maker ("Mfd. & Marketed By",
 *                  "Manufactured & Marketed by").
 * "packer"       — the pack names it only as "Packed & Marketed By", and a
 *                  DIFFERENT company, carried in `alsoManufacturedBy`, is
 *                  printed as the manufacturer with its own FSSAI licence.
 */
type PackEntityRole = "manufacturer" | "packer";

interface PackDisclosure {
  readonly entityRole: PackEntityRole;
  /** The separate manufacturer, when the `manufacturer` object holds the packer. */
  readonly alsoManufacturedBy?: PackEntity;
  /**
   * The allergen line as printed, or `null` where the transcription positively
   * records that the pack prints no allergen declaration at all. Omitting the
   * key means "not recorded" and renders nothing — the three states are
   * different and must not be collapsed.
   */
  readonly allergen?: string | null;
  /** Pack inconsistencies a shopper would want to know before reading the table. */
  readonly advisories?: readonly string[];
}

/** Verbatim from the Superpuffs `notes`: two entities, two FSSAI licences. */
const SWASTHUM_WELLNESS: PackEntity = {
  name: "SWASTHUM WELLNESS Pvt. Ltd.",
  address: "A-43, Naresh Park, Nangloi, New Delhi-110041, INDIA",
  fssaiLicence: "10017011004609",
};

/** Printed on all five Makhana packs, on its own line outside the ingredients. */
const MAKHANA_ALLERGEN =
  "Contains Peanuts. (Produced in a facility where tree nuts and dairy maybe present)";

/** Printed on both Superpuffs packs. */
const SUPERPUFFS_ALLERGEN =
  "Contains Nut. Manufactured in the same facility which processes Soy & Milk.";

/**
 * The four 28 g Makhana packs print g-scale quantities with an mg unit. The
 * transcription reproduces the error rather than correcting it, so the page has
 * to say so.
 */
const MAKHANA_MG_UNIT_ADVISORY =
  "Dietary fibre, total fat and saturated fat are printed on this pack in mg where g is clearly intended. The figures below reproduce the pack exactly and have not been corrected.";

/** Both Superpuffs packs footnote a serving weight their own figures do not use. */
const SUPERPUFFS_RDA_ADVISORY =
  "The %RDA column is footnoted on the pack as “*Values per 150gm”, but the figures correspond to the 50 g serve shown. Reproduced as printed, uncorrected.";

const SUPERPUFFS_FOOTNOTE_ADVISORY =
  "%RDA is printed as a bare number with no % sign. † marks the rows whose %RDA the pack attributes to ICMR 2020 (women, moderate work); “-” marks nutrients for which the pack states no RDA is established.";

/**
 * Both Superpuffs transcriptions came off the 150 g jar — the panel prints
 * "Servings Per Jar : 3" against its 50 g serve. Superpuffs is also sold as a
 * 50 g pouch, and both pack sizes render this same panel, so both have to say
 * where it was read from.
 */
const SUPERPUFFS_PACK_PROVENANCE_ADVISORY =
  "This panel was photographed on the 150 g jar, which prints “Servings Per Jar : 3”. Superpuffs is also sold in a 50 g pouch; it is the same food and the panel's own serving size is 50 g, so the figures carry over unchanged. The pouch's own printed panel has not been photographed.";

const PACK_DISCLOSURES: Readonly<Record<string, PackDisclosure>> = {
  // ── Chips ────────────────────────────────────────────────────────────────
  // All six chip packs print no allergen declaration at all. Their supplier
  // panels are textually identical; only banner and QR colour differ.
  "beetroot-chips-indie-masala": {
    entityRole: "manufacturer",
    allergen: null,
    advisories: [
      "The ingredients and nutrition panel on this pack prints no flavour name and names the seasoning only as “Salt & Spices”. The identical panel appears on the other beetroot flavours, so these figures are not specific to Indie Masala.",
      "Urad dal flour is among the ingredients, and the pack carries no allergen declaration of any kind to cover it.",
    ],
  },
  "oats-chips-indie-masala": {
    entityRole: "manufacturer",
    allergen: null,
    advisories: [
      "The ingredients and nutrition panel on this pack prints no flavour name and names the seasoning only as “Salt & Spices”. The identical panel appears on Oats Peri Peri, so these figures are not specific to Indie Masala.",
      "Oats flour and urad dal flour are both among the ingredients, and the pack carries no allergen declaration to cover them.",
    ],
  },
  "oats-chips-peri-peri": {
    entityRole: "manufacturer",
    allergen: null,
    advisories: [
      "The ingredients and nutrition panel on this pack prints no flavour name and names the seasoning only as “Salt & Spices”. The identical panel appears on Oats Indie Masala, so these figures are not specific to Peri Peri.",
      "Oats flour and urad dal flour are both among the ingredients, and the pack carries no allergen declaration to cover them.",
    ],
  },
  "quinoa-chips-indie-masala": {
    entityRole: "manufacturer",
    allergen: null,
    advisories: [
      "The ingredients and nutrition panel prints no flavour name and names the seasoning only as “Salt & Spices”.",
      "Total fat per serve is printed to one decimal place (7.8 g) where every other value carries two. Reproduced as printed.",
      "Urad dal flour is among the ingredients, and the pack carries no allergen declaration to cover it.",
    ],
  },
  "quinoa-chips-peri-peri": {
    entityRole: "manufacturer",
    allergen: null,
    advisories: [
      "The panel is headed “NUTRITIONAL INFORMATION (Approx. Values)”, and prints no flavour name; the seasoning is named only as “Salt & Spices”.",
      "Total fat per serve is printed to one decimal place (7.8 g) where every other value carries two. Reproduced as printed.",
    ],
  },
  "ragi-chips-indie-masala": {
    entityRole: "manufacturer",
    allergen: null,
    advisories: [
      "The ingredients and nutrition panel supplied for this pack is the same image as the one supplied for Ragi Peri Peri, and it prints no flavour name — so these figures cannot be confirmed as specific to Indie Masala. Check the pack in hand before relying on them.",
    ],
  },
  "ragi-chips-peri-peri": {
    entityRole: "manufacturer",
    allergen: null,
    advisories: [
      "The ingredients and nutrition panel supplied for this pack is the same image as the one supplied for Ragi Indie Masala, and it prints no flavour name — so these figures cannot be confirmed as specific to Peri Peri. Check the pack in hand before relying on them.",
    ],
  },

  // ── Superpuffs ───────────────────────────────────────────────────────────
  // Both packs print "Packed & Marketed By Deccan Food Ventures LLP" AND
  // "Manufactured By SWASTHUM WELLNESS Pvt. Ltd.", each with its own FSSAI
  // licence. The JSON's `manufacturer` object holds the packer.
  "superpuffs-cream-and-onion": {
    entityRole: "packer",
    alsoManufacturedBy: SWASTHUM_WELLNESS,
    allergen: SUPERPUFFS_ALLERGEN,
    advisories: [
      SUPERPUFFS_PACK_PROVENANCE_ADVISORY,
      SUPERPUFFS_RDA_ADVISORY,
      SUPERPUFFS_FOOTNOTE_ADVISORY,
      "The pack prints no flavour name on this panel, and the ingredient list on this Cream & Onion pack declares no dairy or cream component.",
    ],
  },
  "superpuffs-hot-n-sweet-chilli": {
    entityRole: "packer",
    alsoManufacturedBy: SWASTHUM_WELLNESS,
    allergen: SUPERPUFFS_ALLERGEN,
    advisories: [
      SUPERPUFFS_PACK_PROVENANCE_ADVISORY,
      SUPERPUFFS_RDA_ADVISORY,
      SUPERPUFFS_FOOTNOTE_ADVISORY,
      "The pack prints no flavour name on this panel.",
    ],
  },

  // ── Makhana ──────────────────────────────────────────────────────────────
  "makhana-cream-and-onion": {
    entityRole: "manufacturer",
    allergen: MAKHANA_ALLERGEN,
    advisories: [MAKHANA_MG_UNIT_ADVISORY],
  },
  "makhana-himalayan-salt": {
    entityRole: "manufacturer",
    allergen: MAKHANA_ALLERGEN,
    advisories: [
      "This Himalayan Salt pack prints the Cream & Onion ingredient list and the identical figures: it declares onion, parsley and milk solids, names the salt as “iodized Salt”, and never mentions Himalayan salt. Reproduced exactly as printed — the milk-solids declaration is allergen-relevant, so confirm with us before buying on it.",
      MAKHANA_MG_UNIT_ADVISORY,
    ],
  },
  "makhana-pudina": {
    entityRole: "manufacturer",
    allergen: MAKHANA_ALLERGEN,
    advisories: [
      "The pack's own figures do not reconcile: carbohydrate, protein, dietary fibre and fat together come to more than 100 g per 100 g. Reproduced as printed, uncorrected.",
      "The allergen line declares peanuts even though no peanut ingredient appears in the list. Printed that way on the pack.",
    ],
  },
  "makhana-peri-peri": {
    entityRole: "manufacturer",
    allergen: MAKHANA_ALLERGEN,
    advisories: [
      MAKHANA_MG_UNIT_ADVISORY,
      "Sodium is printed as 45.41 mg per 100 g, far below the 229.42 mg on the Cream & Onion and Himalayan Salt packs, despite the same “iodized Salt” declaration. Reproduced as printed.",
    ],
  },
  "makhana-tandoori": {
    entityRole: "manufacturer",
    allergen: MAKHANA_ALLERGEN,
    advisories: [MAKHANA_MG_UNIT_ADVISORY],
  },
};

/** A panel record joined to its disclosures, ready to render. */
export interface PackPanel extends PackPanelRecord {
  readonly entityRole: PackEntityRole;
  readonly alsoManufacturedBy: PackEntity | null;
  /** String = printed line. `null` = pack prints none. `undefined` = not recorded. */
  readonly allergen: string | null | undefined;
  readonly advisories: readonly string[];
}

const PANELS = rawPanels as Record<string, PackPanelRecord>;

/**
 * The same flavour sold in two pack sizes, sharing one transcription.
 *
 * This is the ONE exception to "a slug with no transcription of its own renders
 * no panel", and it is narrow on purpose. It may only be used where the two
 * slugs are the identical food from the identical maker, differing solely in how
 * much of it is in the pack — never between two flavours, two suppliers or two
 * recipes, however similar their panels look.
 *
 * It is sound here because the Superpuffs panel is quoted per 100 g and per a
 * 50 g serve, and 50 g is the serving size on both the pouch and the jar: the
 * ingredient sentence, the allergen line, the licences and every figure in the
 * table are the same numbers on both packs. The only jar-specific line is
 * "Servings Per Jar : 3", which lives in `notes` and is never rendered — and
 * SUPERPUFFS_PACK_PROVENANCE_ADVISORY tells the reader which pack the photograph
 * came from either way.
 *
 * If a pouch panel is ever photographed and differs, delete the alias and give
 * the pouch its own entry in the JSON. Do not reconcile the two by hand.
 */
const PACK_SIZE_ALIASES: Readonly<Record<string, string>> = {
  "superpuffs-cream-n-onion-150g": "superpuffs-cream-and-onion",
  "superpuffs-hot-n-sweet-chilli-150g": "superpuffs-hot-n-sweet-chilli",
};

/**
 * The pack panel for a product slug, or `null` when we hold no transcription for
 * it. Returning `null` is the whole point: a product with no panel must render
 * no panel section rather than borrow a sibling's ingredients or nutrition.
 */
export function getPackPanel(slug: string | undefined | null): PackPanel | null {
  if (!slug) return null;

  // A second pack size of the same food reads the other size's transcription,
  // disclosures included — see PACK_SIZE_ALIASES for why that is allowed here
  // and nowhere else. `hasOwnProperty` rather than a truthiness check on every
  // lookup below: a slug like "constructor" would otherwise return a function.
  const key = Object.prototype.hasOwnProperty.call(PACK_SIZE_ALIASES, slug)
    ? PACK_SIZE_ALIASES[slug]
    : slug;

  if (!Object.prototype.hasOwnProperty.call(PANELS, key)) return null;

  const record = PANELS[key];
  if (!record) return null;

  const disclosure = Object.prototype.hasOwnProperty.call(PACK_DISCLOSURES, key)
    ? PACK_DISCLOSURES[key]
    : undefined;

  return {
    ...record,
    // With no disclosure recorded we describe the single printed entity only as
    // the manufacturer, which is what every pack in this set except Superpuffs
    // prints. A pack that names a separate maker must have a disclosure.
    entityRole: disclosure?.entityRole ?? "manufacturer",
    alsoManufacturedBy: disclosure?.alsoManufacturedBy ?? null,
    allergen: disclosure ? disclosure.allergen : undefined,
    advisories: disclosure?.advisories ?? [],
  };
}
