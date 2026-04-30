import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useGetAdminDashboard, useListAdminCustomers, useUpdateAdminCustomerStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/ui/price";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Package, Users, ShoppingCart, IndianRupee, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

function DashboardInner() {
  const { data: dashboard, isLoading } = useGetAdminDashboard();
  const { data: pendingB2b } = useListAdminCustomers({ type: 'b2b' });
  const updateStatus = useUpdateAdminCustomerStatus();
  const queryClient = useQueryClient();

  const handleApprove = (id: string, status: 'approved' | 'rejected') => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast.success(`Customer ${status}`);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      },
      onError: (err) => toast.error(err.message || "Failed to update status")
    });
  };

  const pendingList = pendingB2b?.filter(c => c.b2bStatus === 'pending') || [];

  if (isLoading || !dashboard) {
    return (
      <AdminShell>
        <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store's performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold"><Price amount={dashboard.totalRevenue} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Orders by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.ordersByCategory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} className="capitalize" />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Pending B2B Approvals</span>
                {pendingList.length > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">{pendingList.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {pendingList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No pending approvals.</div>
              ) : (
                <div className="space-y-4">
                  {pendingList.map(c => (
                    <div key={c.id} className="p-4 border rounded-xl bg-muted/30">
                      <div className="font-bold text-sm mb-1">{c.b2bCompanyName}</div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {c.name} • {c.b2bCustomerType}
                        <br/>
                        {formatDate(c.createdAt)}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => handleApprove(c.id, 'approved')}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleApprove(c.id, 'rejected')}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <DashboardInner />
    </ProtectedRoute>
  );
}
