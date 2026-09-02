import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Eye, ExternalLink, Loader2, Newspaper, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  blogKeys,
  createBlogPost,
  deleteBlogPost,
  listAdminBlogPosts,
  updateBlogPost,
  type BlogPost,
} from "@/lib/blog-api";
import { renderMarkdown } from "@/lib/markdown";

const postSchema = z.object({
  title: z.string().min(2, "Title is required"),
  slug: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  author: z.string().optional(),
  coverImageUrl: z.string().optional(),
  excerpt: z.string().max(300, "Keep the excerpt under 300 characters").optional(),
  content: z.string().min(10, "Write at least a short post"),
  tags: z.string().optional(),
  metaTitle: z.string().max(70, "Google truncates titles past ~60 characters").optional(),
  metaDescription: z.string().max(200, "Google truncates descriptions past ~160 characters").optional(),
  status: z.enum(["draft", "published"]),
});

type PostFormValues = z.infer<typeof postSchema>;

const EMPTY_POST: PostFormValues = {
  title: "",
  slug: "",
  category: "Snacking",
  author: "Narayani Distributors Team",
  coverImageUrl: "",
  excerpt: "",
  content: "",
  tags: "",
  metaTitle: "",
  metaDescription: "",
  status: "draft",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

function BlogInner() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  // Once the author edits the slug by hand we stop deriving it from the title.
  const [slugEdited, setSlugEdited] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: blogKeys.adminList(),
    queryFn: listAdminBlogPosts,
  });

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: EMPTY_POST,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: blogKeys.adminList() });
    queryClient.invalidateQueries({ queryKey: ["blog"] });
  };

  const savePost = useMutation({
    mutationFn: async (values: PostFormValues) => {
      const payload = {
        title: values.title,
        slug: values.slug ? slugify(values.slug) : slugify(values.title),
        category: values.category,
        author: values.author || "Narayani Distributors Team",
        coverImageUrl: values.coverImageUrl || null,
        excerpt: values.excerpt || null,
        content: values.content,
        tags: values.tags
          ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        metaTitle: values.metaTitle || null,
        metaDescription: values.metaDescription || null,
        status: values.status,
      };
      return editing ? updateBlogPost(editing.id, payload) : createBlogPost(payload);
    },
    onSuccess: (post) => {
      toast.success(editing ? "Post updated" : post.status === "published" ? "Post published" : "Draft saved");
      setIsOpen(false);
      setEditing(null);
      form.reset(EMPTY_POST);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not save the post"),
  });

  const togglePublish = useMutation({
    mutationFn: (post: BlogPost) =>
      updateBlogPost(post.id, { status: post.status === "published" ? "draft" : "published" }),
    onSuccess: (post) => {
      toast.success(post.status === "published" ? "Post is now live" : "Post moved to draft");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not update the post"),
  });

  const removePost = useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSuccess: () => {
      toast.success("Post deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete the post"),
  });

  const openCreate = () => {
    setEditing(null);
    setShowPreview(false);
    setSlugEdited(false);
    form.reset(EMPTY_POST);
    setIsOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setShowPreview(false);
    setSlugEdited(true);
    form.reset({
      title: post.title,
      slug: post.slug,
      category: post.category,
      author: post.author,
      coverImageUrl: post.coverImageUrl ?? "",
      excerpt: post.excerpt ?? "",
      content: post.content,
      tags: post.tags.join(", "),
      metaTitle: post.metaTitle ?? "",
      metaDescription: post.metaDescription ?? "",
      status: post.status,
    });
    setIsOpen(true);
  };

  const contentValue = form.watch("content");

  return (
    <AdminShell>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Blog</h1>
          <p className="text-muted-foreground">Write posts, publish them, and they appear on narayanidistributors.com/blog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Post
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-center">Live</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !posts || posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <Newspaper className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="font-medium">No posts yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Write your first post — it will show on the website and in your sitemap for Google.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {post.coverImageUrl ? (
                        <img src={post.coverImageUrl} alt="" className="h-10 w-14 rounded-md border object-cover" />
                      ) : (
                        <div className="flex h-10 w-14 items-center justify-center rounded-md border bg-muted">
                          <Newspaper className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{post.title}</div>
                        <div className="truncate text-xs text-muted-foreground">/blog/{post.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{post.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.publishedAt ? format(new Date(post.publishedAt), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={post.status === "published"}
                      onCheckedChange={() => togglePublish.mutate(post)}
                      disabled={togglePublish.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {post.status === "published" && (
                        <Button variant="ghost" size="icon" asChild title="View on site">
                          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEdit(post)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={removePost.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
                            removePost.mutate(post.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="mb-6">
            <SheetTitle>{editing ? "Edit Post" : "New Post"}</SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => savePost.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Why roasted makhana beats fried chips"
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editing && !slugEdited) {
                            form.setValue("slug", slugify(e.target.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL slug</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="why-roasted-makhana-beats-fried-chips"
                        onChange={(e) => {
                          setSlugEdited(true);
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Page address: narayanidistributors.com/blog/{field.value || "your-slug"}. Avoid changing it after
                      publishing — Google indexes the old URL.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nutrition" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Narayani Distributors Team" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/cover.jpg" />
                    </FormControl>
                    <FormDescription>Recommended 1200×630px — this is what shows when the link is shared.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="One or two lines shown on the blog listing." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Content</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreview((v) => !v)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        {showPreview ? "Hide preview" : "Preview"}
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={14}
                        className="font-mono text-sm"
                        placeholder={"## A subheading\n\nWrite your paragraph here.\n\n- A bullet point\n- Another point\n\n**Bold text**, *italic text* and [a link](https://narayanidistributors.com/shop)."}
                      />
                    </FormControl>
                    <FormDescription>
                      Markdown supported: ## headings, **bold**, *italic*, - lists, &gt; quotes, [links](url),
                      ![images](url).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showPreview && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
                  <div
                    className="prose prose-sm prose-neutral max-w-none prose-headings:font-serif prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(contentValue || "") }}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="makhana, healthy snacks, protein" />
                    </FormControl>
                    <FormDescription>Comma separated.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-xl border p-4">
                <p className="text-sm font-medium">Google search settings</p>
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Leave blank to use the post title" />
                      </FormControl>
                      <FormDescription className={(field.value?.length ?? 0) > 60 ? "text-amber-600" : undefined}>
                        {(field.value?.length ?? 0)}/60 characters
                        {(field.value?.length ?? 0) > 60 ? " — Google will cut this off" : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} placeholder="The summary Google shows under your title." />
                      </FormControl>
                      <FormDescription className={(field.value?.length ?? 0) > 160 ? "text-amber-600" : undefined}>
                        {(field.value?.length ?? 0)}/160 characters
                        {(field.value?.length ?? 0) > 160 ? " — Google will cut this off" : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border p-4">
                    <div>
                      <FormLabel>Publish now</FormLabel>
                      <FormDescription>
                        Published posts appear on the website and in the sitemap Google reads.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "published"}
                        onCheckedChange={(checked) => field.onChange(checked ? "published" : "draft")}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={savePost.isPending}>
                {savePost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save Changes" : "Create Post"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}

export default function AdminBlog() {
  return (
    <ProtectedRoute adminOnly>
      <BlogInner />
    </ProtectedRoute>
  );
}
