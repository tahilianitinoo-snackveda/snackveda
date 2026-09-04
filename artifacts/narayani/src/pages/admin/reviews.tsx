/**
 * Admin → Reviews. The moderation queue.
 *
 * Every review a customer writes lands here as `pending` and is invisible to
 * everyone else until it is approved. That is what makes spec point 37 —
 * "genuine customer reviews only" — enforceable rather than aspirational.
 *
 * Rejecting is not deleting. A rejected review stays in the table and its author
 * still sees it on the product page marked "Not published", so nobody is left
 * wondering whether their submission was ever received. Delete is for spam.
 */
import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { BadgeCheck, Check, Loader2, Star, Trash2, X } from "lucide-react";

interface AdminReview {
  id: string;
  productName: string;
  productSlug: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  verifiedPurchase: boolean;
  status: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-muted text-muted-foreground border-border",
};

function token() {
  return localStorage.getItem("narayani_token");
}

function ReviewsInner() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");

  const { data: reviews, isLoading } = useQuery<AdminReview[]>({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reviews", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Could not load reviews");
      return res.json();
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update the review");
      return res.json();
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success(v.status === "approved" ? "Review published" : "Review hidden");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error("Could not delete the review");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Review deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = reviews ?? [];
  const rows = all.filter((r) => filter === "all" || r.status === filter);
  const countFor = (s: string) => (s === "all" ? all.length : all.filter((r) => r.status === s).length);

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">
          Nothing appears on the site until you approve it
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList>
          {["pending", "approved", "rejected", "all"].map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s} ({countFor(s)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="font-medium">
            {filter === "pending" ? "Nothing waiting for you" : `No ${filter} reviews`}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {all.length === 0
              ? "No customer has written a review yet. Product pages invite signed-in customers to write the first one."
              : "Try another tab."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((review) => (
            <div key={review.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-4 w-4 ${
                            n <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                          strokeWidth={1.5}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-medium">{review.authorName}</span>
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
                      </span>
                    )}
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLE[review.status] ?? ""}`}>
                      {review.status}
                    </Badge>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    on{" "}
                    <a
                      href={`/shop/${review.productSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-foreground hover:underline"
                    >
                      {review.productName}
                    </a>{" "}
                    &bull; {formatDate(review.createdAt)}
                  </p>

                  {review.title && <p className="mt-3 font-medium">{review.title}</p>}
                  {review.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {review.body}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {review.status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => setStatus.mutate({ id: review.id, status: "approved" })}
                      disabled={setStatus.isPending}
                    >
                      <Check className="mr-1.5 h-4 w-4" /> Publish
                    </Button>
                  )}
                  {review.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: review.id, status: "rejected" })}
                      disabled={setStatus.isPending}
                    >
                      <X className="mr-1.5 h-4 w-4" /> Hide
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm("Delete this review permanently? Hiding it is usually enough.")) {
                        remove.mutate(review.id);
                      }
                    }}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminReviews() {
  return (
    <ProtectedRoute adminOnly>
      <ReviewsInner />
    </ProtectedRoute>
  );
}
