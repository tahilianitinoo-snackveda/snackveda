import { pgTable, uuid, text, boolean, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "b2c_customer",
  "b2b_customer",
  "super_admin",
]);

export const customerTypeEnum = pgEnum("customer_type", [
  "retail",
  "kirana",
  "modern_retail",
  "gym",
  "pharmacy",
  "cafe",
  "corporate",
]);

export const b2bStatusEnum = pgEnum("b2b_status", [
  "pending",
  "approved",
  "rejected",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("b2c_customer"),
  customerType: customerTypeEnum("customer_type"),
  businessName: text("business_name"),
  gstNumber: text("gst_number"),
  businessAddress: text("business_address"),
  b2bStatus: b2bStatusEnum("b2b_status"),
  ordersCount: integer("orders_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof usersTable.$inferSelect;
