/**
 * Text helpers for blog posts and any other slugged content.
 *
 * These lived in `api/index.ts`, where nothing could reach them: the test suite
 * covers `api/_lib/` only, so a bug in `slugify` had no way to be caught. One was
 * in there for months — see the note on the null guard below.
 */

/**
 * A URL slug from arbitrary text, or "" when there is nothing to make one from.
 *
 * ─── WHY THE NON-STRING GUARD IS LOAD-BEARING ───────────────────────────────
 * `api/tsconfig.json` sets `"strict": false`. With `strictNullChecks` off, zod
 * infers every field as optional and `BlogPostBody.partial()` types `slug` as
 * `string` even though a caller can send `null` over the wire. So
 * `PATCH /admin/blog/:id` with `{"slug": null}` reached `null.toLowerCase()` and
 * returned a 500 from a live admin route. TypeScript could not see it and no test
 * could reach it.
 *
 * Returning "" for a null slug is the right answer, not a patch over a crash: both
 * call sites already treat an empty slug as "leave it alone" — the create handler
 * falls back to the title, the update handler skips the field — which is exactly
 * what a caller clearing it means.
 */
export function slugify(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    // Trim any hyphen the substitutions left at either end, so "…, and!" does not
    // become a slug ending in "-".
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

/**
 * Reading time in whole minutes, at 200 words per minute, never less than 1.
 * A post is never described as taking "0 min read".
 */
export function estimateReadMinutes(content: string | null | undefined): number {
  if (typeof content !== "string") return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
