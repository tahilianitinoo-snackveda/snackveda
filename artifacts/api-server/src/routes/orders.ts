import { Router, type IRouter } from "express";
import { eq, inArray, desc, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  ordersTable,
  orderItemsTable,
  paymentsTable,
  usersTable,
  addressesTable,
  invoicesTable,
} from "@workspace/db";
import { CreateB2cOrderBody, CreateB2bOrderBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { computeQuote } from "../lib/pricing";
import { generateInvoiceNumber, generateOrderNumber } from "../lib/orderNumber";
import { serializeOrder } from "../lib/orderSerializer";

const router: IRouter = Router();

async function ensureAddress(
  userId: string,
  shipping: { fullName: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string },
) {
  const [addr] = await db
    .insert(addressesTable)
    .values({
      userId,
      fullName: shipping.fullName,
      phone: shipping.phone,
      line1: shipping.line1,
      line2: shipping.line2 ?? null,
      city: shipping.city,
      state: shipping.state,
      pincode: shipping.pincode,
    })
    .returning();
  return addr;
}

router.post("/orders/b2c", requireAuth, async (req, res) => {
  const parsed = CreateB2cOrderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid order data", code: "VALIDATION_ERROR" });
  }
  const body = parsed.data;
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, body.items.map((i) => i.productId)));
  const quote = computeQuote(body.items, products, "b2c", req.user);
  if (quote.lines.length === 0) {
    return res.status(400).json({ message: "No valid items in order", code: "EMPTY_ORDER" });
  }

  const addr = await ensureAddress(req.user!.id, body.shippingAddress);
  const orderNumber = await generateOrderNumber("b2c");

  const [order] = await db
    .insert(ordersTable)
    .values({
      orderNumber,
      userId: req.user!.id,
      orderType: "b2c",
      status: "pending",
      subtotal: String(quote.subtotal),
      discountAmount: String(quote.discountAmount),
      discountPercent: String(quote.discountPercent),
      gstAmount: String(quote.gstAmount),
      shippingCharge: String(quote.shippingCharge),
      totalAmount: String(quote.total),
      shippingAddressId: addr.id,
      notes: body.notes ?? null,
    })
    .returning();

  await db.insert(orderItemsTable).values(
    quote.lines.map((l) => ({
      orderId: order.id,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: String(l.unitPrice),
      gstPercent: String(l.gstPercent),
      gstAmount: String(l.lineGst),
      lineTotal: String(l.lineTotal),
      hsnCode: products.find((p) => p.id === l.productId)?.hsnCode ?? "2106",
    })),
  );

  await db.insert(paymentsTable).values({
    orderId: order.id,
    paymentMethod: body.paymentMethod,
    paymentStatus: "pending",
    amount: String(quote.total),
    referenceNumber: body.paymentReference ?? null,
  });

  await db
    .update(usersTable)
    .set({ ordersCount: sql`${usersTable.ordersCount} + 1` })
    .where(eq(usersTable.id, req.user!.id));

  req.log.info({ orderId: order.id, orderNumber }, "B2C order placed");
  const out = await serializeOrder(order.id);
  res.status(201).json(out);
});

router.post("/orders/b2b", requireAuth, async (req, res) => {
  if (req.user!.role !== "b2b_customer" || req.user!.b2bStatus !== "approved") {
    return res.status(403).json({ message: "Approved B2B account required", code: "FORBIDDEN" });
  }
  const parsed = CreateB2bOrderBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid order data", code: "VALIDATION_ERROR" });
  }
  const body = parsed.data;
  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, body.items.map((i) => i.productId)));
  const quote = computeQuote(body.items, products, "b2b", req.user);
  if (quote.lines.length === 0) {
    return res.status(400).json({ message: "No valid items in order", code: "EMPTY_ORDER" });
  }
  if (!quote.meetsMinimumOrder) {
    return res
      .status(400)
      .json({ message: `Minimum B2B order is ₹${quote.minimumOrderValue}`, code: "BELOW_MIN_ORDER" });
  }
  if (quote.moqViolations.length > 0) {
    return res.status(400).json({ message: quote.moqViolations.join(" "), code: "MOQ_VIOLATION" });
  }

  const addr = await ensureAddress(req.user!.id, body.shippingAddress);
  const orderNumber = await generateOrderNumber("b2b");

  const [order] = await db
    .insert(ordersTable)
    .values({
      orderNumber,
      userId: req.user!.id,
      orderType: "b2b",
      status: "pending",
      subtotal: String(quote.subtotal),
      discountAmount: String(quote.discountAmount),
      discountPercent: String(quote.discountPercent),
      gstAmount: String(quote.gstAmount),
      shippingCharge: String(quote.shippingCharge),
      totalAmount: String(quote.total),
      shippingAddressId: addr.id,
      notes: body.notes ?? null,
    })
    .returning();

  await db.insert(orderItemsTable).values(
    quote.lines.map((l) => ({
      orderId: order.id,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: String(l.unitPrice),
      gstPercent: String(l.gstPercent),
      gstAmount: String(l.lineGst),
      lineTotal: String(l.lineTotal),
      hsnCode: products.find((p) => p.id === l.productId)?.hsnCode ?? "2106",
    })),
  );

  await db.insert(paymentsTable).values({
    orderId: order.id,
    paymentMethod: body.paymentMethod,
    paymentStatus: "pending",
    amount: String(quote.total),
    referenceNumber: null,
  });

  await db
    .update(usersTable)
    .set({ ordersCount: sql`${usersTable.ordersCount} + 1` })
    .where(eq(usersTable.id, req.user!.id));

  req.log.info({ orderId: order.id, orderNumber }, "B2B order placed");
  const out = await serializeOrder(order.id);
  res.status(201).json(out);
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  const out = await serializeOrder(String(req.params.id));
  if (!out) return res.status(404).json({ message: "Order not found", code: "NOT_FOUND" });
  if (req.user!.role !== "super_admin" && out.user?.id !== req.user!.id) {
    return res.status(403).json({ message: "Not your order", code: "FORBIDDEN" });
  }
  res.json(out);
});

router.get("/account/orders", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.user!.id))
    .orderBy(desc(ordersTable.createdAt));
  res.json(
    rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      itemCount: 0,
      createdAt: o.createdAt.toISOString(),
    })),
  );
});

router.get("/orders/:orderId/invoice", requireAuth, async (req, res) => {
  const order = await serializeOrder(String(req.params.orderId));
  if (!order) return res.status(404).json({ message: "Order not found", code: "NOT_FOUND" });
  if (req.user!.role !== "super_admin" && order.user?.id !== req.user!.id) {
    return res.status(403).json({ message: "Not your order", code: "FORBIDDEN" });
  }
  if (!order.payment || order.payment.paymentStatus !== "received") {
    return res.status(400).json({ message: "Invoice available only after payment is confirmed", code: "PAYMENT_PENDING" });
  }
  let [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, order.id)).limit(1);
  if (!inv) {
    const invoiceNumber = await generateInvoiceNumber();
    [inv] = await db.insert(invoicesTable).values({ orderId: order.id, invoiceNumber }).returning();
  }
  res.json({
    invoiceNumber: inv.invoiceNumber,
    issuedAt: inv.createdAt.toISOString(),
    seller: {
      name: "Narayani Distributors",
      brand: "SnackVeda",
      address: "Mumbai, Maharashtra, India",
      gstNumber: "27AAAAA0000A1Z5",
      phone: "+91 90000 00000",
      email: "hello@snackveda.in",
    },
    order,
  });
});

export default router;
