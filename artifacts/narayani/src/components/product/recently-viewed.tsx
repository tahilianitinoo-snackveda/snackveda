import { Link } from "wouter";
import { Price } from "@/components/ui/price";
import { useBrowsingStore } from "@/lib/browsing";

/**
 * Recently viewed — spec point 12.
 *
 * Renders nothing at all until there is more than one product in the list, and
 * never includes the product currently being looked at. A "recently viewed" strip
 * showing one item, and that item being the page you are on, is worse than no strip
 * — it takes vertical space to tell the reader something they already know.
 */
export function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const recentlyViewed = useBrowsingStore((s) => s.recentlyViewed);
  const items = recentlyViewed.filter((v) => v.slug !== excludeSlug);

  if (items.length < 2) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-16 border-t pt-12">
      <h2 id="recently-viewed-heading" className="font-serif text-2xl font-bold">
        Recently viewed
      </h2>
      {/*
        A scrolling row rather than a grid: this is a way back to something, not a
        browsing surface, and it should never push the page's real content down by
        more than one row's height.
      */}
      <ul className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2">
        {items.map((item) => (
          <li key={item.slug} className="w-36 shrink-0">
            <Link href={`/shop/${item.slug}`} className="group block">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="aspect-square w-full rounded-xl border object-cover transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-xl border bg-muted p-3 text-center text-xs text-muted-foreground">
                  {item.name}
                </div>
              )}
              <p className="mt-2 line-clamp-2 text-sm font-medium transition-colors group-hover:text-primary">
                {item.name}
              </p>
              <Price amount={item.price} className="mt-0.5 block text-sm text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
