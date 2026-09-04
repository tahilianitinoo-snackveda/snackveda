/**
 * Admin → Policies. Spec point 49.
 *
 * These were JSX in policies.tsx. Changing a refund window meant a developer and a
 * deploy, which for the documents most likely to need a non-developer's attention
 * was exactly backwards.
 *
 * ─── WHY DELETE IS AWKWARD ON PURPOSE ───────────────────────────────────────
 * Unpublishing hides a policy; deleting destroys it. A shop that has taken orders
 * needs to be able to show the terms in force when an order was placed, so the
 * destructive option asks twice and the reversible one is the obvious button.
 *
 * ─── MARKDOWN, NOT HTML ─────────────────────────────────────────────────────
 * Same renderer as the blog. `##` for a heading, `-` for a bullet, `**bold**`.
 * Not a rich-text editor: these documents are pasted from and into email and legal
 * review, and markdown survives that round trip where pasted HTML does not.
 */
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Eye, FileText, Loader2, Plus, Trash2 } from "lucide-react";

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
}

function token() {
  return localStorage.getItem("narayani_token");
}

function LegalInner() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<LegalPage>>({});
  const [preview, setPreview] = useState(false);

  const { data: pages, isLoading } = useQuery<LegalPage[]>({
    queryKey: ["admin-legal"],
    queryFn: async () => {
      const res = await fetch("/api/admin/legal", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Could not load policies");
      return res.json();
    },
  });

  // Select the first policy once they arrive, so the screen is never empty.
  useEffect(() => {
    if (!selectedId && pages?.length) {
      setSelectedId(pages[0].id);
      setDraft(pages[0]);
    }
  }, [pages, selectedId]);

  const selected = pages?.find((p) => p.id === selectedId) ?? null;

  const save = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Nothing selected");
      const res = await fetch(`/api/admin/legal/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          title: draft.title,
          content: draft.content,
          sortOrder: draft.sortOrder,
          published: draft.published,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Could not save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-legal"] });
      toast.success("Policy saved — it is live now");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          title: "New policy",
          content: "## Heading\n\nWrite the policy here.",
          published: false,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Could not create");
      return res.json();
    },
    onSuccess: (page: LegalPage) => {
      qc.invalidateQueries({ queryKey: ["admin-legal"] });
      setSelectedId(page.id);
      setDraft(page);
      toast.success("Created as a draft — publish it when it is ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/legal/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Could not delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-legal"] });
      setSelectedId(null);
      setDraft({});
      toast.success("Policy deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty =
    selected != null &&
    (draft.title !== selected.title ||
      draft.content !== selected.content ||
      draft.published !== selected.published ||
      draft.sortOrder !== selected.sortOrder);

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Policies</h1>
          <p className="text-muted-foreground">
            Shipping, returns, terms, privacy and cookies — edited here, live immediately
          </p>
        </div>
        <Button variant="outline" onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="mr-2 h-4 w-4" /> New policy
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* The list */}
          <nav className="lg:col-span-1">
            <ul className="space-y-1">
              {pages?.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
                      setSelectedId(p.id);
                      setDraft(p);
                      setPreview(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      p.id === selectedId ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{p.title}</span>
                    {!p.published && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">Draft</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* The editor */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-muted-foreground">Choose a policy to edit.</p>
              </div>
            ) : (
              <div className="space-y-5 rounded-xl border bg-card p-6 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="legal-title" className="mb-1.5 block text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="legal-title"
                      value={draft.title ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="legal-order" className="mb-1.5 block text-sm font-medium">
                      Order
                    </label>
                    <Input
                      id="legal-order"
                      type="number"
                      min={0}
                      value={draft.sortOrder ?? 0}
                      onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  URL: <code className="rounded bg-muted px-1.5 py-0.5">/policies</code> — tab{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">{selected.slug}</code>. Last
                  edited {formatDate(selected.updatedAt)}.
                </p>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="legal-content" className="text-sm font-medium">
                      Content
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreview((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {preview ? "Back to editing" : "Preview"}
                    </button>
                  </div>

                  {preview ? (
                    <div
                      className="prose prose-neutral min-h-64 max-w-none rounded-md border bg-muted/20 p-4 prose-headings:font-serif prose-headings:text-lg"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.content ?? "") }}
                    />
                  ) : (
                    <Textarea
                      id="legal-content"
                      rows={20}
                      className="font-mono text-sm"
                      value={draft.content ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                    />
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Markdown: <code>## Heading</code>, <code>- bullet</code>,{" "}
                    <code>**bold**</code>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                  <label className="flex items-center gap-3 text-sm">
                    <Switch
                      checked={draft.published ?? false}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, published: v }))}
                    />
                    <span>
                      {draft.published ? "Published — visible on /policies" : "Draft — not shown to customers"}
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete "${selected.title}" permanently?\n\nUnpublishing hides it and keeps the text. Deleting cannot be undone, and you may need this document to show what terms applied to a past order.`
                          ) &&
                          window.confirm("Really delete it?")
                        ) {
                          remove.mutate(selected.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                    <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
                      {save.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminLegal() {
  return (
    <ProtectedRoute adminOnly>
      <LegalInner />
    </ProtectedRoute>
  );
}
