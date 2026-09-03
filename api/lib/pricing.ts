export type QuoteProduct = {
  id: string; name: string; slug: string; category: string;
  b2cPrice: string | number; b2bPrice: string | number;
  gstPercent: string | number; moq: number;
};
export type QuoteUser = { role: string; ordersCount: number } | null | undefined;
export type QuoteItem = { productId: string; quantity: number };

// ─── PRICING ──────────────────────────────────────────────────────────────────
export function computeQuote(items: QuoteItem[], products: QuoteProduct[], orderType: "b2c"|"b2b", user?: QuoteUser) {
  const map = new Map(products.map(p => [p.id, p]));
  const lines: any[] = [];
  for (const it of items) {
    const p = map.get(it.productId); if (!p) continue;
    const unitPrice = Number(orderType === "b2b" ? p.b2bPrice : p.b2cPrice);
    const qty = Math.max(1, Math.floor(it.quantity));
    const lineSubtotal = +(unitPrice * qty).toFixed(2);
    const gstPct = Number(p.gstPercent);
    const lineGst = +(lineSubtotal * gstPct / 100).toFixed(2);
    const meetsMoq = orderType === "b2b" ? (qty >= p.moq && qty % p.moq === 0) : true;
    lines.push({ productId: p.id, name: p.name, slug: p.slug, category: p.category, quantity: qty, unitPrice, gstPercent: gstPct, lineSubtotal, lineGst, lineTotal: +(lineSubtotal + lineGst).toFixed(2), moq: p.moq, meetsMoq });
  }
  const subtotal = +lines.reduce((s,l) => s + l.lineSubtotal, 0).toFixed(2);
  let discountPercent = 0, discountLabel = "No discount";
  if (orderType === "b2c" && user?.role === "b2c_customer") {
    const n = user.ordersCount;
    if (n === 0) { discountPercent = 15; discountLabel = "First order — 15% off"; }
    else if (n === 1) { discountPercent = 10; discountLabel = "Returning customer — 10% off"; }
    else { discountPercent = 5; discountLabel = "Loyalty — 5% off"; }
  }
  const discountAmount = +(subtotal * discountPercent / 100).toFixed(2);
  const afterDiscount = +(subtotal - discountAmount).toFixed(2);
  const gstAmount = orderType === "b2b"
    ? +lines.reduce((s,l) => s + l.lineGst, 0).toFixed(2)
    : +lines.reduce((s,l) => { const r = subtotal > 0 ? l.lineSubtotal/subtotal : 0; return s + afterDiscount*r*l.gstPercent/100; }, 0).toFixed(2);
  const shippingCharge = orderType === "b2c" ? (afterDiscount >= 999 ? 0 : 60) : 0;
  const total = +(afterDiscount + gstAmount + shippingCharge).toFixed(2);
  return { orderType, lines, subtotal, discountAmount, discountPercent, discountLabel, gstAmount, shippingCharge, total, meetsMinimumOrder: orderType === "b2b" ? subtotal >= 5000 : true, minimumOrderValue: orderType === "b2b" ? 5000 : 0, moqViolations: orderType === "b2b" ? lines.filter(l => !l.meetsMoq).map(l => `${l.name} requires quantity in multiples of ${l.moq} (you have ${l.quantity}).`) : [] };
}
