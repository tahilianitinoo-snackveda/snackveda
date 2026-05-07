import { SiteShell } from "@/components/layout/site-shell";

export default function About() {
  return (
    <SiteShell>
      <div className="bg-muted/30 py-16 border-b">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">About SnackVeda</h1>
          <p className="text-muted-foreground text-lg">Proudly Indore-born. Built for better snacking.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-16 space-y-16">

        {/* About */}
        <section className="space-y-4">
          <p className="text-lg leading-relaxed">
            SnackVeda is a proudly Indore-born healthy snacking brand by <strong>Narayani Distributors</strong>, created for people who want snacks that are healthier, tastier, and more trustworthy.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            At SnackVeda, we bring wholesome and delicious snacks straight to your doorstep—carefully sourced from genuine manufacturers who meet our standards for quality, purity, and taste. Every product we offer is selected with one simple promise in mind: <strong>better snacking for better living</strong>.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We believe snacking should never be a compromise. It should be tasty, nourishing, and made with ingredients you can trust.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4">
            {["100% Vegetarian","Pure, quality ingredients","Healthy and guilt-free","Tasty and satisfying","Baked, not fried","Crafted for everyday wellness"].map(item => (
              <div key={item} className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-sm text-teal-800 font-medium text-center">{item}</div>
            ))}
          </div>
        </section>

        {/* Our Range */}
        <section className="bg-card border rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-serif font-bold mb-2">Our Range</h2>
          <p className="text-muted-foreground mb-6">SnackVeda offers a wide and exciting range of snacks for every taste and every age group—from children to adults to seniors.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Millet Chips","Protein Chips","Roasted Snacks","Makhana","Gud Chana","Protein Bars","Hazelnut Chocolate Laddoo","Sweet & Savory Functional Snacks"].map(item => (
              <div key={item} className="bg-muted rounded-xl p-3 text-sm font-medium text-center">{item}</div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-6">Perfect for school tiffins, office breaks, travel munching, post-workout fuel, evening chai, and mindful snacking for seniors.</p>
        </section>

        {/* Mission */}
        <section className="space-y-4">
          <h2 className="text-2xl font-serif font-bold">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            At SnackVeda, our mission is to redefine Indian snacking by making healthy snacks more enjoyable, accessible, and flavorful for every household.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We are here to prove that clean ingredients and great taste can go hand in hand. Healthy snacking should never feel boring or restrictive—it should be exciting, satisfying, and full of flavor in every bite.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Our goal is to build a smarter snacking culture in India where people no longer have to choose between taste and health.
          </p>
        </section>

        {/* Sourcing */}
        <section className="bg-muted/30 rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-serif font-bold">Our Sourcing</h2>
          <p className="text-muted-foreground leading-relaxed">
            We work with trusted manufacturers and sourcing partners who share our commitment to quality, hygiene, and authenticity. Every ingredient is carefully selected to ensure freshness, consistency, and nutritional value.
          </p>
          <div className="grid md:grid-cols-3 gap-4 pt-2">
            {[
              { title: "Quality you can trust", desc: "Every product meets our strict quality standards before it reaches you." },
              { title: "Ingredients you can recognize", desc: "Simple, clean ingredients — no confusing additives." },
              { title: "Freshness in every pack", desc: "Carefully sourced and packaged for maximum freshness." },
            ].map(item => (
              <div key={item.title} className="bg-card border rounded-xl p-4">
                <p className="font-semibold text-primary mb-1">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Promise */}
        <section className="border-t pt-12 space-y-4">
          <h2 className="text-2xl font-serif font-bold">Our Promise</h2>
          <p className="text-muted-foreground leading-relaxed">At SnackVeda, what you see is what you get—honest snacking made simple. We promise snacks that are:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {["100% Vegetarian","Baked, not deep-fried","Clean and genuine ingredients","Free from artificial colors","Free from unnecessary additives","Made for guilt-free everyday snacking"].map(item => (
              <div key={item} className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                <span className="text-green-600 mt-0.5">✓</span>
                <span className="text-sm text-green-800">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-center pt-4 font-medium">No shortcuts. No compromise. No confusing ingredients. Just clean, tasty, and better snacks you can trust.</p>
        </section>

        <div className="text-center py-8 border-t">
          <p className="text-lg font-serif text-primary italic">"SnackVeda is more than a snack brand. It is a smarter way to snack—rooted in trust, powered by taste, and built for modern India."</p>
        </div>
      </div>
    </SiteShell>
  );
}
