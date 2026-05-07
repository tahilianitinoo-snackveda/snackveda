import { SiteShell } from "@/components/layout/site-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is SnackVeda?",
    a: "SnackVeda is a healthy snacking brand from Indore by Narayani Distributors that brings clean, tasty, and wholesome snacks to your doorstep. We offer a wide range of better-for-you snacks sourced from trusted manufacturers and made for modern Indian lifestyles."
  },
  {
    q: "What kind of snacks does SnackVeda offer?",
    a: "SnackVeda offers a wide variety of healthy and tasty snacks for every age group—from kids to adults to seniors. Our range includes Millet Chips, Protein Chips, Roasted Snacks, Makhana, Gud Chana, Protein Bars, Hazelnut Chocolate Laddoo, and Sweet & Savory Functional Snacks. From crunchy namkeen snacks to nourishing sweet treats, there's something for everyone."
  },
  {
    q: "Are SnackVeda products healthy?",
    a: "Yes. SnackVeda products are selected for people who want smarter snacking choices without compromising on taste. Our snacks are better-for-you, guilt-free, wholesome, flavorful, and suitable for everyday snacking. We focus on products that combine nutrition, taste, and convenience in every bite."
  },
  {
    q: "Are SnackVeda snacks 100% vegetarian?",
    a: "Yes, all SnackVeda products are 100% vegetarian. We believe in offering clean and trustworthy snacks that are suitable for every Indian household."
  },
  {
    q: "Are SnackVeda snacks fried?",
    a: "No. SnackVeda focuses on snacks that are baked, roasted, or lightly processed—not deep-fried. This helps us offer lighter and smarter alternatives to traditional snacking."
  },
  {
    q: "Do SnackVeda products contain artificial colors or preservatives?",
    a: "We prioritize clean-label products made with quality ingredients and avoid unnecessary additives wherever possible. Our focus is on simple, honest snacking made with ingredients you can trust."
  },
  {
    q: "Who can eat SnackVeda snacks?",
    a: "SnackVeda snacks are made for everyone—children, working professionals, fitness-conscious adults, and seniors. Whether it's school tiffins, office snacking, evening chai, travel munching, post-workout bites, or guilt-free sweet cravings—SnackVeda has something for every age and lifestyle."
  },
  {
    q: "Are SnackVeda snacks good for kids?",
    a: "Yes, many SnackVeda snacks are great for kids as better alternatives to regular junk food. They are tasty, easy to carry, and ideal for school tiffins or evening munching."
  },
  {
    q: "Are SnackVeda snacks suitable for fitness-conscious people?",
    a: "Yes. Many SnackVeda products such as protein chips, roasted snacks, and protein bars are suitable for people looking for smarter snack options to support active lifestyles."
  },
  {
    q: "Where does SnackVeda source its products from?",
    a: "SnackVeda works with trusted manufacturers and sourcing partners who meet our standards for quality, hygiene, and consistency. We carefully select products made with clean ingredients, better processes, and reliable sourcing."
  },
  {
    q: "What makes SnackVeda different from other snack brands?",
    a: "SnackVeda combines three things modern consumers care about most: better ingredients, better taste, and better snacking choices. We are not just selling snacks—we are building a smarter snacking culture with products that are healthier, tastier, and more trustworthy."
  },
  {
    q: "Do you offer both sweet and savory snacks?",
    a: "Yes. SnackVeda offers both savory and sweet snacking options. From namkeen-style roasted snacks and millet chips to indulgent yet mindful treats like gud chana and hazelnut chocolate laddoo, our range covers both sides of snacking."
  },
  {
    q: "Are SnackVeda snacks suitable for senior citizens?",
    a: "Yes. SnackVeda offers several light, roasted, and easy-to-enjoy snack options that are suitable for seniors looking for mindful everyday snacking."
  },
  {
    q: "Why should I choose SnackVeda?",
    a: "Because SnackVeda makes healthy snacking simple. With clean ingredients, trusted sourcing, better taste, and snacks for every age group, SnackVeda is your everyday partner for smarter, tastier, guilt-free snacking."
  },
];

export default function FAQ() {
  return (
    <SiteShell>
      <div className="bg-muted/30 py-16 border-b">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">Everything you need to know about SnackVeda.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl py-16">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-card border rounded-xl px-6 shadow-sm">
              <AccordionTrigger className="text-left font-medium py-5 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-16 bg-teal-50 border border-teal-100 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-serif font-bold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-4">We're happy to help. Reach out to us directly.</p>
          <a href="mailto:support@snackveda.co.in" className="text-primary font-medium hover:underline">support@snackveda.co.in</a>
        </div>
      </div>
    </SiteShell>
  );
}
