// Blog API helpers. The blog endpoints are not part of the generated OpenAPI
// client, so we call them directly the same way the admin product-image
// manager does (Bearer token from localStorage).

export interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  author: string;
  category: string;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  status: "draft" | "published";
  readMinutes: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost extends BlogPostSummary {
  content: string;
}

export interface BlogPostInput {
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  author?: string | null;
  category?: string | null;
  tags?: string[] | string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  status?: "draft" | "published";
  readMinutes?: number | null;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("snackveda_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data as T;
}

export const blogKeys = {
  list: (params?: { category?: string; tag?: string; limit?: number }) => ["blog", "list", params ?? {}] as const,
  detail: (slug: string) => ["blog", "detail", slug] as const,
  adminList: () => ["admin", "blog"] as const,
};

export function listBlogPosts(params?: { category?: string; tag?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.tag) search.set("tag", params.tag);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return request<BlogPostSummary[]>(`/api/blog${qs ? `?${qs}` : ""}`);
}

export function getBlogPost(slug: string) {
  return request<{ post: BlogPost; related: BlogPostSummary[] }>(`/api/blog/${encodeURIComponent(slug)}`);
}

export function listAdminBlogPosts() {
  return request<BlogPost[]>("/api/admin/blog", { headers: authHeaders() });
}

export function createBlogPost(input: BlogPostInput) {
  return request<BlogPost>("/api/admin/blog", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
}

export function updateBlogPost(id: string, input: Partial<BlogPostInput>) {
  return request<BlogPost>(`/api/admin/blog/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
}

export function deleteBlogPost(id: string) {
  return request<{ deleted: boolean }>(`/api/admin/blog/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}
