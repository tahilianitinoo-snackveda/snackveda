import { SiteShell } from "@/components/layout/site-shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      // Always show success to avoid email enumeration
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteShell>
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
          </Link>

          <h1 className="text-3xl font-serif font-bold mb-2">Forgot Password</h1>
          <p className="text-muted-foreground mb-8">Enter your email and we'll send you a link to reset your password.</p>

          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <div className="text-green-700 font-medium mb-2">Check your email</div>
              <p className="text-green-600 text-sm">If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.</p>
              <Link href="/login">
                <Button className="mt-4" variant="outline">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <div className="bg-card border rounded-2xl p-8 shadow-sm">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input placeholder="you@example.com" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
