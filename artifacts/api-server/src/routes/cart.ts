import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { QuoteCartBody } from "@workspace/api-zod";
import { computeQuote } from "../lib/pricing";

const router: IRouter = Router();

router.post("/cart/quote", async (req, res) => {
  const parsed = QuoteCartBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid quote request", code: "VALIDATION_ERROR" });
  }
  const { items, orderType } = parsed.data;
  if (items.length === 0) {
    return res.json({
      orderType,
      lines: [],
      subtotal: 0,
      discountAmount: 0,
      discountPercent: 0,
      discountLabel: "No items",
      gstAmount: 0,
      shippingCharge: 0,
      total: 0,
      meetsMinimumOrder: orderType === "b2c",
      minimumOrderValue: orderType === "b2b" ? 3000 : 0,
      moqViolations: [],
    });
  }
  const productIds = items.map((i) => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const quote = computeQuote(items, products, orderType, req.user);
  res.json(quote);
});

export default router;
