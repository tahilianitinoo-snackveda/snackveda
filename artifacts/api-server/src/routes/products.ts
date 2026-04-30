import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";

const router: IRouter = Router();

function serialize(p: typeof productsTable.$inferSelect) {
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

router.get("/products", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const where = category
    ? and(eq(productsTable.status, "active"), eq(productsTable.category, category as never))
    : eq(productsTable.status, "active");
  const rows = await db
    .select()
    .from(productsTable)
    .where(where)
    .orderBy(asc(productsTable.sortOrder), asc(productsTable.name));
  res.json(rows.map(serialize));
});

router.get("/products/:slug", async (req, res) => {
  const [p] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.slug, req.params.slug))
    .limit(1);
  if (!p) return res.status(404).json({ message: "Product not found", code: "NOT_FOUND" });
  const related = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.category, p.category), eq(productsTable.status, "active")))
    .orderBy(asc(productsTable.sortOrder))
    .limit(5);
  res.json({
    ...serialize(p),
    related: related.filter((r) => r.id !== p.id).slice(0, 4).map(serialize),
  });
});

export default router;
