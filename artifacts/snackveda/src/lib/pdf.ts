import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "@workspace/api-client-react";
import { formatINR, formatDate } from "./format";

export function generateInvoicePdf(invoice: Invoice) {
  const doc = new jsPDF();
  
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(30, 41, 59); // dark slate
  doc.text("SnackVeda", 14, 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate 500
  doc.text("by Narayani Distributors", 14, 26);
  
  // Seller Info (Right aligned)
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const seller = invoice.seller;
  doc.text(seller.name, 196, 20, { align: "right" });
  doc.text(seller.addressLine1, 196, 25, { align: "right" });
  doc.text(`${seller.city}, ${seller.state} ${seller.pincode}`, 196, 30, { align: "right" });
  if (seller.gstNumber) doc.text(`GSTIN: ${seller.gstNumber}`, 196, 35, { align: "right" });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 42, 196, 42);

  // Invoice Details
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE TO:", 14, 52);
  
  doc.setFont("helvetica", "normal");
  doc.text(invoice.customerName, 14, 58);
  doc.text(invoice.shippingAddress.line1, 14, 63);
  if (invoice.shippingAddress.line2) doc.text(invoice.shippingAddress.line2, 14, 68);
  const cityLineY = invoice.shippingAddress.line2 ? 73 : 68;
  doc.text(`${invoice.shippingAddress.city}, ${invoice.shippingAddress.state} ${invoice.shippingAddress.pincode}`, 14, cityLineY);
  doc.text(`Phone: ${invoice.shippingAddress.phone}`, 14, cityLineY + 5);
  if (invoice.customerGst) doc.text(`GSTIN: ${invoice.customerGst}`, 14, cityLineY + 10);

  // Invoice Meta
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice No:`, 120, 52);
  doc.text(`Order No:`, 120, 58);
  doc.text(`Date:`, 120, 64);
  
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoiceNumber, 150, 52);
  doc.text(invoice.orderNumber, 150, 58);
  doc.text(formatDate(invoice.invoiceDate), 150, 64);

  // Items Table
  const tableData = invoice.items.map(item => [
    item.name,
    item.hsnCode,
    item.quantity.toString(),
    formatINR(item.unitPrice),
    `${item.gstRate}%`,
    formatINR(item.gstAmount),
    formatINR(item.totalAmount)
  ]);

  const startY = cityLineY + 20;

  autoTable(doc, {
    startY,
    head: [["Item Description", "HSN", "Qty", "Unit ₹", "GST %", "GST ₹", "Total ₹"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [44, 62, 80] }, // Primary dark
    styles: { fontSize: 9 },
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "right" }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals Box
  const totalsX = 130;
  doc.setFontSize(10);
  
  const drawTotalLine = (label: string, value: number, y: number, isBold = false) => {
    if (isBold) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(label, totalsX, y);
    doc.text(formatINR(value), 196, y, { align: "right" });
  };

  let currentY = finalY;
  drawTotalLine("Subtotal", invoice.totals.subtotal, currentY);
  currentY += 7;
  
  if (invoice.totals.discount > 0) {
    drawTotalLine("Discount", -invoice.totals.discount, currentY);
    currentY += 7;
  }
  
  drawTotalLine("Taxable Amount", invoice.totals.taxableAmount, currentY);
  currentY += 7;
  drawTotalLine("Total GST", invoice.totals.totalGst, currentY);
  currentY += 7;
  drawTotalLine("Shipping", invoice.totals.shipping, currentY);
  currentY += 10;
  
  // Grand Total Box
  doc.setFillColor(241, 245, 249);
  doc.rect(totalsX - 5, currentY - 6, 80, 10, "F");
  drawTotalLine("Grand Total", invoice.totals.grandTotal, currentY, true);

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  const pageHeight = doc.internal.pageSize.height;
  doc.text("Thank you for your order — Operated by Narayani Distributors", 105, pageHeight - 15, { align: "center" });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
