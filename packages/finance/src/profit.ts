export interface EventProfitInput {
  revenue: number; // paise — what the client actually paid (or is booked to pay) for this event/booking
  directCost: number; // paise — internal service cost (Booking.internalCost) + expenses tagged to this specific event
}

export interface EventProfitResult {
  revenue: number;
  directCost: number;
  grossProfit: number;
  grossMarginPercent: number; // 0-100, relative to revenue
}

/** Gross profit is revenue minus the costs directly attributable to *this* event — the booking's own service cost plus any expense explicitly tagged to it. It deliberately excludes studio-wide overhead (rent, salaries not tied to one shoot), which is what separates it from net profit. */
export function computeEventGrossProfit(input: EventProfitInput): EventProfitResult {
  const grossProfit = input.revenue - input.directCost;
  const grossMarginPercent = input.revenue > 0 ? (grossProfit / input.revenue) * 100 : 0;
  return { revenue: input.revenue, directCost: input.directCost, grossProfit, grossMarginPercent };
}

export interface NetProfitInput {
  grossProfit: number; // paise
  allocatedOverhead: number; // paise — a share of studio-wide (non-event-specific) expenses attributed to this event
}

export interface NetProfitResult {
  grossProfit: number;
  allocatedOverhead: number;
  netProfit: number;
  netMarginPercent: number; // 0-100, relative to revenue if provided, else relative to gross profit's implied base
}

/** Net profit subtracts a share of overhead that isn't tied to any one event — how that share is calculated (even split, revenue-proportional, etc.) is a studio-level policy decision left to the caller; this function only does the subtraction once that number is decided. */
export function computeNetProfit(input: NetProfitInput, revenue?: number): NetProfitResult {
  const netProfit = input.grossProfit - input.allocatedOverhead;
  const base = revenue ?? input.grossProfit + input.allocatedOverhead;
  const netMarginPercent = base > 0 ? (netProfit / base) * 100 : 0;
  return { grossProfit: input.grossProfit, allocatedOverhead: input.allocatedOverhead, netProfit, netMarginPercent };
}

/** Studio-wide gross/net profit across a period — the same two functions above, applied once to totals rather than per event, so "this month's profit" and "this event's profit" are computed by the exact same logic. */
export function computeStudioProfitSummary(totalRevenue: number, totalDirectCost: number, totalOverhead: number) {
  const gross = computeEventGrossProfit({ revenue: totalRevenue, directCost: totalDirectCost });
  const net = computeNetProfit({ grossProfit: gross.grossProfit, allocatedOverhead: totalOverhead }, totalRevenue);
  return { ...gross, ...net };
}
