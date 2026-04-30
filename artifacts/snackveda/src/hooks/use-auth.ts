import { useGetCurrentUser } from "@workspace/api-client-react";
import { useCartStore } from "@/lib/store";
import { useEffect } from "react";

export function useAuth() {
  const query = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 30_000,
    },
  });
  const { data, isLoading, error, refetch } = query;
  const setOrderType = useCartStore((state) => state.setOrderType);

  const user = data ?? null;

  useEffect(() => {
    if (user && user.role === 'b2b_customer' && user.b2bStatus === 'approved') {
      setOrderType('b2b');
    } else if (user) {
      setOrderType('b2c');
    } else {
      setOrderType('b2c');
    }
  }, [user, setOrderType]);

  return {
    user,
    isLoading,
    error,
    refetch,
    isAdmin: user?.role === 'super_admin',
    isB2BApproved: user?.role === 'b2b_customer' && user.b2bStatus === 'approved',
  };
}