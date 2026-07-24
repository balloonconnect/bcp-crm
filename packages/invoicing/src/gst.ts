export interface GstSplit {
  gstAmount: number; // paise, total
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

/**
 * Splits total GST into CGST+SGST (intra-state — the studio and client
 * are in the same state, so tax is shared between central and state
 * governments) or IGST (inter-state — one combined central tax) based
 * on `isInterState`. Intra-state splits the rate evenly in half each;
 * inter-state applies the full rate as IGST. This is standard Indian
 * GST mechanics, not a studio-specific policy choice.
 */
export function computeGstSplit(taxableAmount: number, gstRatePercent: number, isInterState: boolean): GstSplit {
  const gstAmount = Math.round((taxableAmount * gstRatePercent) / 100);

  if (isInterState) {
    return { gstAmount, cgstAmount: 0, sgstAmount: 0, igstAmount: gstAmount };
  }

  const half = Math.round(gstAmount / 2);
  return { gstAmount, cgstAmount: half, sgstAmount: gstAmount - half, igstAmount: 0 };
}
