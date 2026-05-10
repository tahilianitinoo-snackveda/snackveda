import { SiteShell } from "@/components/layout/site-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sections = [
  {
    id: "cancellation",
    label: "Cancellation & Refund",
    content: (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-serif font-bold mb-4">Cancellation & Refund Policy</h2>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Cancellation Policy</h3>
          <p className="text-muted-foreground">At SnackVeda, we strive to process and dispatch orders quickly to ensure timely delivery of fresh products. Therefore:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Orders can be cancelled only before dispatch.</li>
            <li>Once the order has been shipped, cancellation requests will not be accepted.</li>
            <li>To request a cancellation, customers must contact us immediately via email or customer support.</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Refund Policy</h3>
          <p className="text-muted-foreground">Refunds are applicable only under the following conditions:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Product received is damaged during transit</li>
            <li>Wrong product delivered</li>
            <li>Product package is tampered with before delivery</li>
            <li>Order not delivered due to our fault</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Non-Refundable Situations</h3>
          <p className="text-muted-foreground">Refunds will not be applicable for:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Taste preferences or personal dislike</li>
            <li>Slight variation in packaging/design</li>
            <li>Delay caused by courier or unforeseen circumstances</li>
            <li>Incorrect address or phone number provided by customer</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Refund Process</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Customers must report issues within 48 hours of delivery.</li>
            <li>Supporting images/videos may be requested.</li>
            <li>Approved refunds will be processed within 5–7 business days to the original payment method.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "delivery",
    label: "Delivery Policy",
    content: (
      <div className="space-y-8">
        <h2 className="text-2xl font-serif font-bold mb-4">Delivery Policy</h2>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Shipping Locations</h3>
          <p className="text-muted-foreground">SnackVeda currently delivers across India.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Dispatch Timeline</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Orders are generally dispatched within 1–3 business days.</li>
            <li>Bulk or special orders may require additional processing time.</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Delivery Timeline</h3>
          <div className="grid md:grid-cols-3 gap-4 mt-2">
            {[
              { label: "Metro Cities", time: "3–5 business days" },
              { label: "Other Cities/Towns", time: "5–8 business days" },
              { label: "Remote Areas", time: "7–10 business days" },
            ].map(item => (
              <div key={item.label} className="bg-muted/40 border rounded-xl p-4 text-center">
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-primary font-bold mt-1">{item.time}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Delivery Delays</h3>
          <p className="text-muted-foreground">Delivery timelines may vary due to weather conditions, courier delays, public holidays, or natural calamities. SnackVeda shall not be held liable for delays caused by third-party logistics providers.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Order Tracking</h3>
          <p className="text-muted-foreground">Customers will receive tracking details via email/SMS once the order is shipped.</p>
        </div>
      </div>
    ),
  },
  {
    id: "terms",
    label: "Terms & Conditions",
    content: (
      <div className="space-y-8">
        <h2 className="text-2xl font-serif font-bold mb-4">Terms & Conditions</h2>
        <p className="text-muted-foreground">Welcome to SnackVeda. By using this website, you agree to the following terms and conditions.</p>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Product Information</h3>
          <p className="text-muted-foreground">We aim to ensure all product descriptions, pricing, and images are accurate. However, minor variations may occur, product availability may change without prior notice, and prices are subject to change at any time.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Use of Website</h3>
          <p className="text-muted-foreground">Users agree not to misuse the website, not to attempt unauthorized access, and not to use the website for unlawful purposes.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Intellectual Property</h3>
          <p className="text-muted-foreground">All content on this website including logos, product images, graphics, text, and designs are the property of SnackVeda/Narayani Distributors and may not be copied or reproduced without permission.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Limitation of Liability</h3>
          <p className="text-muted-foreground">SnackVeda shall not be liable for indirect or incidental damages, loss due to delayed delivery, or allergic reactions caused by ingredients listed on packaging. Customers are advised to read ingredient and nutritional information carefully before consumption.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Governing Law</h3>
          <p className="text-muted-foreground">These terms shall be governed by the laws of India.</p>
        </div>
      </div>
    ),
  },
  {
    id: "privacy",
    label: "Privacy Policy",
    content: (
      <div className="space-y-8">
        <h2 className="text-2xl font-serif font-bold mb-4">Privacy Policy</h2>
        <p className="text-muted-foreground">At SnackVeda, customer privacy is important to us.</p>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Information We Collect</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Name, phone number, email address</li>
            <li>Shipping/Billing address</li>
            <li>Payment information</li>
            <li>Device/browser information</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">How We Use Information</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Order processing and delivery updates</li>
            <li>Customer support</li>
            <li>Marketing communication</li>
            <li>Improving website experience</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Payment Security</h3>
          <p className="text-muted-foreground">We do not store card or banking details on our servers. Payments are processed securely through trusted third-party payment gateways.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Data Sharing</h3>
          <p className="text-muted-foreground">We do not sell customer data. Information may only be shared with courier partners, payment gateways, or government authorities if legally required.</p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">User Rights</h3>
          <p className="text-muted-foreground">Customers may request correction or deletion of their personal data by contacting us at support@snackveda.co.in.</p>
        </div>
      </div>
    ),
  },
  {
    id: "services",
    label: "Our Services",
    content: (
      <div className="space-y-8">
        <h2 className="text-2xl font-serif font-bold mb-4">Our Services</h2>
        <p className="text-muted-foreground">SnackVeda is a healthy snacking brand by Narayani Distributors offering premium-quality snacks crafted with better ingredients and delicious flavors.</p>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">We Offer</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {["Healthy snacks and munchies","Makhana products","Millet-based snacks","Gud Chana varieties","Roasted and flavored snacks","Bulk and wholesale supply","Retail and online orders"].map(item => (
              <div key={item} className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-sm text-teal-800 font-medium">{item}</div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Business Services</h3>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Distributor partnerships</li>
            <li>Retail store supply</li>
            <li>Modern trade supply</li>
            <li>Corporate and bulk gifting solutions</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function Policies() {
  return (
    <SiteShell>
      <div className="bg-muted/30 py-16 border-b">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Policies</h1>
          <p className="text-muted-foreground">SnackVeda by Narayani Distributors</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-12">
        <Tabs defaultValue="cancellation">
          <TabsList className="flex flex-wrap h-auto gap-2 mb-8 bg-transparent p-0">
            {sections.map(s => (
              <TabsTrigger key={s.id} value={s.id} className="rounded-full border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary">
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map(s => (
            <TabsContent key={s.id} value={s.id} className="bg-card border rounded-2xl p-8 shadow-sm">
              {s.content}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-12 text-center text-sm text-muted-foreground border-t pt-8">
          <p>For any queries regarding our policies, contact us at <a href="mailto:support@snackveda.co.in" className="text-primary hover:underline">support@snackveda.co.in</a></p>
          <p className="mt-2">SnackVeda by Narayani Distributors — Healthy Snacking for Modern India.</p>
        </div>
      </div>
    </SiteShell>
  );
}
