export interface RawMatch {
  providerFaceId: string;
  confidence: number;
}

/** Filters raw provider matches down to the gallery's own configured confidence threshold — kept as logic here, not in the provider call itself, so every provider implementation (Rekognition today, anything else later) is judged by the exact same threshold rule rather than each provider interpreting "confident enough" its own way. */
export function filterByConfidence(matches: RawMatch[], thresholdPercent: number): RawMatch[] {
  return matches.filter((m) => m.confidence >= thresholdPercent).sort((a, b) => b.confidence - a.confidence);
}
