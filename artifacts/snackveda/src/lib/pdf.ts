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
  doc.text("SnackVeda", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("by Narayani Distributors", 14, 26);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(seller.name, 196, 20, { align: "right" });
  doc.text(seller.address, 196, 25, { align: "right" });
  doc.text(seller.email, 196, 30, { align: "right" });
  doc.text(`GSTIN: ${seller.gstin}`, 196, 35, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 42, 196, 42);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE TO:", 14, 52);

  doc.setFont("helvetica", "normal");
  doc.text(order.customerName, 14, 58);
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

  const tableData = order.items.map((item) => [
    item.productName,
    item.hsnCode,
    item.quantity.toString(),
    formatINR(item.unitPrice),
    `${item.gstPercent}%`,
    formatINR(item.gstAmount),
    formatINR(item.lineTotal),
  ]);

  const startY = addr ? 90 : 80;

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
  doc.text("Thank you for your order — Operated by Narayani Distributors", 105, pageHeight - 15, { align: "center" });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
