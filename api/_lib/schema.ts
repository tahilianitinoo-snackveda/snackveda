import { pgTable, uuid, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
export const usersTable = pgTable("users", {
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
export const productsTable = pgTable("products", {
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
export const addressesTable = pgTable("addresses", {
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
export const ordersTable = pgTable("orders", {
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
export const orderItemsTable = pgTable("order_items", {
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
export const paymentsTable = pgTable("payments", {
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
export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productImagesTable = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull(),
  url: text("url").notNull(),
  altText: text("alt_text"),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A wholesale or export enquiry from /request-a-quote.
 *
 * Persisted BEFORE any notification is attempted, because transactional email has
 * been failing (see CLAUDE.md) and a notify-only implementation would drop enquiries
 * on the floor. The row is the record; the email is a convenience.
 */
export const quoteEnquiriesTable = pgTable("quote_enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull(),
  enquiryType: text("enquiry_type").notNull(),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  country: text("country").notNull(),
  state: text("state"),
  city: text("city"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  /** Slugs the buyer picked from the catalogue, comma-separated. */
  productSlugs: text("product_slugs"),
  /** Anything they wanted quoted that is not in the catalogue yet. */
  otherProducts: text("other_products"),
  quantity: text("quantity"),
  destinationCountry: text("destination_country"),
  destinationPort: text("destination_port"),
  packaging: text("packaging"),
  privateLabel: text("private_label").notNull().default("unsure"),
  message: text("message"),
  sourceProduct: text("source_product"),
  sourcePath: text("source_path"),
  status: text("status").notNull().default("new"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogPostsTable = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImageUrl: text("cover_image_url"),
  author: text("author").notNull().default("Narayani Distributors Team"),
  category: text("category").notNull().default("Snacking"),
  tags: text("tags"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  status: text("status").notNull().default("draft"),
  readMinutes: integer("read_minutes").notNull().default(3),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
