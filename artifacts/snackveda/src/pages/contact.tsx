import { SiteShell } from "@/components/layout/site-shell";
import { Mail, Phone, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">Get in Touch</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you have a question about our products, need help with an order, or want to explore partnership opportunities, we're here to help.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardContent className="pt-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Email Us</h3>
              <p className="text-muted-foreground text-sm mb-4">For general inquiries and support</p>
              <a href="mailto:hello@snackveda.in" className="text-primary font-medium hover:underline">hello@snackveda.in</a>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">WhatsApp</h3>
              <p className="text-muted-foreground text-sm mb-4">Mon-Fri from 9am to 6pm</p>
              <a href="tel:+919000000000" className="text-primary font-medium hover:underline">+91 90000 00000</a>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Visit Us</h3>
              <p className="text-muted-foreground text-sm mb-4">Narayani Distributors HQ</p>
              <address className="not-italic text-sm text-muted-foreground">
                123 Industrial Estate<br />
                Andheri East<br />
                Mumbai, Maharashtra 400093
              </address>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl font-serif font-bold mb-4">Looking to stock SnackVeda?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">We offer competitive trade pricing and dedicated support for our retail partners across India.</p>
          <Button size="lg" className="rounded-full" asChild>
            <a href="/b2b">Explore B2B Opportunities</a>
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
