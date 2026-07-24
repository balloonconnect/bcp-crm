import PDFDocument from "pdfkit";
import { prisma } from "@bcp/database";
import { getInvoice } from "./invoices.service";

function formatRupees(paise: number): string {
  return `Rs ${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

const DOCUMENT_LABEL: Record<string, string> = { proforma_invoice: "Proforma Invoice", tax_invoice: "Tax Invoice", non_gst_invoice: "Invoice" };

export async function generateInvoicePdf(studioId: string, invoiceId: string): Promise<Buffer> {
  const [invoice, studio] = await Promise.all([getInvoice(studioId, invoiceId), prisma.studio.findUniqueOrThrow({ where: { id: studioId }, select: { name: true } })]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(studio.name);
    doc.fontSize(14).text(DOCUMENT_LABEL[invoice.documentType] ?? "Invoice");
    doc.fontSize(11).fillColor("#666").text(`${invoice.invoiceNumber}  ·  FY ${invoice.financialYear}`);
    doc.fillColor("#000").moveDown();

    if (invoice.dueDate) doc.fontSize(10).text(`Due: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`);
    doc.moveDown();

    doc.fontSize(10).text(`Subtotal: ${formatRupees(invoice.subtotal)}`);
    if (invoice.discountAmount > 0) doc.text(`Discount: -${formatRupees(invoice.discountAmount)}`);
    if (invoice.gstAmount > 0) {
      if (invoice.isInterState) doc.text(`IGST (${invoice.gstRatePercent}%): ${formatRupees(invoice.igstAmount)}`);
      else {
        doc.text(`CGST (${(invoice.gstRatePercent / 2).toFixed(1)}%): ${formatRupees(invoice.cgstAmount)}`);
        doc.text(`SGST (${(invoice.gstRatePercent / 2).toFixed(1)}%): ${formatRupees(invoice.sgstAmount)}`);
      }
    }
    doc.fontSize(12).text(`Total: ${formatRupees(invoice.totalAmount)}`, { underline: true });
    doc.fontSize(10).text(`Paid: ${formatRupees(invoice.amountPaid)}`);
    doc.text(`Outstanding: ${formatRupees(invoice.totalAmount - invoice.amountPaid)}`);
    doc.moveDown();

    if (invoice.installments.length > 0) {
      doc.fontSize(12).text("Payment schedule", { underline: true });
      for (const installment of invoice.installments as Array<{ label: string; amount: number; dueDate: Date }>) {
        doc.fontSize(10).text(`- ${installment.label}: ${formatRupees(installment.amount)} (due ${new Date(installment.dueDate).toLocaleDateString("en-IN")})`);
      }
    }

    doc.end();
  });
}

export async function generateReceiptPdf(studioId: string, paymentId: string): Promise<Buffer> {
  const [payment, studio] = await Promise.all([
    prisma.clientPayment.findFirst({ where: { id: paymentId, studioId }, include: { receipt: true, invoice: { select: { invoiceNumber: true } } } }),
    prisma.studio.findUniqueOrThrow({ where: { id: studioId }, select: { name: true } }),
  ]);
  if (!payment || !payment.receipt) throw new Error("Receipt not found");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(studio.name);
    doc.fontSize(14).text("Payment Receipt");
    doc.fontSize(11).fillColor("#666").text(`${payment.receipt.receiptNumber}  ·  FY ${payment.receipt.financialYear}`);
    doc.fillColor("#000").moveDown();

    doc.fontSize(10).text(`Against invoice: ${payment.invoice.invoiceNumber}`);
    doc.text(`Method: ${payment.method}`);
    doc.text(`Date: ${payment.paidAt.toLocaleDateString("en-IN")}`);
    doc.moveDown();
    doc.fontSize(14).text(`Amount received: ${formatRupees(payment.amount)}`, { underline: true });

    doc.end();
  });
}
