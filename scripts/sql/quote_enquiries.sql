-- quote_enquiries — the table behind /request-a-quote.
--
-- Until now the form did not post anywhere. It built a mailto: link and asked the
-- buyer to press send, which means every enquiry where they closed the tab instead
-- was lost with no trace. This table is the record; the notification email is a
-- convenience on top of it, and is allowed to fail.
--
-- Idempotent. Safe to run twice.

BEGIN;

CREATE TABLE IF NOT EXISTS quote_enquiries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           text        NOT NULL,
  enquiry_type        text        NOT NULL,
  company_name        text        NOT NULL,
  contact_person      text        NOT NULL,
  country             text        NOT NULL,
  state               text,
  city                text,
  email               text        NOT NULL,
  phone               text        NOT NULL,
  product_slugs       text,
  other_products      text,
  quantity            text,
  destination_country text,
  destination_port    text,
  packaging           text,
  private_label       text        NOT NULL DEFAULT 'unsure',
  message             text,
  source_product      text,
  source_path         text,
  status              text        NOT NULL DEFAULT 'new',
  admin_notes         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- The reference is what a buyer quotes back at us, so two enquiries must never
-- share one. The unique index is also what makes the retry in the handler correct:
-- a collision under concurrency raises here rather than silently duplicating.
CREATE UNIQUE INDEX IF NOT EXISTS quote_enquiries_reference_key
  ON quote_enquiries (reference);

-- The admin list is "newest first", and the counter that builds the next reference
-- filters by year prefix on reference. Both read this index.
CREATE INDEX IF NOT EXISTS quote_enquiries_created_at_idx
  ON quote_enquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS quote_enquiries_status_idx
  ON quote_enquiries (status);

COMMIT;
