import { Link } from "wouter";

// Storefronts and trade directories carrying our products. These leave the site,
// so they are plain anchors rather than wouter links.
const MARKETPLACES = [
  { name: "Flipkart", href: "https://www.flipkart.com/search?q=chips++&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off&p%5B%5D=facets.brand%255B%255D%3Dtwirtles" },
  { name: "IndiaMART", href: "https://www.indiamart.com/narayanidistributors-indore/chips.html" },
  { name: "Exporters India", href: "https://www.exportersindia.com/narayani-distributors/" },
  { name: "GlobalLinker", href: "https://www.globallinker.com/search/narayani-distributors" },
];

export function SiteFooter() {
  return (
    <footer className="bg-muted py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link href="/" className="flex flex-col items-start mb-4">
              <span className="font-serif text-2xl font-bold tracking-tight text-primary">Narayani Distributors</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs">
              Clean Ingredients. Bold Indian Flavors. Made for Everyday Life. Premium snacks crafted for mindful eating and joyful moments.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/shop" className="hover:text-foreground transition-colors">All Products</Link></li>
              <li><Link href="/shop?category=chips" className="hover:text-foreground transition-colors">Healthy Chips</Link></li>
              <li><Link href="/shop?category=makhana" className="hover:text-foreground transition-colors">Makhana</Link></li>
              <li><Link href="/shop?category=superpuffs" className="hover:text-foreground transition-colors">Superpuffs</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/b2b" className="hover:text-foreground transition-colors">Wholesale & B2B</Link></li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/policies" className="hover:text-foreground transition-colors">Policies</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
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
