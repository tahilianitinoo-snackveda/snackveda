import { SiteShell } from "@/components/layout/site-shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";

const schema = z.object({
  password: z.string().min(6, "Minimum 6 characters"),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token");

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  const onSubmit = async (values: { password: string }) => {
    if (!token) { toast.error("Invalid reset link"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Password reset successfully. Please login.");
      setLocation("/login");
    } catch (e: any) {
      toast.error(e.message || "Reset failed. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <SiteShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Invalid reset link.</p>
            <Link href="/forgot-password"><Button>Request New Link</Button></Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-serif font-bold mb-2">Set New Password</h1>
          <p className="text-muted-foreground mb-8">Enter your new password below.</p>
          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Updating..." : "Reset Password"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
