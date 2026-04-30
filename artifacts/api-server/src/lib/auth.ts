import type { Request, Response, NextFunction } from "express";
import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.session?.userId) return next();
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);
  if (u) req.user = u;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required", code: "UNAUTHORIZED" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required", code: "UNAUTHORIZED" });
  }
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Admin access required", code: "FORBIDDEN" });
  }
  next();
}

export function requireApprovedB2b(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required", code: "UNAUTHORIZED" });
  }
  if (req.user.role !== "b2b_customer" || req.user.b2bStatus !== "approved") {
    return res.status(403).json({ message: "Approved B2B account required", code: "FORBIDDEN" });
  }
  next();
}

export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    b2bStatus: u.b2bStatus,
  };
}

export function profileUser(u: User) {
  return {
    ...publicUser(u),
    customerType: u.customerType,
    businessName: u.businessName,
    gstNumber: u.gstNumber,
    businessAddress: u.businessAddress,
    ordersCount: u.ordersCount,
  };
}
