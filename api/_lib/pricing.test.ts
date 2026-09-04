import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING_RULES,
  computeQuote,
  pricingRulesFrom,
  type QuoteProduct,
} from "./pricing";

const chips: QuoteProduct = {
  id: "p1", name: "Ragi Chips Peri Peri", slug: "ragi-chips-peri-peri",
  category: "healthy_chips", b2cPrice: "199.00", b2bPrice: "149.00",
  gstPercent: "5.00", moq: 5,
};

const makhana: QuoteProduct = {
  id: "p2", name: "Makhana Peri Peri", slug: "makhana-peri-peri",
  category: "makhana", b2cPrice: "250.00", b2bPrice: "180.00",
  gstPercent: "5.00", moq: 10,
};

// A second GST rate is the whole point of this fixture: every other test in this file
// mixes at most one rate, which lets the B2C apportioning loop degenerate to lineShare
// === 1 without anything noticing.
const almonds: QuoteProduct = {
  id: "p3", name: "Premium Roasted Almonds", slug: "premium-roasted-almonds",
  category: "dry_fruits", b2cPrice: "300.00", b2bPrice: "220.00",
  gstPercent: "12.00", moq: 4,
};

describe("computeQuote", () => {
  it("prices a single B2C line at the retail price plus GST", () => {
    const q = computeQuote([{ productId: "p1", quantity: 2 }], [chips], "b2c", null);
    expect(q.subtotal).toBe(398);
    expect(q.discountPercent).toBe(0);
    expect(q.gstAmount).toBe(19.9);
    expect(q.total).toBe(477.9); // 398 + 19.90 GST + 60 shipping, under the 999 threshold
  });

  it("apportions B2C GST across lines by each line's own share of the subtotal", () => {
    // chips: 2 x 199.00 = 398.00 subtotal @ 5% GST.
    // almonds: 1 x 300.00 = 300.00 subtotal @ 12% GST.
    // subtotal = 398 + 300 = 698, with no loyalty discount so afterDiscount === subtotal.
    // A correct per-line weighting gives each line its own rate on its own share:
    //   398 * 5%  = 19.90
    // + 300 * 12% = 36.00
    // -----------------------
    //             = 55.90
    // Two implementations that would still pass every other test in this file, but fail
    // this one:
    //  - collapsing the loop to a single flat rate off the first line only:
    //      698 * 5% = 34.90
    //  - averaging the two rates unweighted by each line's size:
    //      698 * ((5 + 12) / 2)% = 59.33
    const q = computeQuote(
      [{ productId: "p1", quantity: 2 }, { productId: "p3", quantity: 1 }],
      [chips, almonds], "b2c", null);
    expect(q.subtotal).toBe(698);
    expect(q.discountAmount).toBe(0);
    expect(q.gstAmount).toBe(55.9);
    expect(q.shippingCharge).toBe(60); // 698 is under the 999 free-shipping threshold
    expect(q.total).toBe(813.9); // 698 + 55.90 GST + 60 shipping
  });

  it.each([
    { ordersCount: 0, percent: 15, label: "First order — 15% off" },
    { ordersCount: 1, percent: 10, label: "Returning customer — 10% off" },
    { ordersCount: 2, percent: 5,  label: "Loyalty — 5% off" },
    { ordersCount: 99, percent: 5, label: "Loyalty — 5% off" },
  ])("gives a B2C customer with $ordersCount orders $percent% off", (c) => {
    const q = computeQuote([{ productId: "p1", quantity: 1 }], [chips], "b2c",
      { role: "b2c_customer", ordersCount: c.ordersCount });
    expect(q.discountPercent).toBe(c.percent);
    expect(q.discountLabel).toBe(c.label);
  });

  it("gives no loyalty discount to an anonymous visitor", () => {
    const q = computeQuote([{ productId: "p1", quantity: 1 }], [chips], "b2c", null);
    expect(q.discountPercent).toBe(0);
    expect(q.discountLabel).toBe("No discount");
  });

  it("waives shipping once the discounted subtotal reaches 999", () => {
    const under = computeQuote([{ productId: "p1", quantity: 5 }], [chips], "b2c", null);
    expect(under.subtotal).toBe(995);
    expect(under.shippingCharge).toBe(60);

    const over = computeQuote([{ productId: "p1", quantity: 6 }], [chips], "b2c", null);
    expect(over.subtotal).toBe(1194);
    expect(over.shippingCharge).toBe(0);
  });

  it("applies the threshold to the discounted total, not the gross subtotal", () => {
    // 6 units = 1194 gross, but a first-order 15% discount drops it to 1014.90 — still free.
    const q = computeQuote([{ productId: "p1", quantity: 6 }], [chips], "b2c",
      { role: "b2c_customer", ordersCount: 0 });
    expect(q.discountAmount).toBe(179.1);
    expect(q.shippingCharge).toBe(0);
  });

  it("charges shipping when the discount drops the order back below the threshold", () => {
    // 4 x 250 = 1000 gross, which clears 999 — but a first-order 15% discount
    // leaves 850, which does not. This is the case that actually pins the rule:
    // an implementation reading the gross subtotal would waive the 60 here.
    const q = computeQuote([{ productId: "p2", quantity: 4 }], [makhana], "b2c",
      { role: "b2c_customer", ordersCount: 0 });
    expect(q.subtotal).toBe(1000);
    expect(q.discountAmount).toBe(150);
    expect(q.shippingCharge).toBe(60);
    expect(q.total).toBe(952.5);
  });

  it("prices B2B lines at trade price with no loyalty discount and no shipping", () => {
    const q = computeQuote([{ productId: "p1", quantity: 100 }], [chips], "b2b",
      { role: "b2b_customer", ordersCount: 0 });
    expect(q.lines[0].unitPrice).toBe(149);
    expect(q.discountPercent).toBe(0);
    expect(q.shippingCharge).toBe(0);
  });

  it("reports a MOQ violation when quantity is not a multiple of the MOQ", () => {
    const q = computeQuote([{ productId: "p1", quantity: 7 }], [chips], "b2b", null);
    expect(q.moqViolations).toHaveLength(1);
    expect(q.moqViolations[0]).toContain("multiples of 5");
  });

  it("accepts a quantity that is an exact multiple of the MOQ", () => {
    const q = computeQuote([{ productId: "p1", quantity: 10 }], [chips], "b2b", null);
    expect(q.moqViolations).toHaveLength(0);
  });

  it("flags a B2B order below the 5000 minimum", () => {
    const low = computeQuote([{ productId: "p1", quantity: 5 }], [chips], "b2b", null);
    expect(low.meetsMinimumOrder).toBe(false);
    expect(low.minimumOrderValue).toBe(5000);

    const ok = computeQuote([{ productId: "p1", quantity: 50 }], [chips], "b2b", null);
    expect(ok.meetsMinimumOrder).toBe(true);
  });

  it("ignores items whose product is not in the catalogue", () => {
    const q = computeQuote([{ productId: "ghost", quantity: 3 }], [chips], "b2c", null);
    expect(q.lines).toHaveLength(0);
    expect(q.total).toBe(60); // shipping only
  });

  it("floors fractional quantities and treats anything below 1 as 1", () => {
    expect(computeQuote([{ productId: "p1", quantity: 2.9 }], [chips], "b2c", null)
      .lines[0].quantity).toBe(2);
    expect(computeQuote([{ productId: "p1", quantity: 0 }], [chips], "b2c", null)
      .lines[0].quantity).toBe(1);
    expect(computeQuote([{ productId: "p1", quantity: -5 }], [chips], "b2c", null)
      .lines[0].quantity).toBe(1);
  });
});

/*
 * The commercial rules moved out of this file and into Admin → Settings. They were
 * hardcoded here AND hardcoded again in product-card.tsx and product-detail.tsx, so
 * a shop that changed its first-order discount and missed one of the three copies
 * would have shown a customer one price and charged them another.
 */
describe("pricingRulesFrom", () => {
  it("returns the current live values when nothing is configured", () => {
    expect(pricingRulesFrom({})).toEqual(DEFAULT_PRICING_RULES);
    expect(pricingRulesFrom()).toEqual(DEFAULT_PRICING_RULES);
  });

  it("reads numbers out of the settings map", () => {
    const rules = pricingRulesFrom({
      discount_first_order_percent: "20",
      free_shipping_threshold: "1500",
      b2b_minimum_order_value: "10000",
    });
    expect(rules.discountFirstOrderPercent).toBe(20);
    expect(rules.freeShippingThreshold).toBe(1500);
    expect(rules.b2bMinimumOrderValue).toBe(10000);
    // Untouched keys keep their defaults rather than becoming zero.
    expect(rules.discountRepeatPercent).toBe(DEFAULT_PRICING_RULES.discountRepeatPercent);
  });

  it("treats zero as a real value, because turning a discount off is a real thing to do", () => {
    const rules = pricingRulesFrom({ discount_first_order_percent: "0", shipping_charge: "0" });
    expect(rules.discountFirstOrderPercent).toBe(0);
    expect(rules.shippingCharge).toBe(0);
  });

  /*
   * A malformed setting must never reach the arithmetic. "fifteen" as a discount
   * would make discountAmount NaN and take the order total with it — a checkout
   * showing "₹NaN" is worse than one showing the old price.
   */
  it("falls back to the default for blank, negative and unparseable values", () => {
    const rules = pricingRulesFrom({
      discount_first_order_percent: "",
      discount_second_order_percent: "   ",
      discount_repeat_percent: "fifteen",
      shipping_charge: "-50",
      free_shipping_threshold: "NaN",
    });
    expect(rules).toEqual(DEFAULT_PRICING_RULES);
  });
});

describe("computeQuote with configured rules", () => {
  const newCustomer = { role: "b2c_customer", ordersCount: 0 };

  it("applies the configured first-order discount instead of the default", () => {
    const rules = pricingRulesFrom({ discount_first_order_percent: "25" });
    const q = computeQuote([{ productId: "p1", quantity: 1 }], [chips], "b2c", newCustomer, rules);
    expect(q.discountPercent).toBe(25);
    expect(q.discountAmount).toBe(49.75);
  });

  it("puts the real percentage in the label, so the cart cannot contradict the total", () => {
    const rules = pricingRulesFrom({ discount_first_order_percent: "25" });
    const q = computeQuote([{ productId: "p1", quantity: 1 }], [chips], "b2c", newCustomer, rules);
    expect(q.discountLabel).toBe("First order — 25% off");
  });

  it("says 'No discount' rather than '0% off' when a tier is switched off", () => {
    const rules = pricingRulesFrom({ discount_first_order_percent: "0" });
    const q = computeQuote([{ productId: "p1", quantity: 1 }], [chips], "b2c", newCustomer, rules);
    expect(q.discountPercent).toBe(0);
    expect(q.discountAmount).toBe(0);
    expect(q.discountLabel).toBe("No discount");
  });

  it("moves the free-shipping threshold and the shipping charge together", () => {
    const rules = pricingRulesFrom({ free_shipping_threshold: "5000", shipping_charge: "99" });
    // 199 x 2 = 398, well under the raised threshold, so shipping is now charged.
    const q = computeQuote([{ productId: "p1", quantity: 2 }], [chips], "b2c", null, rules);
    expect(q.shippingCharge).toBe(99);
  });

  it("moves the wholesale minimum order value", () => {
    const rules = pricingRulesFrom({ b2b_minimum_order_value: "1000" });
    // 149 x 10 = 1490, which clears a 1000 minimum but not the 5000 default.
    const q = computeQuote([{ productId: "p1", quantity: 10 }], [chips], "b2b", null, rules);
    expect(q.minimumOrderValue).toBe(1000);
    expect(q.meetsMinimumOrder).toBe(true);

    const strict = computeQuote([{ productId: "p1", quantity: 10 }], [chips], "b2b", null);
    expect(strict.minimumOrderValue).toBe(5000);
    expect(strict.meetsMinimumOrder).toBe(false);
  });
});
