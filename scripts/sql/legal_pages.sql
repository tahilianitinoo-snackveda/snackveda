-- legal_pages — the policy documents, moved out of the code and into the database.
--
-- Spec point 49. The five policies were JSX in artifacts/narayani/src/pages/
-- policies.tsx, so changing a refund window or a delivery timeline meant a code
-- change and a deploy. These are the documents most likely to need editing by a
-- non-developer and they were the hardest to edit in the whole site.
--
-- SEEDED WITH THE EXACT TEXT THAT IS LIVE TODAY
-- Every word below is transcribed from the current policies page. Nothing is
-- reworded, softened or "improved" — these are the terms customers have already
-- agreed to, and rewriting them in a migration would change the contract silently.
-- Markdown, rendered by the same renderMarkdown() the blog uses.
--
-- Idempotent: ON CONFLICT DO NOTHING, so re-running never overwrites an edit the
-- business has since made in the admin.

BEGIN;

CREATE TABLE IF NOT EXISTS legal_pages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text        NOT NULL UNIQUE,
  title      text        NOT NULL,
  content    text        NOT NULL,
  sort_order integer     NOT NULL DEFAULT 0,
  published  boolean     NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_pages_sort_idx ON legal_pages (sort_order, slug);

INSERT INTO legal_pages (slug, title, sort_order, content) VALUES
('cancellation', 'Cancellation & Refund', 1, $md$
## Cancellation Policy

At Narayani Distributors, we strive to process and dispatch orders quickly to ensure timely delivery of fresh products. Therefore:

- Orders can be cancelled only before dispatch.
- Once the order has been shipped, cancellation requests will not be accepted.
- To request a cancellation, customers must contact us immediately via email or customer support.

## Refund Policy

Refunds are applicable only under the following conditions:

- Product received is damaged during transit
- Wrong product delivered
- Product package is tampered with before delivery
- Order not delivered due to our fault

## Non-Refundable Situations

Refunds will not be applicable for:

- Taste preferences or personal dislike
- Slight variation in packaging/design
- Delay caused by courier or unforeseen circumstances
- Incorrect address or phone number provided by customer

## Refund Process

- Customers must report issues within 48 hours of delivery.
- Supporting images/videos may be requested.
- Approved refunds will be processed within 5–7 business days to the original payment method.
$md$),

('delivery', 'Delivery Policy', 2, $md$
## Shipping Locations

Narayani Distributors currently delivers across India.

## Dispatch Timeline

- Orders are generally dispatched within 1–3 business days.
- Bulk or special orders may require additional processing time.

## Delivery Timeline

- **Metro Cities** — 3–5 business days
- **Other Cities/Towns** — 5–8 business days
- **Remote Areas** — 7–10 business days

## Delivery Delays

Delivery timelines may vary due to weather conditions, courier delays, public holidays, or natural calamities. Narayani Distributors shall not be held liable for delays caused by third-party logistics providers.

## Order Tracking

Customers will receive tracking details via email/SMS once the order is shipped.
$md$),

('terms', 'Terms & Conditions', 3, $md$
Welcome to Narayani Distributors. By using this website, you agree to the following terms and conditions.

## Product Information

We aim to ensure all product descriptions, pricing, and images are accurate. However, minor variations may occur, product availability may change without prior notice, and prices are subject to change at any time.

## Use of Website

Users agree not to misuse the website, not to attempt unauthorized access, and not to use the website for unlawful purposes.

## Intellectual Property

All content on this website including logos, product images, graphics, text, and designs are the property of Narayani Distributors and may not be copied or reproduced without permission.

## Limitation of Liability

Narayani Distributors shall not be liable for indirect or incidental damages, loss due to delayed delivery, or allergic reactions caused by ingredients listed on packaging. Customers are advised to read ingredient and nutritional information carefully before consumption.

## Governing Law

These terms shall be governed by the laws of India.
$md$),

('privacy', 'Privacy Policy', 4, $md$
At Narayani Distributors, customer privacy is important to us.

## Information We Collect

- Name, phone number, email address
- Shipping/Billing address
- Payment information
- Device/browser information

## How We Use Information

- Order processing and delivery updates
- Customer support
- Marketing communication
- Improving website experience

## Payment Security

We do not store card or banking details on our servers. Payments are processed securely through trusted third-party payment gateways.

## Data Sharing

We do not sell customer data. Information may only be shared with courier partners, payment gateways, or government authorities if legally required.

## User Rights

Customers may request correction or deletion of their personal data by contacting us at support@narayanidistributors.com.
$md$),

('cookies', 'Cookie Policy', 5, $md$
This site uses cookies and similar browser storage. What is set depends on how the site is configured and on what you do here.

## Always used

- **Your session** — so you stay signed in between pages, and so your cart survives a reload. Without these the site cannot work.
- **Your preferences** — small values remembering things like which category you were browsing.

## Used only when analytics is switched on

The site loads no analytics or advertising script at all unless a measurement ID has been configured. When one has been:

- **Google Analytics** — how many people visit, which pages they read, and which routes lead to an order or an enquiry.
- **Meta and LinkedIn tags** — where configured, so advertising can be measured against the enquiries it produces.

We do not send your name, email address, phone number or postal address to any of these services.

## Managing cookies

Every browser can block or clear cookies for a site. Blocking the session cookies will stop sign-in and the cart from working; blocking the analytics ones will not affect anything you can see.
$md$),

('services', 'Our Services', 6, $md$
Narayani Distributors is a merchant exporter and distributor of Indian packaged foods, sourcing premium-quality snacks made with better ingredients by selected manufacturers and brands.

## We Offer

- Healthy snacks and munchies
- Makhana products
- Millet-based snacks
- Gud Chana varieties
- Roasted and flavored snacks
- Bulk and wholesale supply
- Retail and online orders

## Business Services

- Distributor partnerships
- Retail store supply
- Modern trade supply
- Corporate and bulk gifting solutions
$md$)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
