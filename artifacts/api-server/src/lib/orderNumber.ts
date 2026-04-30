import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { sql, and, like } from "drizzle-orm";

export async function generateOrderNumber(orderType: "b2c" | "b2b"): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SV-${orderType.toUpperCase()}-${year}-`;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(and(like(ordersTable.orderNumber, `${prefix}%`)));
  const next = (row?.count ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(and(like(ordersTable.orderNumber, `%`)));
  const next = (row?.count ?? 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}
