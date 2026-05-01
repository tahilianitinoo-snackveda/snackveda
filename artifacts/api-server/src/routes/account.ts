import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, addressesTable } from "@workspace/db";
import { CreateMyAddressBody } from "@workspace/api-zod";
import { profileUser, requireAuth } from "../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const UpdateProfileBodyLocal = z.object({
  fullName: z.string(),
  phone: z.string().nullish(),
  businessName: z.string().nullish(),
  gstNumber: z.string().nullish(),
  businessAddress: z.string().nullish(),
});

router.get("/account/me", requireAuth, (req, res) => {
  res.json(profileUser(req.user!));
});

router.patch("/account/me", requireAuth, async (req, res) => {
  const parsed = UpdateProfileBodyLocal.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid profile data", code: "VALIDATION_ERROR" });
  }
  const body = parsed.data;
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(body.fullName !== undefined && { fullName: body.fullName }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.businessName !== undefined && { businessName: body.businessName }),
      ...(body.gstNumber !== undefined && { gstNumber: body.gstNumber }),
      ...(body.businessAddress !== undefined && { businessAddress: body.businessAddress }),
    })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json(profileUser(updated));
});

router.get("/account/addresses", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, req.user!.id))
    .orderBy(desc(addressesTable.createdAt));
  res.json(
    rows.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.isDefault,
    })),
  );
});

router.post("/account/addresses", requireAuth, async (req, res) => {
  const parsed = CreateMyAddressBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid address", code: "VALIDATION_ERROR" });
  }
  const body = parsed.data;
  const [a] = await db
    .insert(addressesTable)
    .values({
      userId: req.user!.id,
      fullName: body.fullName,
      phone: body.phone,
      line1: body.line1,
      line2: body.line2 ?? null,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      isDefault: false,
    })
    .returning();
  res.status(201).json({
    id: a.id,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
  });
});

export default router;
