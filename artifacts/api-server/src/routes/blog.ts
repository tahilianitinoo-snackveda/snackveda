import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import { z } from "zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

const BlogPostBody = z.object({
  title: z.string().min(2),
  slug: z.string().nullish(),
  excerpt: z.string().nullish(),
  content: z.string().min(1),
  coverImageUrl: z.string().nullish(),
  author: z.string().nullish(),
  category: z.string().nullish(),
  tags: z.union([z.string(), z.array(z.string())]).nullish(),
  metaTitle: z.string().nullish(),
  metaDescription: z.string().nullish(),
  status: z.enum(["draft", "published"]).nullish(),
  readMinutes: z.number().nullish(),
});

function serialize(p: typeof blogPostsTable.$inferSelect, withContent = true) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    ...(withContent ? { content: p.content } : {}),
    coverImageUrl: p.coverImageUrl,
    author: p.author,
    category: p.category,
    tags: (p.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    status: p.status,
    readMinutes: p.readMinutes,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

function estimateReadMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function tagsToText(tags: string | string[] | null | undefined) {
  if (tags === null || tags === undefined) return null;
  return Array.isArray(tags) ? tags.join(",") : tags;
}

// ── Public ──────────────────────────────────────────────────────────────────
router.get("/blog", async (req, res) => {
  let rows = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "published"))
    .orderBy(desc(blogPostsTable.publishedAt));
  const category = typeof req.query.category === "string" ? req.query.category.toLowerCase() : undefined;
  if (category) rows = rows.filter((r) => r.category.toLowerCase() === category);
  const tag = typeof req.query.tag === "string" ? req.query.tag.toLowerCase() : undefined;
  if (tag) {
    rows = rows.filter((r) => (r.tags ?? "").toLowerCase().split(",").map((t) => t.trim()).includes(tag));
  }
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  if (limit && Number.isFinite(limit)) rows = rows.slice(0, Math.max(1, Math.min(50, limit)));
  res.json(rows.map((p) => serialize(p, false)));
});

router.get("/blog/:slug", async (req, res) => {
  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, req.params.slug), eq(blogPostsTable.status, "published")))
    .limit(1);
  if (!post) return res.status(404).json({ message: "Post not found", code: "NOT_FOUND" });
  const related = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "published"))
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(4);
  res.json({
    post: serialize(post),
    related: related.filter((r) => r.id !== post.id).slice(0, 3).map((r) => serialize(r, false)),
  });
});

// ── Admin ───────────────────────────────────────────────────────────────────
router.get("/admin/blog", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.createdAt));
  res.json(rows.map((p) => serialize(p)));
});

router.post("/admin/blog", requireAdmin, async (req, res) => {
  const parsed = BlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid post data", code: "VALIDATION_ERROR" });
  }
  const d = parsed.data;
  const slug = slugify(d.slug || d.title);
  if (!slug) return res.status(400).json({ message: "Title or slug is required", code: "VALIDATION_ERROR" });
  const [existing] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.slug, slug)).limit(1);
  if (existing) return res.status(400).json({ message: "A post with this slug already exists", code: "SLUG_TAKEN" });
  const [row] = await db
    .insert(blogPostsTable)
    .values({
      title: d.title,
      slug,
      excerpt: d.excerpt ?? null,
      content: d.content,
      coverImageUrl: d.coverImageUrl || null,
      author: d.author || "SnackVeda Team",
      category: d.category || "Snacking",
      tags: tagsToText(d.tags),
      metaTitle: d.metaTitle ?? null,
      metaDescription: d.metaDescription ?? null,
      status: d.status || "draft",
      readMinutes: d.readMinutes || estimateReadMinutes(d.content),
      publishedAt: d.status === "published" ? new Date() : null,
    })
    .returning();
  req.log.info({ postId: row.id, slug: row.slug }, "blog post created");
  res.status(201).json(serialize(row));
});

router.patch("/admin/blog/:id", requireAdmin, async (req, res) => {
  const parsed = BlogPostBody.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid post data", code: "VALIDATION_ERROR" });
  }
  const d = parsed.data;
  const id = String(req.params.id);
  const [current] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, id)).limit(1);
  if (!current) return res.status(404).json({ message: "Post not found", code: "NOT_FOUND" });

  const update: Partial<typeof blogPostsTable.$inferInsert> = {};
  if (d.title !== undefined) update.title = d.title;
  if (d.slug !== undefined && d.slug !== null) {
    const slug = slugify(d.slug);
    if (slug && slug !== current.slug) {
      const [clash] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.slug, slug)).limit(1);
      if (clash) return res.status(400).json({ message: "A post with this slug already exists", code: "SLUG_TAKEN" });
      update.slug = slug;
    }
  }
  if (d.excerpt !== undefined) update.excerpt = d.excerpt;
  if (d.content !== undefined) {
    update.content = d.content;
    if (d.readMinutes === undefined) update.readMinutes = estimateReadMinutes(d.content);
  }
  if (d.coverImageUrl !== undefined) update.coverImageUrl = d.coverImageUrl || null;
  if (d.author !== undefined && d.author !== null) update.author = d.author;
  if (d.category !== undefined && d.category !== null) update.category = d.category;
  if (d.tags !== undefined) update.tags = tagsToText(d.tags);
  if (d.metaTitle !== undefined) update.metaTitle = d.metaTitle;
  if (d.metaDescription !== undefined) update.metaDescription = d.metaDescription;
  if (d.readMinutes !== undefined && d.readMinutes !== null) update.readMinutes = d.readMinutes;
  if (d.status !== undefined && d.status !== null) {
    update.status = d.status;
    // Stamp publishedAt the first time a post goes live; keep the original date afterwards.
    if (d.status === "published" && !current.publishedAt) update.publishedAt = new Date();
  }

  const [row] = await db.update(blogPostsTable).set(update).where(eq(blogPostsTable.id, id)).returning();
  res.json(serialize(row));
});

router.delete("/admin/blog/:id", requireAdmin, async (req, res) => {
  const [deleted] = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, String(req.params.id))).returning();
  if (!deleted) return res.status(404).json({ message: "Post not found", code: "NOT_FOUND" });
  req.log.info({ postId: deleted.id }, "blog post deleted");
  res.json({ deleted: true, id: deleted.id });
});

export default router;
