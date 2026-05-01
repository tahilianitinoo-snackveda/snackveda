import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useListAdminPayments, useConfirmAdminPayment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

function PaymentsInner() {
  const queryClient = useQueryClient();
  const confirmPayment = useConfirmAdminPayment();
  const { data: payments, isLoading } = useListAdminPayments();

  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [refNum, setRefNum] = useState("");

  const pending = payments?.filter(p => p.paymentStatus === 'pending') || [];
  const paid = payments?.filter(p => p.paymentStatus === 'received') || [];

  const handleConfirm = (id: string) => {
    confirmPayment.mutate({ orderId: id, data: { referenceNumber: refNum || "" } }, {
      onSuccess: () => {
        toast.success("Payment marked as received");
        setOpenDialog(null);
        setRefNum("");
        queryClient.invalidateQueries({ queryKey: ['/api/admin/payments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      },
      onError: (err) => toast.error(err.message || "Failed to confirm payment")
    });
  };

  const renderTable = (list: any[], showActions: boolean) => (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {showActions && <TableHead className="text-right">Actions</TableHead>}
            {!showActions && <TableHead>Reference</TableHead>}
            {!showActions && <TableHead>Date</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow><TableCell colSpan={showActions ? 5 : 6} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
          ) : list.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium font-mono">{p.orderNumber}</TableCell>
              <TableCell>{p.customerName}</TableCell>
              <TableCell className="capitalize">{p.method.replace('_', ' ')}</TableCell>
              <TableCell className="text-right font-medium"><Price amount={p.amount} /></TableCell>
              {showActions ? (
                <TableCell className="text-right">
                  <Dialog open={openDialog === p.id} onOpenChange={(open) => {
                    setOpenDialog(open ? p.id : null);
                    if (!open) setRefNum("");
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm"><CheckCircle2 className="w-4 h-4 mr-2" /> Mark Received</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Payment Receipt</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="text-sm text-muted-foreground">Confirm receiving <span className="font-bold text-foreground"><Price amount={p.amount} /></span> for order {p.orderNumber}.</div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Bank UTR / Reference Number (Optional)</label>
                          <Input value={refNum} onChange={e => setRefNum(e.target.value)} placeholder="e.g. UTR123456" />
                        </div>
                        <Button className="w-full" onClick={() => handleConfirm(p.id)} disabled={confirmPayment.isPending}>
                          {confirmPayment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Confirm Payment
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              ) : (
                <>
                  <TableCell className="font-mono text-sm">{p.referenceNumber || '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.updatedAt ? formatDate(p.updatedAt) : '-'}</TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Payments</h1>
        <p className="text-muted-foreground">Track and reconcile bank transfers and UPI payments</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pending Action
            {pending.length > 0 && <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{pending.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div> : renderTable(pending, true)}
        </TabsContent>

        <TabsContent value="history">
          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div> : renderTable(paid, false)}
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

export default function AdminPayments() {
  return (
    <ProtectedRoute adminOnly>
      <PaymentsInner />
    </ProtectedRoute>
  );
}
