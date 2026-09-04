-- Spec point 42 — the product fields the admin screen could not edit, and
-- spec point 43 — multi-brand.
--
-- The admin could set name, slug, category, description, both prices, MOQ, GST,
-- HSN, shelf life, weight, stock and images. Everything else a food distributor
-- needs to publish a product had to be done by a developer, or could not be done
-- at all. In particular there was NO brand column anywhere: brand names lived only
-- inside a frontend transcription file, so a distributor selling other companies'
-- products could not record whose product it was.
--
-- WHERE INGREDIENTS AND NUTRITION ACTUALLY COME FROM — READ THIS
-- artifacts/narayani/src/data/product-panels.json holds careful transcriptions of
-- fourteen physical packs, including their inconsistencies and the disclosures that
-- explain them. That file remains the source of record for those products and TAKES
-- PRECEDENCE over the columns added here. These columns exist so a product with no
-- transcription can still carry its legally required information, entered by hand.
-- They are not a place to retype a panel that already has an entry.
--
-- Every column is nullable with no default. A field nobody has filled in must
-- render as absent, not as an empty string that looks like a real answer.
--
-- Idempotent. Safe to run twice.

BEGIN;

-- ── Identity and multi-brand (spec 43) ──────────────────────────────────────
-- `brand` is the brand printed on the pack, which is NOT Narayani. A product page
-- says "Brand: X, distributed by Narayani Distributors", and where the maker is a
-- third company it says that too. Blurring distributor, brand owner and
-- manufacturer is the specific thing this business must never do.
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand              text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer       text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_fssai text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS country_of_origin  text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory        text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku                text;

-- ── Consumer-facing pack information ────────────────────────────────────────
-- `mrp` is the printed maximum retail price, which is a legal declaration and is
-- not the same number as b2c_price. Nullable: a pack that prints no MRP shows none.
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp          numeric(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients  text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition    text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allergens    text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage      text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS highlights   text;

-- ── Which channels a product is actually offered through ────────────────────
-- Default TRUE for the first two so this migration changes nothing about what is
-- currently sellable. Private label defaults FALSE: it is a claim about what a
-- manufacturing partner will do, and must be turned on deliberately per product.
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_available     boolean NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS export_available        boolean NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS private_label_available boolean NOT NULL DEFAULT false;

-- ── SEO, per product (spec 27) ──────────────────────────────────────────────
-- Overrides only. Blank means the product page keeps the title and description it
-- generates from the product itself, which is a sane default and better than an
-- empty tag.
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title        text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description text;

-- SKUs are optional, but two products must not share one, or a picking list
-- becomes ambiguous. Partial index so any number of rows may leave it blank.
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_key
  ON products (sku) WHERE sku IS NOT NULL AND sku <> '';

COMMIT;
