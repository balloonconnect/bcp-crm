import PDFDocument from "pdfkit";
import { prisma } from "@bcp/database";
import { getCustomerFacingQuotationView } from "./quotations.service";

function formatRupees(paise: number): string {
  return `Rs ${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Renders a quotation to PDF bytes, built *entirely* from
 * `getCustomerFacingQuotationView()` — never from the raw
 * `QuotationLineItem` rows — so this function structurally cannot leak
 * an internal service price into a document a client receives. See
 * docs/services-and-packages.md and docs/quotation-management.md for
 * why this indirection is the whole point.
 */
export async function generateQuotationPdf(studioId: string, quotationId: string): Promise<Buffer> {
  const [view, studio] = await Promise.all([
    getCustomerFacingQuotationView(studioId, quotationId),
    prisma.studio.findUniqueOrThrow({ where: { id: studioId }, select: { name: true } }),
  ]);
  const studioName = studio.name;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(studioName, { continued: false });
    doc.moveDown(0.3);
    doc.fontSize(14).text(`Quotation ${view.quotationNumber}`);
    doc.fontSize(10).fillColor("#666").text(`Status: ${view.status}`);
    if (view.validUntil) doc.text(`Valid until: ${new Date(view.validUntil).toLocaleDateString("en-IN")}`);
    doc.fillColor("#000").moveDown();

    doc.fontSize(12).text("Included", { underline: true });
    doc.moveDown(0.3);
    for (const item of view.lineItems) {
      const qtyLabel = item.quantity > 1 ? ` x${item.quantity}` : "";
      const priceLabel = item.lineTotal !== undefined ? `  ${formatRupees(item.lineTotal)}` : "";
      doc.fontSize(10).text(`- ${item.name}${qtyLabel}${priceLabel}`);
    }
    doc.moveDown();

    doc.fontSize(12).text("Summary", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Subtotal: ${formatRupees(view.subtotal)}`);
    if (view.discountAmount > 0) doc.text(`Discount: -${formatRupees(view.discountAmount)}`);
    if (view.gstAmount > 0) doc.text(`GST (${view.gstRatePercent}%): ${formatRupees(view.gstAmount)}`);
    doc.fontSize(12).text(`Total: ${formatRupees(view.totalAmount)}`, { underline: true });
    doc.moveDown();

    if (view.paymentSchedule.length > 0) {
      doc.fontSize(12).text("Payment schedule", { underline: true });
      doc.moveDown(0.3);
      for (const item of view.paymentSchedule) {
        doc.fontSize(10).text(`- ${item.label}: ${item.percentage}% (${formatRupees(item.amount)})`);
      }
      doc.moveDown();
    }

    if (view.termsText) {
      doc.fontSize(12).text("Terms", { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#444").text(view.termsText);
    }

    doc.end();
  });
}
