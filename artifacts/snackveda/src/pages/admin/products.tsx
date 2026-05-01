import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useListAdminProducts, useCreateAdminProduct, useUpdateAdminProduct, getListAdminProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Image, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Price } from "@/components/ui/price";
import { useState } from "react";

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  category: z.enum(["healthy_chips", "makhana", "superpuffs"]),
  b2cPrice: z.coerce.number().min(1),
  b2bPrice: z.coerce.number().optional(),
  moq: z.coerce.number().optional(),
  weightGrams: z.coerce.number().min(1),
  stockQty: z.coerce.number().min(0),
  gstPercent: z.coerce.number().min(0).max(100),
  hsnCode: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

// Image management component for a single product
function ProductImageManager({ productId, productName }: { productId: string; productName: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [open, setOpen] = useState(false);
  const token = localStorage.getItem("snackveda_token");

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
                    {img.isPrimary && <Badge className="text-[10px] mt-1 bg-amber-500">Primary</Badge>}
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
            <p className="text-sm text-amber-600 text-center">Maximum 4 images reached. Delete one to add more.</p>
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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", slug: "", description: "", category: "healthy_chips", b2cPrice: 0,
      weightGrams: 60, stockQty: 100, gstPercent: 5, hsnCode: "210690"
    }
  });

  const onSubmit = (values: ProductFormValues) => {
    createProduct.mutate({
      data: {
        name: values.name,
        slug: values.slug,
        category: values.category,
        description: values.description ?? null,
        b2cPrice: values.b2cPrice,
        b2bPrice: values.b2bPrice ?? values.b2cPrice * 0.8,
        moq: values.moq ?? 1,
        cartonQty: 1,
        weightGrams: values.weightGrams,
        stockQty: values.stockQty,
        gstPercent: values.gstPercent,
        hsnCode: values.hsnCode ?? "210690",
        shelfLifeMonths: 6,
      }
    }, {
      onSuccess: () => {
        toast.success("Product created successfully");
        setIsOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      },
      onError: (err) => toast.error(err.message || "Failed to create product")
    });
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
          <SheetTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Add New Product</SheetTitle>
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
                </div>
                <Button type="submit" className="w-full" disabled={createProduct.isPending}>
                  {createProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Product
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
                <TableCell className="text-right text-amber-600 text-sm">{p.b2bPrice ? <Price amount={p.b2bPrice} /> : "—"}</TableCell>
                <TableCell className="text-right">{p.stockQty}</TableCell>
                <TableCell className="text-center">
                  <ProductImageManager productId={p.id} productName={p.name} />
                </TableCell>
                <TableCell className="text-center">
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
