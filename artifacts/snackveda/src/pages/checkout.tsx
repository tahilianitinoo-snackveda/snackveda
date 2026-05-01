import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { CartSummary } from "@/components/cart/cart-summary";
import { useCreateB2cOrder, useCreateB2bOrder, useQuoteCart } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Building2, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

const checkoutSchema = z.object({
  shippingName: z.string().min(2, "Name is required"),
  shippingPhone: z.string().min(10, "Valid phone is required"),
  shippingAddressLine1: z.string().min(5, "Address is required"),
  shippingAddressLine2: z.string().optional(),
  shippingCity: z.string().min(2, "City is required"),
  shippingState: z.string().min(2, "State is required"),
  shippingPincode: z.string().min(6, "Valid pincode is required"),
  paymentMethod: z.enum(["upi", "bank_transfer", "payment_link"]).default("upi"),
  paymentReference: z.string().optional()
});

function CheckoutInner() {
  const { items, orderType, clearCart } = useCartStore();
  const { isB2BApproved } = useAuth();
  const [, setLocation] = useLocation();
  const createB2c = useCreateB2cOrder();
  const createB2b = useCreateB2bOrder();
  const quote = useQuoteCart();
  const [b2bViolations, setB2bViolations] = useState<string[]>([]);

  useEffect(() => {
    if (items.length === 0) {
      setLocation("/cart");
    } else {
      quote.mutate({
        data: {
          orderType,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity }))
        }
      }, {
        onSuccess: (data) => {
          if (data.moqViolations) setB2bViolations(data.moqViolations);
        }
      });
    }
  }, [items, orderType]);

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingName: "",
      shippingPhone: "",
      shippingAddressLine1: "",
      shippingAddressLine2: "",
      shippingCity: "",
      shippingState: "",
      shippingPincode: "",
      paymentMethod: isB2BApproved ? "bank_transfer" : "upi",
      paymentReference: ""
    },
  });

  const paymentMethod = form.watch("paymentMethod");

  const onSubmit = (values: z.infer<typeof checkoutSchema>) => {
    if (b2bViolations.length > 0) {
      toast.error("Please resolve order requirements first");
      return;
    }

    const orderItems = items.map(i => ({
      productId: i.productId,
      quantity: i.quantity
    }));

    if (orderType === 'b2b') {
      createB2b.mutate({
        data: {
          items: orderItems,
          shippingAddress: {
            fullName: values.shippingName,
            phone: values.shippingPhone,
            line1: values.shippingAddressLine1,
            line2: values.shippingAddressLine2,
            city: values.shippingCity,
            state: values.shippingState,
            pincode: values.shippingPincode
          },
          paymentMethod: values.paymentMethod as "upi" | "bank_transfer" | "payment_link"
        }
      }, {
        onSuccess: (order) => {
          clearCart();
          toast.success("B2B Order placed successfully");
          setLocation(`/account/orders/${order.id}`);
        },
        onError: (err) => toast.error(err.message || "Failed to place order")
      });
    } else {
      if (!values.paymentReference) {
        form.setError("paymentReference", { message: "Payment reference is required for B2C" });
        return;
      }
      createB2c.mutate({
        data: {
          items: orderItems,
          shippingAddress: {
            fullName: values.shippingName,
            phone: values.shippingPhone,
            line1: values.shippingAddressLine1,
            line2: values.shippingAddressLine2,
            city: values.shippingCity,
            state: values.shippingState,
            pincode: values.shippingPincode
          },
          paymentMethod: values.paymentMethod as "upi" | "bank_transfer" | "payment_link",
          paymentReference: values.paymentReference
        }
      }, {
        onSuccess: (order) => {
          clearCart();
          toast.success("Order placed successfully");
          setLocation(`/account/orders/${order.id}`);
        },
        onError: (err) => toast.error(err.message || "Failed to place order")
      });
    }
  };

  const isPending = createB2c.isPending || createB2b.isPending;

  return (
    <SiteShell>
      <div className="bg-muted/30 py-4 border-b mb-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <h1 className="font-serif font-bold text-xl">Checkout</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </div>

      <div className="container mx-auto px-4 pb-24">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 xl:col-span-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                
                {/* Shipping Address */}
                <div>
                  <h2 className="text-2xl font-serif font-bold mb-6">Shipping Information</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="shippingName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shippingPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl><Input placeholder="10-digit number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shippingAddressLine1" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl><Input placeholder="House/Flat No., Building Name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shippingAddressLine2" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address Line 2 (Optional)</FormLabel>
                        <FormControl><Input placeholder="Street, Area, Landmark" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="shippingCity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="shippingState" render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl><Input placeholder="Maharashtra" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="shippingPincode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode</FormLabel>
                          <FormControl><Input placeholder="400001" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-10">
                  <h2 className="text-2xl font-serif font-bold mb-6">Payment</h2>
                  
                  {orderType === 'b2c' ? (
                    <div className="space-y-6 bg-card border rounded-2xl p-6">
                      <p className="text-muted-foreground text-sm">Please scan the QR code to pay via any UPI app (GPay, PhonePe, Paytm). Enter the UTR/Reference number below after payment.</p>
                      
                      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        <div className="w-48 h-48 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl border-2 border-primary/20 flex flex-col items-center justify-center p-4">
                          <QrCode className="w-16 h-16 text-primary mb-2 opacity-50" />
                          <span className="text-xs font-bold text-center">UPI ID:<br/>snackveda@upi</span>
                        </div>
                        
                        <div className="flex-1 w-full space-y-4">
                          <FormField control={form.control} name="paymentReference" render={({ field }) => (
                            <FormItem>
                              <FormLabel>UPI Reference Number (UTR)</FormLabel>
                              <FormControl><Input placeholder="e.g. 301928374650" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="text-xs text-muted-foreground">Your order will be processed after payment verification.</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-3">
                              <FormItem className="flex items-center space-x-3 space-y-0 bg-card border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FormControl><RadioGroupItem value="bank_transfer" /></FormControl>
                                <FormLabel className="font-medium flex items-center cursor-pointer w-full">
                                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" /> Direct Bank Transfer (NEFT/RTGS)
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 bg-card border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FormControl><RadioGroupItem value="upi" /></FormControl>
                                <FormLabel className="font-medium flex items-center cursor-pointer w-full">
                                  <QrCode className="w-4 h-4 mr-2 text-muted-foreground" /> UPI Transfer
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 bg-card border rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <FormControl><RadioGroupItem value="payment_link" /></FormControl>
                                <FormLabel className="font-medium flex items-center cursor-pointer w-full">
                                  Request Payment Link on WhatsApp/Email
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {paymentMethod === 'bank_transfer' && (
                        <div className="bg-muted p-4 rounded-xl text-sm space-y-2 border">
                          <p className="font-medium mb-3 text-foreground">Bank Details for Transfer:</p>
                          <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                            <span>Account Name:</span><span className="col-span-2 font-mono text-foreground">Narayani Distributors</span>
                            <span>Bank:</span><span className="col-span-2 font-mono text-foreground">HDFC Bank</span>
                            <span>Account No:</span><span className="col-span-2 font-mono text-foreground">50200012345678</span>
                            <span>IFSC Code:</span><span className="col-span-2 font-mono text-foreground">HDFC0001234</span>
                          </div>
                          <p className="pt-2 text-xs">Note: After placing the order, you will receive an invoice. Please transfer the amount and our team will verify and dispatch your order.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg rounded-full" 
                  disabled={isPending || b2bViolations.length > 0}
                >
                  {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Place Order
                </Button>
              </form>
            </Form>
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24">
              <CartSummary />
              {/* Note: Proceed to Checkout button in CartSummary will be rendered but we don't need it here.
                  We could pass a prop to hide it, but the UI might just have two buttons.
                  For a real app, CartSummary would take a hideCTA prop.
               */}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

export default function Checkout() {
  return (
    <ProtectedRoute>
      <CheckoutInner />
    </ProtectedRoute>
  );
}
