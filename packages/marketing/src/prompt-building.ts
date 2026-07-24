import { getContentTypeDefinition } from "./content-types";
import { getLanguageLabel } from "./languages";

export interface MarketingGenerationInputs {
  service?: string;
  city?: string;
  targetAudience?: string;
  tone?: string;
  offer?: string;
  platform?: string;
}

export interface BrandVoiceContext {
  toneDescription?: string | null;
  keyPhrases?: string[];
  avoidPhrases?: string[];
  examples?: string[]; // up to a handful of the studio's own saved approved examples for this content type
}

/**
 * Composes the full generation prompt from every input the brief
 * names: studio brand voice, service, city, target audience, language,
 * tone, offer, platform. Saved brand examples (when any exist for this
 * content type) are included as few-shot material — the mechanism that
 * actually makes "studio brand voice" a genuine, improving-over-time
 * input rather than a static tone description repeated forever.
 */
export function buildGenerationPrompt(contentTypeKey: string, languageKey: string, inputs: MarketingGenerationInputs, brandVoice: BrandVoiceContext): string {
  const contentType = getContentTypeDefinition(contentTypeKey);
  if (!contentType) throw new Error(`Unknown content type: ${contentTypeKey}`);

  const lines: string[] = [
    `Write ${contentType.label.toLowerCase()} content for a photography studio.`,
    contentType.guidance,
    `Language: ${getLanguageLabel(languageKey)}. Write entirely in this language (not transliterated English) unless it is English.`,
  ];

  if (inputs.service) lines.push(`Service: ${inputs.service}`);
  if (inputs.city) lines.push(`City: ${inputs.city}`);
  if (inputs.targetAudience) lines.push(`Target audience: ${inputs.targetAudience}`);
  if (inputs.tone) lines.push(`Tone: ${inputs.tone}`);
  if (inputs.offer) lines.push(`Offer to mention: ${inputs.offer}`);
  if (inputs.platform) lines.push(`Platform: ${inputs.platform}`);

  if (brandVoice.toneDescription) lines.push(`Studio brand voice: ${brandVoice.toneDescription}`);
  if (brandVoice.keyPhrases && brandVoice.keyPhrases.length > 0) lines.push(`Phrases this studio likes to use where natural: ${brandVoice.keyPhrases.join(", ")}`);
  if (brandVoice.avoidPhrases && brandVoice.avoidPhrases.length > 0) lines.push(`Avoid these words/phrases entirely: ${brandVoice.avoidPhrases.join(", ")}`);

  if (brandVoice.examples && brandVoice.examples.length > 0) {
    lines.push("Here are examples of this studio's approved voice for this content type — match this style closely:");
    brandVoice.examples.forEach((example, i) => lines.push(`Example ${i + 1}: ${example}`));
  }

  lines.push("Return only the content itself, no preamble or explanation.");

  return lines.join("\n");
}
