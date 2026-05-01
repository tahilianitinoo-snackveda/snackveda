import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { useListMyOrders, useGetMyProfile, useLogoutUser, getInvoiceForOrder } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Price } from "@/components/ui/price";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { generateInvoicePdf } from "@/lib/pdf";
import { LogOut, FileText, MapPin, User, Package, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { useState } from "react";

function AccountInner() {
  const { user, isB2BApproved } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const { data: orders, isLoading: ordersLoading } = useListMyOrders();
  const logout = useLogoutUser();

  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingOrderId(orderId);
    try {
      const invoice = await getInvoiceForOrder(orderId);
      generateInvoicePdf(invoice);
    } catch {
      toast.error("Failed to fetch invoice data");
    } finally {
      setDownloadingOrderId(null);
    }
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "confirmed": return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">Confirmed</Badge>;
      case "dispatched": return <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">Dispatched</Badge>;
      case "delivered": return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Delivered</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <SiteShell>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">My Account</h1>
            <p className="text-muted-foreground">Welcome back, {user?.fullName}</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "b2b_customer" && (
              <Badge variant={isB2BApproved ? "outline" : "secondary"} className={isB2BApproved ? "border-green-200 bg-green-50 text-green-700" : ""}>
                {isB2BApproved ? "B2B Approved" : "B2B Pending"}
              </Badge>
            )}
            <Button variant="outline" onClick={handleLogout} className="shrink-0">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Tabs defaultValue="orders" className="space-y-8">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="orders" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
              Orders
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm px-6">
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <h2 className="text-2xl font-serif font-bold">Order History</h2>

            {ordersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : !orders || orders.length === 0 ? (
              <EmptyState
                icon={<Package className="w-12 h-12" />}
                title="No orders yet"
                description="You haven't placed any orders with us."
                action={<Button asChild><Link href="/shop">Start Shopping</Link></Button>}
                className="bg-card border rounded-2xl py-20"
              />
            ) : (
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const paymentReceived = order.payment?.paymentStatus === "received";
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell><Price amount={order.totalAmount} className="font-medium" /></TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/account/orders/${order.id}`}>View</Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(order.id)}
                              disabled={!paymentReceived || downloadingOrderId === order.id}
                              title={!paymentReceived ? "Invoice available after payment is confirmed" : "Download Invoice"}
                            >
                              {downloadingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                              Invoice
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-serif font-bold">Profile Details</h2>

            {profileLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : profile ? (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b pb-4 mb-4 text-lg font-medium">
                    <User className="w-5 h-5 text-primary" /> Personal Information
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                    <p className="font-medium">{profile.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                    <p className="font-medium">{profile.phone ?? "N/A"}</p>
                  </div>
                </div>

                {user?.role === "b2b_customer" && (
                  <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 border-b pb-4 mb-4 text-lg font-medium">
                      <MapPin className="w-5 h-5 text-primary" /> Business Information
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                      <p className="font-medium">{profile.businessName ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Business Type</p>
                      <p className="font-medium capitalize">{profile.customerType?.replace("_", " ") ?? "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">GST Number</p>
                      <p className="font-medium">{profile.gstNumber ?? "N/A"}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </SiteShell>
  );
}

export default function Account() {
  return (
    <ProtectedRoute>
      <AccountInner />
    </ProtectedRoute>
  );
}
