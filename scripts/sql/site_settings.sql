-- site_settings — business identity and registration numbers, entered by the admin.
--
-- WHY THIS EXISTS
-- GET /orders/:id/invoice was shipping a hardcoded seller block on real invoices:
--   gstNumber "23AAAAA0000A1Z5"   — a placeholder, on documents issued under GST
--   phone     "+91 90000 00000"   — not a phone number
--   email     "hello@narayani..." — an address that does not exist
-- Registration numbers belong to the business, not to a deployment. They are rows
-- now, editable in Admin -> Settings, and every surface that shows one renders
-- nothing at all when it is blank rather than falling back to an invention.
--
-- Rows are seeded EMPTY on purpose. An empty value is the signal to render nothing;
-- there is no placeholder anywhere in this file.
--
-- Idempotent. Safe to run twice — existing values are never overwritten.

BEGIN;

CREATE TABLE IF NOT EXISTS site_settings (
  key        text PRIMARY KEY,
  value      text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the keys the admin screen and the invoice expect, so the form has its rows
-- and nothing has to guess at a key name. ON CONFLICT DO NOTHING means re-running
-- this never clobbers a real number someone has since typed in.
INSERT INTO site_settings (key, value) VALUES
  ('legal_name',        'Narayani Distributors'),
  ('gstin',             ''),
  ('iec',               ''),
  ('fssai',             ''),
  ('apeda_rcmc',        ''),
  ('cin',               ''),
  ('pan',               ''),
  ('registered_address', ''),
  ('support_email',     'support@narayanidistributors.com'),
  ('support_phone',     ''),
  ('whatsapp',          ''),
  ('bank_name',         ''),
  ('bank_account',      ''),
  ('bank_ifsc',         ''),
  ('upi_id',            '')
ON CONFLICT (key) DO NOTHING;

COMMIT;
