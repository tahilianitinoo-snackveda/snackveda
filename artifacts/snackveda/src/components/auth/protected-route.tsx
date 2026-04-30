import { useAuth } from "@/hooks/use-auth";
import { Redirect, Route, RouteProps } from "wouter";

interface ProtectedRouteProps extends RouteProps {
  adminOnly?: boolean;
}

export function ProtectedRoute({ adminOnly, ...props }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/" />;
  }

  return <Route {...props} />;
}
