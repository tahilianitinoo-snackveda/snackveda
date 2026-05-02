import { SiteShell } from "@/components/layout/site-shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLoginUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLoginUser();
  const { user, isLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      setLocation(user.role === "super_admin" ? "/admin" : "/account");
    }
  }, [user, isLoading]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data: any) => {
        // Save JWT token for all future API requests
        if (data?.token) {
          localStorage.setItem("snackveda_token", data.token);
        }
        toast.success("Welcome back!");
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        const user = data?.user ?? data;
        if (user?.role === 'super_admin') {
          setLocation('/admin');
        } else {
          setLocation('/account');
        }
      },
      onError: (err) => {
        toast.error(err.message || "Invalid credentials");
      }
    });
  };

  return (
    <SiteShell>
      <div className="flex-1 flex items-center justify-center py-20 px-4 bg-muted/20">
        <div className="w-full max-w-md bg-card border rounded-3xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your SnackVeda account</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl><Input placeholder="you@example.com" type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input placeholder="••••••••" type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full h-12 text-base rounded-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account? <Link href="/register" className="text-primary font-medium hover:underline">Register here</Link>
          </div>

          <div className="mt-8 p-4 bg-amber-50 text-amber-800 text-xs border border-amber-200 rounded-xl">
            <p className="font-semibold mb-1">Demo Admin Credentials:</p>
            <p className="font-mono">Email: admin@snackveda.com</p>
            <p className="font-mono">Password: Admin@123</p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
