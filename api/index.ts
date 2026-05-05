// @ts-nocheck
// SnackVeda API — Vercel Serverless Function

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
// Runtime: Node.js 20

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, uuid, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { eq, inArray, and, asc, desc, gte, like, sql } from "drizzle-orm";

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
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

const productImagesTable = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull(),
  url: text("url").notNull(),
  altText: text("alt_text"),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

type User = typeof usersTable.$inferSelect;
type Product = typeof productsTable.$inferSelect;

// ─── DB ───────────────────────────────────────────────────────────────────────
let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (_db) return _db;
  // Replace port 6543 (transaction pooler) with 5432 (direct/session pooler)
  // Direct connections work more reliably with postgres.js
  const url = (process.env.DATABASE_URL || "").replace(":6543/", ":5432/");
  const client = postgres(url, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
    onnotice: () => {},
  });
  _db = drizzle(client);
  return _db;
}

// ─── JWT ──────────────────────────────────────────────────────────────────────
function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "30d" });
}
function verifyToken(token: string): { userId: string } | null {
  try { return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }; }
  catch { return null; }
}
async function getUser(authHeader?: string): Promise<User | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return null;
  const [u] = await getDb().select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  return u ?? null;
}

// ─── RESPONSE HELPERS ─────────────────────────────────────────────────────────
const ok = (body: any, status = 200) => ({ statusCode: status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS" }, body: JSON.stringify(body) });
const err = (msg: string, code: string, status: number) => ok({ message: msg, code }, status);

function profileUser(u: User) {
  return { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role, b2bStatus: u.b2bStatus, customerType: u.customerType, businessName: u.businessName, gstNumber: u.gstNumber, businessAddress: u.businessAddress, ordersCount: u.ordersCount, createdAt: u.createdAt.toISOString() };
}
async function getProductImages(productId: string) {
  try {
    const db = getDb();
    const images = await db.select().from(productImagesTable).where(eq(productImagesTable.productId, productId)).orderBy(asc(productImagesTable.sortOrder));
    return images.map(i => ({ id: i.id, url: i.url, altText: i.altText, isPrimary: i.isPrimary, sortOrder: i.sortOrder }));
  } catch {
    return [];
  }
}
function serializeProduct(p: typeof productsTable.$inferSelect, images?: any[]) {
  return { id: p.id, name: p.name, slug: p.slug, category: p.category, variant: p.variant, b2cPrice: Number(p.b2cPrice), b2bPrice: Number(p.b2bPrice), moq: p.moq, cartonQty: p.cartonQty, gstPercent: Number(p.gstPercent), hsnCode: p.hsnCode, shelfLifeMonths: p.shelfLifeMonths, weightGrams: p.weightGrams, description: p.description, stockQty: p.stockQty, status: p.status, sortOrder: p.sortOrder, imageUrl: p.imageUrl, images: images ?? [] };
}

// ─── PRICING ──────────────────────────────────────────────────────────────────
function computeQuote(items: {productId:string;quantity:number}[], products: Product[], orderType: "b2c"|"b2b", user?: User|null) {
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

async function generateOrderNumber(type: "b2c"|"b2b") {
  const year = new Date().getFullYear();
  const prefix = `SV-${type.toUpperCase()}-${year}-`;
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(and(like(ordersTable.orderNumber, `${prefix}%`)));
  return `${prefix}${String((row?.count ?? 0) + 1).padStart(4, "0")}`;
}
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(invoicesTable);
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
  return { id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, subtotal: Number(o.subtotal), discountAmount: Number(o.discountAmount), discountPercent: Number(o.discountPercent), gstAmount: Number(o.gstAmount), shippingCharge: Number(o.shippingCharge), totalAmount: Number(o.totalAmount), invoiceNumber: inv?.invoiceNumber ?? null, notes: o.notes, createdAt: o.createdAt.toISOString(), user: user ? { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, businessName: user.businessName, gstNumber: user.gstNumber } : null, items: items.map(i => ({ id: i.id, productId: i.productId, name: i.name, slug: i.slug, category: i.category, weightGrams: i.weightGrams, imageUrl: i.imageUrl, quantity: i.quantity, unitPrice: Number(i.unitPrice), gstPercent: Number(i.gstPercent), gstAmount: Number(i.gstAmount), lineTotal: Number(i.lineTotal), hsnCode: i.hsnCode })), shippingAddress: addr ? { id: addr.id, fullName: addr.fullName, phone: addr.phone, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode } : null, payment: pay ? { id: pay.id, paymentMethod: pay.paymentMethod, paymentStatus: pay.paymentStatus, amount: Number(pay.amount), referenceNumber: pay.referenceNumber, paymentLinkUrl: pay.paymentLinkUrl, paidAt: pay.paidAt?.toISOString() ?? null } : null };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
// ─── VERCEL HANDLER ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };

  const send = (body, status = 200) => {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader("Content-Type", "application/json");
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  const ok = (body, status = 200) => send(body, status);
  const err = (msg, code, status) => send({ message: msg, code }, status);

  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = 204;
    res.end();
    return;
  }

  const rawPath = req.url || "/";
  const [pathPart, queryPart] = rawPath.split("?");
  const path = pathPart.replace(/^\/api/, "") || "/";
  const method = req.method;
  const params = Object.fromEntries(new URLSearchParams(queryPart || ""));

  let parsedBody = null;
  try {
    if (method !== "GET" && method !== "HEAD" && req.body) {
      parsedBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }
  } catch {}

  const authHeader = req.headers?.authorization || req.headers?.Authorization;

  try {
    // ── HEALTH ──────────────────────────────────────────────────────────────
    if (path === "/health" && method === "GET") {
      try {
        const db = getDb();
        const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
        return ok({ status: "ok", db: !!process.env.DATABASE_URL, jwt: !!process.env.JWT_SECRET, productCount: row?.count ?? 0 });
      } catch (e: any) {
        return ok({ status: "ok", db: !!process.env.DATABASE_URL, jwt: !!process.env.JWT_SECRET, dbError: e?.message, dbCause: e?.cause?.message ?? null, dbUrl: process.env.DATABASE_URL?.substring(0, 40) + "..." });
      }
    }

    // ── AUTH ─────────────────────────────────────────────────────────────────
    if (path === "/auth/register" && method === "POST") {
      const b = RegisterBody.safeParse(parsedBody);
      if (!b.success) return err("Invalid registration data", "VALIDATION_ERROR", 400);
      const d = b.data;
      const db = getDb();
      const existing = await db.select().from(usersTable).where(eq(usersTable.email, d.email.toLowerCase())).limit(1);
      if (existing.length) return err("Email already exists", "EMAIL_TAKEN", 400);
      const hash = await bcrypt.hash(d.password, 10);
      const isB2b = d.accountType === "b2b";
      const [user] = await db.insert(usersTable).values({ email: d.email.toLowerCase(), passwordHash: hash, fullName: d.fullName, phone: d.phone ?? null, role: isB2b ? "b2b_customer" : "b2c_customer", customerType: isB2b ? (d.businessType ?? "kirana") : "retail", businessName: d.businessName ?? null, gstNumber: d.gstNumber ?? null, businessAddress: d.businessAddress ?? null, b2bStatus: isB2b ? "approved" : null }).returning();
      return ok({ token: signToken(user.id), user: profileUser(user) }, 201);
    }

    if (path === "/auth/login" && method === "POST") {
      const b = LoginBody.safeParse(parsedBody);
      if (!b.success) return err("Invalid login data", "VALIDATION_ERROR", 400);
      const db = getDb();
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, b.data.email.toLowerCase())).limit(1);
      if (!user || !user.isActive) return err("Invalid email or password", "INVALID_CREDENTIALS", 401);
      if (!await bcrypt.compare(b.data.password, user.passwordHash)) return err("Invalid email or password", "INVALID_CREDENTIALS", 401);
      return ok({ token: signToken(user.id), user: profileUser(user) });
    }

    if (path === "/auth/logout" && method === "POST") return ok({ ok: true });

    if (path === "/auth/me" && method === "GET") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      return ok(profileUser(user));
    }

    // ── PRODUCTS ─────────────────────────────────────────────────────────────
    if (path === "/products" && method === "GET") {
      const db = getDb();
      const rows = params.category
        ? await db.select().from(productsTable).where(and(eq(productsTable.status, "active"), eq(productsTable.category, params.category))).orderBy(asc(productsTable.sortOrder))
        : await db.select().from(productsTable).where(eq(productsTable.status, "active")).orderBy(asc(productsTable.sortOrder));
      let allImages: any[] = [];
      try {
        if (rows.length > 0) {
          allImages = await db.select().from(productImagesTable).where(inArray(productImagesTable.productId, rows.map(r => r.id))).orderBy(asc(productImagesTable.sortOrder));
        }
      } catch { allImages = []; }
      return ok(rows.map(p => {
        const images = allImages.filter(i => i.productId === p.id).map(i => ({ id: i.id, url: i.url, altText: i.altText, isPrimary: i.isPrimary, sortOrder: i.sortOrder }));
        return serializeProduct(p, images);
      }));
    }

    const productSlugMatch = path.match(/^\/products\/([^/]+)$/);
    if (productSlugMatch && method === "GET") {
      const db = getDb();
      const [p] = await db.select().from(productsTable).where(eq(productsTable.slug, productSlugMatch[1])).limit(1);
      if (!p) return err("Product not found", "NOT_FOUND", 404);
      const related = await db.select().from(productsTable).where(and(eq(productsTable.category, p.category), eq(productsTable.status, "active"))).orderBy(asc(productsTable.sortOrder)).limit(4);
      const images = await getProductImages(p.id);
      const relatedWithImages = await Promise.all(related.filter(r => r.id !== p.id).slice(0,3).map(async r => serializeProduct(r, await getProductImages(r.id))));
      return ok({ product: serializeProduct(p, images), related: relatedWithImages });
    }

    // ── CART QUOTE ───────────────────────────────────────────────────────────
    if (path === "/cart/quote" && method === "POST") {
      const b = QuoteBody.safeParse(parsedBody);
      if (!b.success) return err("Invalid quote request", "VALIDATION_ERROR", 400);
      const { items, orderType } = b.data;
      const user = await getUser(authHeader);
      if (!items.length) return ok({ orderType, lines: [], subtotal: 0, discountAmount: 0, discountPercent: 0, discountLabel: "No items", gstAmount: 0, shippingCharge: 0, total: 0, meetsMinimumOrder: orderType === "b2c", minimumOrderValue: orderType === "b2b" ? 5000 : 0, moqViolations: [] });
      const db = getDb();
      const products = await db.select().from(productsTable).where(inArray(productsTable.id, items.map(i => i.productId)));
      return ok(computeQuote(items, products, orderType, user));
    }

    // ── ORDERS ───────────────────────────────────────────────────────────────
    if (path === "/orders/b2c" && method === "POST") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      const b = B2cOrderBody.safeParse(parsedBody);
      if (!b.success) return err("Invalid order data", "VALIDATION_ERROR", 400);
      const d = b.data;
      const db = getDb();
      const products = await db.select().from(productsTable).where(inArray(productsTable.id, d.items.map(i => i.productId)));
      const quote = computeQuote(d.items, products, "b2c", user);
      if (!quote.lines.length) return err("No valid items", "EMPTY_ORDER", 400);
      const [addr] = await db.insert(addressesTable).values({ userId: user.id, fullName: d.shippingAddress.fullName, phone: d.shippingAddress.phone, line1: d.shippingAddress.line1, line2: d.shippingAddress.line2 ?? null, city: d.shippingAddress.city, state: d.shippingAddress.state, pincode: d.shippingAddress.pincode }).returning();
      const orderNumber = await generateOrderNumber("b2c");
      const [order] = await db.insert(ordersTable).values({ orderNumber, userId: user.id, orderType: "b2c", status: "pending", subtotal: String(quote.subtotal), discountAmount: String(quote.discountAmount), discountPercent: String(quote.discountPercent), gstAmount: String(quote.gstAmount), shippingCharge: String(quote.shippingCharge), totalAmount: String(quote.total), shippingAddressId: addr.id, notes: d.notes ?? null }).returning();
      await db.insert(orderItemsTable).values(quote.lines.map(l => ({ orderId: order.id, productId: l.productId, quantity: l.quantity, unitPrice: String(l.unitPrice), gstPercent: String(l.gstPercent), gstAmount: String(l.lineGst), lineTotal: String(l.lineTotal), hsnCode: products.find(p => p.id === l.productId)?.hsnCode ?? "21069099" })));
      await db.insert(paymentsTable).values({ orderId: order.id, paymentMethod: d.paymentMethod, paymentStatus: "pending", amount: String(quote.total), referenceNumber: d.paymentReference ?? null });
      await db.update(usersTable).set({ ordersCount: sql`${usersTable.ordersCount} + 1` }).where(eq(usersTable.id, user.id));
      return ok(await serializeOrder(order.id), 201);
    }

    if (path === "/orders/b2b" && method === "POST") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      if (user.role !== "b2b_customer") return err("Wholesale account required", "FORBIDDEN", 403);
      const b = B2bOrderBody.safeParse(parsedBody);
      if (!b.success) return err("Invalid order data", "VALIDATION_ERROR", 400);
      const d = b.data;
      const db = getDb();
      const products = await db.select().from(productsTable).where(inArray(productsTable.id, d.items.map(i => i.productId)));
      const quote = computeQuote(d.items, products, "b2b", user);
      if (!quote.lines.length) return err("No valid items", "EMPTY_ORDER", 400);
      if (!quote.meetsMinimumOrder) return err(`Minimum B2B order is ₹${quote.minimumOrderValue}`, "BELOW_MIN_ORDER", 400);
      if (quote.moqViolations.length) return err(quote.moqViolations.join(" "), "MOQ_VIOLATION", 400);
      const [addr] = await db.insert(addressesTable).values({ userId: user.id, fullName: d.shippingAddress.fullName, phone: d.shippingAddress.phone, line1: d.shippingAddress.line1, line2: d.shippingAddress.line2 ?? null, city: d.shippingAddress.city, state: d.shippingAddress.state, pincode: d.shippingAddress.pincode }).returning();
      const orderNumber = await generateOrderNumber("b2b");
      const [order] = await db.insert(ordersTable).values({ orderNumber, userId: user.id, orderType: "b2b", status: "pending", subtotal: String(quote.subtotal), discountAmount: String(quote.discountAmount), discountPercent: String(quote.discountPercent), gstAmount: String(quote.gstAmount), shippingCharge: String(quote.shippingCharge), totalAmount: String(quote.total), shippingAddressId: addr.id, notes: d.notes ?? null }).returning();
      await db.insert(orderItemsTable).values(quote.lines.map(l => ({ orderId: order.id, productId: l.productId, quantity: l.quantity, unitPrice: String(l.unitPrice), gstPercent: String(l.gstPercent), gstAmount: String(l.lineGst), lineTotal: String(l.lineTotal), hsnCode: products.find(p => p.id === l.productId)?.hsnCode ?? "21069099" })));
      await db.insert(paymentsTable).values({ orderId: order.id, paymentMethod: d.paymentMethod, paymentStatus: "pending", amount: String(quote.total) });
      await db.update(usersTable).set({ ordersCount: sql`${usersTable.ordersCount} + 1` }).where(eq(usersTable.id, user.id));
      return ok(await serializeOrder(order.id), 201);
    }

    const orderIdMatch = path.match(/^\/orders\/([^/]+)$/);
    if (orderIdMatch && method === "GET") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      const out = await serializeOrder(orderIdMatch[1]);
      if (!out) return err("Order not found", "NOT_FOUND", 404);
      if (user.role !== "super_admin" && out.user?.id !== user.id) return err("Not your order", "FORBIDDEN", 403);
      return ok(out);
    }

    const invoiceMatch = path.match(/^\/orders\/([^/]+)\/invoice$/);
    if (invoiceMatch && method === "GET") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      const order = await serializeOrder(invoiceMatch[1]);
      if (!order) return err("Order not found", "NOT_FOUND", 404);
      if (user.role !== "super_admin" && order.user?.id !== user.id) return err("Not your order", "FORBIDDEN", 403);
      if (!order.payment || order.payment.paymentStatus !== "received") return err("Invoice available only after payment confirmed", "PAYMENT_PENDING", 400);
      const db = getDb();
      let [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, order.id)).limit(1);
      if (!inv) { const invoiceNumber = await generateInvoiceNumber(); [inv] = await db.insert(invoicesTable).values({ orderId: order.id, invoiceNumber }).returning(); }
      return ok({ invoiceNumber: inv.invoiceNumber, issuedAt: inv.createdAt.toISOString(), seller: { name: "Narayani Distributors", brand: "SnackVeda", address: "Indore, Madhya Pradesh, India", gstNumber: "23AAAAA0000A1Z5", phone: "+91 90000 00000", email: "hello@snackveda.com" }, order });
    }

    // ── ACCOUNT ──────────────────────────────────────────────────────────────
    if (path === "/account/me" && method === "GET") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      return ok(profileUser(user));
    }
    if (path === "/account/me" && method === "PATCH") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      const b = z.object({ fullName: z.string().optional(), phone: z.string().nullish(), businessName: z.string().nullish(), gstNumber: z.string().nullish(), businessAddress: z.string().nullish() }).safeParse(parsedBody);
      if (!b.success) return err("Invalid data", "VALIDATION_ERROR", 400);
      const update: any = {};
      if (b.data.fullName) update.fullName = b.data.fullName;
      if (b.data.phone !== undefined) update.phone = b.data.phone;
      if (b.data.businessName !== undefined) update.businessName = b.data.businessName;
      if (b.data.gstNumber !== undefined) update.gstNumber = b.data.gstNumber;
      if (b.data.businessAddress !== undefined) update.businessAddress = b.data.businessAddress;
      const [updated] = await getDb().update(usersTable).set(update).where(eq(usersTable.id, user.id)).returning();
      return ok(profileUser(updated));
    }
    if (path === "/account/orders" && method === "GET") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      const rows = await getDb().select().from(ordersTable).where(eq(ordersTable.userId, user.id)).orderBy(desc(ordersTable.createdAt));
      return ok(rows.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })));
    }
    if (path === "/account/addresses" && method === "GET") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      const rows = await getDb().select().from(addressesTable).where(eq(addressesTable.userId, user.id)).orderBy(desc(addressesTable.createdAt));
      return ok(rows.map(a => ({ id: a.id, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault })));
    }

    // ── ADMIN ────────────────────────────────────────────────────────────────
    if (path.startsWith("/admin/")) {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      if (user.role !== "super_admin") return err("Admin access required", "FORBIDDEN", 403);
      const db = getDb();

      if (path === "/admin/dashboard" && method === "GET") {
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
        const [tc] = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable).where(gte(ordersTable.createdAt, todayStart));
        const [pp] = await db.select({ c: sql<number>`count(*)::int` }).from(paymentsTable).where(eq(paymentsTable.paymentStatus, "pending"));
        const [mr] = await db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)::float` }).from(ordersTable).where(and(gte(ordersTable.createdAt, monthStart), eq(ordersTable.status, "confirmed")));
        const [ls] = await db.select({ c: sql<number>`count(*)::int` }).from(productsTable).where(sql`stock_qty < 20`);
        const recent = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(10);
        const [cu] = await db.select({ c: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "b2c_customer"));
        const catData = [{ name: "Chips", orders: 0 }, { name: "Makhana", orders: 0 }, { name: "Superpuffs", orders: 0 }];
        return ok({ thisMonthRevenue: mr.total, todayOrdersCount: tc.c, totalCustomers: cu.c, lowStockCount: ls.c, pendingPayments: pp.c, recentOrders: recent.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })), ordersByCategory: catData });
      }
      if (path === "/admin/products" && method === "GET") {
        const rows = await db.select().from(productsTable).orderBy(asc(productsTable.sortOrder));
        let allImages: any[] = [];
        try { if (rows.length > 0) allImages = await db.select().from(productImagesTable).where(inArray(productImagesTable.productId, rows.map(r => r.id))).orderBy(asc(productImagesTable.sortOrder)); } catch { allImages = []; }
        return ok(rows.map(p => serializeProduct(p, allImages.filter(i => i.productId === p.id).map(i => ({ id: i.id, url: i.url, altText: i.altText, isPrimary: i.isPrimary, sortOrder: i.sortOrder })))));
      }
      if (path === "/admin/products" && method === "POST") {
        const b = z.object({ name: z.string(), slug: z.string(), category: z.string(), variant: z.string().nullish(), b2cPrice: z.number(), b2bPrice: z.number(), moq: z.number().default(1), cartonQty: z.number().default(1), gstPercent: z.number().default(5), hsnCode: z.string().default("21069099"), shelfLifeMonths: z.number().default(6), weightGrams: z.number().default(60), description: z.string().nullish(), stockQty: z.number().default(100), status: z.string().default("active"), sortOrder: z.number().default(0), imageUrl: z.string().nullish() }).safeParse(parsedBody);
        if (!b.success) return err("Invalid product data", "VALIDATION_ERROR", 400);
        const p = b.data;
        const [row] = await db.insert(productsTable).values({ ...p, b2cPrice: String(p.b2cPrice), b2bPrice: String(p.b2bPrice), gstPercent: String(p.gstPercent) }).returning();
        return ok(serializeProduct(row), 201);
      }
      const adminProductMatch = path.match(/^\/admin\/products\/([^/]+)$/);
      if (adminProductMatch && method === "PATCH") {
        const b = z.object({ name: z.string().optional(), variant: z.string().nullish(), b2cPrice: z.number().optional(), b2bPrice: z.number().optional(), moq: z.number().optional(), stockQty: z.number().optional(), status: z.string().optional(), description: z.string().nullish(), imageUrl: z.string().nullish() }).safeParse(parsedBody);
        if (!b.success) return err("Invalid data", "VALIDATION_ERROR", 400);
        const update: any = { ...b.data };
        if (update.b2cPrice !== undefined) update.b2cPrice = String(update.b2cPrice);
        if (update.b2bPrice !== undefined) update.b2bPrice = String(update.b2bPrice);
        const [row] = await db.update(productsTable).set(update).where(eq(productsTable.id, adminProductMatch[1])).returning();
        if (!row) return err("Product not found", "NOT_FOUND", 404);
        const images = await getProductImages(row.id);
        return ok(serializeProduct(row, images));
      }

      // Product images — GET all images for a product
      const adminProductImagesMatch = path.match(/^\/admin\/products\/([^/]+)\/images$/);
      if (adminProductImagesMatch && method === "GET") {
        const images = await getProductImages(adminProductImagesMatch[1]);
        return ok(images);
      }
      // Product images — POST add image
      if (adminProductImagesMatch && method === "POST") {
        const b = z.object({ url: z.string().url(), altText: z.string().nullish(), isPrimary: z.boolean().default(false), sortOrder: z.number().default(0) }).safeParse(parsedBody);
        if (!b.success) return err("Invalid image data", "VALIDATION_ERROR", 400);
        const productId = adminProductImagesMatch[1];
        // Max 4 images per product
        const existing = await getProductImages(productId);
        if (existing.length >= 4) return err("Maximum 4 images allowed per product", "MAX_IMAGES", 400);
        // If isPrimary, unset others
        if (b.data.isPrimary) {
          await db.update(productImagesTable).set({ isPrimary: false }).where(eq(productImagesTable.productId, productId));
          // Also update main imageUrl on product
          await db.update(productsTable).set({ imageUrl: b.data.url }).where(eq(productsTable.id, productId));
        }
        const [img] = await db.insert(productImagesTable).values({ productId, url: b.data.url, altText: b.data.altText ?? null, isPrimary: b.data.isPrimary, sortOrder: b.data.sortOrder }).returning();
        return ok({ id: img.id, url: img.url, altText: img.altText, isPrimary: img.isPrimary, sortOrder: img.sortOrder }, 201);
      }
      // Product images — DELETE single image
      const adminImageDeleteMatch = path.match(/^\/admin\/products\/([^/]+)\/images\/([^/]+)$/);
      if (adminImageDeleteMatch && method === "DELETE") {
        const [deleted] = await db.delete(productImagesTable).where(and(eq(productImagesTable.id, adminImageDeleteMatch[2]), eq(productImagesTable.productId, adminImageDeleteMatch[1]))).returning();
        if (!deleted) return err("Image not found", "NOT_FOUND", 404);
        // If we deleted the primary, set the first remaining as primary
        if (deleted.isPrimary) {
          const remaining = await getProductImages(adminImageDeleteMatch[1]);
          if (remaining.length > 0) {
            await db.update(productImagesTable).set({ isPrimary: true }).where(eq(productImagesTable.id, remaining[0].id));
            await db.update(productsTable).set({ imageUrl: remaining[0].url }).where(eq(productsTable.id, adminImageDeleteMatch[1]));
          } else {
            await db.update(productsTable).set({ imageUrl: null }).where(eq(productsTable.id, adminImageDeleteMatch[1]));
          }
        }
        return ok({ deleted: true });
      }
      if (path === "/admin/customers" && method === "GET") {
        // API client sends ?type=b2c or ?type=b2b, map to role
        const typeParam = params.type as string | undefined;
        const roleFilter = typeParam === "b2c" ? "b2c_customer" : typeParam === "b2b" ? "b2b_customer" : undefined;
        const rows = await db.select().from(usersTable).where(roleFilter ? eq(usersTable.role, roleFilter) : undefined).orderBy(desc(usersTable.createdAt));
        return ok(rows.map(profileUser));
      }
      const adminCustMatch = path.match(/^\/admin\/customers\/([^/]+)\/status$/);
      if (adminCustMatch && method === "PATCH") {
        const b = z.object({ b2bStatus: z.enum(["pending","approved","rejected"]) }).safeParse(parsedBody);
        if (!b.success) return err("Invalid status", "VALIDATION_ERROR", 400);
        const [updated] = await db.update(usersTable).set({ b2bStatus: b.data.b2bStatus }).where(eq(usersTable.id, adminCustMatch[1])).returning();
        return ok(profileUser(updated));
      }
      if (path === "/admin/orders" && method === "GET") {
        const rows = await db.select().from(ordersTable).where(params.orderType ? eq(ordersTable.orderType, params.orderType) : undefined).orderBy(desc(ordersTable.createdAt));
        return ok(rows.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderType: o.orderType, status: o.status, totalAmount: Number(o.totalAmount), createdAt: o.createdAt.toISOString() })));
      }
      const adminOrderMatch = path.match(/^\/admin\/orders\/([^/]+)\/status$/);
      if (adminOrderMatch && method === "PATCH") {
        const b = z.object({ status: z.enum(["pending","confirmed","dispatched","delivered","cancelled"]) }).safeParse(parsedBody);
        if (!b.success) return err("Invalid status", "VALIDATION_ERROR", 400);
        const [updated] = await db.update(ordersTable).set({ status: b.data.status }).where(eq(ordersTable.id, adminOrderMatch[1])).returning();
        return ok({ id: updated.id, status: updated.status });
      }
      if (path === "/admin/payments" && method === "GET") {
        const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
        return ok(rows.map(p => ({ id: p.id, orderId: p.orderId, paymentMethod: p.paymentMethod, paymentStatus: p.paymentStatus, amount: Number(p.amount), referenceNumber: p.referenceNumber, paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString() })));
      }
      const adminPayMatch = path.match(/^\/admin\/payments\/([^/]+)\/confirm$/);
      if (adminPayMatch && method === "PATCH") {
        const b = z.object({ referenceNumber: z.string().optional() }).safeParse(parsedBody);
        if (!b.success) return err("Invalid data", "VALIDATION_ERROR", 400);
        const [payment] = await db.update(paymentsTable).set({ paymentStatus: "received", paidAt: new Date(), markedById: user.id, ...(b.data.referenceNumber && { referenceNumber: b.data.referenceNumber }) }).where(eq(paymentsTable.id, adminPayMatch[1])).returning();
        if (!payment) return err("Payment not found", "NOT_FOUND", 404);
        await db.update(ordersTable).set({ status: "confirmed" }).where(eq(ordersTable.id, payment.orderId));
        const invoiceNumber = await generateInvoiceNumber();
        await db.insert(invoicesTable).values({ orderId: payment.orderId, invoiceNumber }).onConflictDoNothing();
        return ok({ ok: true, paymentId: payment.id, orderId: payment.orderId, invoiceNumber });
      }
    }

    return err("Not found", "NOT_FOUND", 404);

  } catch (e: any) {
    console.error("Function error:", e?.message, e?.stack);
    return err(e?.message || "Internal server error", "INTERNAL_ERROR", 500);
  }
}

// ─── ZOD SCHEMAS ─────────────────────────────────────────────────────────────
const RegisterBody = z.object({ email: z.string(), password: z.string().min(6), fullName: z.string(), phone: z.string().nullish(), accountType: z.enum(["b2c","b2b"]), businessName: z.string().nullish(), businessType: z.string().nullish(), gstNumber: z.string().nullish(), businessAddress: z.string().nullish() });
const LoginBody = z.object({ email: z.string(), password: z.string() });
const QuoteBody = z.object({ orderType: z.enum(["b2c","b2b"]), items: z.array(z.object({ productId: z.string(), quantity: z.number() })) });
const ShippingSchema = z.object({ fullName: z.string(), phone: z.string(), line1: z.string(), line2: z.string().nullish(), city: z.string(), state: z.string(), pincode: z.string() });
const B2cOrderBody = z.object({ items: z.array(z.object({ productId: z.string(), quantity: z.number() })), shippingAddress: ShippingSchema, paymentMethod: z.enum(["upi","bank_transfer","payment_link"]), paymentReference: z.string().nullish(), notes: z.string().nullish() });
const B2bOrderBody = z.object({ items: z.array(z.object({ productId: z.string(), quantity: z.number() })), shippingAddress: ShippingSchema, paymentMethod: z.enum(["upi","bank_transfer","payment_link"]), notes: z.string().nullish() });
