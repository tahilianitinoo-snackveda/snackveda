import bcrypt from "bcryptjs";
import { db, productsTable, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const products = [
  // Healthy Chips
  { name: "Ragi Sea Salt Chips",      slug: "ragi-sea-salt-chips",      category: "healthy_chips" as const, variant: "60g", b2cPrice: 89,  b2bPrice: 60,  moq: 24, cartonQty: 96,  weightGrams: 60,  description: "Stone-milled finger millet chips, slow-baked with pink Himalayan salt. Calcium-rich, gluten-free, deeply earthy crunch.", sortOrder: 1 },
  { name: "Ragi Peri-Peri Chips",     slug: "ragi-peri-peri-chips",     category: "healthy_chips" as const, variant: "60g", b2cPrice: 99,  b2bPrice: 65,  moq: 24, cartonQty: 96,  weightGrams: 60,  description: "Goan-inspired peri-peri spice on calcium-packed ragi chips. Smoky heat without artificial colour.", sortOrder: 2 },
  { name: "Quinoa Cracked Pepper Chips", slug: "quinoa-cracked-pepper-chips", category: "healthy_chips" as const, variant: "60g", b2cPrice: 119, b2bPrice: 80,  moq: 24, cartonQty: 96,  weightGrams: 60,  description: "Andean quinoa pressed thin and finished with hand-cracked Tellicherry pepper.", sortOrder: 3 },
  { name: "Oats Tangy Tomato Chips",  slug: "oats-tangy-tomato-chips",  category: "healthy_chips" as const, variant: "60g", b2cPrice: 89,  b2bPrice: 60,  moq: 24, cartonQty: 96,  weightGrams: 60,  description: "Fibre-rich rolled oats baked with sun-ripened tomato, basil and a hint of garlic.", sortOrder: 4 },
  { name: "Oats Pudina Mint Chips",   slug: "oats-pudina-mint-chips",   category: "healthy_chips" as const, variant: "60g", b2cPrice: 89,  b2bPrice: 60,  moq: 24, cartonQty: 96,  weightGrams: 60,  description: "Cooling pudina and roasted cumin on baked oats — the chai-time chip your nani would approve of.", sortOrder: 5 },
  { name: "Beetroot & Spinach Chips", slug: "beetroot-spinach-chips",   category: "healthy_chips" as const, variant: "60g", b2cPrice: 129, b2bPrice: 85,  moq: 24, cartonQty: 96,  weightGrams: 60,  description: "Real beetroot and spinach, kettle-baked into vibrant ruby-and-jade crisps. Iron, fibre, and absolutely no neon orange dust.", sortOrder: 6 },
  // Makhana
  { name: "Himalayan Pink Salt Makhana", slug: "himalayan-pink-salt-makhana", category: "makhana" as const, variant: "75g", b2cPrice: 149, b2bPrice: 100, moq: 24, cartonQty: 96,  weightGrams: 75,  description: "Hand-roasted Bihar lotus seeds in cold-pressed groundnut oil, finished with pink salt.", sortOrder: 7 },
  { name: "Tangy Tomato Makhana",     slug: "tangy-tomato-makhana",     category: "makhana" as const, variant: "75g", b2cPrice: 149, b2bPrice: 100, moq: 24, cartonQty: 96,  weightGrams: 75,  description: "Crispy makhana tossed in sun-dried tomato, oregano and a touch of jaggery.", sortOrder: 8 },
  { name: "Cheese & Herbs Makhana",   slug: "cheese-herbs-makhana",     category: "makhana" as const, variant: "75g", b2cPrice: 159, b2bPrice: 105, moq: 24, cartonQty: 96,  weightGrams: 75,  description: "Aged cheddar powder, basil and rosemary on plump puffed lotus seeds.", sortOrder: 9 },
  { name: "Peri-Peri Makhana",        slug: "peri-peri-makhana",        category: "makhana" as const, variant: "75g", b2cPrice: 149, b2bPrice: 100, moq: 24, cartonQty: 96,  weightGrams: 75,  description: "Smoky African peri-peri on temple-grade makhana. Bold, but never burning.", sortOrder: 10 },
  { name: "Pudina Mint Makhana",      slug: "pudina-mint-makhana",      category: "makhana" as const, variant: "75g", b2cPrice: 149, b2bPrice: 100, moq: 24, cartonQty: 96,  weightGrams: 75,  description: "Cool pudina, roasted jeera and lemon — the lassi-stand classic, in a snack.", sortOrder: 11 },
  // Superpuffs
  { name: "Multigrain Sea Salt Superpuffs", slug: "multigrain-sea-salt-superpuffs", category: "superpuffs" as const, variant: "50g", b2cPrice: 79,  b2bPrice: 52,  moq: 36, cartonQty: 144, weightGrams: 50, description: "Five Indian millets puffed and lightly salted. Light as air, no maida.", sortOrder: 12 },
  { name: "Multigrain Cheese Superpuffs",   slug: "multigrain-cheese-superpuffs",   category: "superpuffs" as const, variant: "50g", b2cPrice: 89,  b2bPrice: 58,  moq: 36, cartonQty: 144, weightGrams: 50, description: "Real aged cheese powder on multigrain puffs. Lunchbox hero.", sortOrder: 13 },
  { name: "Multigrain Tangy Tomato Superpuffs", slug: "multigrain-tangy-tomato-superpuffs", category: "superpuffs" as const, variant: "50g", b2cPrice: 79,  b2bPrice: 52,  moq: 36, cartonQty: 144, weightGrams: 50, description: "A tangy desi tomato spice mix on light millet puffs. Tiffin gold.", sortOrder: 14 },
  { name: "Multigrain Peri-Peri Superpuffs", slug: "multigrain-peri-peri-superpuffs", category: "superpuffs" as const, variant: "50g", b2cPrice: 89,  b2bPrice: 58,  moq: 36, cartonQty: 144, weightGrams: 50, description: "African heat on Indian millets — bold, smoky, never overpowering.", sortOrder: 15 },
  { name: "Multigrain Pudina Superpuffs",   slug: "multigrain-pudina-superpuffs",   category: "superpuffs" as const, variant: "50g", b2cPrice: 79,  b2bPrice: 52,  moq: 36, cartonQty: 144, weightGrams: 50, description: "Pudina, jeera and a whisper of lemon on millet puffs. Thanda thanda, cool cool.", sortOrder: 16 },
];

async function seed() {
  console.log("Seeding admin user...");
  const adminEmail = "admin@snackveda.com";
  const adminPass = await bcrypt.hash("Admin@123", 10);
  await db
    .insert(usersTable)
    .values({
      email: adminEmail,
      passwordHash: adminPass,
      fullName: "SnackVeda Admin",
      role: "super_admin",
      customerType: "retail",
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: { fullName: "SnackVeda Admin", role: "super_admin", isActive: true },
    });

  console.log("Seeding products...");
  for (const p of products) {
    await db
      .insert(productsTable)
      .values({
        name: p.name,
        slug: p.slug,
        category: p.category,
        variant: p.variant,
        b2cPrice: String(p.b2cPrice),
        b2bPrice: String(p.b2bPrice),
        moq: p.moq,
        cartonQty: p.cartonQty,
        gstPercent: "5.00",
        hsnCode: "2106",
        shelfLifeMonths: 6,
        weightGrams: p.weightGrams,
        description: p.description,
        stockQty: 200,
        status: "active",
        sortOrder: p.sortOrder,
      })
      .onConflictDoUpdate({
        target: productsTable.slug,
        set: {
          name: p.name,
          variant: p.variant,
          b2cPrice: String(p.b2cPrice),
          b2bPrice: String(p.b2bPrice),
          moq: p.moq,
          cartonQty: p.cartonQty,
          weightGrams: p.weightGrams,
          description: p.description,
          sortOrder: p.sortOrder,
        },
      });
  }

  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(productsTable);
  console.log(`Seed complete. Products in DB: ${c}`);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
