import { describe, expect, it } from "vitest";
import { computeQuote, type QuoteProduct } from "./pricing";

const chips: QuoteProduct = {
  id: "p1", name: "Ragi Chips Peri Peri", slug: "ragi-chips-peri-peri",
  category: "healthy_chips", b2cPrice: "199.00", b2bPrice: "149.00",
  gstPercent: "5.00", moq: 5,
};

describe("computeQuote", () => {
  it("prices a single B2C line at the retail price plus GST", () => {
    const q = computeQuote([{ productId: "p1", quantity: 2 }], [chips], "b2c", null);
    expect(q.subtotal).toBe(398);
    expect(q.discountPercent).toBe(0);
    expect(q.gstAmount).toBe(19.9);
    expect(q.total).toBe(477.9); // 398 + 19.90 GST + 60 shipping, under the 999 threshold
  });
});
