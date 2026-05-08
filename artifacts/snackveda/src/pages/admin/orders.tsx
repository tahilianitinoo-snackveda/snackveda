import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useListAdminOrders, useUpdateAdminOrderStatus, getListAdminOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function OrdersInner() {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateAdminOrderStatus();
  const token = typeof window !== "undefined" ? localStorage.getItem("snackveda_token") : "";

  const [shipDialog, setShipDialog] = useState<{ open: boolean; orderId: string; orderNumber: string }>({ open: false, orderId: "", orderNumber: "" });
  const [shipForm, setShipForm] = useState({ courier: "Shiprocket", trackingNumber: "", trackingLink: "" });
  const [shipping, setShipping] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data: b2cOrders, isLoading: b2cLoading } = useListAdminOrders({ orderType: 'b2c' });
  const { data: b2bOrders, isLoading: b2bLoading } = useListAdminOrders({ orderType: 'b2b' });

  const openDetail = async (orderId: string) => {
    setDetailLoading(true);
    setDetailOrder({ loading: true });
    try {
      const res = await fetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setDetailOrder(data);
    } catch { setDetailOrder(null); }
    finally { setDetailLoading(false); }
  };

  const handleShip = async () => {
    if (!shipForm.trackingNumber || !shipForm.trackingLink) { toast.error("Enter tracking number and link"); return; }
    setShipping(true);
    try {
      const res = await fetch(`/api/admin/orders/${shipDialog.orderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(shipForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Order marked as shipped. Customer notified via email & SMS.");
      setShipDialog({ open: false, orderId: "", orderNumber: "" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setShipping(false); }
  };

  const handleStatusChange = (id: string, status: any) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast.success("Order status updated");
        queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      },
      onError: (err) => toast.error(err.message || "Failed to update status")
    });
  };

  const getPaymentBadge = (status: string) => {
    switch(status) {
      case 'paid': return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Paid</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const renderTable = (orders: any[] | undefined, isLoading: boolean) => (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
          ) : !orders?.length ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders yet</TableCell></TableRow>
          ) : orders?.map(o => (
            <TableRow key={o.id}>
              <TableCell className="font-medium font-mono text-sm">{o.orderNumber}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatDate(o.createdAt)}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{o.orderType}</Badge></TableCell>
              <TableCell className="font-medium"><Price amount={o.totalAmount} /></TableCell>
              <TableCell>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => openDetail(o.id)}>
                    Details
                  </Button>
                  <Select defaultValue={o.status} onValueChange={(val) => handleStatusChange(o.id, val)}>
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="dispatched">Dispatched</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {o.status === "confirmed" && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-teal-700 border-teal-300 hover:bg-teal-50"
                      onClick={() => { setShipDialog({ open: true, orderId: o.id, orderNumber: o.orderNumber }); setShipForm({ courier: "Shiprocket", trackingNumber: "", trackingLink: "" }); }}>
                      Ship
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminShell>
      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => { if (!o) setDetailOrder(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order Details — {detailOrder?.orderNumber}</DialogTitle></DialogHeader>
          {detailOrder?.loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : detailOrder && (
            <div className="space-y-6 py-2">
              {/* Customer */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-sm mb-3">Customer Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Name</span><span className="font-medium">{detailOrder.user?.fullName || "—"}</span>
                  <span className="text-muted-foreground">Email</span><span className="font-medium">{detailOrder.user?.email || "—"}</span>
                  <span className="text-muted-foreground">Phone</span><span className="font-medium">{detailOrder.user?.phone || "—"}</span>
                  <span className="text-muted-foreground">Order Type</span><span className="font-medium capitalize">{detailOrder.orderType}</span>
                  <span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{detailOrder.status}</span>
                  <span className="text-muted-foreground">GSTIN</span><span className="font-medium">{detailOrder.user?.gstNumber || "—"}</span>
                </div>
              </div>

              {/* Shipping Address */}
              {detailOrder.shippingAddress && (
                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-sm mb-3">Shipping Address</p>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{detailOrder.shippingAddress.fullName}</p>
                    <p>{detailOrder.shippingAddress.line1}{detailOrder.shippingAddress.line2 ? `, ${detailOrder.shippingAddress.line2}` : ""}</p>
                    <p>{detailOrder.shippingAddress.city}, {detailOrder.shippingAddress.state} — {detailOrder.shippingAddress.pincode}</p>
                    <p>Phone: {detailOrder.shippingAddress.phone}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="font-semibold text-sm mb-3">Order Items</p>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Product</th>
                        <th className="text-center p-3 font-medium">Qty</th>
                        <th className="text-right p-3 font-medium">Price</th>
                        <th className="text-right p-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items?.map((item: any) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right"><Price amount={item.unitPrice} /></td>
                          <td className="p-3 text-right font-medium"><Price amount={item.lineTotal} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold mb-3">Payment Summary</p>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><Price amount={detailOrder.subtotal} /></div>
                  {detailOrder.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-<Price amount={detailOrder.discountAmount} /></span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">GST (5%)</span><Price amount={detailOrder.gstAmount} /></div>
                  {detailOrder.shippingCharge > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><Price amount={detailOrder.shippingCharge} /></div>}
                  <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Total</span><Price amount={detailOrder.totalAmount} /></div>
                </div>
                {detailOrder.payment && (
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="capitalize">{detailOrder.payment.paymentMethod?.replace("_"," ")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Status</span><Badge variant={detailOrder.payment.paymentStatus === "received" ? "outline" : "secondary"} className={detailOrder.payment.paymentStatus === "received" ? "border-green-200 text-green-700" : ""}>{detailOrder.payment.paymentStatus}</Badge></div>
                    {detailOrder.payment.referenceNumber && <div className="flex justify-between"><span className="text-muted-foreground">UTR / Reference</span><span className="font-mono">{detailOrder.payment.referenceNumber}</span></div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Ship Order Dialog */}
      <Dialog open={shipDialog.open} onOpenChange={(o) => setShipDialog(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ship Order — {shipDialog.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Courier</label>
              <Select value={shipForm.courier} onValueChange={v => setShipForm(s => ({ ...s, courier: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shiprocket">Shiprocket</SelectItem>
                  <SelectItem value="Ecom Express">Ecom Express</SelectItem>
                  <SelectItem value="Delhivery">Delhivery</SelectItem>
                  <SelectItem value="DTDC">DTDC</SelectItem>
                  <SelectItem value="Blue Dart">Blue Dart</SelectItem>
                  <SelectItem value="India Post">India Post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">AWB / Tracking Number</label>
              <Input className="mt-1" placeholder="e.g. 12345678901" value={shipForm.trackingNumber} onChange={e => setShipForm(s => ({ ...s, trackingNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Tracking Link</label>
              <Input className="mt-1" placeholder="https://shiprocket.co/tracking/..." value={shipForm.trackingLink} onChange={e => setShipForm(s => ({ ...s, trackingLink: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">Customer will receive email + SMS with tracking details immediately.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipDialog(s => ({ ...s, open: false }))}>Cancel</Button>
            <Button onClick={handleShip} disabled={shipping}>{shipping ? "Sending..." : "Mark as Shipped & Notify"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and track fulfillment</p>
      </div>

      <Tabs defaultValue="b2c" className="space-y-6">
        <TabsList>
          <TabsTrigger value="b2c">B2C Orders</TabsTrigger>
          <TabsTrigger value="b2b">B2B Wholesale</TabsTrigger>
        </TabsList>

        <TabsContent value="b2c">
          {renderTable(b2cOrders, b2cLoading)}
        </TabsContent>

        <TabsContent value="b2b">
          {renderTable(b2bOrders, b2bLoading)}
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

export default function AdminOrders() {
  return (
    <ProtectedRoute adminOnly>
      <OrdersInner />
    </ProtectedRoute>
  );
}
