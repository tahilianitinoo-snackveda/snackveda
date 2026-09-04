-- Analytics measurement IDs as settings, so Google Analytics, Meta and LinkedIn can
-- be connected from Admin -> Settings without a deploy. Seeded empty: with no ID
-- set, the site loads no third-party tag at all.
BEGIN;
INSERT INTO site_settings (key, value) VALUES
  ('ga4_id', ''),
  ('meta_pixel_id', ''),
  ('linkedin_partner_id', ''),
  ('google_site_verification', '')
ON CONFLICT (key) DO NOTHING;
COMMIT;
