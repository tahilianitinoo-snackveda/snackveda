import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  adminOnly?: boolean;
  children: ReactNode;
}

export function ProtectedRoute({ adminOnly, children }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
