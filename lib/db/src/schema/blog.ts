import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

// `status` is a plain text column (not a pgEnum) so that this definition matches
// the serverless handlers in api/index.ts and netlify/functions/api.ts, which
// declare the same table inline, and scripts/sql/blog_posts.sql.
export const blogPostsTable = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImageUrl: text("cover_image_url"),
  author: text("author").notNull().default("SnackVeda Team"),
  category: text("category").notNull().default("Snacking"),
  tags: text("tags"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  readMinutes: integer("read_minutes").notNull().default(3),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type BlogPost = typeof blogPostsTable.$inferSelect;
