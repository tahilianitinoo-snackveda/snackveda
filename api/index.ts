// Narayani Distributors API — Vercel Serverless Function

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

// Runtime: Node.js 20

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, inArray, and, asc, desc, gte, like, sql } from "drizzle-orm";
import { computeQuote, type QuoteItem } from "./_lib/pricing";
import {
  usersTable, productsTable, productImagesTable, addressesTable,
  ordersTable, orderItemsTable, paymentsTable, invoicesTable, blogPostsTable,
} from "./_lib/schema";
import { signToken, verifyToken, profileUser } from "./_lib/auth";
import { sendEmail, sendSMS, emailBase, notifyRegistration, notifyOrderPlaced, notifyShipping } from "./_lib/notify";
import { formatOrderNumber, formatInvoiceNumber, orderNumberPrefix } from "./_lib/orderNumbers";

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
type User = typeof usersTable.$inferSelect;
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

// ─── BLOG ─────────────────────────────────────────────────────────────────────
function serializeBlogPost(p: typeof blogPostsTable.$inferSelect, withContent = true) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    ...(withContent ? { content: p.content } : {}),
    coverImageUrl: p.coverImageUrl,
    author: p.author,
    category: p.category,
    tags: (p.tags || "").split(",").map(t => t.trim()).filter(Boolean),
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    status: p.status,
    readMinutes: p.readMinutes,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

function estimateReadMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

async function generateOrderNumber(type: "b2c"|"b2b") {
  const year = new Date().getFullYear();
  const prefix = orderNumberPrefix(type, year);
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(like(ordersTable.orderNumber, `${prefix}%`));
  return formatOrderNumber(type, year, (row?.count ?? 0) + 1);
}
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(invoicesTable);
  return formatInvoiceNumber(year, (row?.count ?? 0) + 1);
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
  const sendRaw = (body, contentType, status = 200) => {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    res.statusCode = status;
    res.end(body);
  };

  if (req.method === "OPTIONS") {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = 204;
    res.end();
    return;
  }

  const rawUrl = req.url || "/";
  const [rawPathPart, rawQueryPart] = rawUrl.split("?");
  const rawQueryParams = new URLSearchParams(rawQueryPart || "");
  
  // Vercel rewrites lose the original path — recover it from query param or headers
  const pathFromQuery = rawQueryParams.get("path");
  const pathFromHeader = (req.headers?.["x-matched-path"] as string) || (req.headers?.["x-invoke-path"] as string);
  const rawPath = pathFromQuery || pathFromHeader || rawPathPart;
  const path = rawPath.replace(/^\/api/, "") || "/";

  const method = req.method;
  // Params: merge query params excluding the internal path param
  rawQueryParams.delete("path");
  const params: Record<string, string> = {};
  rawQueryParams.forEach((v, k) => { params[k] = v; });

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
      try {
        const b = RegisterBody.safeParse(parsedBody);
        if (!b.success) return err("Invalid registration data", "VALIDATION_ERROR", 400);
        const d = b.data;
        const db = getDb();
        const existing = await db.select().from(usersTable).where(eq(usersTable.email, d.email.toLowerCase())).limit(1);
        if (existing.length) return err("Email already exists", "EMAIL_TAKEN", 400);
        const hash = await bcrypt.hash(d.password, 10);
        const isB2b = d.accountType === "b2b";
        const [user] = await db.insert(usersTable).values({ email: d.email.toLowerCase(), passwordHash: hash, fullName: d.fullName, phone: d.phone ?? null, role: isB2b ? "b2b_customer" : "b2c_customer", customerType: isB2b ? (d.businessType ?? "kirana") : "retail", businessName: d.businessName ?? null, gstNumber: d.gstNumber ?? null, businessAddress: d.businessAddress ?? null, b2bStatus: isB2b ? "approved" : null }).returning();
        notifyRegistration(user, isB2b).catch(() => {});
        return ok({ token: signToken(user.id), user: profileUser(user) }, 201);
      } catch (e: any) {
        console.error("Registration error:", e?.message, e?.stack);
        return err(e?.message || "Registration failed", "INTERNAL_ERROR", 500);
      }
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

    if (path === "/auth/forgot-password" && method === "POST") {
      const b = z.object({ email: z.string().email() }).safeParse(parsedBody);
      if (!b.success) return ok({ ok: true }); // don't reveal validation errors
      try {
        const db = getDb();
        const [user] = await db.select().from(usersTable).where(eq(usersTable.email, b.data.email.toLowerCase())).limit(1);
        if (user) {
          // Generate a simple reset token (JWT with 1h expiry)
          const token = jwt.sign({ userId: user.id, type: "password_reset" }, process.env.JWT_SECRET!, { expiresIn: "1h" });
          const resetLink = `https://narayanidistributors.com/reset-password?token=${token}`;
          const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9f9f7;margin:0"><div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)"><div style="background:#0F766E;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:22px">Narayani Distributors</h1></div><div style="padding:32px;color:#1E293B"><h2 style="color:#0F766E;margin-top:0">Reset Your Password</h2><p>Hi ${user.fullName}, we received a request to reset your password.</p><p>Click the button below to reset it. This link expires in 1 hour.</p><a href="${resetLink}" style="display:inline-block;background:#0F766E;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;margin:16px 0">Reset Password</a><p style="color:#64748B;font-size:13px;margin-top:16px">If you didn't request this, ignore this email. Your password won't change.</p></div><div style="background:#F8FAFC;padding:16px 32px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0">&copy; 2025 Narayani Distributors</div></div></body></html>`;
          await sendEmail(user.email, "Reset Your Narayani Distributors Password", html);
        }
      } catch (e) { console.error("Forgot password error:", e); }
      return ok({ ok: true }); // always return ok
    }

    if (path === "/auth/reset-password" && method === "POST") {
      const b = z.object({ token: z.string(), password: z.string().min(6) }).safeParse(parsedBody);
      if (!b.success) return err("Invalid data", "VALIDATION_ERROR", 400);
      try {
        const payload = jwt.verify(b.data.token, process.env.JWT_SECRET!) as { userId: string; type: string };
        if (payload.type !== "password_reset") return err("Invalid token", "INVALID_TOKEN", 400);
        const hash = await bcrypt.hash(b.data.password, 10);
        await getDb().update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, payload.userId));
        return ok({ ok: true });
      } catch {
        return err("Invalid or expired token", "INVALID_TOKEN", 400);
      }
    }

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

    // ── BLOG (public) ────────────────────────────────────────────────────────
    if (path === "/blog" && method === "GET") {
      const db = getDb();
      let rows = await db
        .select()
        .from(blogPostsTable)
        .where(eq(blogPostsTable.status, "published"))
        .orderBy(desc(blogPostsTable.publishedAt));
      if (params.category) {
        rows = rows.filter(r => r.category?.toLowerCase() === String(params.category).toLowerCase());
      }
      if (params.tag) {
        const tag = String(params.tag).toLowerCase();
        rows = rows.filter(r => (r.tags || "").toLowerCase().split(",").map(t => t.trim()).includes(tag));
      }
      const limit = params.limit ? Math.max(1, Math.min(50, Number(params.limit))) : undefined;
      if (limit) rows = rows.slice(0, limit);
      return ok(rows.map(p => serializeBlogPost(p, false)));
    }

    const blogSlugMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogSlugMatch && method === "GET") {
      const db = getDb();
      const [post] = await db
        .select()
        .from(blogPostsTable)
        .where(and(eq(blogPostsTable.slug, blogSlugMatch[1]), eq(blogPostsTable.status, "published")))
        .limit(1);
      if (!post) return err("Post not found", "NOT_FOUND", 404);
      const related = await db
        .select()
        .from(blogPostsTable)
        .where(eq(blogPostsTable.status, "published"))
        .orderBy(desc(blogPostsTable.publishedAt))
        .limit(4);
      return ok({
        post: serializeBlogPost(post),
        related: related.filter(r => r.id !== post.id).slice(0, 3).map(r => serializeBlogPost(r, false)),
      });
    }

    // ── SITEMAP (for Google Search Console) ──────────────────────────────────
    if ((path === "/sitemap.xml" || path === "/sitemap") && method === "GET") {
      const site = (process.env.SITE_URL || "https://narayanidistributors.com").replace(/\/$/, "");
      const today = new Date().toISOString().slice(0, 10);
      // Static routes. Must stay in step with the router in
      // artifacts/narayani/src/App.tsx — a path listed here that 404s is a crawl
      // error, and a real page missing from here is invisible to Search Console.
      // /business, /wholesale, /export and /request-a-quote are the B2B surface;
      // /b2b is the older account page and stays until it is retired.
      const staticPaths = [
        "/",
        "/shop",
        "/business",
        "/wholesale",
        "/export",
        "/request-a-quote",
        "/b2b",
        "/about",
        "/blog",
        "/faq",
        "/contact",
        "/policies",
      ];
      const entries: { loc: string; lastmod: string; priority: string; changefreq: string }[] =
        staticPaths.map(p => ({
          loc: `${site}${p}`,
          lastmod: today,
          priority: p === "/" ? "1.0" : "0.8",
          changefreq: p === "/" || p === "/shop" || p === "/blog" ? "daily" : "monthly",
        }));
      try {
        const db = getDb();
        const products = await db
          .select({ slug: productsTable.slug, updatedAt: productsTable.updatedAt })
          .from(productsTable)
          .where(eq(productsTable.status, "active"));
        for (const p of products) {
          entries.push({
            loc: `${site}/shop/${p.slug}`,
            lastmod: p.updatedAt.toISOString().slice(0, 10),
            priority: "0.7",
            changefreq: "weekly",
          });
        }
      } catch (e) { console.error("sitemap products error:", e?.message); }
      try {
        const db = getDb();
        const posts = await db
          .select({ slug: blogPostsTable.slug, updatedAt: blogPostsTable.updatedAt })
          .from(blogPostsTable)
          .where(eq(blogPostsTable.status, "published"));
        for (const p of posts) {
          entries.push({
            loc: `${site}/blog/${p.slug}`,
            lastmod: p.updatedAt.toISOString().slice(0, 10),
            priority: "0.7",
            changefreq: "monthly",
          });
        }
      } catch (e) { console.error("sitemap blog error:", e?.message); }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
        .map(e => `  <url>\n    <loc>${xmlEscape(e.loc)}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`)
        .join("\n")}\n</urlset>`;
      return sendRaw(xml, "application/xml; charset=utf-8");
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
      const serialized = await serializeOrder(order.id);
      // Send order received email to customer immediately
      const sendOrderReceivedEmail = async () => {
        const itemsHtml = (serialized?.items||[]).map((i: any) => `<tr><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #F1F5F9">${i.name}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #F1F5F9;text-align:center">${i.quantity}</td><td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #F1F5F9;text-align:right">₹${Number(i.lineTotal).toFixed(2)}</td></tr>`).join("");
        const html = emailBase(`<h2>Thank You for Your Order!</h2><p>Hi ${user.fullName}, we've received your order and it's currently under review. We'll confirm it once payment is verified.</p><div class="box"><div class="row"><span class="lbl">Order Number</span><span class="val">${order.orderNumber}</span></div><div class="row"><span class="lbl">Status</span><span class="val">Under Review</span></div><div class="row"><span class="lbl">Total Payable</span><span class="val">₹${Number(order.totalAmount).toFixed(2)}</span></div></div><table><thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemsHtml}</tbody></table><p style="font-size:13px"><strong>Pay to UPI:</strong> 9898477151@pthdfc (Narayani Distributors)<br>Please share the UTR/reference number after payment.</p><a href="https://narayanidistributors.com/account" class="btn">View Order</a>`);
        await sendEmail(user.email, `Order Received — ${order.orderNumber} | Narayani Distributors`, html);
        if (user.phone) await sendSMS(user.phone, `Narayani Distributors: Order ${order.orderNumber} received. Pay Rs.${Number(order.totalAmount).toFixed(0)} to UPI: 9898477151@pthdfc. We'll confirm after payment.`);
        // Admin alert
        const adminHtml = emailBase(`<h2>New B2C Order: ${order.orderNumber}</h2><div class="box"><div class="row"><span class="lbl">Customer</span><span class="val">${user.fullName}</span></div><div class="row"><span class="lbl">Email</span><span class="val">${user.email}</span></div><div class="row"><span class="lbl">Phone</span><span class="val">${user.phone||"N/A"}</span></div><div class="row"><span class="lbl">Amount</span><span class="val">₹${Number(order.totalAmount).toFixed(2)}</span></div></div><a href="https://narayanidistributors.com/admin/orders" class="btn">View in Admin</a>`);
        await sendEmail("support@narayanidistributors.com", `New B2C Order — ${order.orderNumber}`, adminHtml);
      };
      sendOrderReceivedEmail().catch(() => {});
      return ok(serialized, 201);
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
      const serializedB2b = await serializeOrder(order.id);
      notifyOrderPlaced({ ...serializedB2b, orderNumber: order.orderNumber, totalAmount: order.totalAmount, orderType: order.orderType }, user).catch(() => {});
      return ok(serializedB2b, 201);
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
      return ok({ invoiceNumber: inv.invoiceNumber, issuedAt: inv.createdAt.toISOString(), seller: { name: "Narayani Distributors", brand: "Narayani Distributors", address: "Indore, Madhya Pradesh, India", gstNumber: "23AAAAA0000A1Z5", phone: "+91 90000 00000", email: "hello@narayanidistributors.com" }, order });
    }

    // ── ACCOUNT ──────────────────────────────────────────────────────────────
    if (path === "/account/me" && method === "GET") {
      const user = await getUser(authHeader);
      if (!user) return err("Authentication required", "UNAUTHORIZED", 401);
      return ok(profileUser(user));
    }
    if (path === "/account/profile" && method === "GET") {
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
        // name/slug/category/moq/cartonQty/hsnCode/shelfLifeMonths/weightGrams are restated
        // rather than left to the spread alone. They are the products columns that are notNull
        // with no database default, and the same `strictNullChecks: false` quirk described on
        // OrderItemSchema makes z.infer report them optional. Restating each key with its own
        // value is a no-op at runtime — the schema requires or defaults every one of them, so a
        // successful parse always carries all eight — but it keeps the insert fully checked, so
        // adding a new required column still fails here instead of being silently dropped.
        const [row] = await db.insert(productsTable).values({ ...p, name: p.name, slug: p.slug, category: p.category, moq: p.moq, cartonQty: p.cartonQty, hsnCode: p.hsnCode, shelfLifeMonths: p.shelfLifeMonths, weightGrams: p.weightGrams, b2cPrice: String(p.b2cPrice), b2bPrice: String(p.b2bPrice), gstPercent: String(p.gstPercent) }).returning();
        return ok(serializeProduct(row), 201);
      }
      const adminProductMatch = path.match(/^\/admin\/products\/([^/]+)$/);
      if (adminProductMatch && method === "PATCH") {
        const b = z.object({ name: z.string().optional(), slug: z.string().optional(), variant: z.string().nullish(), category: z.string().optional(), b2cPrice: z.number().optional(), b2bPrice: z.number().optional(), moq: z.number().optional(), cartonQty: z.number().optional(), stockQty: z.number().optional(), gstPercent: z.number().optional(), hsnCode: z.string().optional(), shelfLifeMonths: z.number().optional(), weightGrams: z.number().optional(), status: z.string().optional(), description: z.string().nullish(), imageUrl: z.string().nullish() }).safeParse(parsedBody);
        if (!b.success) return err("Invalid data", "VALIDATION_ERROR", 400);
        const update: any = {};
        const d = b.data;
        if (d.name !== undefined) update.name = d.name;
        if (d.slug !== undefined) update.slug = d.slug;
        if (d.variant !== undefined) update.variant = d.variant;
        if (d.category !== undefined) update.category = d.category;
        if (d.b2cPrice !== undefined) update.b2cPrice = String(d.b2cPrice);
        if (d.b2bPrice !== undefined) update.b2bPrice = String(d.b2bPrice);
        if (d.moq !== undefined) update.moq = d.moq;
        if (d.cartonQty !== undefined) update.cartonQty = d.cartonQty;
        if (d.stockQty !== undefined) update.stockQty = d.stockQty;
        if (d.gstPercent !== undefined) update.gstPercent = String(d.gstPercent);
        if (d.hsnCode !== undefined) update.hsnCode = d.hsnCode;
        if (d.shelfLifeMonths !== undefined) update.shelfLifeMonths = Math.round(Number(d.shelfLifeMonths));
        if (d.weightGrams !== undefined) update.weightGrams = d.weightGrams;
        if (d.status !== undefined) update.status = d.status;
        if (d.description !== undefined) update.description = d.description;
        if (d.imageUrl !== undefined) update.imageUrl = d.imageUrl;
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
        // Send email to customer on status change
        try {
          const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
          if (customer) {
            const statusLabels: Record<string, string> = { confirmed: "Confirmed", dispatched: "Dispatched", delivered: "Delivered", cancelled: "Cancelled", pending: "Pending" };
            const statusLabel = statusLabels[b.data.status] || b.data.status;
            const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f9f9f7;margin:0"><div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)"><div style="background:#0F766E;padding:24px 32px"><h1 style="color:#fff;margin:0;font-size:22px">Narayani Distributors</h1><p style="color:#99F6E4;margin:4px 0 0;font-size:12px">By Narayani Distributors</p></div><div style="padding:32px;color:#1E293B"><h2 style="color:#0F766E;margin-top:0">Order Status Updated</h2><p>Hi ${customer.fullName}, your order status has been updated.</p><div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px 20px;margin:16px 0"><div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #E2E8F0;font-size:13px"><span style="color:#64748B">Order Number</span><span style="font-weight:600">${updated.orderNumber}</span></div><div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #E2E8F0;font-size:13px"><span style="color:#64748B">New Status</span><span style="font-weight:600;color:#0F766E">${statusLabel}</span></div><div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#64748B">Total Amount</span><span style="font-weight:600">₹${Number(updated.totalAmount).toFixed(2)}</span></div></div>${b.data.status === "confirmed" ? `<p style="font-size:13px">Your payment has been confirmed. We are preparing your order for dispatch.</p>` : ""}${b.data.status === "cancelled" ? `<p style="font-size:13px">Your order has been cancelled. For queries contact support@narayanidistributors.com</p>` : ""}<a href="https://narayanidistributors.com/account" style="display:inline-block;background:#0F766E;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:600;margin:12px 0">View Order</a></div><div style="background:#F8FAFC;padding:16px 32px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0">&copy; 2025 Narayani Distributors</div></div></body></html>`;
            await sendEmail(customer.email, `Order ${statusLabel} — ${updated.orderNumber}`, html);
            if (customer.phone && (b.data.status === "confirmed" || b.data.status === "cancelled")) {
              await sendSMS(customer.phone, `Narayani Distributors: Order ${updated.orderNumber} is now ${statusLabel}. View: narayanidistributors.com/account`);
            }
          }
        } catch (e) { console.error("Status notification error:", e); }
        return ok({ id: updated.id, status: updated.status });
      }
      if (path === "/admin/payments" && method === "GET") {
        const rows = await db.select({ id: paymentsTable.id, orderId: paymentsTable.orderId, orderNumber: ordersTable.orderNumber, paymentMethod: paymentsTable.paymentMethod, paymentStatus: paymentsTable.paymentStatus, amount: paymentsTable.amount, referenceNumber: paymentsTable.referenceNumber, paidAt: paymentsTable.paidAt, createdAt: paymentsTable.createdAt }).from(paymentsTable).leftJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id)).orderBy(desc(paymentsTable.createdAt));
        return ok(rows.map(p => ({ id: p.id, orderId: p.orderId, orderNumber: p.orderNumber ?? p.orderId, paymentMethod: p.paymentMethod, paymentStatus: p.paymentStatus, amount: Number(p.amount), referenceNumber: p.referenceNumber, paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString() })));
      }
      const adminPayMatch = path.match(/^\/admin\/payments\/([^/]+)\/confirm$/);
      if (adminPayMatch && method === "PATCH") {
        const b = z.object({ referenceNumber: z.string().optional() }).safeParse(parsedBody);
        if (!b.success) return err("Invalid data", "VALIDATION_ERROR", 400);
        const [payment] = await db.update(paymentsTable).set({ paymentStatus: "received", paidAt: new Date(), markedById: user.id, ...(b.data.referenceNumber && { referenceNumber: b.data.referenceNumber }) }).where(eq(paymentsTable.id, adminPayMatch[1])).returning();
        if (!payment) return err("Payment not found", "NOT_FOUND", 404);
        if (!payment) return err("Payment not found", "NOT_FOUND", 404);
        const [confirmedOrder] = await db.update(ordersTable).set({ status: "confirmed" }).where(eq(ordersTable.id, payment.orderId)).returning();
        const invoiceNumber = await generateInvoiceNumber();
        await db.insert(invoicesTable).values({ orderId: payment.orderId, invoiceNumber }).onConflictDoNothing();
        try {
          const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, confirmedOrder.userId)).limit(1);
          if (customer) { const orderForEmail = await serializeOrder(payment.orderId); if (orderForEmail) notifyOrderPlaced({ ...orderForEmail, orderNumber: confirmedOrder.orderNumber, totalAmount: confirmedOrder.totalAmount, orderType: confirmedOrder.orderType }, customer).catch(()=>{}); }
        } catch(e) { console.error("Payment notify error:", e); }
        return ok({ ok: true, paymentId: payment.id, orderId: payment.orderId, invoiceNumber });
      }

      // Shipping notification — admin marks order as dispatched with tracking
      const adminShipMatch = path.match(/^\/admin\/orders\/([^/]+)\/ship$/);
      if (adminShipMatch && method === "POST") {
        const b = z.object({ courier: z.string(), trackingNumber: z.string(), trackingLink: z.string() }).safeParse(parsedBody);
        if (!b.success) return err("Invalid shipping data", "VALIDATION_ERROR", 400);
        const { courier, trackingNumber, trackingLink } = b.data;
        const [updatedOrder] = await db.update(ordersTable).set({ status: "dispatched" }).where(eq(ordersTable.id, adminShipMatch[1])).returning();
        if (!updatedOrder) return err("Order not found", "NOT_FOUND", 404);
        const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, updatedOrder.userId)).limit(1);
        if (customer) {
          notifyShipping(updatedOrder, customer, courier, trackingNumber, trackingLink).catch(() => {});
        }
        return ok({ ok: true, status: "dispatched", orderId: updatedOrder.id });
      }

      // ── BLOG (admin) ───────────────────────────────────────────────────────
      if (path === "/admin/blog" && method === "GET") {
        const rows = await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.createdAt));
        return ok(rows.map(p => serializeBlogPost(p)));
      }

      if (path === "/admin/blog" && method === "POST") {
        const b = BlogPostBody.safeParse(parsedBody);
        if (!b.success) return err("Invalid post data", "VALIDATION_ERROR", 400);
        const d = b.data;
        const slug = slugify(d.slug || d.title);
        if (!slug) return err("Title or slug is required", "VALIDATION_ERROR", 400);
        const [existing] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.slug, slug)).limit(1);
        if (existing) return err("A post with this slug already exists", "SLUG_TAKEN", 400);
        const [row] = await db.insert(blogPostsTable).values({
          title: d.title,
          slug,
          excerpt: d.excerpt ?? null,
          content: d.content,
          coverImageUrl: d.coverImageUrl || null,
          author: d.author || "Narayani Distributors Team",
          category: d.category || "Snacking",
          tags: Array.isArray(d.tags) ? d.tags.join(",") : (d.tags ?? null),
          metaTitle: d.metaTitle ?? null,
          metaDescription: d.metaDescription ?? null,
          status: d.status || "draft",
          readMinutes: d.readMinutes || estimateReadMinutes(d.content),
          publishedAt: d.status === "published" ? new Date() : null,
        }).returning();
        return ok(serializeBlogPost(row), 201);
      }

      const adminBlogMatch = path.match(/^\/admin\/blog\/([^/]+)$/);
      if (adminBlogMatch && method === "PATCH") {
        const b = BlogPostBody.partial().safeParse(parsedBody);
        if (!b.success) return err("Invalid post data", "VALIDATION_ERROR", 400);
        const d = b.data;
        const [current] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, adminBlogMatch[1])).limit(1);
        if (!current) return err("Post not found", "NOT_FOUND", 404);
        const update: any = { updatedAt: new Date() };
        if (d.title !== undefined) update.title = d.title;
        if (d.slug !== undefined) {
          const slug = slugify(d.slug);
          if (slug && slug !== current.slug) {
            const [clash] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.slug, slug)).limit(1);
            if (clash) return err("A post with this slug already exists", "SLUG_TAKEN", 400);
            update.slug = slug;
          }
        }
        if (d.excerpt !== undefined) update.excerpt = d.excerpt;
        if (d.content !== undefined) {
          update.content = d.content;
          if (d.readMinutes === undefined) update.readMinutes = estimateReadMinutes(d.content);
        }
        if (d.coverImageUrl !== undefined) update.coverImageUrl = d.coverImageUrl || null;
        if (d.author !== undefined) update.author = d.author;
        if (d.category !== undefined) update.category = d.category;
        if (d.tags !== undefined) update.tags = Array.isArray(d.tags) ? d.tags.join(",") : d.tags;
        if (d.metaTitle !== undefined) update.metaTitle = d.metaTitle;
        if (d.metaDescription !== undefined) update.metaDescription = d.metaDescription;
        if (d.readMinutes !== undefined) update.readMinutes = d.readMinutes;
        if (d.status !== undefined) {
          update.status = d.status;
          // Stamp publishedAt the first time a post goes live; keep the original date afterwards.
          if (d.status === "published" && !current.publishedAt) update.publishedAt = new Date();
        }
        const [row] = await db.update(blogPostsTable).set(update).where(eq(blogPostsTable.id, adminBlogMatch[1])).returning();
        return ok(serializeBlogPost(row));
      }

      if (adminBlogMatch && method === "DELETE") {
        const [deleted] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, adminBlogMatch[1])).returning();
        if (!deleted) return err("Post not found", "NOT_FOUND", 404);
        return ok({ deleted: true, id: deleted.id });
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
// One shared schema replacing three byte-identical inline copies. It validates exactly as
// they did — both fields required, unknown keys stripped — and zod schemas are immutable, so
// sharing one instance across the three bodies below changes nothing at runtime.
//
// The assertion restores the output type zod would infer on its own if this project compiled
// with `strictNullChecks`. With it off, zod's `addQuestionMarks` helper asks whether
// `undefined extends T` — true for every T when strictNullChecks is off — so `z.infer` marks
// every field optional and stops matching what a successful parse actually yields. Asserting
// here rather than at the three call sites keeps the explanation next to the cause.
const OrderItemSchema = z.object({ productId: z.string(), quantity: z.number() }) as unknown as z.ZodType<QuoteItem>;
const QuoteBody = z.object({ orderType: z.enum(["b2c","b2b"]), items: z.array(OrderItemSchema) });
const ShippingSchema = z.object({ fullName: z.string(), phone: z.string(), line1: z.string(), line2: z.string().nullish(), city: z.string(), state: z.string(), pincode: z.string() });
const B2cOrderBody = z.object({ items: z.array(OrderItemSchema), shippingAddress: ShippingSchema, paymentMethod: z.enum(["upi","bank_transfer","payment_link"]), paymentReference: z.string().nullish(), notes: z.string().nullish() });
const B2bOrderBody = z.object({ items: z.array(OrderItemSchema), shippingAddress: ShippingSchema, paymentMethod: z.enum(["upi","bank_transfer","payment_link"]), notes: z.string().nullish() });
const BlogPostBody = z.object({
  title: z.string().min(2),
  slug: z.string().nullish(),
  excerpt: z.string().nullish(),
  content: z.string().min(1),
  coverImageUrl: z.string().nullish(),
  author: z.string().nullish(),
  category: z.string().nullish(),
  tags: z.union([z.string(), z.array(z.string())]).nullish(),
  metaTitle: z.string().nullish(),
  metaDescription: z.string().nullish(),
  status: z.enum(["draft", "published"]).nullish(),
  readMinutes: z.number().nullish(),
});
