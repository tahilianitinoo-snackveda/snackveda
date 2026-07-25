import { SiteShell } from "@/components/layout/site-shell";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Clock, Loader2, Newspaper, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogKeys, getBlogPost } from "@/lib/blog-api";
import { markdownToPlainText, renderMarkdown } from "@/lib/markdown";
import { SITE_URL, useSeo } from "@/lib/seo";

export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: blogKeys.detail(slug),
    queryFn: () => getBlogPost(slug),
    enabled: Boolean(slug),
  });

  const post = data?.post;
  const related = data?.related ?? [];
  const publishedAt = post?.publishedAt ?? post?.createdAt;

  const html = useMemo(() => (post ? renderMarkdown(post.content) : ""), [post]);

  useSeo({
    title: post?.metaTitle || post?.title || "Blog",
    description:
      post?.metaDescription ||
      post?.excerpt ||
      (post ? markdownToPlainText(post.content) : "Stories and snacking guides from SnackVeda."),
    canonical: `/blog/${slug}`,
    image: post?.coverImageUrl || undefined,
    type: "article",
    noIndex: !post && !isLoading,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.metaDescription || post.excerpt || markdownToPlainText(post.content),
          image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
          datePublished: publishedAt,
          dateModified: post.updatedAt,
          author: { "@type": "Person", name: post.author },
          publisher: {
            "@type": "Organization",
            name: "SnackVeda",
            url: SITE_URL,
            logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
          keywords: post.tags.join(", ") || undefined,
        }
      : null,
  });

  if (isLoading) {
    return (
      <SiteShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SiteShell>
    );
  }

  if (isError || !post) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-24 text-center">
          <Newspaper className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
          <h1 className="font-serif text-2xl font-bold">Post not found</h1>
          <p className="mt-2 text-muted-foreground">This story may have been moved or unpublished.</p>
          <Button asChild className="mt-6">
            <Link href="/blog">Back to the journal</Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <Link href="/blog" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> All posts
        </Link>

        <Badge variant="secondary" className="mb-4">{post.category}</Badge>
        <h1 className="font-serif text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" /> {post.author}
          </span>
          {publishedAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> {format(new Date(publishedAt), "dd MMM yyyy")}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {post.readMinutes} min read
          </span>
        </div>

        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="mt-8 aspect-[16/9] w-full rounded-2xl border object-cover"
          />
        )}

        {post.excerpt && (
          <p className="mt-8 border-l-4 border-primary/30 pl-4 text-lg text-muted-foreground">{post.excerpt}</p>
        )}

        <div
          className="prose prose-neutral mt-8 max-w-none prose-headings:font-serif prose-a:text-primary prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t pt-6">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">#{tag}</Badge>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl bg-primary/5 p-6 text-center">
          <h2 className="font-serif text-xl font-bold">Hungry after reading?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Healthy chips, roasted makhana and superpuffs — shipped across India.
          </p>
          <Button asChild className="mt-4">
            <Link href="/shop">Shop the range</Link>
          </Button>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t bg-muted/30 py-10">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className="mb-6 font-serif text-2xl font-bold">More from the journal</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <Badge variant="secondary" className="mb-3">{item.category}</Badge>
                  <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-primary">{item.title}</h3>
                  {item.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
