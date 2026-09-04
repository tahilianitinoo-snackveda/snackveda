/**
 * Admin → Enquiries. The wholesale and export enquiries from /request-a-quote.
 *
 * This screen is the reason the RFQ endpoint stores before it notifies. Email on
 * this project has been failing (unverified Resend sending domain — see CLAUDE.md),
 * so for as long as that is true this table is the ONLY place an enquiry can be
 * seen. It must therefore work with no dependency on mail having been delivered.
 *
 * Raw fetch rather than a generated hook, matching ProductImageManager in
 * admin/products.tsx: `/admin/rfq` is not in lib/api-spec/openapi.yaml yet, and
 * hand-editing anything under generated/ is forbidden by CLAUDE.md.
 */
import { useState } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { ChevronDown, Globe, Loader2, Mail, Phone, Store } from "lucide-react";

interface Enquiry {
  id: string;
  reference: string;
  enquiryType: "wholesale" | "export";
  companyName: string;
  contactPerson: string;
  country: string;
  state: string | null;
  city: string | null;
  email: string;
  phone: string;
  productSlugs: string[];
  otherProducts: string | null;
  quantity: string | null;
  destinationCountry: string | null;
  destinationPort: string | null;
  packaging: string | null;
  privateLabel: string;
  message: string | null;
  sourceProduct: string | null;
  sourcePath: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

/** Somebody who gave their details to download the catalogue — spec point 20. */
interface CatalogueLead {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName: string | null;
  country: string | null;
  interest: string | null;
  createdAt: string;
}

const STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

/** Colour carries the same meaning as the word, for scanning a long list. */
const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-amber-100 text-amber-800 border-amber-200",
  quoted: "bg-violet-100 text-violet-800 border-violet-200",
  won: "bg-green-100 text-green-800 border-green-200",
  lost: "bg-muted text-muted-foreground border-border",
};

const PRIVATE_LABEL: Record<string, string> = {
  unsure: "Not decided",
  yes: "Wants own brand",
  no: "Existing brand is fine",
};

function token() {
  return localStorage.getItem("narayani_token");
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function EnquiryDetail({ enquiry }: { enquiry: Enquiry }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(enquiry.adminNotes ?? "");

  const update = useMutation({
    mutationFn: async (patch: { status?: string; adminNotes?: string }) => {
      const res = await fetch(`/api/admin/rfq/${enquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Could not save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rfq"] });
      toast.success("Enquiry updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const products = [
    enquiry.productSlugs.join(", "),
    enquiry.otherProducts ? `Also asked for: ${enquiry.otherProducts}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6 border-t bg-muted/20 p-6">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Products" value={products} />
        <Field label="Quantity" value={enquiry.quantity} />
        <Field label="Packaging" value={enquiry.packaging} />
        <Field label="Destination country" value={enquiry.destinationCountry} />
        <Field label="Destination port" value={enquiry.destinationPort} />
        <Field label="State / city" value={[enquiry.state, enquiry.city].filter(Boolean).join(", ")} />
        <Field label="Private label" value={PRIVATE_LABEL[enquiry.privateLabel] ?? enquiry.privateLabel} />
        <Field label="Came from" value={enquiry.sourceProduct || enquiry.sourcePath} />
      </dl>

      {enquiry.message && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Message</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{enquiry.message}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button size="sm" variant="outline" asChild>
          <a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Your enquiry ${enquiry.reference} — Narayani Distributors`)}`}>
            <Mail className="mr-2 h-4 w-4" /> Reply by email
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`}>
            <Phone className="mr-2 h-4 w-4" /> Call {enquiry.phone}
          </a>
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Internal notes</p>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What was quoted, what they said, what happens next"
        />
        <Button
          size="sm"
          className="mt-2"
          disabled={update.isPending || notes === (enquiry.adminNotes ?? "")}
          onClick={() => update.mutate({ adminNotes: notes })}
        >
          Save notes
        </Button>
      </div>
    </div>
  );
}

function EnquiriesInner() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data: enquiries, isLoading } = useQuery<Enquiry[]>({
    queryKey: ["admin-rfq"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rfq", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Could not load enquiries");
      return res.json();
    },
  });

  const { data: catalogueLeads } = useQuery<CatalogueLead[]>({
    queryKey: ["admin-catalogue-leads"],
    queryFn: async () => {
      const res = await fetch("/api/admin/catalogue-leads", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/rfq/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update status");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-rfq"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (enquiries ?? []).filter((e) => filter === "all" || e.status === filter);
  const countFor = (status: string) =>
    status === "all" ? enquiries?.length ?? 0 : (enquiries ?? []).filter((e) => e.status === status).length;

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold">Enquiries</h1>
        <p className="text-muted-foreground">
          Wholesale and export enquiries from the Request a Quote form
        </p>
      </div>

      {/*
        Catalogue downloads are leads too, and they were invisible: somebody who
        gives you their name, email and phone to get your catalogue is further down
        the funnel than a visitor, and nothing surfaced them.
      */}
      {catalogueLeads && catalogueLeads.length > 0 && (
        <details className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
          <summary className="cursor-pointer font-semibold">
            Catalogue downloads ({catalogueLeads.length})
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            People who gave their details to download the wholesale &amp; export catalogue.
            Not enquiries — but they went looking for one.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Looking for</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogueLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.fullName}
                      {lead.country && (
                        <div className="text-xs font-normal text-muted-foreground">{lead.country}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                      <div className="text-xs text-muted-foreground">{lead.phone}</div>
                    </TableCell>
                    <TableCell className="text-sm">{lead.companyName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.interest || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      )}

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({countFor("all")})</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s} ({countFor(s)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  {filter === "all"
                    ? "No enquiries yet. They appear here the moment someone submits the form."
                    : `No enquiries marked "${filter}".`}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => (
                <>
                  <TableRow
                    key={e.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{e.reference}</TableCell>
                    <TableCell className="font-medium">
                      {e.companyName}
                      <div className="text-xs font-normal text-muted-foreground">
                        {[e.city, e.state, e.country].filter(Boolean).join(", ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {e.contactPerson}
                      <div className="text-xs text-muted-foreground">
                        {e.email} &bull; {e.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                        {e.enquiryType === "export" ? (
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Store className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {e.enquiryType}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(e.createdAt)}</TableCell>
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      <Select
                        value={e.status}
                        onValueChange={(status) => setStatus.mutate({ id: e.id, status })}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLE[e.status] ?? ""}>
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${expanded === e.id ? "rotate-180" : ""}`}
                        />
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {expanded === e.id && (
                    <TableRow key={`${e.id}-detail`}>
                      <TableCell colSpan={7} className="p-0">
                        <EnquiryDetail enquiry={e} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}

export default function AdminEnquiries() {
  return (
    <ProtectedRoute adminOnly>
      <EnquiriesInner />
    </ProtectedRoute>
  );
}
