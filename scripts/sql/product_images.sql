-- Replace product imagery with the shoot delivered in "Image URLs.xlsx" (68 images, 4 per SKU).
-- Every URL was checked and returns HTTP 200 before this file was written.
--
-- Three SKUs in the sheet were missing from the catalogue and are created here. Their
-- pricing, MOQ, HSN, weight and shelf life are copied from their category siblings, which
-- are uniform: chips are 199/149 at MOQ 5, superpuffs are 47.60/40 at MOQ 35. Check the
-- prices before committing if that assumption is wrong.
--
-- "Superpuffs Spanish Tomato" is deliberately untouched: the sheet has no images for it,
-- and clearing them would leave it with no photo on the shop page.
--
-- "Makhana Mint" in the sheet is applied to the "Makhana Pudina" SKU.

BEGIN;

-- 1. Create the three missing SKUs -------------------------------------------

INSERT INTO products (name, slug, category, b2c_price, b2b_price, moq, carton_qty,
                      gst_percent, hsn_code, shelf_life_months, weight_grams,
                      description, stock_qty, status, sort_order)
SELECT 'Beetroot Chips Cream and Onion', 'beetroot-chips-cream-and-onion', 'healthy_chips', 199.00, 149.00, 5, 1,
        5, '21069099', 6, 150,
        'Crunchy beetroot chips layered with creamy onion seasoning for a smooth, savoury finish. Naturally vibrant and delicious, this snack is wholesome, crunchy, and full of flavor.', 50, 'active', 0
 WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'beetroot-chips-cream-and-onion');

INSERT INTO products (name, slug, category, b2c_price, b2b_price, moq, carton_qty,
                      gst_percent, hsn_code, shelf_life_months, weight_grams,
                      description, stock_qty, status, sort_order)
SELECT 'Beetroot Chips Peri Peri', 'beetroot-chips-peri-peri', 'healthy_chips', 199.00, 149.00, 5, 1,
        5, '21069099', 6, 150,
        'Crispy beetroot chips seasoned with fiery peri peri for the perfect spicy kick. Naturally vibrant and delicious, this snack delivers bold flavor with every crunchy bite.', 50, 'active', 0
 WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'beetroot-chips-peri-peri');

INSERT INTO products (name, slug, category, b2c_price, b2b_price, moq, carton_qty,
                      gst_percent, hsn_code, shelf_life_months, weight_grams,
                      description, stock_qty, status, sort_order)
SELECT 'Superpuffs Indie Masala', 'superpuffs-indie-masala', 'superpuffs', 47.60, 40.00, 35, 1,
        5, '21069099', 9, 50,
        'Bold Indian masala meets crispy multigrain goodness in Superpuffs Indie Masala. Baked for a light yet satisfying crunch, every pack provides 12.5g protein along with Calcium and Vitamin D2 for added nutrition.', 500, 'active', 0
 WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'superpuffs-indie-masala');


-- 2. Clear existing imagery for just these SKUs -------------------------------

DELETE FROM product_images
 WHERE product_id IN (SELECT id FROM products WHERE slug IN ('beetroot-chips-cream-and-onion',
                                                        'beetroot-chips-indie-masala',
                                                        'beetroot-chips-peri-peri',
                                                        'oats-chips-indie-masala',
                                                        'oats-chips-peri-peri',
                                                        'quinoa-chips-indie-masala',
                                                        'quinoa-chips-peri-peri',
                                                        'ragi-chips-indie-masala',
                                                        'ragi-chips-peri-peri',
                                                        'superpuffs-cream-and-onion',
                                                        'superpuffs-hot-n-sweet-chilli',
                                                        'superpuffs-indie-masala',
                                                        'makhana-cream-and-onion',
                                                        'makhana-himalayan-salt',
                                                        'makhana-pudina',
                                                        'makhana-peri-peri',
                                                        'makhana-tandoori'));


-- 3. Load the new imagery (first image of each set is primary) -----------------

-- Beetroot Cream N Onion Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Beetroot Chips Cream and Onion', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Cream%20N%20Onion%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Cream%20N%20Onion%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Cream%20N%20Onion%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Cream%20N%20Onion%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'beetroot-chips-cream-and-onion';

-- Beetroot Indie Masala Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Beetroot Indie Masala Chips', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Indie%20Masala%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Indie%20Masala%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Indie%20Masala%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Indie%20Masala%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'beetroot-chips-indie-masala';

-- Beetroot Peri Peri Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Beetroot Chips Peri Peri', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Peri%20Peri%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Peri%20Peri%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Peri%20Peri%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Beetroot%20Chips%20Peri%20Peri%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'beetroot-chips-peri-peri';

-- Oats Indie Masala Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Oats Indie Masala Chips', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Indie%20Masala%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Indie%20Masala%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Indie%20Masala%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Indie%20Masala%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'oats-chips-indie-masala';

-- Oats Peri Peri Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Oats Peri Peri Chips', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Peri%20Peri%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Peri%20Peri%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Peri%20Peri%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Oats%20Chips%20Peri%20Peri%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'oats-chips-peri-peri';

-- Quinoa Indie Masala Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Quinoa Indie Masala Chips', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Indie%20Masala%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Indie%20Masala%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Indie%20Masala%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Indie%20Masala%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'quinoa-chips-indie-masala';

-- Quinoa Peri Peri Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Quinoa Peri Peri Chips', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Peri%20Peri%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Peri%20Peri%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Peri%20Peri%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Quinoa%20Chips%20Peri%20Peri%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'quinoa-chips-peri-peri';

-- Ragi Indie Masala Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Ragi Indie Masala Chips', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Indie%20Masala%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Indie%20Masala%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Indie%20Masala%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Indie%20Masala%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'ragi-chips-indie-masala';

-- Ragi Peri Peri Chips
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Ragi Peri Peri Chips', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Peri%20Peri%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Peri%20Peri%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Peri%20Peri%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Ragi%20Chips%20Peri%20Peri%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'ragi-chips-peri-peri';

-- Superpuffs Cream N Onion
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Superpuffs Cream N Onion', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Cream%20N%20Onion%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'superpuffs-cream-and-onion';

-- Superpuffs Hot N Sweet Chilli
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Superpuffs Hot N Sweet Chilli', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Hot%20N%20Sweet%20Chilli%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'superpuffs-hot-n-sweet-chilli';

-- Superpuffs Indie Masala
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Superpuffs Indie Masala', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Indie%20Masala%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Indie%20Masala%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Indie%20Masala%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Superpuffs%20Can%20Indie%20Masala%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'superpuffs-indie-masala';

-- Makhana Cream N Onion
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Makhana Cream N Onion', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Cream%20N%20Onion%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Cream%20N%20Onion%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Cream%20N%20Onion%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Cream%20N%20Onion%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'makhana-cream-and-onion';

-- Makhana Himalayan Salt
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Makhana Himalayan Salt', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Himalayan%20Salt%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Himalayan%20Salt%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Himalayan%20Salt%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Himalayan%20Salt%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'makhana-himalayan-salt';

-- Makhana Mint
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Makhana Mint', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Mint%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Mint%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Mint%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Mint%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'makhana-pudina';

-- Makhana Peri Peri
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Makhana Peri Peri', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Peri%20Peri%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Peri%20Peri%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Peri%20Peri%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Peri%20Peri%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'makhana-peri-peri';

-- Makhana Tandoori
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
SELECT p.id, v.url, 'Makhana Tandoori', v.ord = 0, v.ord
  FROM products p
  CROSS JOIN (VALUES
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Tandoori%201.png', 0),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Tandoori%202.png', 1),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Tandoori%203.png', 2),
    ('https://lgmphgwravmmyjdmcuou.supabase.co/storage/v1/object/public/Product-image/Makhana%20Tandoori%204.png', 3)
  ) AS v(url, ord)
 WHERE p.slug = 'makhana-tandoori';


-- 4. Point each product's headline image at its new primary -------------------
UPDATE products p
   SET image_url = i.url
  FROM product_images i
 WHERE i.product_id = p.id
   AND i.is_primary
   AND p.slug IN ('beetroot-chips-cream-and-onion', 'beetroot-chips-indie-masala', 'beetroot-chips-peri-peri', 'oats-chips-indie-masala', 'oats-chips-peri-peri', 'quinoa-chips-indie-masala', 'quinoa-chips-peri-peri', 'ragi-chips-indie-masala', 'ragi-chips-peri-peri', 'superpuffs-cream-and-onion', 'superpuffs-hot-n-sweet-chilli', 'superpuffs-indie-masala', 'makhana-cream-and-onion', 'makhana-himalayan-salt', 'makhana-pudina', 'makhana-peri-peri', 'makhana-tandoori');

-- Verify before committing:
--   SELECT p.name, count(i.id) FROM products p
--     LEFT JOIN product_images i ON i.product_id = p.id
--    GROUP BY p.name ORDER BY p.name;

-- Report before committing. A 0 anywhere means something above silently failed.
SELECT 'products total' AS what, count(*)::text AS value FROM products
UNION ALL SELECT 'the 3 new SKUs', count(*)::text FROM products
  WHERE slug IN ('beetroot-chips-cream-and-onion','beetroot-chips-peri-peri','superpuffs-indie-masala')
UNION ALL SELECT 'product_images rows', count(*)::text FROM product_images;

COMMIT;
