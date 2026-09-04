/**
 * Admin → Settings. The business's own identity and registration numbers.
 *
 * ─── WHY THIS SCREEN EXISTS ─────────────────────────────────────────────────
 * These values were hardcoded in api/index.ts, and what was hardcoded was fiction:
 * GET /orders/:id/invoice shipped the GSTIN "23AAAAA0000A1Z5" — the format example
 * out of the GST documentation — along with a phone number of "+91 90000 00000" and
 * an email address that does not exist, on tax invoices issued to real customers.
 *
 * ─── THE RULE FOR EVERY FIELD HERE ──────────────────────────────────────────
 * Blank means "render nothing", everywhere. Not a placeholder, not a dash, not a
 * "coming soon". An invoice with no GSTIN line is a document with a visible gap
 * somebody fixes; an invoice with an invented GSTIN is a document that looks right
 * and is not. The same applies to the /quality page and the footer: a registration
 * that is not entered here simply does not appear on the site.
 *
 * Banking fields are not served by the public GET /settings — see
 * PUBLIC_SETTING_KEYS in api/index.ts. They reach an invoice, not a crawler.
 */
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Building2, CreditCard, LineChart, Loader2, ShieldCheck } from "lucide-react";

type Settings = Record<string, string>;

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
}

interface GroupDef {
  title: string;
  icon: typeof Building2;
  intro: string;
  fields: FieldDef[];
}

const GROUPS: GroupDef[] = [
  {
    title: "Business identity",
    icon: Building2,
    intro:
      "Shown on invoices, on the Quality & Compliance page and in the footer. Anything you leave blank is not displayed anywhere.",
    fields: [
      { key: "legal_name", label: "Registered business name", placeholder: "Narayani Distributors" },
      {
        key: "registered_address",
        label: "Registered address",
        multiline: true,
        hint: "The address that appears on your GST invoices.",
      },
      { key: "support_email", label: "Contact email", placeholder: "support@narayanidistributors.com" },
      { key: "support_phone", label: "Contact phone", placeholder: "+91 ..." },
      { key: "whatsapp", label: "WhatsApp number", hint: "Leave blank if it is the same as the phone." },
    ],
  },
  {
    title: "Registrations",
    icon: ShieldCheck,
    intro:
      "Enter only numbers you actually hold. Each one appears on the Quality & Compliance page with a link to the official register, so a buyer can check it — which means a wrong number is worse than no number.",
    fields: [
      { key: "gstin", label: "GSTIN", hint: "15 characters. Goes on every invoice." },
      { key: "pan", label: "PAN", hint: "10 characters." },
      { key: "fssai", label: "FSSAI licence", hint: "14 digits. Yours as a distributor, not the manufacturer's." },
      { key: "iec", label: "IEC (Import Export Code)", hint: "10 characters. Required to export." },
      { key: "apeda_rcmc", label: "APEDA RCMC", hint: "Only if you are registered with APEDA." },
      { key: "cin", label: "CIN", hint: "Only if incorporated as a company." },
    ],
  },
  {
    title: "Analytics & tracking",
    icon: LineChart,
    intro:
      "Paste the IDs from each platform. Nothing is loaded until an ID is set here — with all four blank the site sends no tracking script and sets no tracking cookie at all.",
    fields: [
      {
        key: "ga4_id",
        label: "Google Analytics 4 measurement ID",
        placeholder: "G-XXXXXXXXXX",
        hint: "Analytics → Admin → Data streams → your web stream.",
      },
      {
        key: "google_site_verification",
        label: "Google Search Console verification",
        hint: "The content value from the HTML tag method. Needed to submit your sitemap.",
      },
      { key: "meta_pixel_id", label: "Meta Pixel ID", placeholder: "15 digits" },
      { key: "linkedin_partner_id", label: "LinkedIn Partner ID", placeholder: "7 digits" },
    ],
  },
  {
    title: "Payment details",
    icon: CreditCard,
    intro:
      "Used on invoices so a customer knows where to pay. These are NOT served on the public settings endpoint.",
    fields: [
      { key: "bank_name", label: "Bank name" },
      { key: "bank_account", label: "Account number" },
      { key: "bank_ifsc", label: "IFSC code" },
      { key: "upi_id", label: "UPI ID" },
    ],
  },
];

function token() {
  return localStorage.getItem("narayani_token");
}

function SettingsInner() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Settings>({});

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Could not load settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (values: Settings) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Could not save settings");
      return res.json();
    },
    onSuccess: (saved: Settings) => {
      setDraft(saved);
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty = data ? Object.keys(draft).some((k) => (draft[k] ?? "") !== (data[k] ?? "")) : false;
  const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const filledCount = Object.entries(draft).filter(
    ([k, v]) => v.trim() && ["gstin", "iec", "fssai", "apeda_rcmc", "cin", "pan"].includes(k)
  ).length;

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Your business identity, registrations and payment details
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <strong>Anything left blank is not shown anywhere on the site.</strong> That is
            deliberate. The Quality &amp; Compliance page, the footer and your invoices all
            render only the numbers you have entered here — nothing is filled in with a
            placeholder or an example.
            {filledCount === 0 && (
              <>
                {" "}
                Right now <strong>no registration numbers are set</strong>, so your invoices
                carry no GSTIN and the Quality page shows nothing.
              </>
            )}
          </div>

          <div className="space-y-8">
            {GROUPS.map((group) => (
              <section key={group.title} className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-start gap-3 border-b p-6">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <group.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{group.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {group.intro}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 p-6 sm:grid-cols-2">
                  {group.fields.map((field) => (
                    <div
                      key={field.key}
                      className={field.multiline ? "sm:col-span-2" : undefined}
                    >
                      <label
                        htmlFor={`setting-${field.key}`}
                        className="mb-1.5 block text-sm font-medium"
                      >
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <Textarea
                          id={`setting-${field.key}`}
                          rows={3}
                          value={draft[field.key] ?? ""}
                          placeholder={field.placeholder}
                          onChange={(e) => set(field.key, e.target.value)}
                        />
                      ) : (
                        <Input
                          id={`setting-${field.key}`}
                          value={draft[field.key] ?? ""}
                          placeholder={field.placeholder}
                          onChange={(e) => set(field.key, e.target.value)}
                        />
                      )}
                      {field.hint && (
                        <p className="mt-1.5 text-xs text-muted-foreground">{field.hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 border-t bg-background/95 py-4 backdrop-blur">
            <p className="text-sm text-muted-foreground">
              {dirty ? "You have unsaved changes." : "Everything is saved."}
            </p>
            <div className="flex gap-3">
              {dirty && (
                <Button variant="outline" onClick={() => data && setDraft(data)}>
                  Discard
                </Button>
              )}
              <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(draft)}>
                {save.isPending ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}

export default function AdminSettings() {
  return (
    <ProtectedRoute adminOnly>
      <SettingsInner />
    </ProtectedRoute>
  );
}
