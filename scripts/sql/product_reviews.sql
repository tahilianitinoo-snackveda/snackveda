-- product_reviews — customer reviews, moderated before they appear.
--
-- Spec point 37: genuine reviews only, and if there are none, show none. Nothing in
-- this file seeds an example review, and nothing anywhere in the codebase generates
-- one. A product with no approved reviews renders an invitation to write the first,
-- not a fabricated five stars.
--
-- WHY MODERATED
-- A public write endpoint on a food site attracts exactly two things: spam, and
-- claims about allergies and illness that need a human to see them before they are
-- published. Every review lands as 'pending' and an admin approves it.
--
-- Idempotent. Safe to run twice.

BEGIN;

CREATE TABLE IF NOT EXISTS product_reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name       text        NOT NULL,
  rating            integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title             text,
  body              text,
  verified_purchase boolean     NOT NULL DEFAULT false,
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','approved','rejected')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- One review per customer per product. Without this, a single unhappy afternoon
-- puts six one-star reviews on the same page, and the average stops meaning
-- anything. A customer who wants to change their mind edits the review they have.
CREATE UNIQUE INDEX IF NOT EXISTS product_reviews_one_per_customer
  ON product_reviews (product_id, user_id);

-- The public read is always "approved reviews for this product, newest first".
CREATE INDEX IF NOT EXISTS product_reviews_product_status_idx
  ON product_reviews (product_id, status, created_at DESC);

-- The moderation queue is "everything pending, oldest first".
CREATE INDEX IF NOT EXISTS product_reviews_status_idx
  ON product_reviews (status, created_at);

COMMIT;
