-- The commercial rules as settings, so the business can change its own discounts,
-- free-shipping threshold and wholesale minimum without a developer.
--
-- Seeded with the values the site is ALREADY charging, not with blanks: these are
-- live prices, and a blank that fell back to a different default would silently
-- change what customers pay. api/_lib/pricing.ts falls back to exactly these same
-- numbers if a row is missing, so the two can never disagree.
BEGIN;
INSERT INTO site_settings (key, value) VALUES
  ('discount_first_order_percent',  '15'),
  ('discount_second_order_percent', '10'),
  ('discount_repeat_percent',       '5'),
  ('free_shipping_threshold',       '999'),
  ('shipping_charge',               '60'),
  ('b2b_minimum_order_value',       '5000')
ON CONFLICT (key) DO NOTHING;
COMMIT;
