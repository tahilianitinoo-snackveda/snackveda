/**
 * Analytics — spec point 32.
 *
 * ─── WHY THE IDs ARE NOT IN THE CODE ────────────────────────────────────────
 * The measurement IDs come from Admin → Settings, not from a build. The business
 * should be able to connect Google Analytics without a developer and a deploy, and
 * a tag that needs a code change to add is a tag that never gets added.
 *
 * ─── NOTHING LOADS UNTIL AN ID EXISTS ───────────────────────────────────────
 * With no ID configured, no third-party script is fetched at all. That is not just
 * tidiness: every tag is a request on the critical path, a cookie, and a thing to
 * declare in a privacy policy. A site with no analytics configured should ship no
 * analytics, not an empty gtag stub.
 *
 * ─── EVERY TRACKING CALL IS SAFE TO MAKE ────────────────────────────────────
 * `track()` is a no-op when nothing is configured. Call it freely from components:
 * they must never have to know whether analytics is switched on, and they must
 * never break a checkout because a tag failed to load.
 *
 * ─── WHAT MUST NEVER BE SENT ────────────────────────────────────────────────
 * No email address, no phone number, no name, no address, and NO b2bPrice. The
 * trade price list is gated everywhere else on this site; sending it to Google as
 * an event parameter would publish it just as surely. Events carry product ids,
 * names, categories and retail prices.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
    lintrk?: (...args: unknown[]) => void;
  }
}

export interface AnalyticsConfig {
  ga4_id?: string;
  meta_pixel_id?: string;
  linkedin_partner_id?: string;
  google_site_verification?: string;
}

let loaded = false;
let active: AnalyticsConfig = {};

function injectScript(src: string, async = true) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = async;
  document.head.appendChild(s);
}

/**
 * Call once, with whatever GET /api/settings returned. Safe to call repeatedly —
 * the guard means a re-render never injects a second copy of a tag.
 */
export function initAnalytics(config: AnalyticsConfig) {
  if (typeof window === "undefined" || loaded) return;
  active = config;

  /*
    Search Console verification. Handled separately from the tags below because it
    is not a tag: it is one meta element, it loads nothing, and it must be present
    even when the business wants verification without any tracking at all.

    Google renders JavaScript when it verifies by HTML tag, so injecting it here
    works — but the DNS or HTML-file method is more robust for a site rendered
    client-side. index.html carries a comment saying so for whoever does it.
  */
  if (config.google_site_verification) {
    let el = document.head.querySelector<HTMLMetaElement>('meta[name="google-site-verification"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "google-site-verification");
      document.head.appendChild(el);
    }
    el.setAttribute("content", config.google_site_verification);
  }

  const hasAny = config.ga4_id || config.meta_pixel_id || config.linkedin_partner_id;
  if (!hasAny) return;
  loaded = true;

  if (config.ga4_id) {
    window.dataLayer = window.dataLayer || [];
    // Must be a real `arguments`-forwarding function, not an arrow taking a rest
    // parameter — gtag.js reads `arguments` off what it is given.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", config.ga4_id, {
      // wouter does not reload the document, so automatic page_view would fire
      // once and never again. trackPageView() below sends them.
      send_page_view: false,
    });
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${config.ga4_id}`);
  }

  if (config.meta_pixel_id) {
    /* eslint-disable */
    // Meta's own shim, transcribed. `n` is both the function and its own queue —
    // fbevents.js looks for exactly this shape when it loads and replays whatever
    // is in `n.queue`, so it cannot be tidied into something better typed.
    const n: any = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    /* eslint-enable */
    injectScript("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq?.("init", config.meta_pixel_id);
  }

  if (config.linkedin_partner_id) {
    (window as unknown as { _linkedin_partner_id?: string })._linkedin_partner_id =
      config.linkedin_partner_id;
    injectScript("https://snap.licdn.com/li.lms-analytics/insight.min.js");
  }
}

/** A page view. wouter navigation does not reload the document, so this is manual. */
export function trackPageView(path: string, title?: string) {
  if (!loaded) return;
  window.gtag?.("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
  window.fbq?.("track", "PageView");
}

/**
 * The two funnels spec point 32 asks to be tracked separately.
 *
 * B2C  view_item → add_to_cart → begin_checkout → purchase
 * B2B  rfq_submitted, catalogue_download, whatsapp_click, email_click, phone_click
 *
 * The B2B side matters more here than it looks: a distributor's most valuable
 * conversion is an enquiry, and an enquiry that is not tracked cannot be attributed
 * to the campaign that produced it.
 */
export type AnalyticsEvent =
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "rfq_submitted"
  | "catalogue_download"
  | "quote_started"
  | "whatsapp_click"
  | "email_click"
  | "phone_click";

/** Meta's own event vocabulary, for the events it recognises. */
const META_EVENT: Partial<Record<AnalyticsEvent, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  rfq_submitted: "Lead",
  catalogue_download: "Lead",
};

export function track(event: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (!loaded) return;
  window.gtag?.("event", event, params);
  const metaEvent = META_EVENT[event];
  if (metaEvent) window.fbq?.("track", metaEvent, params);
}

/** Whether anything is configured — for a UI that wants to say so. */
export function analyticsActive() {
  return loaded;
}

export function analyticsConfig() {
  return active;
}
