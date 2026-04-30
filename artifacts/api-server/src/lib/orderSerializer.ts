import { db, ordersTable, orderItemsTable, paymentsTable, addressesTable, productsTable, invoicesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function serializeOrder(orderId: string) {
  const [o] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!o) return null;
  const items = await db
    .select({
      id: orderItemsTable.id,
      productId: orderItemsTable.productId,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      gstPercent: orderItemsTable.gstPercent,
      gstAmount: orderItemsTable.gstAmount,
      lineTotal: orderItemsTable.lineTotal,
      hsnCode: orderItemsTable.hsnCode,
      name: productsTable.name,
      slug: productsTable.slug,
      category: productsTable.category,
      weightGrams: productsTable.weightGrams,
      imageUrl: productsTable.imageUrl,
    })
    .from(orderItemsTable)
    .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));
  const [pay] = await db.select().from(paymentsTable).where(eq(paymentsTable.orderId, orderId)).limit(1);
  const [addr] = o.shippingAddressId
    ? await db.select().from(addressesTable).where(eq(addressesTable.id, o.shippingAddressId)).limit(1)
    : [undefined];
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.orderId, orderId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, o.userId)).limit(1);

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    orderType: o.orderType,
    status: o.status,
    subtotal: Number(o.subtotal),
    discountAmount: Number(o.discountAmount),
    discountPercent: Number(o.discountPercent),
    gstAmount: Number(o.gstAmount),
    shippingCharge: Number(o.shippingCharge),
    totalAmount: Number(o.totalAmount),
    invoiceNumber: inv?.invoiceNumber ?? null,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    user: user
      ? { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, businessName: user.businessName, gstNumber: user.gstNumber }
      : null,
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      slug: i.slug,
      category: i.category,
      weightGrams: i.weightGrams,
      imageUrl: i.imageUrl,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      gstPercent: Number(i.gstPercent),
      gstAmount: Number(i.gstAmount),
      lineTotal: Number(i.lineTotal),
      hsnCode: i.hsnCode,
    })),
    shippingAddress: addr
      ? {
          id: addr.id,
          fullName: addr.fullName,
          phone: addr.phone,
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          isDefault: addr.isDefault,
        }
      : null,
    payment: pay
      ? {
          id: pay.id,
          paymentMethod: pay.paymentMethod,
          paymentStatus: pay.paymentStatus,
          amount: Number(pay.amount),
          referenceNumber: pay.referenceNumber,
          paymentLinkUrl: pay.paymentLinkUrl,
          paidAt: pay.paidAt ? pay.paidAt.toISOString() : null,
        }
      : null,
  };
}
