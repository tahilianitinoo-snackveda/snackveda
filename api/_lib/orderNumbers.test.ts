import { describe, expect, it } from "vitest";
import {
  formatEnquiryReference,
  formatInvoiceNumber,
  formatOrderNumber,
  orderNumberPrefix,
} from "./orderNumbers";

describe("orderNumberPrefix", () => {
  it("builds the ND prefix from order type and year", () => {
    expect(orderNumberPrefix("b2c", 2026)).toBe("ND-B2C-2026-");
    expect(orderNumberPrefix("b2b", 2026)).toBe("ND-B2B-2026-");
  });

  it("is shared by formatOrderNumber, so the counting query's LIKE pattern and the formatter can never desynchronise", () => {
    const prefix = orderNumberPrefix("b2c", 2026);
    expect(formatOrderNumber("b2c", 2026, 1).startsWith(prefix)).toBe(true);
  });
});

describe("formatOrderNumber", () => {
  it("uses the ND prefix and an uppercase order type", () => {
    expect(formatOrderNumber("b2c", 2026, 1)).toBe("ND-B2C-2026-0001");
    expect(formatOrderNumber("b2b", 2026, 1)).toBe("ND-B2B-2026-0001");
  });

  it("pads the sequence to four digits and does not truncate beyond them", () => {
    expect(formatOrderNumber("b2c", 2026, 42)).toBe("ND-B2C-2026-0042");
    expect(formatOrderNumber("b2c", 2026, 9999)).toBe("ND-B2C-2026-9999");
    expect(formatOrderNumber("b2c", 2026, 10000)).toBe("ND-B2C-2026-10000");
  });
});

describe("formatInvoiceNumber", () => {
  it("pads the sequence to five digits", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("INV-2026-00001");
    expect(formatInvoiceNumber(2026, 12345)).toBe("INV-2026-12345");
  });

  it("does not truncate at the five-digit boundary", () => {
    expect(formatInvoiceNumber(2026, 99999)).toBe("INV-2026-99999");
    expect(formatInvoiceNumber(2026, 100000)).toBe("INV-2026-100000");
  });
});

describe("formatEnquiryReference", () => {
  it("pads the sequence to four digits", () => {
    expect(formatEnquiryReference(2026, 1)).toBe("RFQ-2026-0001");
    expect(formatEnquiryReference(2026, 137)).toBe("RFQ-2026-0137");
  });

  it("does not share a series with orders, so an enquiry can never be read as one", () => {
    expect(formatEnquiryReference(2026, 1).startsWith("ND-")).toBe(false);
    expect(formatEnquiryReference(2026, 1)).not.toBe(formatOrderNumber("b2b", 2026, 1));
  });
});
