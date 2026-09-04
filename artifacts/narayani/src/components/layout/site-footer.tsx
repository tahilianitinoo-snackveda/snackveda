import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

/**
 * Business information for the footer — spec point 40.
 *
 * Read from site_settings via GET /api/settings, which omits any key the admin has
 * left blank. A registration that has not been entered does not render: no label
 * with nothing after it, no placeholder, no "coming soon". If none are entered the
 * whole strip is absent and the footer looks exactly as it did before.
 *
 * Order matters — GSTIN first, because that is the one an Indian buyer looks for,
 * then FSSAI, then the export registrations.
 */
const FOOTER_REGISTRATIONS = [
  { key: "gstin", label: "GST" },
  { key: "fssai", label: "FSSAI" },
  { key: "iec", label: "IEC" },
  { key: "apeda_rcmc", label: "APEDA RCMC" },
  { key: "cin", label: "CIN" },
];

// Storefronts and trade directories carrying our products. These leave the site,
// so they are plain anchors rather than wouter links.
const MARKETPLACES = [
  { name: "Flipkart", href: "https://www.flipkart.com/search?q=chips++&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off&p%5B%5D=facets.brand%255B%255D%3Dtwirtles" },
  { name: "IndiaMART", href: "https://www.indiamart.com/narayanidistributors-indore/chips.html" },
  { name: "Exporters India", href: "https://www.exportersindia.com/narayani-distributors/" },
  { name: "GlobalLinker", href: "https://www.globallinker.com/search/narayani-distributors" },
];

export function SiteFooter() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return {};
      return res.json();
    },
    // On every page, and these change roughly never.
    staleTime: 5 * 60 * 1000,
  });

  const registrations = FOOTER_REGISTRATIONS.filter((r) => settings?.[r.key]?.trim());
  const contact = [settings?.support_email, settings?.support_phone].filter(Boolean);

  return (
    <footer className="bg-muted py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-8 mb-8 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex flex-col items-start mb-3">
              <span className="font-serif text-2xl font-bold tracking-tight text-primary">Narayani Distributors</span>
            </Link>
            <p className="text-sm font-medium text-foreground mb-3">
              Narayani Distributors — Merchant Exporter | Distributor | Indian Food Products
            </p>
            <p className="text-muted-foreground text-sm max-w-xs">
              Clean Ingredients. Bold Indian Flavors. Thoughtfully sourced and distributed for
              mindful eating and joyful moments, every day.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/shop" className="hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link href="/shop?category=healthy_chips" className="hover:text-foreground transition-colors">Healthy Chips</Link></li>
              <li><Link href="/shop?category=makhana" className="hover:text-foreground transition-colors">Makhana</Link></li>
              <li><Link href="/shop?category=superpuffs" className="hover:text-foreground transition-colors">Superpuffs</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Business</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/business" className="hover:text-foreground transition-colors">Business Overview</Link></li>
              <li><Link href="/wholesale" className="hover:text-foreground transition-colors">Wholesale</Link></li>
              <li><Link href="/export" className="hover:text-foreground transition-colors">Export / International</Link></li>
              <li><Link href="/private-label" className="hover:text-foreground transition-colors">Private Label</Link></li>
              <li><Link href="/catalogue" className="hover:text-foreground transition-colors">Download Catalogue</Link></li>
              <li><Link href="/request-a-quote" className="hover:text-foreground transition-colors">Request a Quote</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/quality" className="hover:text-foreground transition-colors">Quality &amp; Compliance</Link></li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Resources</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/policies" className="hover:text-foreground transition-colors">Policies</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        {/*
          Business information — spec point 40. Renders only what the admin has
          entered in Admin → Settings. Nothing here has a fallback, because a
          fabricated registration number is worse than an absent one.
        */}
        {(registrations.length > 0 || contact.length > 0) && (
          <div className="mb-6 border-t border-border pt-8">
            <h3 className="mb-3 text-sm font-semibold">Business information</h3>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {registrations.map((reg) => (
                <li key={reg.key}>
                  <span className="uppercase tracking-wide">{reg.label}</span>{" "}
                  <span className="font-mono text-foreground">{settings?.[reg.key]}</span>
                </li>
              ))}
              {settings?.support_email && (
                <li>
                  <a
                    href={`mailto:${settings.support_email}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {settings.support_email}
                  </a>
                </li>
              )}
              {settings?.support_phone && (
                <li>
                  <a
                    href={`tel:${settings.support_phone.replace(/[^\d+]/g, "")}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {settings.support_phone}
                  </a>
                </li>
              )}
              {registrations.length > 0 && (
                <li>
                  <Link href="/quality" className="text-primary hover:underline">
                    Verify these
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-3 mb-6">
          <h3 className="font-semibold text-sm shrink-0">Also available on</h3>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {MARKETPLACES.map((m) => (
              <li key={m.name}>
                <a
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  {m.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>Indore, India</p>
          <p>&copy; {new Date().getFullYear()} Narayani Distributors. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
