import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Clock, Loader2, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogKeys, listBlogPosts, type BlogPostSummary } from "@/lib/blog-api";
import { SITE_URL, useSeo } from "@/lib/seo";

function postDate(post: BlogPostSummary) {
  return post.publishedAt ?? post.createdAt;
}

function PostCard({ post, featured = false }: { post: BlogPostSummary; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        featured ? "md:flex-row" : ""
      }`}
    >
      <div className={`relative overflow-hidden bg-muted ${featured ? "md:w-1/2 aspect-[16/10]" : "aspect-[16/9]"}`}>
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/5">
            <Newspaper className="h-10 w-10 text-primary/30" />
          </div>
        )}
        <Badge className="absolute left-3 top-3 bg-background/90 text-foreground hover:bg-background/90">
          {post.category}
        </Badge>
      </div>
      <div className={`flex flex-1 flex-col p-5 ${featured ? "md:p-8 md:justify-center" : ""}`}>
        <h2
          className={`font-serif font-bold leading-snug transition-colors group-hover:text-primary ${
            featured ? "text-2xl md:text-3xl" : "text-lg"
          }`}
        >
          {post.title}
        </h2>
        {post.excerpt && (
          <p className={`mt-2 text-sm text-muted-foreground ${featured ? "md:text-base line-clamp-3" : "line-clamp-2"}`}>
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(postDate(post)), "dd MMM yyyy")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {post.readMinutes} min read
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: posts, isLoading, isError } = useQuery({
    queryKey: blogKeys.list(),
    queryFn: () => listBlogPosts(),
  });

  const categories = useMemo(() => {
    const set = new Set((posts ?? []).map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [posts]);

  const visible = useMemo(() => {
    if (!posts) return [];
    if (activeCategory === "all") return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const [featured, ...rest] = visible;

  useSeo({
    title: "Blog — Snacking, Nutrition & Indian Flavours",
    description:
      "Recipes, nutrition guides and snacking stories from SnackVeda — healthy chips, roasted makhana and superpuffs made in India.",
    canonical: "/blog",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "SnackVeda Blog",
      url: `${SITE_URL}/blog`,
      publisher: {
        "@type": "Organization",
        name: "SnackVeda",
        url: SITE_URL,
      },
      blogPost: (posts ?? []).slice(0, 10).map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `${SITE_URL}/blog/${p.slug}`,
        datePublished: postDate(p),
        author: { "@type": "Person", name: p.author },
      })),
    },
  });

  return (
    <SiteShell>
      <div className="border-b bg-muted/30 py-10">
        <div className="container mx-auto px-4">
          <h1 className="mb-3 font-serif text-3xl font-bold md:text-4xl">The SnackVeda Journal</h1>
          <p className="max-w-2xl text-muted-foreground">
            Snacking ideas, ingredient deep-dives and stories from our kitchen in Indore — written for people who read
            the label before the price tag.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {categories.length > 2 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setActiveCategory(category)}
              >
                {category === "all" ? "All posts" : category}
              </Button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <p className="text-muted-foreground">We couldn't load the journal right now. Please try again shortly.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="font-medium">No posts published yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New stories are on the way — check back soon.
            </p>
            <Button asChild className="mt-6">
              <Link href="/shop">Browse the range</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {featured && <PostCard post={featured} featured />}
            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
