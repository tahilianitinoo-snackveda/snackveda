import { Link, useLocation } from "wouter";
import { ShoppingBag, User, Menu, Search, ChevronDown } from "lucide-react";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

// Consumer-facing links shown flat, in order, on both the desktop bar and the mobile
// sheet. "Business" is handled separately since desktop groups it into a dropdown
// (with Export and the quote CTA) while mobile lists everything flat.
const PRIMARY_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
];
const SECONDARY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

// Flat order for the mobile sheet: Home, Shop, Business, Wholesale, Export, Private
// Label, About, Resources, Contact. The desktop dropdown groups the four business
// pages; mobile has no room for a nested menu, so it lists them.
const MOBILE_LINKS = [
  ...PRIMARY_LINKS,
  { href: "/business", label: "Business" },
  { href: "/wholesale", label: "Wholesale" },
  { href: "/export", label: "Export" },
  { href: "/private-label", label: "Private Label" },
  { href: "/catalogue", label: "Catalogue" },
  ...SECONDARY_LINKS,
];

export function SiteHeader() {
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isBusinessSection = [
    "/business",
    "/wholesale",
    "/export",
    "/private-label",
    "/catalogue",
    "/request-a-quote",
  ].some((href) => location === href || location.startsWith(`${href}/`));

  const navLinkClass = (href: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      location === href ? "text-primary" : "text-muted-foreground"
    }`;

  // Plain function, not an event handler, so both the form's onSubmit (covers the
  // Enter key natively) and the submit button call the same logic.
  const runSearch = () => {
    const q = searchQuery.trim();
    setIsSearchOpen(false);
    setSearchQuery("");
    // shop.tsx reads `search` and filters on it. Keep the parameter name in step
    // with the one it reads — this box was chrome over a page that ignored it for
    // long enough that every search silently returned the whole catalogue.
    setLocation(q ? `/shop?search=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled ? "bg-background/95 backdrop-blur shadow-sm" : "bg-background"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {MOBILE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 pt-6 border-t border-border">
                <Button asChild className="w-full" onClick={() => setIsMenuOpen(false)}>
                  <Link href="/request-a-quote">Request a quote</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex flex-col items-start">
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">Narayani Distributors</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-6">
          {PRIMARY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 text-sm font-medium outline-none transition-colors hover:text-primary ${
                  isBusinessSection ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Business
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/business">Business overview</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wholesale">Wholesale</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/export">Export</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/private-label">Private Label</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/catalogue">Download catalogue</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/request-a-quote" className="font-semibold text-primary">
                  Request a quote
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {SECONDARY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSearch();
              }}
              className="flex items-center gap-1"
            >
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }
                }}
                onBlur={() => {
                  // Leave it open if the visitor typed something — only auto-collapse
                  // the empty affordance, so an in-progress query is never lost.
                  if (!searchQuery) setIsSearchOpen(false);
                }}
                placeholder="Search products"
                aria-label="Search products"
                className="h-9 w-32 sm:w-48"
              />
              <Button type="submit" variant="ghost" size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
                <span className="sr-only">Submit search</span>
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
          )}

          <Button variant="ghost" size="icon" asChild title={user ? user.fullName || "My Account" : "Login"}>
            <Link href={user ? (user.role === "super_admin" ? "/admin" : "/account") : "/login"}>
              <User className="h-5 w-5" />
              <span className="sr-only">Account</span>
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/cart">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
