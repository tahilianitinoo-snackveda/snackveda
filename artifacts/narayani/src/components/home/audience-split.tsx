import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Building2, ShoppingBag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The homepage fork. Narayani serves two audiences that otherwise collide on the
 * same page: someone buying a snack, and someone sourcing at wholesale or for
 * export. Neither may be the default.
 *
 * Equal visual weight is enforced structurally, not by eye: both cards are
 * produced by the same map over this array and share one class string, so there
 * is no place for a hierarchy to creep in. They differ only in icon, label and
 * copy. If you add a prop that styles one card differently, you have broken the
 * point of the component.
 */
interface Audience {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: LucideIcon;
}

const AUDIENCES: Audience[] = [
  {
    eyebrow: "Retail",
    title: "Shop for yourself",
    description: "Discover our range of Indian snacks and packaged foods.",
    cta: "Browse the range",
    href: "/shop",
    icon: ShoppingBag,
  },
  {
    eyebrow: "Wholesale & export",
    title: "Buy for your business",
    description: "Wholesale, distribution and international sourcing opportunities.",
    cta: "See business options",
    href: "/business",
    icon: Building2,
  },
];

const CARD_CLASSES =
  "group flex h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-sm " +
  "outline-none transition-[border-color,box-shadow,transform] duration-200 " +
  "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background lg:p-10";

export function AudienceSplit() {
  return (
    <section
      aria-labelledby="audience-split-heading"
      className="border-y border-border bg-secondary/70 py-14 lg:py-20"
    >
      <div className="container mx-auto px-4">
        <h2
          id="audience-split-heading"
          className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:mb-10"
        >
          Two ways to buy from Narayani
        </h2>

        {/*
          Both cards enter together — a stagger would make one arrive first and
          read as the default, which is exactly what this section must not do.
        */}
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2 lg:gap-6">
          {AUDIENCES.map((audience) => (
            <motion.div
              key={audience.href}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                href={audience.href}
                aria-label={`${audience.title}. ${audience.description}`}
                className={CARD_CLASSES}
                data-testid={`audience-card-${audience.href.replace("/", "")}`}
              >
                <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                  <audience.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </span>

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {audience.eyebrow}
                </span>

                <h3 className="mt-2 font-serif text-2xl font-bold leading-tight text-foreground lg:text-3xl">
                  {audience.title}
                </h3>

                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {audience.description}
                </p>

                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-primary">
                  {audience.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
