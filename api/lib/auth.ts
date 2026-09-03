import jwt from "jsonwebtoken";

// ─── JWT ──────────────────────────────────────────────────────────────────────
export function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "30d" });
}
export function verifyToken(token: string): { userId: string } | null {
  try { return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }; }
  catch { return null; }
}

export function profileUser(user: Record<string, unknown>): Record<string, unknown> {
  return { id: user.id, email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, b2bStatus: user.b2bStatus, customerType: user.customerType, businessName: user.businessName, gstNumber: user.gstNumber, businessAddress: user.businessAddress, ordersCount: user.ordersCount, createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt };
}
