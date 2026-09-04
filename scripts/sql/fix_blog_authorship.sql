-- One blog post is still credited to "SnackVeda Team", which is visible on the
-- live blog. This is a display string only — no login, no slug, no URL.
--
-- The admin account is still admin@snackveda.com and is NOT touched here.
-- rebrand_narayani.sql changes it, and changing a login identity is the business
-- owner's decision to make, not a migration to slip into a bug-fix pass.
--
-- Idempotent.
BEGIN;
UPDATE blog_posts SET author = 'Narayani Distributors Team' WHERE author = 'SnackVeda Team';
COMMIT;
