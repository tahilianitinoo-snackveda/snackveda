import { pgTable, uuid, text, integer, timestamp, pgEnum, numeric } from "drizzle-orm/pg-core";

export const productCategoryEnum = pgEnum("product_category", [
  "healthy_chips",
  "makhana",
  "superpuffs",
]);

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "inactive",
  "out_of_stock",
]);

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: productCategoryEnum("category").notNull(),
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
  status: productStatusEnum("status").notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Product = typeof productsTable.$inferSelect;
