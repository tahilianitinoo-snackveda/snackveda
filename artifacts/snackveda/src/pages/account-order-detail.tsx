import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useRoute, Link } from "wouter";
import { useGetOrderById, useGetInvoiceForOrder } from "@workspace/api-client-react";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { generateInvoicePdf } from "@/lib/pdf";
import { ArrowLeft, CheckCircle2, Package, Truck, Receipt, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

function OrderDetailInner() {
  const [, params] = useRoute("/account/orders/:id");
  const id = params?.id || "";

  const { data: order, isLoading } = useGetOrderById(id, { query: { enabled: !!id } });
  const getInvoice = useGetInvoiceForOrder();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadInvoice = () => {
    setDownloading(true);
    getInvoice.mutate(
      { orderId: id },
      {
        onSuccess: (data) => {
          try {
            generateInvoicePdf(data);
          } catch (e) {
            toast.error("Failed to generate PDF");
          }
          setDownloading(false);
        },
        onError: () => {
          toast.error("Failed to fetch invoice data");
          setDownloading(false);
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'processing': return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Processing</Badge>;
      case 'shipped': return <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">Shipped</Badge>;
      case 'delivered': return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Delivered</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Paid</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <SiteShell>
      <div className="bg-muted/30 py-4 border-b">
        <div className="container mx-auto px-4">
          <Link href="/account" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Account
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {isLoading || !order ? (
          <div className="space-y-8">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="grid md:grid-cols-2 gap-8">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-sm">
              <div>
                <h1 className="text-2xl font-serif font-bold mb-2">Order {order.orderNumber}</h1>
                <p className="text-muted-foreground text-sm">Placed on {formatDate(order.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {getStatusBadge(order.status)}
                {getPaymentStatusBadge(order.paymentStatus)}
                <Button 
                  variant="outline" 
                  onClick={handleDownloadInvoice}
                  disabled={order.paymentStatus !== 'paid' || downloading}
                >
                  {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download Invoice
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-4">
                    <Package className="w-5 h-5 text-primary" /> Items Ordered
                  </h3>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0 last:pb-0">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">{item.quantity} × <Price amount={item.unitPrice} /></p>
                        </div>
                        <div className="font-medium">
                          <Price amount={item.totalAmount} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2 border-b pb-4">
                      <Truck className="w-5 h-5 text-primary" /> Shipping To
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
                      <p>{order.shippingAddress.line1}</p>
                      {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                      <p className="pt-2">Phone: {order.shippingAddress.phone}</p>
                    </div>
                  </div>
                  
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2 border-b pb-4">
                      <Receipt className="w-5 h-5 text-primary" /> Payment Method
                    </h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground capitalize">{order.paymentMethod.replace('_', ' ')}</p>
                      {order.paymentReference && <p>Ref: {order.paymentReference}</p>}
                      {order.orderType === 'b2b' && <p className="mt-2 text-xs bg-muted p-2 rounded">B2B Trade Order</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-card border rounded-2xl p-6 shadow-sm sticky top-24">
                  <h3 className="font-bold text-lg mb-4 border-b pb-4">Order Summary</h3>
                  <div className="space-y-3 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <Price amount={order.subtotal} />
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-<Price amount={order.discountAmount} /></span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total GST</span>
                      <Price amount={order.taxTotal} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      {order.shippingAmount > 0 ? <Price amount={order.shippingAmount} /> : <span className="text-green-600">Free</span>}
                    </div>
                    <div className="pt-3 border-t flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <Price amount={order.totalAmount} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

export default function OrderDetail() {
  return (
    <ProtectedRoute>
      <OrderDetailInner />
    </ProtectedRoute>
  );
}
