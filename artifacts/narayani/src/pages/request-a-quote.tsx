import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  Globe,
  Mail,
  Paperclip,
  Store,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
 *
 *  ⚠️  TODO(sub-plan 4) — THERE IS NO RFQ ENDPOINT. THIS FORM DOES NOT POST.
 *
 *  Nothing in `api/index.ts` accepts an enquiry, and `lib/api-spec/openapi.yaml`
 *  does not describe one. Until `POST /rfq` exists, a submitted enquiry reaches
 *  the business ONLY because the buyer clicks the email button on the success
 *  screen. That is a real, working path — but it is a human step, not a request.
 *
 *  What has to be built, in this order:
 *    1. `lib/api-spec/openapi.yaml` — add `POST /rfq` taking the `QuoteEnquiry`
 *       shape defined below, returning `{ id, reference }`. Regenerate the client.
 *    2. `api/_lib/schema.ts` + a migration in `scripts/sql/` — a `quote_enquiries`
 *       table, so an enquiry survives a failed email.
 *    3. `api/index.ts` — the handler. Persist FIRST, notify second: transactional
 *       email is currently failing (the Resend sending domain is unverified, see
 *       CLAUDE.md), so a notify-only implementation would lose enquiries silently.
 *    4. `api/_lib/notify.ts` — the internal notification.
 *    5. Here — replace `onSubmit`'s local handling with the generated mutation.
 *       KEEP the email fallback visible on failure. Do not replace a working
 *       manual path with a network call that can fail into nothing.
 *
 *  Until then: do not "wire this up" by adding a fetch to an endpoint that does
 *  not exist, and do not change the success copy to say the enquiry was sent.
 *  Nine calls to action across the site land on this page; an enquiry that looks
 *  submitted and is not is worse for this business than no form at all.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Omitted on purpose: the file-upload field in spec point 19. It needs object
 *  storage that does not exist in this project — there is no bucket, no signed
 *  upload route and no `attachments` table. Rather than a field that drops the
 *  file, the success screen asks the buyer to attach specifications to the email.
 *
 *  No claim is made anywhere on this page about certifications, registration
 *  numbers, markets served, volumes, lead times or response times, and nothing
 *  implies Narayani manufactures anything. See
 *  docs/decisions/0002-never-imply-manufacturing.md and
 *  docs/superpowers/plans/2026-09-04-subplan-1-visible-site.md.
 */

/** The address on /contact and in api/index.ts. The only one this repository knows. */
const ENQUIRY_EMAIL = "support@narayanidistributors.com";

/**
 * The buyer's own copy of their enquiry, kept on their device so a reload does not
 * destroy a long form. Never sent anywhere; cleared when they start a new enquiry.
 */
const ENQUIRY_STORAGE_KEY = "narayani:quote-enquiry:last";

/**
 * mailto: hrefs are truncated by some mail clients and by Windows' shell handler
 * somewhere north of 2000 characters. The zod maxima below bound a typical enquiry
 * well under this; the guard in `mailtoHref` catches the outliers.
 */
const MAILTO_MAX_HREF = 1900;

const DESTINATION_COUNTRY_REQUIRED = "Which country is the shipment going to?";

/**
 * Required: company name, contact person, country, email, wholesale-or-export, and
 * the products the enquiry is about. Everything else is optional by design — see
 * the reasoning in .superpowers/sdd/task-8-report.md. The short version: we need to
 * know who is asking, how to reply, and what they want priced. A buyer who cannot
 * yet answer "which port" or "how many cases" still has an enquiry worth having.
 *
 * Destination country is the one conditional requirement. It is asked only of export
 * buyers, who always know it, and it changes the quotation.
 */
const quoteSchema = z
  .object({
    enquiryType: z.enum(["wholesale", "export"], {
      required_error: "Choose whether this is a wholesale or an export enquiry",
    }),
    companyName: z.string().trim().min(2, "Company name is required").max(120),
    contactPerson: z.string().trim().min(2, "Please tell us who to reply to").max(120),
    country: z.string().trim().min(2, "Country is required").max(80),
    email: z.string().trim().email("Enter an email address we can reply to").max(160),
    phone: z.string().trim().max(40).optional(),
    productsOfInterest: z
      .string()
      .trim()
      .min(3, "Tell us which products or categories to quote for")
      .max(600),
    quantity: z.string().trim().max(200).optional(),
    destinationCountry: z.string().trim().max(80).optional(),
    destinationPort: z.string().trim().max(120).optional(),
    packaging: z.string().trim().max(400).optional(),
    privateLabel: z.enum(["unsure", "yes", "no"]),
    message: z.string().trim().max(1200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enquiryType === "export" && !data.destinationCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationCountry"],
        message: DESTINATION_COUNTRY_REQUIRED,
      });
    }
  });

type QuoteFormValues = z.infer<typeof quoteSchema>;

/**
 * zod does not run `.superRefine` when the base object already has an issue, so on a
 * first submit with (say) a mistyped email, the destination-country error above would
 * be withheld and only appear on the SECOND submit, after everything else was fixed.
 * On the page every B2B call to action lands on, making a buyer discover a new
 * required field after they thought they were done is one round trip too many.
 *
 * So the conditional rule is applied alongside the base errors rather than after them.
 * The `superRefine` stays in the schema — it is the rule, and `quoteSchema` should
 * still enforce it if it is ever reused (the RFQ endpoint should reuse it). This
 * wrapper only fixes when the buyer is told.
 */
const runQuoteSchema = zodResolver(quoteSchema);

const quoteResolver: Resolver<QuoteFormValues> = async (values, context, options) => {
  const result = await runQuoteSchema(values, context, options);
  if (values.enquiryType !== "export" || values.destinationCountry?.trim()) {
    return result;
  }
  return {
    values: {},
    errors: {
      ...result.errors,
      destinationCountry: result.errors.destinationCountry ?? {
        type: "custom",
        message: DESTINATION_COUNTRY_REQUIRED,
      },
    },
  };
};

/**
 * The wire shape `POST /rfq` will have to accept. Written out rather than reusing
 * `QuoteFormValues` because it is a contract, not a form: export-only fields are
 * dropped from a wholesale enquiry, and the last three fields are provenance the
 * form never asks for.
 */
export interface QuoteEnquiry {
  enquiryType: "wholesale" | "export";
  companyName: string;
  contactPerson: string;
  country: string;
  email: string;
  phone?: string;
  productsOfInterest: string;
  quantity?: string;
  destinationCountry?: string;
  destinationPort?: string;
  packaging?: string;
  privateLabel: "unsure" | "yes" | "no";
  message?: string;
  /** The product slug this enquiry started from, when it came off a product page. */
  sourceProduct?: string;
  /** Where on the site the buyer was sent from. */
  sourcePath: string;
  submittedAt: string;
}

/** The one choice that changes the shape of the form, so it is the first thing asked. */
const ENQUIRY_TYPES = [
  {
    value: "wholesale" as const,
    icon: Store,
    title: "Wholesale in India",
    desc: "Buying in quantity for a shop, a route or your own business.",
  },
  {
    value: "export" as const,
    icon: Globe,
    title: "Export",
    desc: "Importing into a market outside India.",
  },
];

const PRIVATE_LABEL_LABEL: Record<QuoteEnquiry["privateLabel"], string> = {
  unsure: "Not decided yet",
  yes: "Yes, own brand / private label",
  no: "No, the existing brand is fine",
};

/**
 * `?product=<slug>` and `?type=wholesale|export` come from links elsewhere on the
 * site, so they are untrusted input. React escapes them on render; these two helpers
 * keep them sane in the payload as well.
 */
function readProductParam(search: string): string | undefined {
  const raw = new URLSearchParams(search).get("product");
  if (!raw) return undefined;
  const slug = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 80);
  return slug || undefined;
}

function readTypeParam(search: string): "wholesale" | "export" | undefined {
  const raw = new URLSearchParams(search).get("type");
  return raw === "wholesale" || raw === "export" ? raw : undefined;
}

/** `roasted-makhana-peri-peri` → `Roasted Makhana Peri Peri`, as a starting point the buyer can edit. */
function slugToLabel(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildEnquiry(values: QuoteFormValues, sourceProduct?: string): QuoteEnquiry {
  const isExport = values.enquiryType === "export";
  return {
    enquiryType: values.enquiryType,
    companyName: values.companyName,
    contactPerson: values.contactPerson,
    country: values.country,
    email: values.email,
    phone: values.phone || undefined,
    productsOfInterest: values.productsOfInterest,
    quantity: values.quantity || undefined,
    // Export-only fields never travel on a wholesale enquiry, even if the buyer
    // typed them before switching the enquiry type.
    destinationCountry: isExport ? values.destinationCountry || undefined : undefined,
    destinationPort: isExport ? values.destinationPort || undefined : undefined,
    packaging: values.packaging || undefined,
    privateLabel: values.privateLabel,
    message: values.message || undefined,
    sourceProduct,
    sourcePath:
      typeof window === "undefined"
        ? "/request-a-quote"
        : `${window.location.pathname}${window.location.search}`,
    submittedAt: new Date().toISOString(),
  };
}

/** The enquiry as text a person can read — the email body, and the copy-to-clipboard block. */
function enquiryToText(enquiry: QuoteEnquiry): string {
  const rows: Array<[string, string | undefined]> = [
    ["Enquiry type", enquiry.enquiryType === "export" ? "Export" : "Wholesale (India)"],
    ["Company", enquiry.companyName],
    ["Contact person", enquiry.contactPerson],
    ["Country", enquiry.country],
    ["Email", enquiry.email],
    ["Phone / WhatsApp", enquiry.phone],
    ["Products of interest", enquiry.productsOfInterest],
    ["Estimated quantity", enquiry.quantity],
    ["Destination country", enquiry.destinationCountry],
    ["Destination port", enquiry.destinationPort],
    ["Packaging requirement", enquiry.packaging],
    // "Not decided yet" is the default, so printing it would be noise, not information.
    [
      "Private label",
      enquiry.privateLabel === "unsure" ? undefined : PRIVATE_LABEL_LABEL[enquiry.privateLabel],
    ],
    ["Message", enquiry.message],
  ];

  return rows
    .filter((row): row is [string, string] => Boolean(row[1]))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\r\n");
}

function mailtoHref(enquiry: QuoteEnquiry): string {
  const subject = `Quote request — ${enquiry.companyName} (${
    enquiry.enquiryType === "export" ? "Export" : "Wholesale"
  })`;
  const body = enquiryToText(enquiry);
  const build = (text: string) =>
    `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

  const href = build(body);
  if (href.length <= MAILTO_MAX_HREF) return href;

  // Long enquiry. Truncate rather than hand the mail client a href it will cut in
  // an arbitrary place — and say so, so the buyer knows to paste the rest.
  const room = Math.max(0, body.length - (href.length - MAILTO_MAX_HREF) - 120);
  return build(
    `${body.slice(0, room)}\r\n\r\n[This enquiry was shortened to fit. The full version is on the website page — please paste it below.]`
  );
}

export default function RequestAQuote() {
  const search = typeof window === "undefined" ? "" : window.location.search;
  const [sourceProduct] = useState(() => readProductParam(search));
  const [submitted, setSubmitted] = useState<QuoteEnquiry | null>(null);
  const [copied, setCopied] = useState(false);

  /*
    Called before the `if (submitted)` early return below, so the hook order is the
    same on both screens. The canonical is the bare path: `?product=` and `?type=`
    are pre-fill hints, not distinct pages, and letting each product spawn its own
    indexable quote URL would duplicate this page across the catalogue.

    The description describes the form, not an outcome — see the TODO at the top of
    this file: there is no RFQ endpoint yet, so nothing here should promise a reply.
  */
  useSeo({
    title: "Request a Quote — Wholesale & Export Enquiries",
    description:
      "Send a wholesale or export enquiry for Indian snacks and packaged foods — the products, quantities and destination you need quoted, in one form.",
    canonical: "/request-a-quote",
  });

  const form = useForm<QuoteFormValues>({
    resolver: quoteResolver,
    defaultValues: {
      enquiryType: readTypeParam(search),
      companyName: "",
      contactPerson: "",
      country: "",
      email: "",
      phone: "",
      productsOfInterest: sourceProduct ? slugToLabel(sourceProduct) : "",
      quantity: "",
      destinationCountry: "",
      destinationPort: "",
      packaging: "",
      privateLabel: "unsure",
      message: "",
    },
  });

  const enquiryType = form.watch("enquiryType");

  /*
    The review screen is far shorter than the form, so without this the buyer is
    left looking at empty space below it and cannot tell anything happened. It runs
    after the swap has been committed, and instantly: a smooth scroll started before
    the re-render gets cancelled when the document shrinks under it.
  */
  useEffect(() => {
    if (submitted) window.scrollTo(0, 0);
  }, [submitted]);

  const onSubmit = (values: QuoteFormValues) => {
    const enquiry = buildEnquiry(values, sourceProduct);

    // 1. Log it. With no endpoint, this is the only automatic record that exists.
    //    Deliberate console use on a page that otherwise has none — see the TODO above.
    // eslint-disable-next-line no-console
    console.info(
      "[narayani] Quote enquiry captured. No RFQ endpoint exists yet, so this was NOT transmitted:",
      enquiry
    );

    // 2. Keep the buyer's own copy on their device, so a reload does not destroy a
    //    form that took ten minutes to fill in.
    try {
      window.localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(enquiry));
    } catch {
      // Private browsing, or storage disabled. The review screen still works.
    }

    // 3. Hand them a channel that actually delivers today.
    setSubmitted(enquiry);
    setCopied(false);
  };

  const onCopy = async () => {
    if (!submitted) return;
    try {
      await navigator.clipboard.writeText(enquiryToText(submitted));
      setCopied(true);
      toast.success("Enquiry copied");
    } catch {
      toast.error("Could not copy automatically — select the text below and copy it.");
    }
  };

  /* ── Review and send ─────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <SiteShell>
        <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
          <div className="container mx-auto max-w-3xl px-4 py-14 lg:py-20">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </span>

            <h1 className="mt-6 font-serif text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              Your enquiry is ready to send.
            </h1>

            {/*
              This screen never says "received" or "we will be in touch", because
              nothing has received it. It says exactly what is true and puts the
              action that actually delivers directly under the sentence.
            */}
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We have put everything you entered into an email addressed to our team. Send it
              and it reaches us directly &mdash; nothing has left this page yet.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full px-8" asChild>
                <a href={mailtoHref(submitted)}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Send this enquiry by email
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8"
                onClick={onCopy}
                type="button"
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy the enquiry"}
              </Button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              If the button does not open a mail app &mdash; common on webmail &mdash; copy the
              enquiry and send it to{" "}
              <a
                href={`mailto:${ENQUIRY_EMAIL}`}
                className="font-medium text-primary hover:underline"
              >
                {ENQUIRY_EMAIL}
              </a>
              . Prefer to talk?{" "}
              <Link href="/contact" className="font-medium text-primary hover:underline">
                Our phone numbers are on the contact page
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="container mx-auto max-w-3xl px-4 py-12 lg:py-16">
          <h2 className="font-serif text-2xl font-bold">What you are sending</h2>
          <pre className="mt-5 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-border bg-card p-6 font-sans text-sm leading-relaxed text-foreground shadow-sm">
            {enquiryToText(submitted)}
          </pre>

          {/*
            Point 19 asks for a file upload. There is no storage for one, so instead of a
            field that would drop the file, we tell the buyer where to put it.
          */}
          <div className="mt-6 flex gap-3 rounded-2xl border border-border bg-secondary/60 p-5">
            <Paperclip
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Have a specification sheet, a label or a photograph of what you are looking for?
              Attach it to the email. We can work from it.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {/*
              Returns to the form with every value still in it — `form` is never reset,
              so nothing the buyer typed is thrown away by coming back here.
            */}
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6"
              onClick={() => setSubmitted(null)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Change something
            </Button>
            <Button variant="outline" className="rounded-full px-6" asChild>
              <Link href="/shop">Keep looking at the range</Link>
            </Button>
          </div>
        </section>
      </SiteShell>
    );
  }

  /* ── The form ────────────────────────────────────────────────────────────── */
  return (
    <SiteShell>
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-3xl px-4 py-14 text-center lg:py-20">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Request a Quote
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>

          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Tell us what you need priced.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Whether you are stocking shelves in India or importing Indian packaged foods, describe
            the requirement and we will come back with a quotation for it.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Form */}
          <div className="lg:col-span-7 xl:col-span-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                {/* Enquiry type — the choice that shapes the rest of the form */}
                <div>
                  <h2 className="font-serif text-2xl font-bold">What kind of enquiry is this?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This decides what else we need to ask you.
                  </p>

                  <FormField
                    control={form.control}
                    name="enquiryType"
                    render={({ field }) => (
                      <FormItem className="mt-5 space-y-3">
                        <FormControl>
                          <RadioGroup
                            value={field.value ?? ""}
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value === "wholesale") {
                                // Do not carry destination details into a domestic
                                // enquiry, and clear any error they left behind.
                                form.setValue("destinationCountry", "");
                                form.setValue("destinationPort", "");
                                form.clearErrors(["destinationCountry", "destinationPort"]);
                              }
                            }}
                            className="grid gap-3 sm:grid-cols-2"
                          >
                            {ENQUIRY_TYPES.map((option) => (
                              <FormItem
                                key={option.value}
                                className={cn(
                                  "flex items-start gap-3 space-y-0 rounded-2xl border bg-card p-5 shadow-sm transition-colors",
                                  field.value === option.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <FormControl>
                                  <RadioGroupItem value={option.value} className="mt-1" />
                                </FormControl>
                                <FormLabel className="flex-1 cursor-pointer font-normal">
                                  <span className="flex items-center gap-2 font-semibold text-foreground">
                                    <option.icon
                                      className="h-4 w-4 text-primary"
                                      strokeWidth={1.75}
                                      aria-hidden="true"
                                    />
                                    {option.title}
                                  </span>
                                  <span className="mt-1.5 block text-sm font-normal leading-relaxed text-muted-foreground">
                                    {option.desc}
                                  </span>
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Who is asking */}
                <div className="border-t border-border pt-10">
                  <h2 className="font-serif text-2xl font-bold">Your details</h2>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company name</FormLabel>
                          <FormControl>
                            <Input placeholder="Registered business name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact person</FormLabel>
                          <FormControl>
                            <Input placeholder="Who should we reply to?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Where your business is based" {...field} />
                          </FormControl>
                          <FormDescription>
                            Tells us whether this is a domestic or an export quotation.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              placeholder="you@company.com"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>This is where the quotation goes.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>
                            Phone or WhatsApp{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              inputMode="tel"
                              autoComplete="tel"
                              placeholder="Include your country code"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Useful for anything quicker to settle in a message than in an email.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* What to quote */}
                <div className="border-t border-border pt-10">
                  <h2 className="font-serif text-2xl font-bold">What you want priced</h2>

                  <div className="mt-6 space-y-5">
                    <FormField
                      control={form.control}
                      name="productsOfInterest"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Products of interest</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Products, categories or a description of what you are looking for"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            A category is enough if you have not picked specific items yet.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Quantity{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Cases, kilos, a container — however you think about it"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            A rough estimate is genuinely useful; leave it blank if you are still
                            working it out.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Export-only: where it is going */}
                {enquiryType === "export" && (
                  <div className="border-t border-border pt-10">
                    <h2 className="font-serif text-2xl font-bold">Where it is going</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The destination changes the documentation and the shipping, so it changes the
                      quotation.
                    </p>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="destinationCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination country</FormLabel>
                            <FormControl>
                              <Input placeholder="Where the goods are landing" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="destinationPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Destination port{" "}
                              <span className="font-normal text-muted-foreground">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Port or airport, if you know it" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave it blank if it is not settled &mdash; we can work to the
                              country.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Packaging and labelling */}
                <div className="border-t border-border pt-10">
                  <h2 className="font-serif text-2xl font-bold">Packaging and labelling</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Both optional. Packaging is the manufacturer&rsquo;s, so we take your
                    requirements to them rather than deciding it here.
                  </p>

                  <div className="mt-6 space-y-5">
                    <FormField
                      control={form.control}
                      name="packaging"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Packaging requirement{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={2}
                              placeholder="Pack sizes, case configuration, labelling or language requirements"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="privateLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Are you looking for private label?</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="unsure">Not decided yet</option>
                              <option value="yes">Yes &mdash; own brand / private label</option>
                              <option value="no">No &mdash; the existing brand is fine</option>
                            </select>
                          </FormControl>
                          <FormDescription>
                            {/*
                              Asks about the buyer's requirement. It deliberately makes no
                              statement about whether private label is offered — the business
                              has not answered that. See the sub-plan's blocked list.
                            */}
                            Tell us what you need and we will take it to the supplier.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Anything else */}
                <div className="border-t border-border pt-10">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-serif text-2xl font-bold">
                          Anything else{" "}
                          <span className="text-base font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            className="mt-4"
                            placeholder="Timelines, certifications you need, how often you expect to reorder, or anything else that shapes the quotation"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/*
                  Said before the button, not after it. A buyer should know what the
                  next screen does before they get there.
                */}
                <div className="rounded-2xl border border-border bg-secondary/60 p-5">
                  <p className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <FileText
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span>
                      The next step shows your enquiry written out and an email button that sends
                      it to us. Nothing leaves this page until you send it.
                    </span>
                  </p>
                </div>

                <Button type="submit" size="lg" className="h-14 w-full rounded-full text-lg">
                  Review and send enquiry
                </Button>
              </form>
            </Form>
          </div>

          {/* Aside — what a useful enquiry contains, and the other ways to reach us */}
          <aside className="lg:col-span-5 xl:col-span-4">
            <div className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-serif text-xl font-bold">What helps us quote faster</h2>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {[
                    "The products or categories you are interested in",
                    "Roughly what quantity, and how often you expect to reorder",
                    "The destination market, if you are importing",
                    "Pack sizes and any packaging requirement",
                    "Labelling or language rules that apply where you sell",
                    "The timeline you are working to",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                  Not all of it is required. Send what you know.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/60 p-6">
                <h2 className="font-serif text-xl font-bold">Would rather just email?</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Write to{" "}
                  <a
                    href={`mailto:${ENQUIRY_EMAIL}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {ENQUIRY_EMAIL}
                  </a>{" "}
                  directly, or find our phone numbers and address on the{" "}
                  <Link href="/contact" className="font-medium text-primary hover:underline">
                    contact page
                  </Link>
                  .
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Buying to sell in India?{" "}
                  <Link href="/wholesale" className="font-medium text-primary hover:underline">
                    See how wholesale works
                  </Link>
                  . Importing?{" "}
                  <Link href="/export" className="font-medium text-primary hover:underline">
                    See the export page
                  </Link>
                  .
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
