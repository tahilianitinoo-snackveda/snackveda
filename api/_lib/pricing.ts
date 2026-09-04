export type QuoteProduct = {
  id: string; name: string; slug: string; category: string;
  b2cPrice: string | number; b2bPrice: string | number;
  gstPercent: string | number; moq: number;
};
export type QuoteUser = { role: string; ordersCount: number } | null | undefined;
export type QuoteItem = { productId: string; quantity: number };

export type QuoteLine = {
  productId: string;
  name: string;
  slug: string;
  category: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
  lineSubtotal: number;
  lineGst: number;
  lineTotal: number;
  moq: number;
  meetsMoq: boolean;
};

export type Quote = {
  orderType: "b2c" | "b2b";
  lines: QuoteLine[];
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  discountLabel: string;
  gstAmount: number;
  shippingCharge: number;
  total: number;
  meetsMinimumOrder: boolean;
  minimumOrderValue: number;
  moqViolations: string[];
};

/**
 * The commercial rules, which the business sets in Admin → Settings.
 *
 * ─── WHY THESE ARE NOT CONSTANTS ANY MORE ───────────────────────────────────
 * They were hardcoded here AND hardcoded again in the storefront —
 * `product-card.tsx` and `product-detail.tsx` each carried their own copy of
 * "15 for the first order, 10 for the second, 5 after that". A shop that changed
 * its first-order discount and missed one of the three would show a customer one
 * price and charge them another. This module is the authority now, and the
 * storefront reads the same numbers from `GET /settings`.
 *
 * ─── THE DEFAULTS ARE THE CURRENT LIVE VALUES ───────────────────────────────
 * Every default below is exactly what the site has been charging. A deployment
 * that reads no settings behaves identically to before — which is what makes this
 * safe to ship against a live shop, and why the existing tests pass untouched.
 */
export type PricingRules = {
  /** Percent off for a customer who has never ordered. */
  discountFirstOrderPercent: number;
  /** Percent off on their second order. */
  discountSecondOrderPercent: number;
  /** Percent off on every order after that. */
  discountRepeatPercent: number;
  /** Order value (after discount) at which retail shipping becomes free. */
  freeShippingThreshold: number;
  /** Flat retail shipping charge below that threshold. */
  shippingCharge: number;
  /** Minimum order value for a wholesale order, before GST. */
  b2bMinimumOrderValue: number;
};

export const DEFAULT_PRICING_RULES: PricingRules = {
  discountFirstOrderPercent: 15,
  discountSecondOrderPercent: 10,
  discountRepeatPercent: 5,
  freeShippingThreshold: 999,
  shippingCharge: 60,
  b2bMinimumOrderValue: 5000,
};

/**
 * Rules from a settings map, falling back to the default for anything missing,
 * blank or unparseable.
 *
 * A malformed setting must never take a discount to NaN and a total with it. Zero
 * is a legitimate value throughout — a shop turning its first-order discount off
 * sets it to 0 — so only a value that is not a finite number is rejected.
 */
export function pricingRulesFrom(settings: Record<string, string | undefined> = {}): PricingRules {
  const read = (key: string, fallback: number) => {
    const raw = settings[key];
    if (raw == null || String(raw).trim() === "") return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    discountFirstOrderPercent: read("discount_first_order_percent", DEFAULT_PRICING_RULES.discountFirstOrderPercent),
    discountSecondOrderPercent: read("discount_second_order_percent", DEFAULT_PRICING_RULES.discountSecondOrderPercent),
    discountRepeatPercent: read("discount_repeat_percent", DEFAULT_PRICING_RULES.discountRepeatPercent),
    freeShippingThreshold: read("free_shipping_threshold", DEFAULT_PRICING_RULES.freeShippingThreshold),
    shippingCharge: read("shipping_charge", DEFAULT_PRICING_RULES.shippingCharge),
    b2bMinimumOrderValue: read("b2b_minimum_order_value", DEFAULT_PRICING_RULES.b2bMinimumOrderValue),
  };
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
export function computeQuote(items: QuoteItem[], products: QuoteProduct[], orderType: "b2c"|"b2b", user?: QuoteUser, rules: PricingRules = DEFAULT_PRICING_RULES): Quote {
  const productsById = new Map(products.map(product => [product.id, product]));
  const lines: QuoteLine[] = [];
  for (const item of items) {
    const product = productsById.get(item.productId); if (!product) continue;
    const unitPrice = Number(orderType === "b2b" ? product.b2bPrice : product.b2cPrice);
    const qty = Math.max(1, Math.floor(item.quantity));
    const lineSubtotal = +(unitPrice * qty).toFixed(2);
    const gstPercent = Number(product.gstPercent);
    const lineGst = +(lineSubtotal * gstPercent / 100).toFixed(2);
    const meetsMoq = orderType === "b2b" ? (qty >= product.moq && qty % product.moq === 0) : true;
    lines.push({ productId: product.id, name: product.name, slug: product.slug, category: product.category, quantity: qty, unitPrice, gstPercent, lineSubtotal, lineGst, lineTotal: +(lineSubtotal + lineGst).toFixed(2), moq: product.moq, meetsMoq });
  }
  const subtotal = +lines.reduce((sum, line) => sum + line.lineSubtotal, 0).toFixed(2);
  let discountPercent = 0, discountLabel = "No discount";
  if (orderType === "b2c" && user?.role === "b2c_customer") {
    const ordersCount = user.ordersCount;
    // The label carries the actual percentage rather than a hardcoded string, so a
    // shop that changes its first-order discount to 20 does not get a cart saying
    // "15% off" beside a total discounted by 20.
    if (ordersCount === 0) { discountPercent = rules.discountFirstOrderPercent; discountLabel = `First order — ${discountPercent}% off`; }
    else if (ordersCount === 1) { discountPercent = rules.discountSecondOrderPercent; discountLabel = `Returning customer — ${discountPercent}% off`; }
    else { discountPercent = rules.discountRepeatPercent; discountLabel = `Loyalty — ${discountPercent}% off`; }
    // A tier set to zero is "no discount for this tier", not "0% off".
    if (discountPercent === 0) discountLabel = "No discount";
  }
  const discountAmount = +(subtotal * discountPercent / 100).toFixed(2);
  const afterDiscount = +(subtotal - discountAmount).toFixed(2);
  const gstAmount = orderType === "b2b"
    ? +lines.reduce((sum, line) => sum + line.lineGst, 0).toFixed(2)
    : +lines.reduce((sum, line) => { const lineShare = subtotal > 0 ? line.lineSubtotal/subtotal : 0; return sum + afterDiscount*lineShare*line.gstPercent/100; }, 0).toFixed(2);
  const shippingCharge = orderType === "b2c"
    ? (afterDiscount >= rules.freeShippingThreshold ? 0 : rules.shippingCharge)
    : 0;
  const total = +(afterDiscount + gstAmount + shippingCharge).toFixed(2);
  return { orderType, lines, subtotal, discountAmount, discountPercent, discountLabel, gstAmount, shippingCharge, total, meetsMinimumOrder: orderType === "b2b" ? subtotal >= rules.b2bMinimumOrderValue : true, minimumOrderValue: orderType === "b2b" ? rules.b2bMinimumOrderValue : 0, moqViolations: orderType === "b2b" ? lines.filter(line => !line.meetsMoq).map(line => `${line.name} requires quantity in multiples of ${line.moq} (you have ${line.quantity}).`) : [] };
}
