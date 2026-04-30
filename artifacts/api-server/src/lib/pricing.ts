import type { Product, User } from "@workspace/db";

export const FREE_SHIPPING_THRESHOLD = 999;
export const FLAT_SHIPPING = 60;
export const B2B_MIN_ORDER = 3000;

export function b2cDiscount(ordersCount: number): { percent: number; label: string } {
  if (ordersCount === 0) return { percent: 15, label: "First order — 15% off" };
  if (ordersCount === 1) return { percent: 10, label: "Returning customer — 10% off" };
  return { percent: 5, label: "Loyalty — 5% off" };
}

export type CartItemInput = { productId: string; quantity: number };

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

export function computeQuote(
  items: CartItemInput[],
  products: Product[],
  orderType: "b2c" | "b2b",
  user: User | undefined,
): Quote {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const lines: QuoteLine[] = [];

  for (const it of items) {
    const p = productMap.get(it.productId);
    if (!p) continue;
    const unitPrice = Number(orderType === "b2b" ? p.b2bPrice : p.b2cPrice);
    const qty = Math.max(1, Math.floor(it.quantity));
    const lineSubtotal = +(unitPrice * qty).toFixed(2);
    const gstPercent = Number(p.gstPercent);
    const lineGst = +(lineSubtotal * (gstPercent / 100)).toFixed(2);
    const meetsMoq = orderType === "b2b" ? qty >= p.moq : true;
    lines.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      quantity: qty,
      unitPrice,
      gstPercent,
      lineSubtotal,
      lineGst,
      lineTotal: +(lineSubtotal + lineGst).toFixed(2),
      moq: p.moq,
      meetsMoq,
    });
  }

  const subtotal = +lines.reduce((s, l) => s + l.lineSubtotal, 0).toFixed(2);

  let discountPercent = 0;
  let discountLabel = "No discount applied";
  if (orderType === "b2c" && user && user.role === "b2c_customer") {
    const d = b2cDiscount(user.ordersCount);
    discountPercent = d.percent;
    discountLabel = d.label;
  }
  const discountAmount = +(subtotal * (discountPercent / 100)).toFixed(2);
  const afterDiscount = +(subtotal - discountAmount).toFixed(2);

  const gstAmount =
    orderType === "b2b"
      ? +lines.reduce((s, l) => s + l.lineGst, 0).toFixed(2)
      : +lines
          .reduce((s, l) => {
            const lineRatio = subtotal > 0 ? l.lineSubtotal / subtotal : 0;
            const adjusted = afterDiscount * lineRatio;
            return s + adjusted * (l.gstPercent / 100);
          }, 0)
          .toFixed(2);

  let shippingCharge = 0;
  if (orderType === "b2c") {
    shippingCharge = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  }

  const total = +(afterDiscount + gstAmount + shippingCharge).toFixed(2);

  const minimumOrderValue = orderType === "b2b" ? B2B_MIN_ORDER : 0;
  const meetsMinimumOrder = orderType === "b2b" ? subtotal >= B2B_MIN_ORDER : true;

  const moqViolations: string[] = [];
  if (orderType === "b2b") {
    for (const l of lines) {
      if (!l.meetsMoq) {
        moqViolations.push(`${l.name} requires a minimum of ${l.moq} units (you have ${l.quantity}).`);
      }
    }
  }

  return {
    orderType,
    lines,
    subtotal,
    discountAmount,
    discountPercent,
    discountLabel,
    gstAmount,
    shippingCharge,
    total,
    meetsMinimumOrder,
    minimumOrderValue,
    moqViolations,
  };
}
