# Blog + Google Search Console — setup guide

Everything below is a one-time setup. After that, the admin just writes posts.

---

## 1. Create the database table (do this first)

The blog needs one new table. Open **Supabase → SQL Editor**, paste the contents of
`scripts/sql/blog_posts.sql`, and run it. It is safe to run more than once.

Alternative (if `DATABASE_URL` is set locally):

```bash
pnpm --filter @workspace/db run push
```

Until the table exists, `/blog` shows "No posts published yet" and `/admin/blog` errors.

---

## 2. Deploy

Push to the branch Vercel builds. Nothing else to configure — the API function,
the blog pages and the sitemap all ship with the same deploy.

Optional env var: `SITE_URL` (defaults to `https://narayanidistributors.com`). Set it if the
production domain ever changes, so the sitemap emits the right URLs.

---

## 3. Writing posts (admin)

Log in as the admin, go to **Admin → Blog → New Post**.

| Field | What it does |
|---|---|
| Title | The `<h1>` and the default Google headline |
| URL slug | The page address, `narayanidistributors.com/blog/<slug>`. Don't change it after publishing — Google has already indexed the old one |
| Category | Groups posts and shows as the filter chips on `/blog` |
| Cover image URL | Shown on the listing, the post header, and in WhatsApp/social previews. Use 1200×630px |
| Excerpt | The 1–2 line summary on the listing page |
| Content | Markdown — `## heading`, `**bold**`, `*italic*`, `- list`, `> quote`, `[link](url)`, `![image](url)`. Use the **Preview** button |
| Tags | Comma separated, shown at the bottom of the post |
| Meta title / description | What Google shows in search results. Leave blank to fall back to the title/excerpt |
| Publish now | Off = draft (invisible on the site). On = live and added to the sitemap |

The read-time estimate is calculated automatically from the word count.

Toggling the **Live** switch in the posts table publishes or unpublishes instantly.

---

## 4. Google Search Console

### a. Verify ownership

1. Go to https://search.google.com/search-console and add a property.
2. **Domain property** (recommended) — add the TXT record it gives you at your
   domain registrar's DNS. Covers every subdomain.
3. Or **URL prefix property** with `https://narayanidistributors.com`, then either:
   - **HTML tag** — copy the `<meta name="google-site-verification" ... />` line into
     `artifacts/snackveda/index.html`, where the comment marks the spot, and redeploy; or
   - **HTML file** — drop the downloaded `google*.html` file into
     `artifacts/snackveda/public/` and redeploy. It will be served at the site root.

### b. Submit the sitemap

In Search Console → **Sitemaps**, enter `sitemap.xml` and submit.

`https://narayanidistributors.com/sitemap.xml` is generated live on each request and contains:

- the static pages (`/`, `/shop`, `/b2b`, `/about`, `/blog`, `/faq`, `/contact`, `/policies`)
- every **active** product (`/shop/<slug>`)
- every **published** blog post (`/blog/<slug>`)

New posts appear in it the moment they are published — nothing to regenerate. The
response is cached at the CDN for an hour.

`robots.txt` (at `artifacts/snackveda/public/robots.txt`) already points Google at the
sitemap and blocks `/admin`, `/account`, `/checkout` and the auth pages from being indexed.

### c. Ask for indexing on a new post

Search Console → **URL Inspection** → paste the post URL → **Request indexing**.
Not required, but it usually gets a fresh post crawled in a day or two instead of a week.

---

## Notes and limitations

- **The site is a client-rendered SPA.** Google renders JavaScript, so the per-page
  titles, descriptions and JSON-LD set by `src/lib/seo.ts` are picked up — but
  rendering is queued, so indexing can lag by days. Non-Google crawlers and the
  WhatsApp/LinkedIn link previewers do *not* run JavaScript, so shared links show the
  generic site-level Open Graph image and text from `index.html`, not the post's own.
  Fixing that properly means server-rendering or pre-rendering `/blog/*`, which is a
  larger change than this one — happy to do it as a follow-up if link previews matter.
- Blog endpoints are not in the OpenAPI spec (`lib/api-spec/openapi.yaml`), so they are
  not part of the generated TanStack Query client. The frontend calls them through
  `src/lib/blog-api.ts`, the same pattern the product-image admin already uses.
- Post content is Markdown and is HTML-escaped before rendering (`src/lib/markdown.ts`),
  so pasted content cannot inject scripts.
