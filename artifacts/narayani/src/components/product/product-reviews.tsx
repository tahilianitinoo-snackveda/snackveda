/**
 * Customer reviews on a product page — spec point 37.
 *
 * ─── THE RULE ───────────────────────────────────────────────────────────────
 * "Use genuine customer reviews only. If reviews are not available, do not
 * fabricate them." Nothing in this component, and nothing behind it, can produce a
 * review that a signed-in customer did not write. There is no seed data, no
 * example, no placeholder star rating. A product with none shows an invitation to
 * write the first one — which is honest, and is also the only thing that has ever
 * caused a review section to fill up.
 *
 * ─── MODERATION IS VISIBLE, NOT HIDDEN ──────────────────────────────────────
 * Every review lands as `pending` and an admin approves it. The author is told
 * that in those words and can see their own pending review; everyone else sees
 * only what is approved. A customer whose review silently disappeared would
 * reasonably conclude we deleted it for being critical.
 *
 * ─── NO AggregateRating SCHEMA HERE ─────────────────────────────────────────
 * product-detail.tsx deliberately emits no review or rating JSON-LD. Do not add it
 * from this component either until there is a meaningful number of real reviews —
 * emitting an aggregate over two ratings is how a food site earns a manual action.
 */
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { BadgeCheck, Clock, Loader2, Star } from "lucide-react";

interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  verifiedPurchase: boolean;
  status: string;
  createdAt: string;
}

interface ReviewsResponse {
  count: number;
  average: number | null;
  distribution: Record<string, number>;
  reviews: Review[];
  mine: Review | null;
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const px = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${px} ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

/** The rating input. Keyboard-operable, because a star widget usually is not. */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ slug, productName }: { slug: string; productName: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [writing, setWriting] = useState(false);

  const { data, isLoading } = useQuery<ReviewsResponse>({
    queryKey: ["product-reviews", slug],
    queryFn: async () => {
      const token = localStorage.getItem("narayani_token");
      const res = await fetch(`/api/products/${slug}/reviews`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Could not load reviews");
      return res.json();
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("narayani_token");
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, title: title || undefined, body: body || undefined }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Could not save your review");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-reviews", slug] });
      setWriting(false);
      setTitle("");
      setBody("");
      setRating(0);
      toast.success("Thank you — your review is with us and will appear once checked.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = data?.reviews ?? [];
  const count = data?.count ?? 0;

  return (
    <section aria-labelledby="reviews-heading" className="mt-16 border-t border-border pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="font-serif text-3xl font-bold text-foreground">
            Customer reviews
          </h2>
          {count > 0 && data?.average != null ? (
            <div className="mt-3 flex items-center gap-3">
              <Stars value={Math.round(data.average)} size="lg" />
              <span className="text-lg font-semibold">{data.average.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">
                from {count} {count === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">
              No one has reviewed {productName} yet.
            </p>
          )}
        </div>

        {!writing && (
          user ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setWriting(true);
                if (data?.mine) {
                  setRating(data.mine.rating);
                  setTitle(data.mine.title ?? "");
                  setBody(data.mine.body ?? "");
                }
              }}
            >
              {data?.mine ? "Edit your review" : "Write a review"}
            </Button>
          ) : (
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/login">Sign in to review</Link>
            </Button>
          )
        )}
      </div>

      {/* The author's own review, whatever its state. */}
      {data?.mine && !writing && (
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Stars value={data.mine.rating} />
            <span className="text-sm font-medium">Your review</span>
            {data.mine.status === "pending" && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" /> Awaiting approval
              </Badge>
            )}
            {data.mine.status === "rejected" && (
              <Badge variant="outline" className="text-xs">Not published</Badge>
            )}
          </div>
          {data.mine.title && <p className="mt-2 font-medium">{data.mine.title}</p>}
          {data.mine.body && (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {data.mine.body}
            </p>
          )}
          {data.mine.status === "pending" && (
            <p className="mt-3 text-xs text-muted-foreground">
              We read every review before it goes up. Yours is not visible to anyone else yet.
            </p>
          )}
        </div>
      )}

      {/* Write form */}
      {writing && (
        <form
          className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rating) {
              toast.error("Choose a rating first");
              return;
            }
            submit.mutate();
          }}
        >
          <div>
            <p className="mb-2 text-sm font-medium">How would you rate it?</p>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium">
              Headline <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="review-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a few words"
            />
          </div>
          <div>
            <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium">
              Your review <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="review-body"
              rows={4}
              value={body}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you think? Taste, texture, packaging, whether you would buy it again."
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Reviews are read before they are published, so yours will not appear straight away.
            If something you ate made you unwell, please contact us directly rather than only
            writing it here — we need to reach the manufacturer.
          </p>
          <div className="flex gap-3">
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Sending…" : data?.mine ? "Update review" : "Submit review"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setWriting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Published reviews */}
      {isLoading ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length > 0 ? (
        <ul className="mt-8 space-y-6">
          {reviews.map((review) => (
            <li key={review.id} className="border-b border-border pb-6 last:border-0">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={review.rating} />
                <span className="text-sm font-medium text-foreground">{review.authorName}</span>
                {review.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Verified purchase
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
              </div>
              {review.title && <p className="mt-2 font-medium text-foreground">{review.title}</p>}
              {review.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !writing && (
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            {user
              ? "Be the first — if you have tried it, we would like to know what you thought."
              : "Sign in to leave the first review. We publish only reviews written by customers with an account."}
          </p>
        )
      )}
    </section>
  );
}
