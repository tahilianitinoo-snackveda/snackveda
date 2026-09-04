import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/layout/site-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { renderMarkdown } from "@/lib/markdown";
import { useSeo } from "@/lib/seo";

/**
 * /policies — spec point 49.
 *
 * ─── THESE USED TO BE JSX ───────────────────────────────────────────────────
 * All five policies were hardcoded in this file, which meant changing a refund
 * window or a delivery timeline was a code change and a deploy. They are the
 * documents most likely to need editing by someone who is not a developer, and
 * they were the hardest thing on the site to edit.
 *
 * They now come from the `legal_pages` table and are edited in Admin → Policies.
 * The seed migration transcribed the existing text word for word — these are terms
 * customers have already agreed to, and rewording them in a migration would have
 * changed the contract silently.
 *
 * ─── WHAT HAPPENS IF THE REQUEST FAILS ──────────────────────────────────────
 * An error state that says so, with the support address. NOT an empty page and
 * NOT a hardcoded fallback copy of the policies: a stale duplicate of a legal
 * document living in the bundle is exactly the problem this change removes, and
 * two versions of a refund policy is worse than a page that admits it is down.
 */

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

const SUPPORT_EMAIL = "support@narayanidistributors.com";

function PolicyBody({ page }: { page: LegalPage }) {
  const html = useMemo(() => renderMarkdown(page.content), [page.content]);
  return (
    <div className="rounded-2xl border bg-card p-8 shadow-sm">
      <h2 className="mb-6 font-serif text-2xl font-bold">{page.title}</h2>
      <div
        className="prose prose-neutral max-w-none prose-headings:font-serif prose-headings:text-lg prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default function Policies() {
  const { data: pages, isLoading, isError } = useQuery<LegalPage[]>({
    queryKey: ["legal-pages"],
    queryFn: async () => {
      const res = await fetch("/api/legal");
      if (!res.ok) throw new Error("Could not load the policies");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useSeo({
    title: "Policies — Shipping, Returns, Privacy & Terms",
    description:
      "Cancellation and refund, delivery, terms and conditions, privacy and cookie policies for Narayani Distributors.",
    canonical: "/policies",
  });

  return (
    <SiteShell>
      <div className="border-b bg-muted/30 py-16">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">Policies</h1>
          <p className="text-muted-foreground">Narayani Distributors</p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-32 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : isError || !pages || pages.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-10 text-center">
            <h2 className="font-serif text-xl font-bold">We could not load our policies.</h2>
            <p className="mx-auto mt-3 max-w-lg leading-relaxed text-muted-foreground">
              This is a problem at our end, not yours. Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>{" "}
              and we will send you whichever policy you need — cancellation and refund, delivery,
              terms, privacy or cookies — straight away.
            </p>
          </div>
        ) : (
          <Tabs defaultValue={pages[0].slug}>
            <TabsList className="mb-8 flex h-auto flex-wrap gap-2 bg-transparent p-0">
              {pages.map((p) => (
                <TabsTrigger
                  key={p.slug}
                  value={p.slug}
                  className="rounded-full border data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {p.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {pages.map((p) => (
              <TabsContent key={p.slug} value={p.slug}>
                <PolicyBody page={p} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            For any queries regarding our policies, contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="mt-2">Narayani Distributors — Merchant Exporter | Distributor | Indian Food Products</p>
        </div>
      </div>
    </SiteShell>
  );
}
