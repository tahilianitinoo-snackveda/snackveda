import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { profileUser, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid registration data", code: "VALIDATION_ERROR" });
  }
  const body = parsed.data;
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, body.email.toLowerCase()))
    .limit(1);
  if (existing.length) {
    return res.status(400).json({ message: "An account with that email already exists", code: "EMAIL_TAKEN" });
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  const isB2b = body.accountType === "b2b";
  const [user] = await db
    .insert(usersTable)
    .values({
      email: body.email.toLowerCase(),
      passwordHash,
      fullName: body.fullName,
      phone: body.phone ?? null,
      role: isB2b ? "b2b_customer" : "b2c_customer",
      customerType: isB2b ? (body.businessType ?? "kirana") : "retail",
      businessName: body.businessName ?? null,
      gstNumber: body.gstNumber ?? null,
      businessAddress: body.businessAddress ?? null,
      b2bStatus: isB2b ? "pending" : null,
    })
    .returning();
  req.session.userId = user.id;
  req.log.info({ userId: user.id, role: user.role }, "user registered");
  res.status(201).json(profileUser(user));
});

router.post("/login", async (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login data", code: "VALIDATION_ERROR" });
  }
  const { email, password } = parsed.data;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
  }
  req.session.userId = user.id;
  res.json(profileUser(user));
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json(profileUser(req.user!));
});

export default router;
