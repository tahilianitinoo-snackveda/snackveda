import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "@workspace/api-client-react";
import { formatINR, formatDate } from "./format";

export function generateInvoicePdf(invoice: Invoice) {
  const doc = new jsPDF();
  const order = invoice.order;
  const seller = invoice.seller;
  const addr = order.shippingAddress;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(30, 41, 59);
  doc.text("Narayani Distributors", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  /*
    The seller block is built from whatever Admin → Settings has been filled in.
    Every line below the name is CONDITIONAL, and that is the whole point.

    These fields used to be hardcoded, and what was hardcoded was fiction — the
    GSTIN was "23AAAAA0000A1Z5", the format example out of the GST documentation,
    printed on real tax invoices. They now come from site_settings, and a field
    the business has not entered is omitted rather than printed as "undefined" or
    filled with a plausible placeholder. An invoice with a missing GSTIN line is a
    gap someone notices and fixes; an invoice with an invented one is not.

    Lines are laid out as a list rather than at fixed y positions, so omitting one
    closes the gap instead of leaving a hole in the header.
  */
  const s = seller as typeof seller & {
    address?: string; email?: string; phone?: string; gstNumber?: string;
    pan?: string; fssai?: string; iec?: string;
  };
  const sellerLines = [
    s.name,
    s.address,
    s.email,
    s.phone,
    s.gstNumber ? `GSTIN: ${s.gstNumber}` : "",
    s.fssai ? `FSSAI: ${s.fssai}` : "",
    s.iec ? `IEC: ${s.iec}` : "",
  ].filter((line): line is string => Boolean(line && String(line).trim()));

  let sellerY = 20;
  for (const line of sellerLines) {
    doc.text(line, 196, sellerY, { align: "right" });
    sellerY += 5;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, Math.max(42, sellerY + 2), 196, Math.max(42, sellerY + 2));

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE TO:", 14, 52);

  doc.setFont("helvetica", "normal");
  const customerName = order.user?.fullName || "Customer";
  doc.text(customerName, 14, 58);
  if (addr) {
    doc.text(addr.line1, 14, 63);
    let addrY = 68;
    if (addr.line2) {
      doc.text(addr.line2, 14, addrY);
      addrY += 5;
    }
    doc.text(`${addr.city}, ${addr.state} ${addr.pincode}`, 14, addrY);
    doc.text(`Phone: ${addr.phone}`, 14, addrY + 5);
  }

  doc.setFont("helvetica", "bold");
  doc.text("Invoice No:", 120, 52);
  doc.text("Order No:", 120, 58);
  doc.text("Date:", 120, 64);

  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber, 150, 52);
  doc.text(order.orderNumber, 150, 58);
  doc.text(formatDate(invoice.issuedAt), 150, 64);

  const tableData = order.items.map((item: any) => [
    item.name || item.productName,
    item.hsnCode,
    item.quantity.toString(),
    formatINR(item.unitPrice),
    `${item.gstPercent}%`,
    formatINR(item.gstAmount),
    formatINR(item.lineTotal),
  ]);

  // Below whichever block runs longer — the customer address on the left or the
  // seller block on the right, which now varies with how much has been filled in.
  const startY = Math.max(addr ? 90 : 80, sellerY + 12);

  autoTable(doc, {
    startY,
    head: [["Item Description", "HSN", "Qty", "Unit ₹", "GST %", "GST ₹", "Total ₹"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [44, 62, 80] },
    styles: { fontSize: 9 },
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  const totalsX = 130;
  doc.setFontSize(10);

  const drawTotalLine = (label: string, value: number, y: number, isBold = false) => {
    if (isBold) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(label, totalsX, y);
    doc.text(formatINR(value), 196, y, { align: "right" });
  };

  let currentY = finalY;
  drawTotalLine("Subtotal", order.subtotal, currentY);
  currentY += 7;

  if (order.discountAmount > 0) {
    drawTotalLine("Discount", -order.discountAmount, currentY);
    currentY += 7;
  }

  const taxableAmount = order.subtotal - order.discountAmount;
  drawTotalLine("Taxable Amount", taxableAmount, currentY);
  currentY += 7;
  drawTotalLine("Total GST", order.gstAmount, currentY);
  currentY += 7;
  if (order.shippingCharge > 0) {
    drawTotalLine("Shipping", order.shippingCharge, currentY);
    currentY += 7;
  }
  currentY += 3;

  doc.setFillColor(241, 245, 249);
  doc.rect(totalsX - 5, currentY - 6, 80, 10, "F");
  drawTotalLine("Grand Total", order.totalAmount, currentY, true);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const pageHeight = doc.internal.pageSize.height;
  doc.text("Thank you for your order", 105, pageHeight - 15, { align: "center" });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Wholesale & export catalogue — spec point 20.
 *
 * ─── NO TRADE PRICES IN HERE ───────────────────────────────────────────────
 * The catalogue is handed to anyone who fills in a three-field form, so it is a
 * public document in every sense that matters. `b2bPrice` is not in the payload
 * the API returns for it and must never be added: the trade price list is quoted
 * against an enquiry, and a PDF full of wholesale rates circulating among buyers
 * and competitors cannot be recalled.
 *
 * ─── EVERY FIGURE COMES FROM THE DATABASE ──────────────────────────────────
 * Company registrations come from site_settings and are printed only when the
 * business has entered them, exactly as on the invoice, the footer and /quality.
 * No MOQ appears anywhere: it is agreed per enquiry now, and a number printed in
 * a PDF that circulates for a year is the worst possible place to state one.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface CataloguePayload {
  generatedAt: string;
  company: Record<string, string>;
  products: Array<{
    name: string;
    category: string;
    variant?: string | null;
    brand?: string | null;
    weightGrams: number;
    cartonQty: number;
    shelfLifeMonths: number;
    hsnCode: string;
    gstPercent: number;
    b2cPrice: number;
    mrp?: number | null;
  }>;
}

const CATEGORY_TITLE: Record<string, string> = {
  healthy_chips: "Healthy Chips",
  makhana: "Makhana",
  superpuffs: "Superpuffs",
};

export function generateCataloguePdf(data: CataloguePayload) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(27, 32, 44);
  doc.text("Narayani Distributors", 14, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(37, 55, 141);
  doc.text("Wholesale & Export Catalogue", 14, 33);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Merchant Exporter | Distributor | Indian Food Products", 14, 40);

  // Company block, right-aligned. Only what has actually been entered.
  const c = data.company;
  const companyLines = [
    c.registered_address,
    c.support_email,
    c.support_phone,
    c.gstin ? `GSTIN: ${c.gstin}` : "",
    c.fssai ? `FSSAI: ${c.fssai}` : "",
    c.iec ? `IEC: ${c.iec}` : "",
    c.apeda_rcmc ? `APEDA RCMC: ${c.apeda_rcmc}` : "",
  ].filter((l): l is string => Boolean(l && l.trim()));

  let y = 24;
  doc.setFontSize(8);
  for (const line of companyLines) {
    doc.text(line, pageWidth - 14, y, { align: "right" });
    y += 4.5;
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 46, pageWidth - 14, 46);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Narayani Distributors is a merchant exporter and distributor. Products are sourced from selected Indian manufacturers and brands; we do not manufacture.",
    14,
    52,
    { maxWidth: pageWidth - 28 }
  );

  // One table per category, so a buyer can find a range rather than scan a list.
  const byCategory = new Map<string, CataloguePayload["products"]>();
  for (const p of data.products) {
    const key = p.category;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }

  let startY = 62;
  for (const [category, items] of byCategory) {
    autoTable(doc, {
      startY,
      head: [[
        { content: CATEGORY_TITLE[category] ?? category, colSpan: 7, styles: { halign: "left", fontSize: 11 } },
      ], [
        "Product", "Brand", "Pack", "Net wt", "Carton", "Shelf life", "HSN",
      ]],
      body: items.map((p) => [
        p.name,
        p.brand || "—",
        p.variant || "—",
        `${p.weightGrams} g`,
        `${p.cartonQty}`,
        `${p.shelfLifeMonths} mo`,
        p.hsnCode,
      ]),
      theme: "striped",
      headStyles: { fillColor: [37, 55, 141], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });
    startY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer on every page, with the enquiry route — the catalogue's only job is to
  // produce an enquiry, so the address to send one to belongs on each page.
  const pages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Minimum order quantities apply to wholesale and export, agreed per enquiry. Prices are indicative retail and exclude GST.",
      14,
      pageHeight - 14,
      { maxWidth: pageWidth - 28 }
    );
    doc.text(
      `Enquiries: ${c.support_email || "narayanidistributors.com/request-a-quote"}   |   Page ${i} of ${pages}`,
      14,
      pageHeight - 9
    );
  }

  doc.save(`Narayani-Distributors-Catalogue-${data.generatedAt.slice(0, 10)}.pdf`);
}
