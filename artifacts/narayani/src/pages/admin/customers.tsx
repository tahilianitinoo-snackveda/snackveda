import { AdminShell } from "@/components/layout/admin-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useListAdminCustomers } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { Loader2 } from "lucide-react";

function CustomersInner() {
  const { data: b2cCustomers, isLoading: b2cLoading } = useListAdminCustomers({ type: 'b2c' });
  const { data: b2bCustomers, isLoading: b2bLoading } = useListAdminCustomers({ type: 'b2b' });

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Customers</h1>
        <p className="text-muted-foreground">Manage B2C and B2B accounts</p>
      </div>

      <Tabs defaultValue="b2b" className="space-y-6">
        <TabsList>
          <TabsTrigger value="b2b">B2B Partners</TabsTrigger>
          <TabsTrigger value="b2c">B2C Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="b2b">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b2bLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : b2bCustomers?.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.businessName}
                      {c.gstNumber && <div className="text-xs font-normal text-muted-foreground font-mono">GST: {c.gstNumber}</div>}
                    </TableCell>
                    <TableCell>
                      {c.fullName}
                      <div className="text-xs text-muted-foreground">{c.email} &bull; {c.phone}</div>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{c.customerType?.replace("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{c.b2bStatus || "active"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="b2c">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b2cLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : b2cCustomers?.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>
                      {c.email}
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </TableCell>
                    <TableCell>{c.ordersCount}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

export default function AdminCustomers() {
  return (
    <ProtectedRoute adminOnly>
      <CustomersInner />
    </ProtectedRoute>
  );
}
