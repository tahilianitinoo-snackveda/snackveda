-- Narayani_Distributors_Product_Pricing-4.xlsx  ->  products
--
-- Brings the catalogue in line with the pricing sheet supplied 04 Sep 2026.
-- Nothing is deleted: every existing product is updated in place, and the SKUs
-- the sheet lists but the database lacks are inserted.
--
-- WHAT THE SHEET CHANGED
--   Healthy Chips   199/149 -> 209/156, MOQ 5->12, carton 1->40
--   Makhana         285/214 -> 299/224, MOQ 5->12, carton 1->16
--   Superpuffs 50g  47.60/40 -> 50/40,  carton 1->35
--   Superpuffs 150g a whole pack format that did not exist here at all
--
-- MOQ applies to B2B quotes only (api/_lib/pricing.ts: meetsMoq is true for b2c),
-- so raising it from 5 to 12 does not force a retail shopper to buy a dozen.
--
-- THE 150 g CAN LINE
--   The sheet lists Superpuffs in two pack formats. Only the 50 g pouch was in
--   the database. Every Superpuffs photograph supplied is named "Superpuffs Can
--   ...", and the transcribed pack panel prints "Servings Per Jar : 3" against a
--   50 g serve -- so all the Superpuffs material we hold describes the 150 g can,
--   and it was attached to the pouches only because the can SKUs did not exist.
--   superpuffs-indie-masala is converted rather than duplicated: the sheet lists
--   Indie Masala ONLY as a can, and that row was created by the image migration
--   purely because can photographs existed for it. No order references it, so
--   the conversion loses nothing.
--
-- Idempotent: re-running changes nothing. Safe to run twice.

BEGIN;

-- -- 1. Healthy Chips -- 150 g jar ------------------------------------------
-- beetroot-chips-peri-peri is NOT in the sheet but exists here with its own
-- photographs. Every Healthy Chips row in the sheet carries identical pricing,
-- so it takes the line rate. Confirm it is a real SKU.
UPDATE products SET
  b2c_price = 209.00, b2b_price = 156.00,
  moq = 12, carton_qty = 40,
  gst_percent = 5.00, hsn_code = '21069099',
  shelf_life_months = 6, weight_grams = 150,
  variant = '150 GM jar',
  updated_at = now()
WHERE category = 'healthy_chips';

-- -- 2. Makhana -- 76 g can --------------------------------------------------
UPDATE products SET
  b2c_price = 299.00, b2b_price = 224.00,
  moq = 12, carton_qty = 16,
  gst_percent = 5.00, hsn_code = '20081920',
  shelf_life_months = 6, weight_grams = 76,
  variant = '76 GM can',
  updated_at = now()
WHERE category = 'makhana';

-- -- 3. Superpuffs -- 50 g pouch ---------------------------------------------
-- The pack format goes into the name as well as variant: the pouch and the can
-- of the same flavour are separate SKUs five times apart in price, and they show
-- the same photograph until pouch photographs exist. variant is not rendered
-- anywhere on the storefront, so the name is what a shopper and an invoice see.
UPDATE products SET
  b2c_price = 50.00, b2b_price = 40.00,
  moq = 35, carton_qty = 35,
  gst_percent = 5.00, hsn_code = '21069099',
  shelf_life_months = 9, weight_grams = 50,
  variant = '50 GM pouch',
  name = CASE WHEN name LIKE '%(50 g Pouch)' THEN name ELSE name || ' (50 g Pouch)' END,
  updated_at = now()
WHERE slug IN ('superpuffs-cream-and-onion',
               'superpuffs-hot-n-sweet-chilli',
               'superpuffs-spanish-tomato');

-- -- 4. Superpuffs Indie Masala -- converted from 50 g pouch to 150 g can ----
-- The description loses its protein figure. It claimed "every pack provides
-- 12.5g protein", which is the per-50 g-serve figure off the Cream N Onion
-- panel; on a 150 g jar of three servings it is simply wrong, and no Indie
-- Masala panel exists to replace it with.
UPDATE products SET
  name = 'Superpuffs Indie Masala (150 g Can)',
  b2c_price = 250.00, b2b_price = 199.00,
  moq = 35, carton_qty = 36,
  gst_percent = 5.00, hsn_code = '21069099',
  shelf_life_months = 7, weight_grams = 150,
  variant = '150 GM can',
  description = 'Bold Indian masala over crispy multigrain Superpuffs, baked rather than fried for a light crunch. Supplied as a 150 g jar.',
  updated_at = now()
WHERE slug = 'superpuffs-indie-masala';

-- -- 5. The two 150 g cans the database is missing ---------------------------
INSERT INTO products (name, slug, category, variant, b2c_price, b2b_price, moq,
                      carton_qty, gst_percent, hsn_code, shelf_life_months,
                      weight_grams, description, stock_qty, status, sort_order)
SELECT 'Superpuffs Cream N Onion (150 g Can)', 'superpuffs-cream-n-onion-150g',
       'superpuffs', '150 GM can', 250.00, 199.00, 35, 36, 5.00, '21069099', 7, 150,
       'Creamy onion seasoning over crispy multigrain Superpuffs, baked rather than fried. A 150 g jar of three 50 g servings, each carrying 12.5 g protein alongside Calcium and Vitamin D2. No added sugar, cholesterol, palm oil, gluten or MSG.',
       200, 'active', 0
 WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'superpuffs-cream-n-onion-150g');

INSERT INTO products (name, slug, category, variant, b2c_price, b2b_price, moq,
                      carton_qty, gst_percent, hsn_code, shelf_life_months,
                      weight_grams, description, stock_qty, status, sort_order)
SELECT 'Superpuffs Hot N Sweet Chilli (150 g Can)', 'superpuffs-hot-n-sweet-chilli-150g',
       'superpuffs', '150 GM can', 250.00, 199.00, 35, 36, 5.00, '21069099', 7, 150,
       'Spicy chilli against a note of sweetness, over crispy multigrain Superpuffs, baked rather than fried. A 150 g jar of three 50 g servings, each carrying 12.5 g protein and fortified with Vitamin C, Iron and Vitamin B12. No added sugar, palm oil, gluten or MSG.',
       200, 'active', 0
 WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'superpuffs-hot-n-sweet-chilli-150g');

-- -- 6. Photographs for the two new cans -------------------------------------
-- These are the same files the 50 g pouches carry. They are photographs OF the
-- can, so the can is where they belong; they stay on the pouches too rather than
-- leave three live products with no image at all, until pouch photographs exist.
DELETE FROM product_images
 WHERE product_id IN (SELECT id FROM products
                       WHERE slug IN ('superpuffs-cream-n-onion-150g',
                                      'superpuffs-hot-n-sweet-chilli-150g'));

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Superpuffs Cream N Onion 150 g can', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'superpuffs-cream-n-onion-150g';

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Superpuffs Hot N Sweet Chilli 150 g can', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'superpuffs-hot-n-sweet-chilli-150g';

-- Mirror the primary image onto products.image_url, which the cart reads.
UPDATE products p SET image_url = pi.url, updated_at = now()
  FROM product_images pi
 WHERE pi.product_id = p.id AND pi.is_primary
   AND p.slug IN ('superpuffs-cream-n-onion-150g', 'superpuffs-hot-n-sweet-chilli-150g');

-- -- 7. Superpuffs Spanish Tomato -- remove the dead image rows --------------
-- All four of its URLs return HTTP 400; the storage bucket holds no Spanish
-- Tomato file under any name. Four broken-image icons are worse than the card's
-- own fallback tile, which renders the product name on a coloured ground.
DELETE FROM product_images
 WHERE url LIKE '%/Product-image/1\_S.png'
    OR url LIKE '%/Product-image/3\_S\_.png'
    OR url LIKE '%/Product-image/5\_S.png'
    OR url LIKE '%/Product-image/6\_S.png';

UPDATE products SET image_url = NULL, updated_at = now()
 WHERE slug = 'superpuffs-spanish-tomato'
   AND image_url LIKE '%/Product-image/1\_S.png';

COMMIT;
