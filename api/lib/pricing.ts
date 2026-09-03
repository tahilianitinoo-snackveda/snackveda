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

// ─── PRICING ──────────────────────────────────────────────────────────────────
export function computeQuote(items: QuoteItem[], products: QuoteProduct[], orderType: "b2c"|"b2b", user?: QuoteUser): Quote {
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
    if (ordersCount === 0) { discountPercent = 15; discountLabel = "First order — 15% off"; }
    else if (ordersCount === 1) { discountPercent = 10; discountLabel = "Returning customer — 10% off"; }
    else { discountPercent = 5; discountLabel = "Loyalty — 5% off"; }
  }
  const discountAmount = +(subtotal * discountPercent / 100).toFixed(2);
  const afterDiscount = +(subtotal - discountAmount).toFixed(2);
  const gstAmount = orderType === "b2b"
    ? +lines.reduce((sum, line) => sum + line.lineGst, 0).toFixed(2)
    : +lines.reduce((sum, line) => { const lineShare = subtotal > 0 ? line.lineSubtotal/subtotal : 0; return sum + afterDiscount*lineShare*line.gstPercent/100; }, 0).toFixed(2);
  const shippingCharge = orderType === "b2c" ? (afterDiscount >= 999 ? 0 : 60) : 0;
  const total = +(afterDiscount + gstAmount + shippingCharge).toFixed(2);
  return { orderType, lines, subtotal, discountAmount, discountPercent, discountLabel, gstAmount, shippingCharge, total, meetsMinimumOrder: orderType === "b2b" ? subtotal >= 5000 : true, minimumOrderValue: orderType === "b2b" ? 5000 : 0, moqViolations: orderType === "b2b" ? lines.filter(line => !line.meetsMoq).map(line => `${line.name} requires quantity in multiples of ${line.moq} (you have ${line.quantity}).`) : [] };
}
