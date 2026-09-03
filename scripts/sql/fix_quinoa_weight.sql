-- Correct the pack weight on Quinoa Chips Peri Peri.
--
-- It is stored as 1500g while every other product in healthy_chips is 150g —
-- a factor-of-ten typo. Weight feeds shipping, so the wrong value inflates
-- freight on any order containing this SKU.

BEGIN;

UPDATE products
   SET weight_grams = 150
 WHERE slug = 'quinoa-chips-peri-peri'
   AND weight_grams = 1500;   -- no-op if it has already been corrected

-- Verify before committing (expect 150, and the row count to be 1):
--   SELECT name, weight_grams, shelf_life_months
--     FROM products WHERE category = 'healthy_chips' ORDER BY name;

COMMIT;

-- Not changed, because you asked only about the weight: this same row also has
-- shelf_life_months = 9 where its siblings are 6. That may be deliberate, so it
-- is left alone. If it is also wrong, run:
--
--   UPDATE products SET shelf_life_months = 6
--    WHERE slug = 'quinoa-chips-peri-peri';
