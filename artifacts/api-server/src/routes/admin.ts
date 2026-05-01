import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  usersTable,
  ordersTable,
  orderItemsTable,
  paymentsTable,
} from "@workspace/db";
import {
  UpdateAdminCustomerStatusBody,
  UpdateAdminOrderStatusBody,
  ConfirmAdminPaymentBody,
} from "@workspace/api-zod";
import { z } from "zod";
import { requireAdmin } from "../lib/auth";
import { serializeOrder } from "../lib/orderSerializer";

const AdminCreateProductSchema = z.object({
  name: z.string(),
  slug: z.string(),
  category: z.enum(["healthy_chips", "makhana", "superpuffs"]),
  variant: z.string().nullish(),
  b2cPrice: z.number(),
  b2bPrice: z.number(),
  moq: z.number().default(1),
  cartonQty: z.number().default(1),
  gstPercent: z.number().default(5),
  hsnCode: z.string().default("2106"),
  shelfLifeMonths: z.number().default(6),
  weightGrams: z.number().default(60),
  description: z.string().nullish(),
  stockQty: z.number().default(100),
  status: z.enum(["active", "inactive", "out_of_stock"]).default("active"),
  sortOrder: z.number().default(0),
  imageUrl: z.string().nullish(),
});

const AdminUpdateProductSchema = z.object({
  name: z.string().optional(),
  variant: z.string().nullish(),
  b2cPrice: z.number().optional(),
  b2bPrice: z.number().optional(),
  moq: z.number().optional(),
  cartonQty: z.number().optional(),
  gstPercent: z.number().optional(),
  hsnCode: z.string().optional(),
  shelfLifeMonths: z.number().optional(),
  weightGrams: z.number().optional(),
  description: z.string().nullish(),
  stockQty: z.number().optional(),
  status: z.enum(["active", "inactive", "out_of_stock"]).optional(),
  sortOrder: z.number().optional(),
  imageUrl: z.string().nullish(),
});


const router: IRouter = Router();
router.use(requireAdmin);

function serializeProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    variant: p.variant,
    b2cPrice: Number(p.b2cPrice),
    b2bPrice: Number(p.b2bPrice),
    moq: p.moq,
    cartonQty: p.cartonQty,
    gstPercent: Number(p.gstPercent),
    hsnCode: p.hsnCode,
    shelfLifeMonths: p.shelfLifeMonths,
    weightGrams: p.weightGrams,
    description: p.description,
    stockQty: p.stockQty,
    status: p.status,
    sortOrder: p.sortOrder,
    imageUrl: p.imageUrl,
  };
}

router.get("/admin/dashboard", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [todayCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, todayStart));

  const [pendingPay] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(paymentsTable)
    .where(eq(paymentsTable.paymentStatus, "pending"));

  const [revRow] = await db
    .select({ s: sql<string>`coalesce(sum(${ordersTable.totalAmount}), 0)::text` })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, monthStart));

  const lowStock = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(sql`${productsTable.stockQty} < 10`);

  const [totalCust] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(sql`${usersTable.role} <> 'super_admin'`);

  const pendingB2b = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.role, "b2b_customer"), eq(usersTable.b2bStatus, "pending")))
    .orderBy(desc(usersTable.createdAt))
    .limit(10);

  const recentOrders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  const ordersByCategory = await db
    .select({
      category: productsTable.category,
      quantity: sql<number>`coalesce(sum(${orderItemsTable.quantity}), 0)::int`,
      revenue: sql<string>`coalesce(sum(${orderItemsTable.lineTotal}), 0)::text`,
    })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .groupBy(productsTable.category);

  res.json({
    todayOrdersCount: todayCount?.c ?? 0,
    pendingPaymentsCount: pendingPay?.c ?? 0,
    thisMonthRevenue: Number(revRow?.s ?? "0"),
    lowStockCount: lowStock[0]?.c ?? 0,
    totalCustomers: totalCust?.c ?? 0,
    pendingB2bApplications: pendingB2b.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      businessName: u.businessName,
      gstNumber: u.gstNumber,
      businessAddress: u.businessAddress,
      customerType: u.customerType,
      createdAt: u.createdAt.toISOString(),
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt.toISOString(),
    })),
    ordersByCategory: ordersByCategory.map((r) => ({
      category: r.category,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    })),
  });
});

router.get("/admin/products", async (_req, res) => {
  const rows = await db
    .select()
    .from(productsTable)
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));
  res.json(rows.map(serializeProduct));
});

router.post("/admin/products", async (req, res) => {
  const parsed = AdminCreateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid product data", code: "VALIDATION_ERROR" });
  }
  const b = parsed.data;
  const [p] = await db
    .insert(productsTable)
    .values({
      name: b.name,
      slug: b.slug,
      category: b.category,
      variant: b.variant ?? null,
      b2cPrice: String(b.b2cPrice),
      b2bPrice: String(b.b2bPrice),
      moq: b.moq,
      cartonQty: b.cartonQty,
      gstPercent: String(b.gstPercent),
      hsnCode: b.hsnCode,
      shelfLifeMonths: b.shelfLifeMonths,
      weightGrams: b.weightGrams,
      description: b.description ?? null,
      stockQty: b.stockQty ?? 100,
      status: b.status ?? "active",
      sortOrder: b.sortOrder ?? 0,
      imageUrl: b.imageUrl ?? null,
    })
    .returning();
  res.status(201).json(serializeProduct(p));
});

router.patch("/admin/products/:id", async (req, res) => {
  const parsed = AdminUpdateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid product update", code: "VALIDATION_ERROR" });
  }
  const b = parsed.data;
  const [p] = await db
    .update(productsTable)
    .set({
      ...(b.name !== undefined && { name: b.name }),
      ...(b.variant !== undefined && { variant: b.variant }),
      ...(b.b2cPrice !== undefined && { b2cPrice: String(b.b2cPrice) }),
      ...(b.b2bPrice !== undefined && { b2bPrice: String(b.b2bPrice) }),
      ...(b.moq !== undefined && { moq: b.moq }),
      ...(b.cartonQty !== undefined && { cartonQty: b.cartonQty }),
      ...(b.gstPercent !== undefined && { gstPercent: String(b.gstPercent) }),
      ...(b.hsnCode !== undefined && { hsnCode: b.hsnCode }),
      ...(b.shelfLifeMonths !== undefined && { shelfLifeMonths: b.shelfLifeMonths }),
      ...(b.weightGrams !== undefined && { weightGrams: b.weightGrams }),
      ...(b.description !== undefined && { description: b.description }),
      ...(b.stockQty !== undefined && { stockQty: b.stockQty }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.sortOrder !== undefined && { sortOrder: b.sortOrder }),
      ...(b.imageUrl !== undefined && { imageUrl: b.imageUrl }),
    })
    .where(eq(productsTable.id, req.params.id))
    .returning();
  if (!p) return res.status(404).json({ message: "Product not found", code: "NOT_FOUND" });
  res.json(serializeProduct(p));
});

router.get("/admin/customers", async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  let rows = await db
    .select()
    .from(usersTable)
    .where(sql`${usersTable.role} <> 'super_admin'`)
    .orderBy(desc(usersTable.createdAt));
  if (type === "b2c") rows = rows.filter((u) => u.role === "b2c_customer");
  if (type === "b2b") rows = rows.filter((u) => u.role === "b2b_customer");
  res.json(
    rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      customerType: u.customerType,
      businessName: u.businessName,
      gstNumber: u.gstNumber,
      businessAddress: u.businessAddress,
      b2bStatus: u.b2bStatus,
      ordersCount: u.ordersCount,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    })),
  );
});

router.patch("/admin/customers/:id/status", async (req, res) => {
  const parsed = UpdateAdminCustomerStatusBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid status update", code: "VALIDATION_ERROR" });
  }
  const [u] = await db
    .update(usersTable)
    .set({ b2bStatus: parsed.data.b2bStatus })
    .where(eq(usersTable.id, req.params.id))
    .returning();
  if (!u) return res.status(404).json({ message: "Customer not found", code: "NOT_FOUND" });
  req.log.info({ customerId: u.id, status: u.b2bStatus }, "B2B status updated");
  res.json({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    b2bStatus: u.b2bStatus,
  });
});

router.get("/admin/orders", async (req, res) => {
  const orderType = typeof req.query.orderType === "string" ? req.query.orderType : undefined;
  let rows = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      orderType: ordersTable.orderType,
      status: ordersTable.status,
      totalAmount: ordersTable.totalAmount,
      createdAt: ordersTable.createdAt,
      customerName: usersTable.fullName,
      customerEmail: usersTable.email,
      paymentStatus: paymentsTable.paymentStatus,
    })
    .from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(paymentsTable, eq(paymentsTable.orderId, ordersTable.id))
    .orderBy(desc(ordersTable.createdAt));
  if (orderType === "b2c" || orderType === "b2b") {
    rows = rows.filter((r) => r.orderType === orderType);
  }
  res.json(
    rows.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      orderType: r.orderType,
      status: r.status,
      totalAmount: Number(r.totalAmount),
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      paymentStatus: r.paymentStatus ?? "pending",
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.patch("/admin/orders/:id/status", async (req, res) => {
  const parsed = UpdateAdminOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid status update", code: "VALIDATION_ERROR" });
  }
  const [o] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, req.params.id))
    .returning();
  if (!o) return res.status(404).json({ message: "Order not found", code: "NOT_FOUND" });
  res.json(await serializeOrder(o.id));
});

router.get("/admin/payments", async (_req, res) => {
  const rows = await db
    .select({
      id: paymentsTable.id,
      orderId: paymentsTable.orderId,
      orderNumber: ordersTable.orderNumber,
      orderType: ordersTable.orderType,
      customerName: usersTable.fullName,
      customerEmail: usersTable.email,
      paymentMethod: paymentsTable.paymentMethod,
      paymentStatus: paymentsTable.paymentStatus,
      amount: paymentsTable.amount,
      referenceNumber: paymentsTable.referenceNumber,
      paidAt: paymentsTable.paidAt,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .innerJoin(ordersTable, eq(paymentsTable.orderId, ordersTable.id))
    .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(
    rows.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      orderType: r.orderType,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      paymentMethod: r.paymentMethod,
      paymentStatus: r.paymentStatus,
      amount: Number(r.amount),
      referenceNumber: r.referenceNumber,
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.patch("/admin/payments/:id/confirm", async (req, res) => {
  const parsed = ConfirmAdminPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payment confirmation", code: "VALIDATION_ERROR" });
  }
  const [pay] = await db
    .update(paymentsTable)
    .set({
      paymentStatus: "received",
      referenceNumber: parsed.data.referenceNumber,
      paidAt: new Date(),
      markedById: req.user!.id,
    })
    .where(eq(paymentsTable.id, req.params.id))
    .returning();
  if (!pay) return res.status(404).json({ message: "Payment not found", code: "NOT_FOUND" });
  await db
    .update(ordersTable)
    .set({ status: "confirmed" })
    .where(eq(ordersTable.id, pay.orderId));
  req.log.info({ paymentId: pay.id }, "payment confirmed");
  res.json({
    id: pay.id,
    orderId: pay.orderId,
    paymentStatus: pay.paymentStatus,
    referenceNumber: pay.referenceNumber,
    paidAt: pay.paidAt?.toISOString() ?? null,
  });
});

export default router;
