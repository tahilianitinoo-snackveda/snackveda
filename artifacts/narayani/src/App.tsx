import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { initAnalytics, trackPageView, type AnalyticsConfig } from "@/lib/analytics";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import axios from "axios";

// Pages
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import B2B from "@/pages/b2b";
import Business from "@/pages/business";
import Export from "@/pages/export";
import Wholesale from "@/pages/wholesale";
import PrivateLabel from "@/pages/private-label";
import Quality from "@/pages/quality";
import RequestAQuote from "@/pages/request-a-quote";
import About from "@/pages/about";
import FAQ from "@/pages/faq";
import Contact from "@/pages/contact";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Policies from "@/pages/policies";
import Blog from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
import Account from "@/pages/account";
import AccountOrderDetail from "@/pages/account-order-detail";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminCustomers from "@/pages/admin/customers";
import AdminOrders from "@/pages/admin/orders";
import AdminPayments from "@/pages/admin/payments";
import AdminBlog from "@/pages/admin/blog";
import AdminEnquiries from "@/pages/admin/enquiries";
import AdminSettings from "@/pages/admin/settings";
import AdminReviews from "@/pages/admin/reviews";
import NotFound from "@/pages/not-found";

// Ensure credentials flow for auth
axios.defaults.withCredentials = true;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/shop" component={Shop} />
      <Route path="/shop/:slug" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      {/*
        The business surface. /business is the hub; /wholesale and /export are its
        depth. /b2b predates them and is no longer linked from the header or footer —
        it stays routed so existing links and bookmarks do not 404.
      */}
      <Route path="/business" component={Business} />
      <Route path="/wholesale" component={Wholesale} />
      <Route path="/private-label" component={PrivateLabel} />
      <Route path="/quality" component={Quality} />
      <Route path="/export" component={Export} />
      {/* The conversion point every B2B call to action lands on. */}
      <Route path="/request-a-quote" component={RequestAQuote} />
      <Route path="/b2b" component={B2B} />
      <Route path="/about" component={About} />
      <Route path="/faq" component={FAQ} />
      <Route path="/contact" component={Contact} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/policies" component={Policies} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPostPage} />
      
      <Route path="/account" component={Account} />
      <Route path="/account/orders/:id" component={AccountOrderDetail} />
      
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/blog" component={AdminBlog} />
      <Route path="/admin/enquiries" component={AdminEnquiries} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/reviews" component={AdminReviews} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Analytics — spec point 32.
 *
 * Measurement IDs come from Admin → Settings rather than a build, so the business
 * can connect Google Analytics without a developer. With nothing configured, no
 * third-party script is fetched at all: a site with no analytics set up should ship
 * no analytics, not an empty stub with a cookie behind it.
 *
 * Page views are sent manually because wouter navigates without reloading the
 * document, so gtag's automatic page_view would fire once on the first paint and
 * never again — which is how a single-page site ends up reporting one page view
 * per session.
 */
function Analytics() {
  const [location] = useLocation();

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settings) initAnalytics(settings as AnalyticsConfig);
  }, [settings]);

  useEffect(() => {
    // A frame's delay, so the page has set its own title before it is reported.
    const id = window.setTimeout(() => trackPageView(location), 0);
    return () => window.clearTimeout(id);
  }, [location, settings]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Analytics />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
