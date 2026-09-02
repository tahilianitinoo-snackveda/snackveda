-- Rebrand SnackVeda -> Narayani Distributors for rows already in the database.
--
-- The code rebrand does not touch existing rows, so run this once against
-- production. Review it first: the first statement changes a LOGIN IDENTITY.
-- After it runs, sign in as admin@narayanidistributors.com. The password is
-- unchanged.
--
-- Slugs are deliberately left alone. Blog post slugs are indexed by Google and
-- rewriting them would 404 every existing link.

BEGIN;

-- Admin account (login identity + display name)
UPDATE users
   SET email     = 'admin@narayanidistributors.com',
       full_name = 'Narayani Distributors Admin'
 WHERE email = 'admin@snackveda.com';

-- Blog authorship
UPDATE blog_posts
   SET author = 'Narayani Distributors Team'
 WHERE author = 'SnackVeda Team';

-- Brand mentions in blog copy (slug untouched)
UPDATE blog_posts
   SET title            = replace(title,            'SnackVeda', 'Narayani Distributors'),
       excerpt          = replace(excerpt,          'SnackVeda', 'Narayani Distributors'),
       content          = replace(content,          'SnackVeda', 'Narayani Distributors'),
       meta_title       = replace(meta_title,       'SnackVeda', 'Narayani Distributors'),
       meta_description = replace(meta_description, 'SnackVeda', 'Narayani Distributors')
 WHERE title            LIKE '%SnackVeda%'
    OR excerpt          LIKE '%SnackVeda%'
    OR content          LIKE '%SnackVeda%'
    OR meta_title       LIKE '%SnackVeda%'
    OR meta_description LIKE '%SnackVeda%';

-- Product copy (slug untouched)
UPDATE products
   SET name        = replace(name,        'SnackVeda', 'Narayani Distributors'),
       description = replace(description, 'SnackVeda', 'Narayani Distributors')
 WHERE name        LIKE '%SnackVeda%'
    OR description LIKE '%SnackVeda%';

-- Verify before committing:
--   SELECT email, full_name FROM users WHERE role = 'super_admin';
--   SELECT count(*) FROM blog_posts WHERE content LIKE '%SnackVeda%';
--   SELECT count(*) FROM products   WHERE description LIKE '%SnackVeda%';

COMMIT;
