import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Users, ShoppingCart, CreditCard, LogOut } from "lucide-react";
import { useLogoutUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [location] = useLocation();
  const logout = useLogoutUser();

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/customers", icon: Users, label: "Customers" },
    { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/admin/payments", icon: CreditCard, label: "Payments" },
  ];

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <Link href="/admin" className="flex flex-col items-start mb-8">
            <span className="font-serif text-xl font-bold tracking-tight text-primary">SnackVeda Admin</span>
          </Link>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  location === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={() => { localStorage.removeItem("snackveda_token"); logout.mutate(undefined, { onSuccess: () => window.location.href = "/" }); }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
