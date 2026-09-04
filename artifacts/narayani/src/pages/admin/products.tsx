import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useListAdminProducts, useCreateAdminProduct, useUpdateAdminProduct, getListAdminProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Image, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Price } from "@/components/ui/price";
import { useState } from "react";

/**
 * Spec point 42 — everything needed to publish a product without a developer.
 *
 * ─── INGREDIENTS AND NUTRITION: READ BEFORE TYPING ANYTHING IN THEM ─────────
 * `artifacts/narayani/src/data/product-panels.json` holds careful transcriptions
 * of fourteen physical packs, complete with the disclosures that explain where a
 * pack contradicts itself. That file TAKES PRECEDENCE over the fields here, and
 * the product page renders it in preference. These fields are for products with no
 * transcription — do not use them to retype a panel that already has one, or the
 * two will drift and only one of them will be on the page.
 *
 * ─── EVERY OPTIONAL FIELD MEANS "SHOW NOTHING" WHEN BLANK ──────────────────
 * Not a dash, not a placeholder. A blank allergen box on a live product means the
 * page shows no allergen line at all, which is the correct behaviour for a pack
 * that declares none and the correct behaviour for one nobody has got to yet.
 */
const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(["healthy_chips", "makhana", "superpuffs"]),
  subcategory: z.string().optional(),
  b2cPrice: z.coerce.number().min(1),
  b2bPrice: z.coerce.number().optional(),
  mrp: z.coerce.number().optional(),
  moq: z.coerce.number().optional(),
  cartonQty: z.coerce.number().optional(),
  weightGrams: z.coerce.number().min(1),
  stockQty: z.coerce.number().min(0),
  gstPercent: z.coerce.number().min(0).max(100),
  hsnCode: z.string().optional(),
  shelfLifeMonths: z.coerce.number().min(1).optional(),
  sku: z.string().optional(),

  // Spec 43 — multi-brand. These three are different companies and must stay so.
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  manufacturerFssai: z.string().optional(),
  countryOfOrigin: z.string().optional(),

  ingredients: z.string().optional(),
  nutrition: z.string().optional(),
  allergens: z.string().optional(),
  storage: z.string().optional(),
  highlights: z.string().optional(),

  wholesaleAvailable: z.boolean().optional(),
  exportAvailable: z.boolean().optional(),
  privateLabelAvailable: z.boolean().optional(),

  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  status: z.enum(["active", "inactive", "out_of_stock"]).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// Image management component for a single product
function ProductImageManager({ productId, productName }: { productId: string; productName: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem("narayani_token");

  const { data: images, refetch } = useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: open,
  });

  const addImage = useMutation({
    mutationFn: async (data: { url: string; isPrimary: boolean }) => {
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, sortOrder: (images?.length ?? 0) }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => { toast.success("Image added"); setImageUrl(""); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteImage = useMutation({
    mutationFn: async (imageId: string) => {
      const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { toast.success("Image removed"); refetch(); },
    onError: () => toast.error("Failed to delete image"),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Image className="w-3 h-3" /> Images {images?.length ? `(${images.length})` : ""}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Product Images — {productName}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <p className="text-sm text-muted-foreground">Add 2–4 images per product. The primary image shows on the shop listing. All images show in the product gallery.</p>

          {/* Current images */}
          <div className="space-y-3">
            {!images ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : images.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No images yet. Add your first image below.</p>
            ) : (
              images.map((img: any) => (
                <div key={img.id} className="flex items-center gap-3 p-3 border rounded-xl bg-muted/30">
                  <img src={img.url} alt={img.altText || ""} className="w-16 h-16 object-cover rounded-lg border" onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/64x64?text=?"; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{img.url}</p>
                    {img.isPrimary && <Badge className="text-[10px] mt-1 bg-primary">Primary</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={() => deleteImage.mutate(img.id)} disabled={deleteImage.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Add image form */}
          {(!images || images.length < 4) && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Add Image URL</p>
              <p className="text-xs text-muted-foreground">Paste a direct image URL (from Supabase Storage, Cloudinary, or any public image link). Recommended size: 800×800px.</p>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!imageUrl || addImage.isPending}
                  onClick={() => addImage.mutate({ url: imageUrl, isPrimary: !images || images.length === 0 })}
                >
                  {addImage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {(!images || images.length === 0) ? "Add as Primary Image" : "Add Image"}
                </Button>
                {images && images.length > 0 && (
                  <Button
                    variant="outline"
                    disabled={!imageUrl || addImage.isPending}
                    onClick={() => addImage.mutate({ url: imageUrl, isPrimary: true })}
                    title="Set as primary (shown in shop listing)"
                  >
                    <Star className="w-4 h-4 mr-1" /> Set Primary
                  </Button>
                )}
              </div>
            </div>
          )}
          {images && images.length >= 4 && (
            <p className="text-sm text-amber-700 text-center">Maximum 4 images reached. Delete one to add more.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProductsInner() {
  const { data: products, isLoading } = useListAdminProducts();
  const createProduct = useCreateAdminProduct();
  const updateProduct = useUpdateAdminProduct();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  /** A new product starts empty everywhere the storefront can show nothing. */
  const EMPTY: ProductFormValues = {
    name: "", slug: "", description: "", category: "healthy_chips", subcategory: "",
    b2cPrice: 0, weightGrams: 60, stockQty: 100, gstPercent: 5, hsnCode: "210690",
    sku: "", brand: "", manufacturer: "", manufacturerFssai: "", countryOfOrigin: "India",
    ingredients: "", nutrition: "", allergens: "", storage: "", highlights: "",
    wholesaleAvailable: true, exportAvailable: true, privateLabelAvailable: false,
    seoTitle: "", metaDescription: "", status: "active",
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  const openEdit = (p: any) => {
    setEditingProduct(p);
    form.reset({
      ...EMPTY,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      category: p.category,
      subcategory: p.subcategory ?? "",
      b2cPrice: p.b2cPrice,
      b2bPrice: p.b2bPrice,
      mrp: p.mrp ?? undefined,
      moq: p.moq,
      cartonQty: p.cartonQty,
      weightGrams: p.weightGrams,
      stockQty: p.stockQty,
      gstPercent: p.gstPercent,
      hsnCode: p.hsnCode ?? "210690",
      shelfLifeMonths: p.shelfLifeMonths ?? 6,
      sku: p.sku ?? "",
      brand: p.brand ?? "",
      manufacturer: p.manufacturer ?? "",
      manufacturerFssai: p.manufacturerFssai ?? "",
      countryOfOrigin: p.countryOfOrigin ?? "",
      ingredients: p.ingredients ?? "",
      nutrition: p.nutrition ?? "",
      allergens: p.allergens ?? "",
      storage: p.storage ?? "",
      highlights: p.highlights ?? "",
      wholesaleAvailable: p.wholesaleAvailable ?? true,
      exportAvailable: p.exportAvailable ?? true,
      privateLabelAvailable: p.privateLabelAvailable ?? false,
      seoTitle: p.seoTitle ?? "",
      metaDescription: p.metaDescription ?? "",
      status: p.status ?? "active",
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingProduct(null);
    form.reset(EMPTY);
    setIsOpen(true);
  };

  const onSubmit = (values: ProductFormValues) => {
    /*
      An empty text box means "clear this field", which has to reach the API as
      null — not as "" and not as an absent key. The API distinguishes the three:
      undefined leaves a column alone, null clears it. Sending "" instead would
      put an empty string in a column the storefront then treats as present.
    */
    const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

    const data = {
      name: values.name,
      slug: values.slug,
      category: values.category,
      description: orNull(values.description),
      b2cPrice: values.b2cPrice,
      b2bPrice: values.b2bPrice ?? values.b2cPrice * 0.75,
      moq: values.moq ?? 1,
      cartonQty: values.cartonQty ?? 1,
      weightGrams: values.weightGrams,
      stockQty: values.stockQty,
      gstPercent: values.gstPercent,
      hsnCode: values.hsnCode ?? "210690",
      shelfLifeMonths: Number(values.shelfLifeMonths) || 6,
      status: values.status ?? "active",

      subcategory: orNull(values.subcategory),
      sku: orNull(values.sku),
      mrp: values.mrp ? Number(values.mrp) : null,
      brand: orNull(values.brand),
      manufacturer: orNull(values.manufacturer),
      manufacturerFssai: orNull(values.manufacturerFssai),
      countryOfOrigin: orNull(values.countryOfOrigin),
      ingredients: orNull(values.ingredients),
      nutrition: orNull(values.nutrition),
      allergens: orNull(values.allergens),
      storage: orNull(values.storage),
      highlights: orNull(values.highlights),
      wholesaleAvailable: values.wholesaleAvailable ?? true,
      exportAvailable: values.exportAvailable ?? true,
      privateLabelAvailable: values.privateLabelAvailable ?? false,
      seoTitle: orNull(values.seoTitle),
      metaDescription: orNull(values.metaDescription),
    };

    if (editingProduct) {
      // Use direct fetch to bypass limited UpdateProductBody schema
      const token = localStorage.getItem("narayani_token");
      fetch(`/api/admin/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(data),
      }).then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.message);
        toast.success("Product updated");
        setIsOpen(false);
        queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      }).catch((err) => toast.error(err.message || "Failed to update product"));
    } else {
      createProduct.mutate({ data }, {
        onSuccess: () => {
          toast.success("Product created");
          setIsOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
        },
        onError: (err) => toast.error(err.message || "Failed to create product")
      });
    }
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateProduct.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast.success("Status updated");
        queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      },
      onError: (err) => toast.error(err.message || "Failed to update status"),
    });
  };

  return (
    <AdminShell>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{editingProduct ? "Edit Product" : "Add New Product"}</SheetTitle>
            </SheetHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} onChange={e => {
                    field.onChange(e);
                    if (!form.getValues("slug")) {
                      form.setValue("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                    }
                  }} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" {...field}>
                          <option value="healthy_chips">Healthy Chips</option>
                          <option value="makhana">Makhana</option>
                          <option value="superpuffs">Superpuffs</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="weightGrams" render={({ field }) => (
                    <FormItem><FormLabel>Weight (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="b2cPrice" render={({ field }) => (
                    <FormItem><FormLabel>B2C Price (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="stockQty" render={({ field }) => (
                    <FormItem><FormLabel>Stock Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="b2bPrice" render={({ field }) => (
                    <FormItem><FormLabel>B2B Price (₹) (Opt)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="moq" render={({ field }) => (
                    <FormItem><FormLabel>MOQ (Opt)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="gstPercent" render={({ field }) => (
                    <FormItem><FormLabel>GST %</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="hsnCode" render={({ field }) => (
                    <FormItem><FormLabel>HSN Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="shelfLifeMonths" render={({ field }) => (
                    <FormItem><FormLabel>Shelf Life (Months)</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                {/*
                  Spec point 42 — the rest of it. Collapsed behind three headings
                  rather than added to the flat list above: a form with thirty
                  visible fields is a form nobody fills in correctly.

                  Every field below is optional and every one of them renders
                  NOTHING on the storefront when left blank. That is the contract —
                  see the comment on productSchema.
                */}
                <div className="grid grid-cols-2 gap-4 border-t pt-5">
                  <FormField control={form.control} name="cartonQty" render={({ field }) => (
                    <FormItem><FormLabel>Carton Qty</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mrp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>MRP (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormDescription className="text-xs">Printed on the pack. Not the same as the selling price.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <details className="rounded-lg border bg-muted/20 p-4" open>
                  <summary className="cursor-pointer text-sm font-semibold">Brand &amp; manufacturer</summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Narayani distributes; it does not manufacture. The brand on the pack and
                    the company that made it are two different things, and both are shown on
                    the product page against their own names.
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="brand" render={({ field }) => (
                        <FormItem><FormLabel>Brand on the pack</FormLabel><FormControl><Input placeholder="e.g. Twirtles" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="sku" render={({ field }) => (
                        <FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="manufacturer" render={({ field }) => (
                      <FormItem><FormLabel>Manufactured by</FormLabel><FormControl><Input placeholder="Company name as printed" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="manufacturerFssai" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Their FSSAI licence</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormDescription className="text-xs">The manufacturer's, not ours.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="countryOfOrigin" render={({ field }) => (
                        <FormItem><FormLabel>Country of origin</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="subcategory" render={({ field }) => (
                      <FormItem><FormLabel>Subcategory</FormLabel><FormControl><Input placeholder="Free text, for grouping within a category" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </details>

                <details className="rounded-lg border bg-muted/20 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Pack information</summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Fourteen products already have a transcribed pack panel in the code, and
                    that <strong>takes precedence over anything typed here</strong>. Use these
                    fields for products that do not have one. Copy exactly what the pack says,
                    including anything on it that looks wrong.
                  </p>
                  <div className="mt-4 space-y-4">
                    <FormField control={form.control} name="ingredients" render={({ field }) => (
                      <FormItem><FormLabel>Ingredients</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="allergens" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allergen declaration</FormLabel>
                        <FormControl><Input placeholder="Exactly as printed" {...field} /></FormControl>
                        <FormDescription className="text-xs">Leave blank if the pack declares none. Do not write "none".</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="nutrition" render={({ field }) => (
                      <FormItem><FormLabel>Nutrition</FormLabel><FormControl><Textarea rows={4} placeholder="One nutrient per line, as printed" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="storage" render={({ field }) => (
                        <FormItem><FormLabel>Storage</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="highlights" render={({ field }) => (
                        <FormItem><FormLabel>Highlights</FormLabel><FormControl><Input placeholder="Comma separated" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                </details>

                <details className="rounded-lg border bg-muted/20 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Channels &amp; SEO</summary>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      {([
                        ["wholesaleAvailable", "Offer for wholesale"],
                        ["exportAvailable", "Offer for export"],
                        ["privateLabelAvailable", "Available for private label"],
                      ] as const).map(([key, label]) => (
                        <FormField key={key} control={form.control} name={key} render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={!!field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{label}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...field}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="out_of_stock">Out of stock</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="seoTitle" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO title</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormDescription className="text-xs">Blank keeps the title the page builds from the product name and weight.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="metaDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta description</FormLabel>
                        <FormControl><Textarea rows={2} {...field} /></FormControl>
                        <FormDescription className="text-xs">Around 150 characters. Blank falls back to the product description.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </details>

                <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editingProduct ? "Save Changes" : "Create Product"}
                </Button>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">B2C Price</TableHead>
              <TableHead className="text-right">B2B Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Images</TableHead>
              <TableHead className="text-center">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : products?.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border">
                        <Image className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.weightGrams}g</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">{p.category.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium"><Price amount={p.b2cPrice} /></TableCell>
                <TableCell className="text-right text-primary text-sm">{p.b2bPrice ? <Price amount={p.b2bPrice} /> : "—"}</TableCell>
                <TableCell className="text-right">{p.stockQty}</TableCell>
                <TableCell className="text-center">
                  <ProductImageManager productId={p.id} productName={p.name} />
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="mr-2">Edit</Button>
                  <Switch
                    checked={p.status === "active"}
                    onCheckedChange={() => toggleStatus(p.id, p.status)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}

export default function AdminProducts() {
  return (
    <ProtectedRoute adminOnly>
      <ProductsInner />
    </ProtectedRoute>
  );
}
