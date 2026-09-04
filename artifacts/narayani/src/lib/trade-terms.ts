/**
 * How trade terms are described on the storefront.
 *
 * ─── WHY MOQ IS NO LONGER PRINTED AS A NUMBER ───────────────────────────────
 * Every product carries an `moq` value, and the site used to print it as though it
 * were a published commitment: "MOQ: 12 units". It is not one. The real minimum
 * moves with the buyer, the destination and the order — a Delhi retailer taking one
 * category and an importer taking a mixed container are not held to the same figure,
 * and quoting one number to both was costing enquiries from the smaller buyer and
 * misrepresenting the terms to the larger one.
 *
 * So the number stays in the database, where it drives the B2B cart's step size and
 * the order check in api/_lib/pricing.ts, and the storefront says what is true
 * instead: a minimum applies to wholesale and export, and it is agreed per enquiry.
 *
 * NOTE FOR WHOEVER CHANGES THIS NEXT: api/_lib/pricing.ts still REJECTS a B2B order
 * whose quantity is not an exact multiple of `moq`. That enforcement is stricter
 * than what these strings promise. Softening it is a checkout change on a live
 * store and needs its own task and its own tests — do not do it as a side effect of
 * editing copy here.
 */

/** One line, for a product card. Short enough for a 10px caption. */
export const MOQ_SHORT = "MOQ applies";

/** For a specification table, where the label is already "Minimum order quantity". */
export const MOQ_SPEC = "Agreed per enquiry";

/** A full sentence, for a banner or a page section. */
export const MOQ_SENTENCE =
  "A minimum order quantity applies to wholesale and export orders. It is agreed per enquiry rather than fixed per product, because it moves with the destination and the mix.";

/** The same fact, shortened for a banner that already has context around it. */
export const MOQ_BANNER =
  "Minimum order quantities apply to wholesale and export, agreed per enquiry.";
