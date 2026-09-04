import { SiteShell } from "@/components/layout/site-shell";
import { useLocation } from "wouter";
import { useListProducts, ProductCategory } from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { CategoryTabs } from "@/components/product/category-tabs";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSeo } from "@/lib/seo";
import { AlertCircle, Search, SlidersHorizontal, X, Zap } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

/**
 * /shop — the catalogue.
 *
 * ─── SEARCH ─────────────────────────────────────────────────────────────────
 * The header has had a search box for some time. It navigated to
 * `/shop?search=<query>` and this page ignored the parameter entirely, so every
 * search returned the unfiltered catalogue and looked like a broken site. It is
 * read here now, and the URL is the single source of truth for it: a search result
 * is a link a visitor can send to someone, and the back button has to work.
 *
 * Matching is client-side across name, category, pack format and weight, over a
 * catalogue of twenty products. That is the right call at this size — a round trip
 * per keystroke for twenty rows would be slower and no more accurate. If the
 * catalogue reaches a few hundred, move it behind a `search` parameter on
 * GET /products and delete `matches` below.
 *
 * ─── WHAT IS FILTERED WHERE ─────────────────────────────────────────────────
 * Category is a server filter (`useListProducts({ category })`) because the API
 * supports it. Search, pack size and price band are client filters over whatever
 * that returned. They compose: a category tab plus a search box plus a pack filter
 * all narrow the same list.
 */

/**
 * A category's storage key is `healthy_chips`; nobody searches for that. These are
 * the words a person actually types, including the ones that are not in any product
 * name — "foxnut" and "lotus seed" for makhana, "crisps" for chips.
 */
const CATEGORY_WORDS: Record<string, string> = {
  healthy_chips: "healthy chips crisps snack",
  makhana: "makhana foxnut fox nut lotus seed roasted snack",
  superpuffs: "superpuffs super puffs protein puff snack",
};

/** Everything a visitor might reasonably type at a product and expect to find it. */
function haystack(product: Product): string {
  return [
    product.name,
    product.slug.replace(/-/g, " "),
    CATEGORY_WORDS[product.category] ?? product.category,
    product.variant,
    product.description,
    `${product.weightGrams}g`,
    `${product.weightGrams} g`,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Every term has to match somewhere. Typing more words narrows the result rather
 * than widening it, which is what people expect and the opposite of an OR search.
 */
function matches(product: Product, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = haystack(product);
  return terms.every((term) => text.includes(term));
}

type SortKey = "featured" | "price-low" | "price-high" | "name" | "weight";

const PRICE_BANDS: { id: string; label: string; test: (price: number) => boolean }[] = [
  { id: "all", label: "Any price", test: () => true },
  { id: "under-100", label: "Under ₹100", test: (p) => p < 100 },
  { id: "100-250", label: "₹100 – ₹250", test: (p) => p >= 100 && p <= 250 },
  { id: "over-250", label: "Over ₹250", test: (p) => p > 250 },
];

export default function Shop() {
  const [location, setLocation] = useLocation();

  // Read from the URL on every render rather than seeding state once: arriving from
  // the header search while already on /shop changes the query string without
  // remounting, and state seeded in useState would silently ignore it.
  const params = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search
  );
  const urlSearch = params.get("search") ?? "";
  const urlCategory = (params.get("category") as ProductCategory) || "all";

  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">(urlCategory);
  const [search, setSearch] = useState(urlSearch);
  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [priceBand, setPriceBand] = useState("all");
  const [packSize, setPackSize] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Keeps the box in step with the URL when the header search fires while this page
  // is already mounted, and when the visitor uses the back button.
  useEffect(() => {
    setSearch(urlSearch);
    setActiveCategory(urlCategory);
  }, [location, urlSearch, urlCategory]);

  const { data: products, isLoading } = useListProducts(
    activeCategory !== "all" ? { category: activeCategory } : undefined
  );

  const { user, isB2BApproved } = useAuth();
  const b2cDiscount = user?.role === "b2c_customer" && (user.ordersCount ?? 0) > 0;

  useSeo({
    title: search
      ? `${search} — Search results | Narayani Distributors`
      : "Shop Indian Snacks — Makhana, Chips & Superpuffs",
    description:
      "Browse the full range of Indian packaged snacks from Narayani Distributors — roasted makhana, millet and grain chips, and protein superpuffs.",
    canonical: "/shop",
  });

  /** Pack sizes present in the current result, so the filter never offers a dead option. */
  const packSizes = useMemo(() => {
    const sizes = new Set<number>();
    for (const p of products ?? []) if (p.weightGrams) sizes.add(p.weightGrams);
    return [...sizes].sort((a, b) => a - b);
  }, [products]);

  const visible = useMemo(() => {
    let list = [...(products ?? [])];

    if (search.trim()) list = list.filter((p) => matches(p, search.trim()));
    if (packSize !== "all") list = list.filter((p) => String(p.weightGrams) === packSize);

    const priceOf = (p: Product) => (isB2BApproved && p.b2bPrice ? p.b2bPrice : p.b2cPrice);

    const band = PRICE_BANDS.find((b) => b.id === priceBand);
    if (band && band.id !== "all") list = list.filter((p) => band.test(priceOf(p)));

    if (sortBy === "price-low") list.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sortBy === "price-high") list.sort((a, b) => priceOf(b) - priceOf(a));
    else if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "weight") list.sort((a, b) => (a.weightGrams ?? 0) - (b.weightGrams ?? 0));

    return list;
  }, [products, search, packSize, priceBand, sortBy, isB2BApproved]);

  /** The URL is the source of truth, so every control writes to it. */
  const pushParams = (next: { search?: string; category?: ProductCategory | "all" }) => {
    const q = new URLSearchParams();
    const nextSearch = next.search !== undefined ? next.search : search;
    const nextCategory = next.category !== undefined ? next.category : activeCategory;
    if (nextSearch.trim()) q.set("search", nextSearch.trim());
    if (nextCategory !== "all") q.set("category", nextCategory);
    const qs = q.toString();
    setLocation(qs ? `/shop?${qs}` : "/shop");
  };

  const activeFilterCount = (priceBand !== "all" ? 1 : 0) + (packSize !== "all" ? 1 : 0);

  const clearEverything = () => {
    setPriceBand("all");
    setPackSize("all");
    setSortBy("featured");
    setSearch("");
    setActiveCategory("all");
    setLocation("/shop");
  };

  return (
    <SiteShell>
      <div className="border-b bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <h1 className="mb-4 font-serif text-3xl font-bold md:text-4xl">Shop the Range</h1>
          <p className="text-muted-foreground">
            Discover our full collection of premium, healthy Indian snacks.
          </p>

          <form
            className="mt-6 flex max-w-xl gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              pushParams({ search });
            }}
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, flavours or pack sizes"
                aria-label="Search products"
                className="bg-background pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    pushParams({ search: "" });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isB2BApproved && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
            <Zap className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">
              Trade pricing active. You are viewing wholesale rates. Minimum order quantities
              apply, agreed per enquiry.
            </div>
          </div>
        )}

        {!isB2BApproved && b2cDiscount && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
            <Zap className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">
              Welcome back! Enjoy your loyal customer discount of 10% on all items.
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <CategoryTabs
            activeCategory={activeCategory}
            onChange={(category) => {
              setActiveCategory(category);
              pushParams({ category });
            }}
          />

          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 min-w-5 justify-center px-1.5">{activeFilterCount}</Badge>
              )}
            </Button>
            <Select value={sortBy} onValueChange={(v: SortKey) => setSortBy(v)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Featured" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
                <SelectItem value="weight">Pack size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="mb-8 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Price
              </label>
              <Select value={priceBand} onValueChange={setPriceBand}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_BANDS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pack size
              </label>
              <Select value={packSize} onValueChange={setPackSize}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any size</SelectItem>
                  {packSizes.map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      {g} g
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearEverything} className="gap-2">
                <X className="h-4 w-4" /> Clear all
              </Button>
            </div>
          </div>
        )}

        {!isLoading && (search.trim() || activeFilterCount > 0) && (
          <p className="mb-6 text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? "product" : "products"}
            {search.trim() && (
              <>
                {" "}
                for <span className="font-medium text-foreground">&ldquo;{search.trim()}&rdquo;</span>
              </>
            )}
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 py-24 text-center">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-medium">
              {search.trim()
                ? `Nothing matches “${search.trim()}”`
                : "No products found"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              {search.trim()
                ? "Try a shorter search, or browse the categories above. If you are looking for something we do not list, we may still be able to source it."
                : "Try a different category or clear your filters."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={clearEverything}>
                Clear everything
              </Button>
              {search.trim() && (
                <Button variant="ghost" onClick={() => setLocation("/request-a-quote")}>
                  Ask us to source it
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ProductGrid>
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}
      </div>
    </SiteShell>
  );
}
