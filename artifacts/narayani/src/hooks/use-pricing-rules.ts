import { useQuery } from "@tanstack/react-query";

/**
 * The shop's commercial rules, as set in Admin → Settings.
 *
 * ─── WHY THIS HOOK EXISTS ───────────────────────────────────────────────────
 * "15% first order, 10% second, 5% after" was written out three times: once in
 * `api/_lib/pricing.ts`, which decides what a customer is actually charged, and
 * again in `product-card.tsx` and `product-detail.tsx`, which decide what they are
 * shown. A shop changing its first-order discount and missing one of the three
 * would display one price and charge another — and the customer would find out at
 * the checkout, which is the worst possible moment.
 *
 * `api/_lib/pricing.ts` is the authority. This hook reads the same values it reads,
 * so the display can only ever agree with the total.
 *
 * ─── THE DEFAULTS MATTER ────────────────────────────────────────────────────
 * They are the same numbers `DEFAULT_PRICING_RULES` uses on the server. While the
 * request is in flight, or if it fails, the page shows what the server would
 * charge under the same circumstances — never a zero discount that would flash a
 * higher price at a customer who is entitled to a lower one.
 */
export interface PricingRules {
  discountFirstOrderPercent: number;
  discountSecondOrderPercent: number;
  discountRepeatPercent: number;
  freeShippingThreshold: number;
  shippingCharge: number;
  b2bMinimumOrderValue: number;
}

export const DEFAULT_PRICING_RULES: PricingRules = {
  discountFirstOrderPercent: 15,
  discountSecondOrderPercent: 10,
  discountRepeatPercent: 5,
  freeShippingThreshold: 999,
  shippingCharge: 60,
  b2bMinimumOrderValue: 5000,
};

function read(settings: Record<string, string> | undefined, key: string, fallback: number): number {
  const raw = settings?.[key];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function usePricingRules(): PricingRules {
  const { data } = useQuery<Record<string, string>>({
    // The same key the footer and the analytics loader use, so the settings are
    // fetched once for the whole app rather than once per component that wants them.
    queryKey: ["site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    discountFirstOrderPercent: read(data, "discount_first_order_percent", DEFAULT_PRICING_RULES.discountFirstOrderPercent),
    discountSecondOrderPercent: read(data, "discount_second_order_percent", DEFAULT_PRICING_RULES.discountSecondOrderPercent),
    discountRepeatPercent: read(data, "discount_repeat_percent", DEFAULT_PRICING_RULES.discountRepeatPercent),
    freeShippingThreshold: read(data, "free_shipping_threshold", DEFAULT_PRICING_RULES.freeShippingThreshold),
    shippingCharge: read(data, "shipping_charge", DEFAULT_PRICING_RULES.shippingCharge),
    b2bMinimumOrderValue: read(data, "b2b_minimum_order_value", DEFAULT_PRICING_RULES.b2bMinimumOrderValue),
  };
}

/**
 * The discount a retail customer gets on their next order, given how many they have
 * placed. Mirrors the tier logic in `api/_lib/pricing.ts` exactly — if you change
 * one, change the other, and there is a test on the server side that pins it.
 */
export function discountPercentFor(rules: PricingRules, ordersCount: number): number {
  if (ordersCount === 0) return rules.discountFirstOrderPercent;
  if (ordersCount === 1) return rules.discountSecondOrderPercent;
  return rules.discountRepeatPercent;
}
