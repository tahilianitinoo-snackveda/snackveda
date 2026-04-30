import { SiteShell } from "@/components/layout/site-shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegisterUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Store, User } from "lucide-react";
import { useState } from "react";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  accountType: z.enum(["b2c", "b2b"]),
  b2bCompanyName: z.string().optional(),
  b2bGstNumber: z.string().optional(),
  b2bCustomerType: z.enum(["kirana", "modern_retail", "cafe_restaurant", "pharmacy", "gym_wellness", "corporate", "other"]).optional()
}).refine((data) => {
  if (data.accountType === "b2b") {
    return !!data.b2bCompanyName && !!data.b2bCustomerType;
  }
  return true;
}, {
  message: "Company Name and Business Type are required for B2B accounts",
  path: ["b2bCompanyName"] // Attach error loosely, we'll handle visual cues
});

export default function Register() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get("type") === "b2b" ? "b2b" : "b2c";
  
  const [step, setStep] = useState(1);
  const queryClient = useQueryClient();
  const registerMutation = useRegisterUser();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      accountType: initialType,
      name: "", email: "", phone: "", password: "",
      b2bCompanyName: "", b2bGstNumber: "", b2bCustomerType: "kirana"
    },
  });

  const accountType = form.watch("accountType");

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    const payload: any = {
      accountType: values.accountType,
      name: values.name,
      email: values.email,
      phone: values.phone,
      password: values.password
    };
    if (values.accountType === "b2b") {
      payload.b2bCompanyName = values.b2bCompanyName;
      payload.b2bGstNumber = values.b2bGstNumber || undefined;
      payload.b2bCustomerType = values.b2bCustomerType;
    }

    registerMutation.mutate({ data: payload }, {
      onSuccess: () => {
        toast.success(values.accountType === "b2b" ? "B2B Application submitted successfully" : "Registration successful");
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setLocation('/account');
      },
      onError: (err) => {
        toast.error(err.message || "Registration failed");
      }
    });
  };

  return (
    <SiteShell>
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 bg-muted/20">
        <div className="w-full max-w-2xl bg-card border rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Create an Account</h1>
            <p className="text-muted-foreground">Join SnackVeda for a premium snacking experience</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <h2 className="text-xl font-medium text-center mb-6">How would you like to use SnackVeda?</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => form.setValue("accountType", "b2c")}
                      className={`flex flex-col items-center text-center p-8 rounded-2xl border-2 transition-all ${
                        accountType === "b2c" 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      <User className={`w-12 h-12 mb-4 ${accountType === "b2c" ? "text-primary" : "text-muted-foreground"}`} />
                      <h3 className="font-bold text-lg mb-2">Personal Use</h3>
                      <p className="text-sm text-muted-foreground">Shop premium snacks for yourself, friends, and family.</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => form.setValue("accountType", "b2b")}
                      className={`flex flex-col items-center text-center p-8 rounded-2xl border-2 transition-all ${
                        accountType === "b2b" 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      <Store className={`w-12 h-12 mb-4 ${accountType === "b2b" ? "text-primary" : "text-muted-foreground"}`} />
                      <h3 className="font-bold text-lg mb-2">Business / Wholesale</h3>
                      <p className="text-sm text-muted-foreground">Stock SnackVeda in your store, cafe, or office.</p>
                    </button>
                  </div>
                  <div className="pt-6 flex justify-center">
                    <Button type="button" size="lg" className="rounded-full px-12" onClick={() => setStep(2)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-6">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="text-muted-foreground -ml-4">
                      &larr; Back
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground ml-auto uppercase tracking-widest">
                      {accountType === "b2b" ? "B2B Application" : "Personal Details"}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl><Input placeholder="10-digit number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Min. 6 characters" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {accountType === "b2b" && (
                    <div className="pt-6 mt-6 border-t space-y-6">
                      <h3 className="font-serif font-bold text-xl">Business Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="b2bCompanyName" render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Company / Store Name</FormLabel>
                            <FormControl><Input placeholder="Your Business Name" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="b2bCustomerType" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Type</FormLabel>
                            <FormControl>
                              <select 
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="kirana">Kirana / Local Store</option>
                                <option value="modern_retail">Supermarket / Retail Chain</option>
                                <option value="pharmacy">Pharmacy / Health Store</option>
                                <option value="gym_wellness">Gym / Fitness Center</option>
                                <option value="cafe_restaurant">Cafe / Restaurant</option>
                                <option value="corporate">Corporate Office</option>
                                <option value="other">Other</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="b2bGstNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Number (Optional)</FormLabel>
                            <FormControl><Input placeholder="e.g. 22AAAAA0000A1Z5" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full rounded-full h-14 text-lg mt-8" disabled={registerMutation.isPending}>
                    {registerMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {accountType === "b2b" ? "Submit Application" : "Create Account"}
                  </Button>
                </div>
              )}
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-muted-foreground border-t pt-8">
            Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
