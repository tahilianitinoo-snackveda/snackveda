import serverless from "serverless-http";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Router } from "express";

// ─── DB & Auth helpers ────────────────────────────────────────────────────────
import { db, usersTable } from "@workspace/db";
import { eq, inArray, and, asc, desc, gte, like, sql } from "drizzle-orm";
import {
  productsTable,
  ordersTable,
  orderItemsTable,
  paymentsTable,
  invoicesTable,
  addressesTable,
} from "@workspace/db";

// ─── Validation schemas ───────────────────────────────────────────────────────
import {
  RegisterUserBody,
  LoginUserBody,
  QuoteCartBody,
  CreateB2cOrderBody,
  CreateB2bOrderBody,
} from "@workspace/api-zod";
import { z } from "zod";

// ─── Business logic ───────────────────────────────────────────────────────────
import { computeQuote } from "../../artifacts/api-server/src/lib/pricing";
import {
  generateOrderNumber,
  generateInvoiceNumber,
} from "../../artifacts/api-server/src/lib/orderNumber";
import { serializeOrder } from "../../artifacts/api-server/src/lib/orderSerializer";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ─── Types ────────────────────────────────────────────────────────────────────
import type { User } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// ─── JWT Auth (replaces express-session for serverless) ───────────────────────
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "snackveda-secret";

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload) return next();
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (u) req.user = u;
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Authentication required", code: "UNAUTHORIZED" });
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Authentication required", code: "UNAUTHORIZED" });
  if (req.user.role !== "super_admin") return res.status(403).json({ message: "Admin access required", code: "FORBIDDEN" });
  next();
}

function publicUser(u: User) {
  return { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role, b2bStatus: u.b2bStatus };
}

function profileUser(u: User) {
  return { ...publicUser(u), customerType: u.customerType, businessName: u.businessName, gstNumber: u.gstNumber, businessAddress: u.businessAddress, ordersCount: u.ordersCount };
}

// ─── Serialize product ────────────────────────────────────────────────────────
function serializeProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id, name: p.name, slug: p.slug, category: p.category, variant: p.variant,
    b2cPrice: Number(p.b2cPrice), b2bPrice: Number(p.b2bPrice),
    moq: p.moq, cartonQty: p.cartonQty, gstPercent: Number(p.gstPercent),
    hsnCode: p.hsnCode, shelfLifeMonths: p.shelfLifeMonths, weightGrams: p.weightGrams,
    description: p.description, stockQty: p.stockQty, status: p.status,
    sortOrder: p.sortOrder, imageUrl: p.imageUrl,
  };
}

// ─── Address helper ───────────────────────────────────────────────────────────
async function ensureAddress(
  userId: string,
  shipping: { fullName: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string },
) {
  const [addr] = await db.insert(addressesTable).values({
    userId, fullName: shipping.fullName, phone: shipping.phone,
    line1: shipping.line1, line2: shipping.line2 ?? null,
    city: shipping.city, state: shipping.state, pincode: shipping.pincode,
  }).returning();
  return addr;
}

// ─── Express App ──────────────────────────────────────────────────────────────
const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loadUser);

const router = Router();

// ─── HEALTH ───────────────────────────────────────────────────────────────────
router.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid registration data", code: "VALIDATION_ERROR" });
  const body = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email.toLowerCase())).limit(1);
  if (existing.length) return res.status(400).json({ message: "An account with that email already exists", code: "EMAIL_TAKEN" });
  const passwordHash = await bcrypt.hash(body.password, 10);
  const isB2b = body.accountType === "b2b";
  const [user] = await db.insert(usersTable).values({
    email: body.email.toLowerCase(), passwordHash,
    fullName: body.fullName, phone: body.phone ?? null,
    role: isB2b ? "b2b_customer" : "b2c_customer",
    customerType: isB2b ? (body.businessType ?? "kirana") : "retail",
    businessName: body.businessName ?? null,
    gstNumber: body.gstNumber ?? null,
    businessAddress: body.businessAddress ?? null,
    b2bStatus: isB2b ? "pending" : null,
  }).returning();
  const token = signToken(user.id);
  res.status(201).json({ token, user: profileUser(user) });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid login data", code: "VALIDATION_ERROR" });
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || !user.isActive) return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
  const token = signToken(user.id);
  res.json({ token, user: profileUser(user) });
});

router.post("/auth/logout", (_req, res) => res.json({ ok: true }));

router.get("/auth/me", requireAuth, (req, res) => res.json(profileUser(req.user!)));

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  const category = req.query.category as string | undefined;
  const conditions = [eq(productsTable.status, "active")];
  if (category) conditions.push(eq(productsTable.category, category as any));
  const rows = await db.select().from(productsTable).where(and(...conditions)).orderBy(asc(productsTable.sortOrder));
  res.json(rows.map(serializeProduct));
});

router.get("/products/:slug", async (req, res) => {
  const [p] = await db.select().from(productsTable).where(eq(productsTable.slug, req.params.slug)).limit(1);
  if (!p) return res.status(404).json({ message: "Product not found", code: "NOT_FOUND" });
  const related = await db.select().from(productsTable)
    .where(and(eq(productsTable.category, p.category), eq(productsTable.status, "active")))
    .orderBy(asc(productsTable.sortOrder)).limit(4);
  res.json({ product: serializeProduct(p), related: related.filter(r => r.id !== p.id).slice(0, 3).map(serializeProduct) });
});

// ─── CART QUOTE ───────────────────────────────────────────────────────────────
router.post("/cart/quote", async (req, res) => {
  const parsed = QuoteCartBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid quote request", code: "VALIDATION_ERROR" });
  const { items, orderType } = parsed.data;
  if (items.length === 0) {
    return res.json({ orderType, lines: [], subtotal: 0, discountAmount: 0, discountPercent: 0, discountLabel: "No items", gstAmount: 0, shippingCharge: 0, total: 0, meetsMinimumOrder: orderType === "b2c", minimumOrderValue: orderType === "b2b" ? 3000 : 0, moqViolations: [] });
  }
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, items.map(i => i.productId)));
  const quote = computeQuote(items, products, orderType, req.user);
  res.json(quote);
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────
router.post("/orders/b2c", requireAuth, async (req, res) => {
  const parsed = CreateB2cOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid order data", code: "VALIDATION_ERROR" });
  const body = parsed.data;
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, body.items.map(i => i.productId)));
  const quote = computeQuote(body.items, products, "b2c", req.user);
  if (quote.lines.length === 0) return res.status(400).json({ message: "No valid items in order", code: "EMPTY_ORDER" });
  const addr = await ensureAddress(req.user!.id, body.shippingAddress);
  const orderNumber = await generateOrderNumber("b2c");
  const [order] = await db.insert(ordersTable).values({
    orderNumber, userId: req.user!.id, orderType: "b2c", status: "pending",
    subtotal: String(quote.subtotal), discountAmount: String(quote.discountAmount),
    discountPercent: String(quote.discountPercent), gstAmount: String(quote.gstAmount),
    shippingCharge: String(quote.shippingCharge), totalAmount: String(quote.total),
    shippingAddressId: addr.id, notes: body.notes ?? null,
  }).returning();
  await db.insert(orderItemsTable).values(quote.lines.map(l => ({
    orderId: order.id, productId: l.productId, quantity: l.quantity,
    unitPrice: String(l.unitPrice), gstPercent: String(l.gstPercent),
    gstAmount: String(l.lineGst), lineTotal: String(l.lineTotal),
    hsnCode: products.find(p => p.id === l.productId)?.hsnCode ?? "21069099",
  })));
  await db.insert(paymentsTable).values({
    orderId: order.id, paymentMethod: body.paymentMethod,
    paymentStatus: "pending", amount: String(quote.total),
    referenceNumber: body.paymentReference ?? null,
  });
  await db.update(usersTable).set({ ordersCount: sql`${usersTable.ordersCount} + 1` }).where(eq(usersTable.id, req.user!.id));
  res.status(201).json(await serializeOrder(order.id));
});

router.post("/orders/b2b", requireAuth, async (req, res) => {
  if (req.user!.role !== "b2b_customer" || req.user!.b2bStatus !== "approved") {
    return res.status(403).json({ message: "Approved B2B account required", code: "FORBIDDEN" });
  }
  const parsed = CreateB2bOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid order data", code: "VALIDATION_ERROR" });
  const body = parsed.data;
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, body.items.map(i => i.productId)));
  const quote = computeQuote(body.items, products, "b2b", req.user);
  if (quote.lines.length === 0) return res.status(400).json({ message: "No valid items in order", code: "EMPTY_ORDER" });
  if (!quote.meetsMinimumOrder) return res.status(400).json({ message: `Minimum B2B order is ₹${quote.minimumOrderValue}`, code: "BELOW_MIN_ORDER" });
  if (quote.moqViolations.length > 0) return res.status(400).json({ message: quote.moqViolations.join(" "), code: "MOQ_VIOLATION" });
  const addr = await ensureAddress(req.user!.id, body.shippingAddress);
  const orderNumber = await generateOrderNumber("b2b");
  const [order] = await db.insert(ordersTable).values({
    orderNumber, userId: req.user!.id, orderType: "b2b", status: "pending",
    subtotal: String(quote.subtotal), discountAmount: String(quote.discountAmount),
    discountPercent: String(quote.discountPercent), gstAmount: String(quote.gstAmount),
    shippingCharge: String(quote.shippingCharge), totalAmount: String(quote.total),
    shippingAddressId: addr.id, notes: body.notes ?? null,
  }).returning();
  await db.insert(orderItemsTable).values(quote.lines.map(l => ({
    orderId: order.id, productId: l.productId, quantity: l.quantity,
    unitPrice: String(l.unitPrice), gstPercent: String(l.gstPercent),
    gstAmount: String(l.lineGst), lineTotal: String(l.lineTotal),
    hsnCode: products.find(p => p.id === l.productId)?.hsnCode ?? "21069099",
  })));
  await db.insert(paymentsTable).values({
    orderId: order.id, paymentMethod: body.paymentMethod,
    paymentStatus: "pending", amount: String(quote.total),
  });
  await db.update(usersTable).set({ ordersCount: sql`${usersTable.ordersCount} + 1` }).where(eq(usersTable.id, req.user!.id));
  res.status(201).json(await serializeOrder(order.id));
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  const out = await serializeOrder(String(req.params.id));
  if (!out) return res.status(404).json({ message: "Order not found", code: "NOT_FOUND" });
  if (req.user!.role !== "super_admin" && out.user?.id !== req.user!.id) return res.status(403).json({ message: "Not your order", code: "FORBIDDEN" });
  res.json(out);
});

router.get("/account/orders", requireAuth, async (req, res) => {
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.userId, req.user!.id)).orderBy(desc(ordersTable.createdAt));
  res.json(rows.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })));
});

router.get("/orders/:orderId/invoice", requireAuth, async (req, res) => {
  const order = await serializeOrder(String(req.params.orderId));
  if (!order) return res.status(404).json({ message: "Order not found", code: "NOT_FOUND" });
  if (req.user!.role !== "super_admin" && order.user?.id !== req.user!.id) return res.status(403).json({ message: "Not your order", code: "FORBIDDEN" });
  if (!order.payment || order.payment.paymentStatus !== "received") return res.status(400).json({ message: "Invoice available only after payment confirmed", code: "PAYMENT_PENDING" });
  let [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, order.id)).limit(1);
  if (!inv) {
    const invoiceNumber = await generateInvoiceNumber();
    [inv] = await db.insert(invoicesTable).values({ orderId: order.id, invoiceNumber }).returning();
  }
  res.json({ invoiceNumber: inv.invoiceNumber, issuedAt: inv.createdAt.toISOString(), seller: { name: "Narayani Distributors", brand: "SnackVeda", address: "Indore, Madhya Pradesh, India", gstNumber: "23AAAAA0000A1Z5", phone: "+91 90000 00000", email: "hello@snackveda.com" }, order });
});

// ─── ACCOUNT ──────────────────────────────────────────────────────────────────
router.get("/account/me", requireAuth, (req, res) => res.json(profileUser(req.user!)));

router.patch("/account/me", requireAuth, async (req, res) => {
  const schema = z.object({ fullName: z.string(), phone: z.string().nullish(), businessName: z.string().nullish(), gstNumber: z.string().nullish(), businessAddress: z.string().nullish() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid profile data", code: "VALIDATION_ERROR" });
  const body = parsed.data;
  const [updated] = await db.update(usersTable).set({
    ...(body.fullName !== undefined && { fullName: body.fullName }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.businessName !== undefined && { businessName: body.businessName }),
    ...(body.gstNumber !== undefined && { gstNumber: body.gstNumber }),
    ...(body.businessAddress !== undefined && { businessAddress: body.businessAddress }),
  }).where(eq(usersTable.id, req.user!.id)).returning();
  res.json(profileUser(updated));
});

router.get("/account/addresses", requireAuth, async (req, res) => {
  const rows = await db.select().from(addressesTable).where(eq(addressesTable.userId, req.user!.id)).orderBy(desc(addressesTable.createdAt));
  res.json(rows.map(a => ({ id: a.id, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault })));
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [todayCount] = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable).where(gte(ordersTable.createdAt, todayStart));
  const [pendingPay] = await db.select({ c: sql<number>`count(*)::int` }).from(paymentsTable).where(eq(paymentsTable.paymentStatus, "pending"));
  const [monthRevenue] = await db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)::float` }).from(ordersTable).where(and(gte(ordersTable.createdAt, monthStart), eq(ordersTable.status, "confirmed")));
  const [lowStock] = await db.select({ c: sql<number>`count(*)::int` }).from(productsTable).where(sql`stock_qty < 20`);
  const recentOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(10);
  res.json({ todayOrders: todayCount.c, pendingPayments: pendingPay.c, monthRevenue: monthRevenue.total, lowStockItems: lowStock.c, recentOrders: recentOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })) });
});

router.get("/admin/products", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(productsTable).orderBy(asc(productsTable.sortOrder));
  res.json(rows.map(serializeProduct));
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  const schema = z.object({ name: z.string(), slug: z.string(), category: z.enum(["healthy_chips", "makhana", "superpuffs"]), variant: z.string().nullish(), b2cPrice: z.number(), b2bPrice: z.number(), moq: z.number().default(1), cartonQty: z.number().default(1), gstPercent: z.number().default(5), hsnCode: z.string().default("21069099"), shelfLifeMonths: z.number().default(6), weightGrams: z.number().default(60), description: z.string().nullish(), stockQty: z.number().default(100), status: z.enum(["active", "inactive", "out_of_stock"]).default("active"), sortOrder: z.number().default(0), imageUrl: z.string().nullish() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid product data", code: "VALIDATION_ERROR" });
  const p = parsed.data;
  const [row] = await db.insert(productsTable).values({ ...p, b2cPrice: String(p.b2cPrice), b2bPrice: String(p.b2bPrice), gstPercent: String(p.gstPercent) }).returning();
  res.status(201).json(serializeProduct(row));
});

router.patch("/admin/products/:id", requireAdmin, async (req, res) => {
  const schema = z.object({ name: z.string().optional(), variant: z.string().nullish(), b2cPrice: z.number().optional(), b2bPrice: z.number().optional(), moq: z.number().optional(), cartonQty: z.number().optional(), gstPercent: z.number().optional(), hsnCode: z.string().optional(), shelfLifeMonths: z.number().optional(), weightGrams: z.number().optional(), description: z.string().nullish(), stockQty: z.number().optional(), status: z.enum(["active", "inactive", "out_of_stock"]).optional(), sortOrder: z.number().optional(), imageUrl: z.string().nullish() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", code: "VALIDATION_ERROR" });
  const body = parsed.data;
  const update: any = { ...body };
  if (body.b2cPrice !== undefined) update.b2cPrice = String(body.b2cPrice);
  if (body.b2bPrice !== undefined) update.b2bPrice = String(body.b2bPrice);
  if (body.gstPercent !== undefined) update.gstPercent = String(body.gstPercent);
  const [row] = await db.update(productsTable).set(update).where(eq(productsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ message: "Product not found", code: "NOT_FOUND" });
  res.json(serializeProduct(row));
});

router.get("/admin/customers", requireAdmin, async (req, res) => {
  const role = req.query.role as string | undefined;
  const conditions = role ? [eq(usersTable.role, role as any)] : [];
  const rows = await db.select().from(usersTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(usersTable.createdAt));
  res.json(rows.map(profileUser));
});

router.patch("/admin/customers/:id/status", requireAdmin, async (req, res) => {
  const schema = z.object({ b2bStatus: z.enum(["pending", "approved", "rejected"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status", code: "VALIDATION_ERROR" });
  const [updated] = await db.update(usersTable).set({ b2bStatus: parsed.data.b2bStatus }).where(eq(usersTable.id, req.params.id)).returning();
  res.json(profileUser(updated));
});

router.get("/admin/orders", requireAdmin, async (req, res) => {
  const orderType = req.query.orderType as string | undefined;
  const conditions = orderType ? [eq(ordersTable.orderType, orderType as any)] : [];
  const rows = await db.select().from(ordersTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(ordersTable.createdAt));
  res.json(rows.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })));
});

router.patch("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const schema = z.object({ status: z.enum(["pending", "confirmed", "dispatched", "delivered", "cancelled"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status", code: "VALIDATION_ERROR" });
  const [updated] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, req.params.id)).returning();
  res.json({ id: updated.id, status: updated.status });
});

router.get("/admin/payments", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
  res.json(rows.map(p => ({ id: p.id, orderId: p.orderId, paymentMethod: p.paymentMethod, paymentStatus: p.paymentStatus, amount: Number(p.amount), referenceNumber: p.referenceNumber, paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString() })));
});

router.patch("/admin/payments/:id/confirm", requireAdmin, async (req, res) => {
  const schema = z.object({ referenceNumber: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", code: "VALIDATION_ERROR" });
  const [payment] = await db.update(paymentsTable).set({ paymentStatus: "received", paidAt: new Date(), markedById: req.user!.id, ...(parsed.data.referenceNumber && { referenceNumber: parsed.data.referenceNumber }) }).where(eq(paymentsTable.id, req.params.id)).returning();
  if (!payment) return res.status(404).json({ message: "Payment not found", code: "NOT_FOUND" });
  await db.update(ordersTable).set({ status: "confirmed" }).where(eq(ordersTable.id, payment.orderId));
  const invoiceNumber = await generateInvoiceNumber();
  await db.insert(invoicesTable).values({ orderId: payment.orderId, invoiceNumber }).onConflictDoNothing();
  res.json({ ok: true, paymentId: payment.id, orderId: payment.orderId, invoiceNumber });
});

// ─── Mount & export ───────────────────────────────────────────────────────────
app.use("/api", router);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("API error:", err);
  res.status(500).json({ message: "Internal server error", code: "INTERNAL_ERROR" });
});

export const handler = serverless(app);
