-- Narayani Distributors — blog_posts table
-- Run this once in the Supabase SQL editor (or `psql $DATABASE_URL -f scripts/sql/blog_posts.sql`).
-- Safe to re-run: everything is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS blog_posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  slug              text NOT NULL UNIQUE,
  excerpt           text,
  content           text NOT NULL,
  cover_image_url   text,
  author            text NOT NULL DEFAULT 'Narayani Distributors Team',
  category          text NOT NULL DEFAULT 'Snacking',
  tags              text,
  meta_title        text,
  meta_description  text,
  status            text NOT NULL DEFAULT 'draft',
  read_minutes      integer NOT NULL DEFAULT 3,
  published_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_status_published_idx
  ON blog_posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);

-- Optional starter post so /blog is not empty on first deploy.
INSERT INTO blog_posts (title, slug, excerpt, content, category, status, published_at, meta_title, meta_description)
SELECT
  'Why Makhana Is India''s Smartest Everyday Snack',
  'why-makhana-is-indias-smartest-everyday-snack',
  'Roasted fox nuts are light, protein-rich and guilt-free. Here is why makhana deserves a permanent spot in your snack drawer.',
  E'## A snack with a 3,000-year head start\n\nMakhana, or fox nuts, have been part of Indian kitchens for centuries — long before "healthy snacking" became a category.\n\n### What makes it different\n\n- **Low in calories** — a 30g serving is roughly 100 calories\n- **Plant protein** — around 3g per serving\n- **No deep frying** — ours are roasted, not fried\n- **Naturally gluten-free**\n\n### How we make ours\n\nWe source from Bihar, roast in small batches, and season with clean spices — no palm oil, no artificial flavour.\n\n> Snacking should feel good an hour later, not just for the first bite.\n\nExplore the full range on our [shop page](/shop).',
  'Nutrition',
  'published',
  now(),
  'Why Makhana Is India''s Smartest Everyday Snack | Narayani Distributors',
  'Roasted makhana is low-calorie, protein-rich and gluten-free. Learn why fox nuts are the smartest everyday Indian snack.'
WHERE NOT EXISTS (SELECT 1 FROM blog_posts);
