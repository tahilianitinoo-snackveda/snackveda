import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo";
import { ArrowRight, ExternalLink, FileText, Info, ShieldCheck } from "lucide-react";

/**
 * /quality — spec point 23, Quality & Compliance.
 *
 * ─── THE RULE THIS PAGE IS BUILT AROUND ─────────────────────────────────────
 * Spec point 23: "Show ONLY genuine, verifiable credentials. Do NOT create fake
 * verification badges. Do NOT display credentials that Narayani does not actually
 * possess."
 *
 * So this page renders NOTHING it was not given. Registration numbers come from
 * site_settings via GET /api/settings, which omits any key the admin has left
 * blank. A registration that is not entered does not appear — no greyed-out row,
 * no "coming soon", no badge with a blank next to it. If none are entered, the
 * credentials section does not render at all and the page says plainly that the
 * numbers are available on request, which is true and costs nothing.
 *
 * Every number shown is paired with a link to the official register that issued it,
 * so a buyer can check it against the source rather than trust a graphic on our
 * website. That is the whole point of the page for an importer.
 *
 * ─── WHAT THIS PAGE MUST NEVER DO ───────────────────────────────────────────
 * Do not add an ISO, HACCP, organic, halal or kosher badge. None is held. Do not
 * present a MANUFACTURER's FSSAI licence as Narayani's — those belong to the
 * companies that make the food and are already shown on each product page against
 * the company that holds them. Confusing the two is the specific failure mode this
 * whole site has been built to avoid. See
 * docs/decisions/0002-never-imply-manufacturing.md.
 */

interface Registration {
  key: string;
  label: string;
  /** What it actually certifies. An importer reading this may not know Indian regimes. */
  meaning: string;
  /** Where a buyer verifies it themselves. */
  verifyUrl?: string;
  verifyLabel?: string;
}

const REGISTRATIONS: Registration[] = [
  {
    key: "gstin",
    label: "GSTIN",
    meaning:
      "Goods and Services Tax registration. It is what allows us to issue a tax invoice, and it appears on every invoice we raise.",
    verifyUrl: "https://services.gst.gov.in/services/searchtp",
    verifyLabel: "Verify on the GST portal",
  },
  {
    key: "fssai",
    label: "FSSAI licence",
    meaning:
      "Food Safety and Standards Authority of India licence, held by us as a distributor of packaged food. The manufacturers we source from hold their own, shown on each product page.",
    verifyUrl: "https://foscos.fssai.gov.in/",
    verifyLabel: "Verify on FoSCoS",
  },
  {
    key: "iec",
    label: "Import Export Code",
    meaning:
      "Issued by the DGFT. It is the registration that permits us to export from India, and customs in your market will see it on the documentation.",
    verifyUrl: "https://www.dgft.gov.in/CP/?opt=view-any-iec",
    verifyLabel: "Verify on DGFT",
  },
  {
    key: "apeda_rcmc",
    label: "APEDA RCMC",
    meaning:
      "Registration-cum-Membership Certificate with the Agricultural and Processed Food Products Export Development Authority.",
    verifyUrl: "https://apeda.gov.in/",
    verifyLabel: "APEDA",
  },
  {
    key: "cin",
    label: "CIN",
    meaning: "Corporate Identity Number, from the Ministry of Corporate Affairs.",
    verifyUrl: "https://www.mca.gov.in/mcafoportal/viewCompanyMasterData.do",
    verifyLabel: "Verify on MCA",
  },
  {
    key: "pan",
    label: "PAN",
    meaning: "Permanent Account Number — the business's tax identity in India.",
  },
];

export default function Quality() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return {};
      return res.json();
    },
    // These change roughly never. Do not re-fetch them on every focus.
    staleTime: 5 * 60 * 1000,
  });

  // Only what the business has actually entered.
  const held = REGISTRATIONS.filter((r) => settings?.[r.key]?.trim());

  useSeo({
    title: "Quality & Compliance — Narayani Distributors",
    description:
      "Registrations, product documentation and how we handle food-safety information at Narayani Distributors, merchant exporter and distributor of Indian packaged foods.",
    canonical: "/quality",
  });

  return (
    <SiteShell>
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-20">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Quality &amp; Compliance
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>
          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            What we can show you, and how to check it.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Every registration below links to the official register that issued it. We would
            rather you verified us at the source than took a badge on a website at face value.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-16 lg:py-20">
        {/* Registrations — only those actually entered */}
        <section>
          <h2 className="font-serif text-3xl font-bold">Our registrations</h2>

          {held.length > 0 ? (
            <div className="mt-8 space-y-4">
              {held.map((reg) => (
                <div
                  key={reg.key}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck
                        className="h-4.5 w-4.5 shrink-0 text-primary"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {reg.label}
                      </span>
                    </div>
                    <span className="font-mono text-lg font-semibold text-foreground">
                      {settings?.[reg.key]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {reg.meaning}
                  </p>
                  {reg.verifyUrl && (
                    <a
                      href={reg.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      {reg.verifyLabel ?? "Verify"}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /*
              No registration numbers entered yet. Say so honestly rather than
              rendering empty rows or a badge with nothing behind it.
            */
            <div className="mt-8 flex gap-4 rounded-2xl border border-border bg-secondary/50 p-6">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="font-medium text-foreground">
                  Our registration numbers are not published on this page yet.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  They are available on request and will be on any quotation and every
                  invoice we issue. We would rather leave this section empty than fill it with
                  something you cannot verify.
                </p>
                <Button variant="outline" size="sm" className="mt-4 rounded-full" asChild>
                  <Link href="/contact">Ask us for them</Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Product documentation — this part is true regardless of settings */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl font-bold">Product documentation</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            What we hold against a product, and what you will find on its page.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              {
                title: "Ingredients and nutrition",
                desc: "Transcribed from the physical pack, per 100 g and per serving, exactly as printed.",
              },
              {
                title: "Allergen information",
                desc: "The allergen line as the pack states it — or a note that the pack carries none, which is a different thing from us not knowing.",
              },
              {
                title: "Manufacturer identity",
                desc: "The company that made the product, its address and its own FSSAI licence, as printed. Where a pack names a separate packer, both are shown.",
              },
              {
                title: "Pack specification",
                desc: "Net weight, shelf life and carton configuration, per product.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-2.5">
                  <FileText
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The honest bit */}
        <section className="mt-16 rounded-3xl border border-border bg-card p-8 shadow-sm lg:p-10">
          <h2 className="font-serif text-2xl font-bold">Where a pack contradicts itself</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Packaging is not always internally consistent. Across the range we carry there are
            panels that print a quantity in milligrams where grams are clearly meant, a footnote
            citing a serving weight the figures do not use, an allergen line declaring an
            ingredient that is not in the list, and one flavour printing another flavour's
            ingredients.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            We reproduce what is printed and say on the product page where it does not add up,
            rather than quietly correcting it. The pack is the legal document. If you are buying
            on a specific figure — an allergen, a protein claim, a shelf life — ask us and we
            will confirm it against the manufacturer before you commit.
          </p>
        </section>

        {/* What we are not */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold">What we do not claim</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We are a merchant exporter and distributor. We do not operate a food facility, and
            we hold no ISO, HACCP, organic, halal or kosher certification of our own. Where a
            product carries a certification, it is the manufacturer's and it is shown on that
            product's page against the company that holds it. You will not find a certification
            badge anywhere on this site that we cannot put a number behind.
          </p>
        </section>

        <section className="mt-16 rounded-3xl border border-border bg-secondary/50 p-8 text-center lg:p-10">
          <h2 className="font-serif text-2xl font-bold">Need documentation for a shipment?</h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted-foreground">
            Tell us the market and the products, and we will tell you what we can supply against
            them.
          </p>
          <Button className="mt-6 rounded-full px-8" asChild>
            <Link href="/request-a-quote?type=export">
              Start an enquiry <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </div>
    </SiteShell>
  );
}
