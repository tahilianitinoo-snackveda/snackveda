import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, Users, ShoppingCart, CreditCard, LogOut, Menu } from "lucide-react";
import { useLogoutUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [location] = useLocation();
  const logout = useLogoutUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/customers", icon: Users, label: "Customers" },
    { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/admin/payments", icon: CreditCard, label: "Payments" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("snackveda_token");
    logout.mutate(undefined, { onSuccess: () => window.location.href = "/" });
  };

  const NavContent = () => (
    <>
      <div className="p-6 flex-1">
        <Link href="/admin" className="flex flex-col items-start mb-8" onClick={() => setMobileOpen(false)}>
          <span className="font-serif text-xl font-bold tracking-tight text-primary">SnackVeda</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin Panel</span>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                location === item.href
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive text-sm"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      {/* Desktop sidebar — always visible */}
      <aside className="hidden lg:flex w-64 bg-card border-r border-border flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
          <SheetTrigger asChild onClick={() => setMobileOpen(true)}>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <span className="font-serif font-bold text-primary">SnackVeda Admin</span>
        </div>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
