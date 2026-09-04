import { useState } from "react";
import { Link } from "wouter";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { COUNTRIES } from "@/data/geography";
import { PhoneField, composePhone } from "@/components/ui/phone-field";
import { generateCataloguePdf, type CataloguePayload } from "@/lib/pdf";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { ArrowRight, Check, Download, FileText, Package, Ship } from "lucide-react";

/**
 * /catalogue — spec point 20.
 *
 * ─── WHAT THE FORM IS AND IS NOT ────────────────────────────────────────────
 * Three required fields — name, email, phone — and then the download happens, in
 * the same click, with no approval step and nothing to wait for. It is a lead
 * capture, not a paywall. If recording the lead fails server-side, the catalogue
 * is still returned: a buyer must never be denied a document because our database
 * hiccuped.
 *
 * ─── NO TRADE PRICES ────────────────────────────────────────────────────────
 * Anyone can fill in this form, so the catalogue is a public document. The API
 * response deliberately excludes `b2bPrice`, and `generateCataloguePdf` has no way
 * to print one. Wholesale rates are quoted against an enquiry — a PDF of them
 * circulating among buyers and competitors cannot be recalled.
 *
 * The PDF is generated in the browser from live database rows, so it can never be
 * the stale file that a static download inevitably becomes.
 */

const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Your name, please").max(120),
  email: z.string().trim().email("Enter an email we can reach you on").max(160),
  // ISO alpha-2 of the dialling code; the code itself is derived, because +1 is
  // the US, Canada and Jamaica and could not be a unique key.
  phoneCountry: z.string().length(2).default("IN"),
  // The national number only — the code is chosen beside it and joined on submit.
  phone: z
    .string()
    .trim()
    .min(6, "Enter a phone number we can call back")
    .max(20)
    .regex(/^[\d][\d\s().-]{4,}$/, "Digits only — pick the country code on the left"),
  companyName: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  interest: z.string().trim().max(200).optional(),
});

type LeadValues = z.infer<typeof leadSchema>;

const INSIDE = [
  { icon: Package, title: "Every product we carry", desc: "Name, brand, pack format, net weight and carton configuration." },
  { icon: FileText, title: "Trade specification", desc: "Shelf life, HSN code and GST rate against each item." },
  { icon: Ship, title: "How to buy", desc: "Who we supply, how a quotation works and where to send an enquiry." },
];

export default function Catalogue() {
  const [done, setDone] = useState(false);
  const [payload, setPayload] = useState<CataloguePayload | null>(null);
  const [sending, setSending] = useState(false);

  useSeo({
    title: "Download the Wholesale & Export Catalogue",
    description:
      "The full Narayani Distributors product catalogue with pack formats, carton configurations, shelf life and HSN codes — for wholesale buyers, distributors and importers.",
    canonical: "/catalogue",
  });

  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      fullName: "", email: "", phoneCountry: "IN", phone: "",
      companyName: "", country: "", interest: "",
    },
  });


  const onSubmit = async (values: LeadValues) => {
    setSending(true);
    try {
      const res = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // Send the number WITH its dialling code, so it can be called back
          // without anyone having to work out where it came from.
          phone: composePhone(values.phoneCountry || "IN", values.phone),
          sourcePath: typeof window === "undefined" ? "/catalogue" : window.location.pathname,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Could not prepare the catalogue");
      }
      const data = (await res.json()) as CataloguePayload;
      setPayload(data);
      setDone(true);
      track("catalogue_download", {
        country: values.country || "unspecified",
        has_company: Boolean(values.companyName),
      });
      // Straight into the download. They asked for a catalogue; make them click once.
      generateCataloguePdf(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <SiteShell>
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-20">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Catalogue
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>
          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            The wholesale &amp; export catalogue.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Every product we carry, with the pack and specification detail a business buyer
            needs to shortlist. Built from our live catalogue the moment you ask for it, so it
            is never out of date.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <h2 className="font-serif text-2xl font-bold">What is in it</h2>
            <ul className="mt-6 space-y-6">
              {INSIDE.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <item.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/*
              Said plainly rather than discovered on page four. A buyer downloading
              a catalogue is usually looking for a price, and being straight about
              why it is not in there saves everyone an email.
            */}
            <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-5">
              <p className="text-sm font-medium text-foreground">On pricing</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The catalogue carries specifications, not trade prices. Wholesale and export
                rates depend on the quantity, the mix and the destination, so they are quoted
                against an enquiry rather than published.{" "}
                <Link href="/request-a-quote" className="font-medium text-primary hover:underline">
                  Ask for a quotation
                </Link>{" "}
                and you will get real numbers.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            {done && payload ? (
              <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                </span>
                <h2 className="mt-5 font-serif text-2xl font-bold">Your catalogue is downloading.</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {payload.products.length} products, generated just now. If the download did not
                  start, use the button below.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button className="rounded-full px-7" onClick={() => generateCataloguePdf(payload)}>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    Download again
                  </Button>
                  <Button variant="outline" className="rounded-full px-7" asChild>
                    <Link href="/request-a-quote">
                      Get a quotation <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                <h2 className="font-serif text-2xl font-bold">Where should we send it?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Three fields and it downloads straight away — there is nothing to wait for.
                </p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 space-y-5">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your name</FormLabel>
                        <FormControl><Input autoComplete="name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" inputMode="email" autoComplete="email" placeholder="you@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Country <span className="font-normal text-muted-foreground">(optional)</span>
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(name) => {
                              field.onChange(name);
                              // Move the phone code with it, unless they already set one.
                              const iso = COUNTRIES.find((c) => c.name === name)?.code;
                              if (iso && !form.formState.dirtyFields.phoneCountry) {
                                form.setValue("phoneCountry", iso);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Where you are" /></SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-72">
                              {COUNTRIES.map((c) => (
                                <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            {/* Selectable code, same reasoning as the quote form. */}
                            <PhoneField
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              country={form.watch("phoneCountry") || "IN"}
                              onCountryChange={(iso) =>
                                form.setValue("phoneCountry", iso, { shouldDirty: true })
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="companyName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Company <span className="font-normal text-muted-foreground">(optional)</span>
                        </FormLabel>
                        <FormControl><Input autoComplete="organization" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="interest" render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          What are you looking for?{" "}
                          <span className="font-normal text-muted-foreground">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Wholesale in India, export, private label…" {...field} />
                        </FormControl>
                        <FormDescription>
                          Helps us send something more useful than a catalogue if you need it.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="submit" size="lg" className="w-full rounded-full" disabled={sending}>
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      {sending ? "Preparing…" : "Download the catalogue"}
                    </Button>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
