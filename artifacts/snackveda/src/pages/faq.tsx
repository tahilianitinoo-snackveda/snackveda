import { SiteShell } from "@/components/layout/site-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      q: "Are SnackVeda products fried?",
      a: "No! All our snacks are carefully roasted, baked, or popped. We never deep fry our products, significantly reducing their fat content while maintaining that perfect crunch."
    },
    {
      q: "Are your products suitable for vegetarians and vegans?",
      a: "Yes, 100% of our products are vegetarian. Most of our range is also vegan, though a few specific flavors may contain dairy (like cheese or whey powder). Please check individual product ingredients."
    },
    {
      q: "Do your products contain artificial flavors or colors?",
      a: "Absolutely not. We rely entirely on natural Indian spices and clean ingredients to flavor our snacks. You won't find any synthetic colors or artificial flavor enhancers here."
    },
    {
      q: "What is the shelf life of your snacks?",
      a: "Our snacks typically have a shelf life of 6 to 9 months from the date of manufacture when stored in a cool, dry place away from direct sunlight."
    },
    {
      q: "Do you ship across India?",
      a: "Yes! We ship to almost all pincodes across India. Shipping usually takes 3-5 business days depending on your location."
    },
    {
      q: "How can I become a B2B partner or retailer?",
      a: "We'd love to partner with you! Please visit our B2B page to view our wholesale terms and apply for a trade account. Once approved, you'll get access to special pricing and bulk ordering."
    },
    {
      q: "What is your return policy?",
      a: "Since our products are food items, we generally do not accept returns. However, if you receive a damaged or incorrect item, please contact our support team within 48 hours of delivery with photos, and we will arrange a replacement."
    },
    {
      q: "Are your snacks gluten-free?",
      a: "Many of our products, like Makhana, are naturally gluten-free. However, they are processed in a facility that also handles wheat products. Please check the specific allergen warnings on each product page."
    }
  ];

  return (
    <SiteShell>
      <div className="container mx-auto px-4 py-16 md:py-24 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">Got questions? We've got answers.</p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium text-lg">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SiteShell>
  );
}
