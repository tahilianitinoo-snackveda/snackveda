import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Router } from "express";
import serverless from "serverless-http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { pgTable, uuid, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { eq, inArray, and, asc, desc, gte, like, sql } from "drizzle-orm";

// ─── DB SCHEMA (no pgEnum — use plain text columns to avoid Drizzle registry issues) ───
const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("b2c_customer"),
  customerType: text("customer_type"),
  businessName: text("business_name"),
  gstNumber: text("gst_number"),
  businessAddress: text("business_address"),
  b2bStatus: text("b2b_status"),
  ordersCount: integer("orders_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  category: text("category").notNull(),
  variant: text("variant"),
  b2cPrice: numeric("b2c_price", { precision: 10, scale: 2 }).notNull(),
  b2bPrice: numeric("b2b_price", { precision: 10, scale: 2 }).notNull(),
  moq: integer("moq").notNull(),
  cartonQty: integer("carton_qty").notNull(),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull(),
  hsnCode: text("hsn_code").notNull(),
  shelfLifeMonths: integer("shelf_life_months").notNull(),
  weightGrams: integer("weight_grams").notNull(),
  description: text("description"),
  stockQty: integer("stock_qty").notNull().default(100),
  status: text("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const addressesTable = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const ordersTable = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull(),
  userId: uuid("user_id").notNull(),
  orderType: text("order_type").notNull(),
  status: text("status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).notNull(),
  shippingCharge: numeric("shipping_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  shippingAddressId: uuid("shipping_address_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const orderItemsTable = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull(),
  gstAmount: numeric("gst_amount", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  hsnCode: text("hsn_code").notNull(),
});

const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  referenceNumber: text("reference_number"),
  paymentLinkUrl: text("payment_link_url"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  markedById: uuid("marked_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

type User = typeof usersTable.$inferSelect;
type Product = typeof productsTable.$inferSelect;

// ─── LAZY DB CONNECTION (created once, reused across invocations) ─────────────
let _db: NodePgDatabase<any> | null = null;
function getDb() {
  if (_db) return _db;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  _db = drizzle(pool);
  return _db;
}

// ─── JWT ──────────────────────────────────────────────────────────────────────
const JWT_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is required");
  return s;
};
function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET(), { expiresIn: "30d" });
}
function verifyToken(token: string): { userId: string } | null {
  try { return jwt.verify(token, JWT_SECRET()) as { userId: string }; }
  catch { return null; }
}

declare global { namespace Express { interface Request { user?: User } } }

async function loadUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return next();
    const payload = verifyToken(token);
    if (!payload) return next();
    const db = getDb();
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (u) req.user = u;
  } catch (_) {}
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
function profileUser(u: User) {
  return { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role, b2bStatus: u.b2bStatus, customerType: u.customerType, businessName: u.businessName, gstNumber: u.gstNumber, businessAddress: u.businessAddress, ordersCount: u.ordersCount };
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function b2cDiscount(n: number) {
  if (n === 0) return { percent: 15, label: "First order — 15% off" };
  if (n === 1) return { percent: 10, label: "Returning customer — 10% off" };
  return { percent: 5, label: "Loyalty — 5% off" };
}
function computeQuote(items: {productId:string;quantity:number}[], products: Product[], orderType: "b2c"|"b2b", user?: User) {
  const map = new Map(products.map(p => [p.id, p]));
  const lines: any[] = [];
  for (const it of items) {
    const p = map.get(it.productId); if (!p) continue;
    const unitPrice = Number(orderType === "b2b" ? p.b2bPrice : p.b2cPrice);
    const qty = Math.max(1, Math.floor(it.quantity));
    const lineSubtotal = +(unitPrice * qty).toFixed(2);
    const gstPercent = Number(p.gstPercent);
    const lineGst = +(lineSubtotal * gstPercent / 100).toFixed(2);
    lines.push({ productId: p.id, name: p.name, slug: p.slug, category: p.category, quantity: qty, unitPrice, gstPercent, lineSubtotal, lineGst, lineTotal: +(lineSubtotal + lineGst).toFixed(2), moq: p.moq, meetsMoq: orderType === "b2b" ? qty >= p.moq : true });
  }
  const subtotal = +lines.reduce((s,l) => s + l.lineSubtotal, 0).toFixed(2);
  let discountPercent = 0, discountLabel = "No discount";
  if (orderType === "b2c" && user?.role === "b2c_customer") {
    const d = b2cDiscount(user.ordersCount); discountPercent = d.percent; discountLabel = d.label;
  }
  const discountAmount = +(subtotal * discountPercent / 100).toFixed(2);
  const afterDiscount = +(subtotal - discountAmount).toFixed(2);
  const gstAmount = orderType === "b2b"
    ? +lines.reduce((s,l) => s + l.lineGst, 0).toFixed(2)
    : +lines.reduce((s,l) => { const r = subtotal > 0 ? l.lineSubtotal/subtotal : 0; return s + afterDiscount*r*l.gstPercent/100; }, 0).toFixed(2);
  const shippingCharge = orderType === "b2c" ? (afterDiscount >= 999 ? 0 : 60) : 0;
  const total = +(afterDiscount + gstAmount + shippingCharge).toFixed(2);
  const moqViolations = orderType === "b2b" ? lines.filter(l => !l.meetsMoq).map(l => `${l.name} requires min ${l.moq} units (you have ${l.quantity}).`) : [];
  return { orderType, lines, subtotal, discountAmount, discountPercent, discountLabel, gstAmount, shippingCharge, total, meetsMinimumOrder: orderType === "b2b" ? subtotal >= 3000 : true, minimumOrderValue: orderType === "b2b" ? 3000 : 0, moqViolations };
}

// ─── ORDER HELPERS ────────────────────────────────────────────────────────────
async function generateOrderNumber(type: "b2c"|"b2b") {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = `SV-${type.toUpperCase()}-${year}-`;
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(and(like(ordersTable.orderNumber, `${prefix}%`)));
  return `${prefix}${String((row?.count ?? 0) + 1).padStart(4, "0")}`;
}
async function generateInvoiceNumber() {
  const db = getDb();
  const year = new Date().getFullYear();
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(invoicesTable);
  return `INV-${year}-${String((row?.count ?? 0) + 1).padStart(5, "0")}`;
}
async function serializeOrder(orderId: string) {
  const db = getDb();
  const [o] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!o) return null;
  const items = await db.select({ id: orderItemsTable.id, productId: orderItemsTable.productId, quantity: orderItemsTable.quantity, unitPrice: orderItemsTable.unitPrice, gstPercent: orderItemsTable.gstPercent, gstAmount: orderItemsTable.gstAmount, lineTotal: orderItemsTable.lineTotal, hsnCode: orderItemsTable.hsnCode, name: productsTable.name, slug: productsTable.slug, category: productsTable.category, weightGrams: productsTable.weightGrams, imageUrl: productsTable.imageUrl }).from(orderItemsTable).innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id)).where(eq(orderItemsTable.orderId, orderId));
  const [pay] = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, orderId)).limit(1);
  const [addr] = o.shippingAddressId ? await db.select().from(addressesTable).where(eq(addressesTable.id, o.shippingAddressId)).limit(1) : [undefined];
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, orderId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, o.userId)).limit(1);
  return {
    id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status,
    subtotal: Number(o.subtotal), discountAmount: Number(o.discountAmount), discountPercent: Number(o.discountPercent),
    gstAmount: Number(o.gstAmount), shippingCharge: Number(o.shippingCharge), totalAmount: Number(o.totalAmount),
    invoiceNumber: inv?.invoiceNumber ?? null, notes: o.notes, createdAt: o.createdAt.toISOString(),
    user: user ? { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, businessName: user.businessName, gstNumber: user.gstNumber } : null,
    items: items.map(i => ({ id: i.id, productId: i.productId, name: i.name, slug: i.slug, category: i.category, weightGrams: i.weightGrams, imageUrl: i.imageUrl, quantity: i.quantity, unitPrice: Number(i.unitPrice), gstPercent: Number(i.gstPercent), gstAmount: Number(i.gstAmount), lineTotal: Number(i.lineTotal), hsnCode: i.hsnCode })),
    shippingAddress: addr ? { id: addr.id, fullName: addr.fullName, phone: addr.phone, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode } : null,
    payment: pay ? { id: pay.id, paymentMethod: pay.paymentMethod, paymentStatus: pay.paymentStatus, amount: Number(pay.amount), referenceNumber: pay.referenceNumber, paymentLinkUrl: pay.paymentLinkUrl, paidAt: pay.paidAt?.toISOString() ?? null } : null,
  };
}
function serializeProduct(p: typeof productsTable.$inferSelect) {
  return { id: p.id, name: p.name, slug: p.slug, category: p.category, variant: p.variant, b2cPrice: Number(p.b2cPrice), b2bPrice: Number(p.b2bPrice), moq: p.moq, cartonQty: p.cartonQty, gstPercent: Number(p.gstPercent), hsnCode: p.hsnCode, shelfLifeMonths: p.shelfLifeMonths, weightGrams: p.weightGrams, description: p.description, stockQty: p.stockQty, status: p.status, sortOrder: p.sortOrder, imageUrl: p.imageUrl };
}
async function ensureAddress(userId: string, s: {fullName:string;phone:string;line1:string;line2?:string|null;city:string;state:string;pincode:string}) {
  const db = getDb();
  const [addr] = await db.insert(addressesTable).values({ userId, fullName: s.fullName, phone: s.phone, line1: s.line1, line2: s.line2 ?? null, city: s.city, state: s.state, pincode: s.pincode }).returning();
  return addr;
}

// ─── ZOD SCHEMAS ─────────────────────────────────────────────────────────────
const RegisterBody = z.object({ email: z.string(), password: z.string().min(6), fullName: z.string(), phone: z.string().nullish(), accountType: z.enum(["b2c","b2b"]), businessName: z.string().nullish(), businessType: z.string().nullish(), gstNumber: z.string().nullish(), businessAddress: z.string().nullish() });
const LoginBody = z.object({ email: z.string(), password: z.string() });
const QuoteBody = z.object({ orderType: z.enum(["b2c","b2b"]), items: z.array(z.object({ productId: z.string(), quantity: z.number() })) });
const ShippingSchema = z.object({ fullName: z.string(), phone: z.string(), line1: z.string(), line2: z.string().nullish(), city: z.string(), state: z.string(), pincode: z.string() });
const B2cOrderBody = z.object({ items: z.array(z.object({ productId: z.string(), quantity: z.number() })), shippingAddress: ShippingSchema, paymentMethod: z.enum(["upi","bank_transfer","payment_link"]), paymentReference: z.string().nullish(), notes: z.string().nullish() });
const B2bOrderBody = z.object({ items: z.array(z.object({ productId: z.string(), quantity: z.number() })), shippingAddress: ShippingSchema, paymentMethod: z.enum(["upi","bank_transfer","payment_link"]), notes: z.string().nullish() });

// ─── EXPRESS APP ──────────────────────────────────────────────────────────────
const app: Express = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loadUser);

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", db: !!process.env.DATABASE_URL, jwt: !!process.env.JWT_SECRET });
});

// AUTH
router.post("/auth/register", async (req, res) => {
  try {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid registration data", code: "VALIDATION_ERROR", errors: parsed.error.flatten() });
    const b = parsed.data;
    const db = getDb();
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, b.email.toLowerCase())).limit(1);
    if (existing.length) return res.status(400).json({ message: "An account with that email already exists", code: "EMAIL_TAKEN" });
    const passwordHash = await bcrypt.hash(b.password, 10);
    const isB2b = b.accountType === "b2b";
    const [user] = await db.insert(usersTable).values({ email: b.email.toLowerCase(), passwordHash, fullName: b.fullName, phone: b.phone ?? null, role: isB2b ? "b2b_customer" : "b2c_customer", customerType: isB2b ? (b.businessType ?? "kirana") : "retail", businessName: b.businessName ?? null, gstNumber: b.gstNumber ?? null, businessAddress: b.businessAddress ?? null, b2bStatus: isB2b ? "pending" : null }).returning();
    res.status(201).json({ token: signToken(user.id), user: profileUser(user) });
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.post("/auth/login", async (req, res) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid login data", code: "VALIDATION_ERROR" });
    const { email, password } = parsed.data;
    const db = getDb();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
    res.json({ token: signToken(user.id), user: profileUser(user) });
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.post("/auth/logout", (_req, res) => res.json({ ok: true }));
router.get("/auth/me", requireAuth, (req, res) => res.json(profileUser(req.user!)));

// PRODUCTS
router.get("/products", async (req, res) => {
  try {
    const db = getDb();
    const cat = req.query.category as string | undefined;
    const conds: any[] = [eq(productsTable.status, "active")];
    if (cat) conds.push(eq(productsTable.category, cat));
    const rows = await db.select().from(productsTable).where(and(...conds)).orderBy(asc(productsTable.sortOrder));
    res.json(rows.map(serializeProduct));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/products/:slug", async (req, res) => {
  try {
    const db = getDb();
    const [p] = await db.select().from(productsTable).where(eq(productsTable.slug, req.params.slug)).limit(1);
    if (!p) return res.status(404).json({ message: "Product not found", code: "NOT_FOUND" });
    const related = await db.select().from(productsTable).where(and(eq(productsTable.category, p.category), eq(productsTable.status, "active"))).orderBy(asc(productsTable.sortOrder)).limit(4);
    res.json({ product: serializeProduct(p), related: related.filter(r => r.id !== p.id).slice(0,3).map(serializeProduct) });
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

// CART QUOTE
router.post("/cart/quote", async (req, res) => {
  try {
    const parsed = QuoteBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid quote request", code: "VALIDATION_ERROR" });
    const { items, orderType } = parsed.data;
    if (!items.length) return res.json({ orderType, lines: [], subtotal: 0, discountAmount: 0, discountPercent: 0, discountLabel: "No items", gstAmount: 0, shippingCharge: 0, total: 0, meetsMinimumOrder: orderType === "b2c", minimumOrderValue: orderType === "b2b" ? 3000 : 0, moqViolations: [] });
    const db = getDb();
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, items.map(i => i.productId)));
    res.json(computeQuote(items, products, orderType, req.user));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

// B2C ORDER
router.post("/orders/b2c", requireAuth, async (req, res) => {
  try {
    const parsed = B2cOrderBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid order data", code: "VALIDATION_ERROR" });
    const b = parsed.data;
    const db = getDb();
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, b.items.map(i => i.productId)));
    const quote = computeQuote(b.items, products, "b2c", req.user);
    if (!quote.lines.length) return res.status(400).json({ message: "No valid items", code: "EMPTY_ORDER" });
    const addr = await ensureAddress(req.user!.id, b.shippingAddress);
    const orderNumber = await generateOrderNumber("b2c");
    const [order] = await db.insert(ordersTable).values({ orderNumber, userId: req.user!.id, orderType: "b2c", status: "pending", subtotal: String(quote.subtotal), discountAmount: String(quote.discountAmount), discountPercent: String(quote.discountPercent), gstAmount: String(quote.gstAmount), shippingCharge: String(quote.shippingCharge), totalAmount: String(quote.total), shippingAddressId: addr.id, notes: b.notes ?? null }).returning();
    await db.insert(orderItemsTable).values(quote.lines.map(l => ({ orderId: order.id, productId: l.productId, quantity: l.quantity, unitPrice: String(l.unitPrice), gstPercent: String(l.gstPercent), gstAmount: String(l.lineGst), lineTotal: String(l.lineTotal), hsnCode: products.find(p => p.id === l.productId)?.hsnCode ?? "21069099" })));
    await db.insert(paymentsTable).values({ orderId: order.id, paymentMethod: b.paymentMethod, paymentStatus: "pending", amount: String(quote.total), referenceNumber: b.paymentReference ?? null });
    await db.update(usersTable).set({ ordersCount: sql`${usersTable.ordersCount} + 1` }).where(eq(usersTable.id, req.user!.id));
    res.status(201).json(await serializeOrder(order.id));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

// B2B ORDER
router.post("/orders/b2b", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== "b2b_customer" || req.user!.b2bStatus !== "approved") return res.status(403).json({ message: "Approved B2B account required", code: "FORBIDDEN" });
    const parsed = B2bOrderBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid order data", code: "VALIDATION_ERROR" });
    const b = parsed.data;
    const db = getDb();
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, b.items.map(i => i.productId)));
    const quote = computeQuote(b.items, products, "b2b", req.user);
    if (!quote.lines.length) return res.status(400).json({ message: "No valid items", code: "EMPTY_ORDER" });
    if (!quote.meetsMinimumOrder) return res.status(400).json({ message: `Minimum B2B order is ₹${quote.minimumOrderValue}`, code: "BELOW_MIN_ORDER" });
    if (quote.moqViolations.length) return res.status(400).json({ message: quote.moqViolations.join(" "), code: "MOQ_VIOLATION" });
    const addr = await ensureAddress(req.user!.id, b.shippingAddress);
    const orderNumber = await generateOrderNumber("b2b");
    const [order] = await db.insert(ordersTable).values({ orderNumber, userId: req.user!.id, orderType: "b2b", status: "pending", subtotal: String(quote.subtotal), discountAmount: String(quote.discountAmount), discountPercent: String(quote.discountPercent), gstAmount: String(quote.gstAmount), shippingCharge: String(quote.shippingCharge), totalAmount: String(quote.total), shippingAddressId: addr.id, notes: b.notes ?? null }).returning();
    await db.insert(orderItemsTable).values(quote.lines.map(l => ({ orderId: order.id, productId: l.productId, quantity: l.quantity, unitPrice: String(l.unitPrice), gstPercent: String(l.gstPercent), gstAmount: String(l.lineGst), lineTotal: String(l.lineTotal), hsnCode: products.find(p => p.id === l.productId)?.hsnCode ?? "21069099" })));
    await db.insert(paymentsTable).values({ orderId: order.id, paymentMethod: b.paymentMethod, paymentStatus: "pending", amount: String(quote.total) });
    await db.update(usersTable).set({ ordersCount: sql`${usersTable.ordersCount} + 1` }).where(eq(usersTable.id, req.user!.id));
    res.status(201).json(await serializeOrder(order.id));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const out = await serializeOrder(req.params.id);
    if (!out) return res.status(404).json({ message: "Order not found", code: "NOT_FOUND" });
    if (req.user!.role !== "super_admin" && out.user?.id !== req.user!.id) return res.status(403).json({ message: "Not your order", code: "FORBIDDEN" });
    res.json(out);
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/account/orders", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.select().from(ordersTable).where(eq(ordersTable.userId, req.user!.id)).orderBy(desc(ordersTable.createdAt));
    res.json(rows.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/orders/:orderId/invoice", requireAuth, async (req, res) => {
  try {
    const order = await serializeOrder(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found", code: "NOT_FOUND" });
    if (req.user!.role !== "super_admin" && order.user?.id !== req.user!.id) return res.status(403).json({ message: "Not your order", code: "FORBIDDEN" });
    if (!order.payment || order.payment.paymentStatus !== "received") return res.status(400).json({ message: "Invoice available only after payment confirmed", code: "PAYMENT_PENDING" });
    const db = getDb();
    let [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, order.id)).limit(1);
    if (!inv) { const invoiceNumber = await generateInvoiceNumber(); [inv] = await db.insert(invoicesTable).values({ orderId: order.id, invoiceNumber }).returning(); }
    res.json({ invoiceNumber: inv.invoiceNumber, issuedAt: inv.createdAt.toISOString(), seller: { name: "Narayani Distributors", brand: "SnackVeda", address: "Indore, Madhya Pradesh, India", gstNumber: "23AAAAA0000A1Z5", phone: "+91 90000 00000", email: "hello@snackveda.com" }, order });
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

// ACCOUNT
router.get("/account/me", requireAuth, (req, res) => res.json(profileUser(req.user!)));
router.patch("/account/me", requireAuth, async (req, res) => {
  try {
    const schema = z.object({ fullName: z.string(), phone: z.string().nullish(), businessName: z.string().nullish(), gstNumber: z.string().nullish(), businessAddress: z.string().nullish() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid profile data", code: "VALIDATION_ERROR" });
    const b = parsed.data;
    const db = getDb();
    const [updated] = await db.update(usersTable).set({ ...(b.fullName && { fullName: b.fullName }), ...(b.phone !== undefined && { phone: b.phone }), ...(b.businessName !== undefined && { businessName: b.businessName }), ...(b.gstNumber !== undefined && { gstNumber: b.gstNumber }), ...(b.businessAddress !== undefined && { businessAddress: b.businessAddress }) }).where(eq(usersTable.id, req.user!.id)).returning();
    res.json(profileUser(updated));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});
router.get("/account/addresses", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.select().from(addressesTable).where(eq(addressesTable.userId, req.user!.id)).orderBy(desc(addressesTable.createdAt));
    res.json(rows.map(a => ({ id: a.id, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault })));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

// ADMIN
router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  try {
    const db = getDb();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const [tc] = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable).where(gte(ordersTable.createdAt, todayStart));
    const [pp] = await db.select({ c: sql<number>`count(*)::int` }).from(paymentsTable).where(eq(paymentsTable.paymentStatus, "pending"));
    const [mr] = await db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)::float` }).from(ordersTable).where(and(gte(ordersTable.createdAt, monthStart), eq(ordersTable.status, "confirmed")));
    const [ls] = await db.select({ c: sql<number>`count(*)::int` }).from(productsTable).where(sql`stock_qty < 20`);
    const recent = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(10);
    res.json({ todayOrders: tc.c, pendingPayments: pp.c, monthRevenue: mr.total, lowStockItems: ls.c, recentOrders: recent.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })) });
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/admin/products", requireAdmin, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db.select().from(productsTable).orderBy(asc(productsTable.sortOrder));
    res.json(rows.map(serializeProduct));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ name: z.string(), slug: z.string(), category: z.string(), variant: z.string().nullish(), b2cPrice: z.number(), b2bPrice: z.number(), moq: z.number().default(1), cartonQty: z.number().default(1), gstPercent: z.number().default(5), hsnCode: z.string().default("21069099"), shelfLifeMonths: z.number().default(6), weightGrams: z.number().default(60), description: z.string().nullish(), stockQty: z.number().default(100), status: z.string().default("active"), sortOrder: z.number().default(0), imageUrl: z.string().nullish() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid product data", code: "VALIDATION_ERROR" });
    const p = parsed.data;
    const db = getDb();
    const [row] = await db.insert(productsTable).values({ ...p, b2cPrice: String(p.b2cPrice), b2bPrice: String(p.b2bPrice), gstPercent: String(p.gstPercent) }).returning();
    res.status(201).json(serializeProduct(row));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.patch("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({ name: z.string().optional(), variant: z.string().nullish(), b2cPrice: z.number().optional(), b2bPrice: z.number().optional(), moq: z.number().optional(), cartonQty: z.number().optional(), gstPercent: z.number().optional(), hsnCode: z.string().optional(), shelfLifeMonths: z.number().optional(), weightGrams: z.number().optional(), description: z.string().nullish(), stockQty: z.number().optional(), status: z.string().optional(), sortOrder: z.number().optional(), imageUrl: z.string().nullish() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", code: "VALIDATION_ERROR" });
    const update: any = { ...parsed.data };
    if (update.b2cPrice !== undefined) update.b2cPrice = String(update.b2cPrice);
    if (update.b2bPrice !== undefined) update.b2bPrice = String(update.b2bPrice);
    if (update.gstPercent !== undefined) update.gstPercent = String(update.gstPercent);
    const db = getDb();
    const [row] = await db.update(productsTable).set(update).where(eq(productsTable.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ message: "Product not found", code: "NOT_FOUND" });
    res.json(serializeProduct(row));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/admin/customers", requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const role = req.query.role as string | undefined;
    const rows = await db.select().from(usersTable).where(role ? eq(usersTable.role, role) : undefined).orderBy(desc(usersTable.createdAt));
    res.json(rows.map(profileUser));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.patch("/admin/customers/:id/status", requireAdmin, async (req, res) => {
  try {
    const parsed = z.object({ b2bStatus: z.enum(["pending","approved","rejected"]) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid status", code: "VALIDATION_ERROR" });
    const db = getDb();
    const [updated] = await db.update(usersTable).set({ b2bStatus: parsed.data.b2bStatus }).where(eq(usersTable.id, req.params.id)).returning();
    res.json(profileUser(updated));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/admin/orders", requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const ot = req.query.orderType as string | undefined;
    const rows = await db.select().from(ordersTable).where(ot ? eq(ordersTable.orderType, ot) : undefined).orderBy(desc(ordersTable.createdAt));
    res.json(rows.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.patch("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const parsed = z.object({ status: z.enum(["pending","confirmed","dispatched","delivered","cancelled"]) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid status", code: "VALIDATION_ERROR" });
    const db = getDb();
    const [updated] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, req.params.id)).returning();
    res.json({ id: updated.id, status: updated.status });
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.get("/admin/payments", requireAdmin, async (_req, res) => {
  try {
    const db = getDb();
    const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
    res.json(rows.map(p => ({ id: p.id, orderId: p.orderId, paymentMethod: p.paymentMethod, paymentStatus: p.paymentStatus, amount: Number(p.amount), referenceNumber: p.referenceNumber, paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString() })));
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

router.patch("/admin/payments/:id/confirm", requireAdmin, async (req, res) => {
  try {
    const parsed = z.object({ referenceNumber: z.string().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", code: "VALIDATION_ERROR" });
    const db = getDb();
    const [payment] = await db.update(paymentsTable).set({ paymentStatus: "received", paidAt: new Date(), markedById: req.user!.id, ...(parsed.data.referenceNumber && { referenceNumber: parsed.data.referenceNumber }) }).where(eq(paymentsTable.id, req.params.id)).returning();
    if (!payment) return res.status(404).json({ message: "Payment not found", code: "NOT_FOUND" });
    await db.update(ordersTable).set({ status: "confirmed" }).where(eq(ordersTable.id, payment.orderId));
    const invoiceNumber = await generateInvoiceNumber();
    await db.insert(invoicesTable).values({ orderId: payment.orderId, invoiceNumber }).onConflictDoNothing();
    res.json({ ok: true, paymentId: payment.id, orderId: payment.orderId, invoiceNumber });
  } catch (e: any) { res.status(500).json({ message: e.message, code: "INTERNAL_ERROR" }); }
});

// ─── MOUNT & EXPORT ───────────────────────────────────────────────────────────
app.use("/api", router);
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error", code: "INTERNAL_ERROR" });
});

export const handler = serverless(app);
