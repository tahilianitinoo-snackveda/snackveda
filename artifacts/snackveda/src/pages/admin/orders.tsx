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
  
  const { data: b2cOrders, isLoading: b2cLoading } = useListAdminOrders({ orderType: 'b2c' });
  const { data: b2bOrders, isLoading: b2bLoading } = useListAdminOrders({ orderType: 'b2b' });

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
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
          ) : orders?.map(o => (
            <TableRow key={o.id}>
              <TableCell className="font-medium font-mono">{o.orderNumber}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
              <TableCell>
                {o.customerName}
                <div className="text-xs text-muted-foreground capitalize">{o.paymentMethod.replace('_', ' ')}</div>
              </TableCell>
              <TableCell className="font-medium"><Price amount={o.totalAmount} /></TableCell>
              <TableCell>{getPaymentBadge(o.paymentStatus)}</TableCell>
              <TableCell>
                <Select defaultValue={o.status} onValueChange={(val) => handleStatusChange(o.id, val)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminShell>
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
