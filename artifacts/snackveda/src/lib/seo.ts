import { useEffect } from "react";

export const SITE_URL = "https://narayanidistributors.com";
const DEFAULT_TITLE = "SnackVeda | Mindful Eating Meets Joyful Snacking";
const DEFAULT_DESCRIPTION =
  "Premium Indian snacks by Narayani Distributors — healthy chips, roasted makhana and superpuffs. Clean ingredients, bold flavours, retail and wholesale.";
const DEFAULT_IMAGE = `${SITE_URL}/opengraph.jpg`;

export interface SeoOptions {
  title?: string;
  description?: string;
  /** Path (e.g. "/blog/my-post") or absolute URL. Defaults to the current path. */
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  /** Set true for drafts/previews so search engines skip the page. */
  noIndex?: boolean;
  /** Schema.org JSON-LD object injected as <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown> | null;
}

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  el.dataset.seo = "managed";
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Sets the document title, meta description, canonical link, Open Graph/Twitter
 * tags and optional JSON-LD for the current page. Google renders client-side
 * React, so these tags are picked up on crawl.
 */
export function useSeo(options: SeoOptions) {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    canonical,
    image = DEFAULT_IMAGE,
    type = "website",
    noIndex = false,
    jsonLd = null,
  } = options;

  const fullTitle = title ? (title.includes("SnackVeda") ? title : `${title} | SnackVeda`) : DEFAULT_TITLE;
  const url = absoluteUrl(canonical ?? (typeof window !== "undefined" ? window.location.pathname : "/"));
  const imageUrl = absoluteUrl(image);
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    document.title = fullTitle;

    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");

    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "SnackVeda");

    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [fullTitle, description, url, imageUrl, type, noIndex]);

  useEffect(() => {
    const existing = document.head.querySelector('script[data-seo="jsonld"]');
    if (existing) existing.remove();
    if (!jsonLdKey) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seo = "jsonld";
    script.textContent = jsonLdKey;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [jsonLdKey]);
}
