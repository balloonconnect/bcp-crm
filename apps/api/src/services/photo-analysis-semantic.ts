import { AiClient } from "@bcp/ai";
import { SUGGESTED_MOMENT_TAGS } from "@bcp/photo-intelligence";

export class AiNotConfiguredError extends Error {
  readonly code = "AI_NOT_CONFIGURED";
  constructor() {
    super("The AI provider isn't configured for this environment yet.");
    this.name = "AiNotConfiguredError";
  }
}

let client: AiClient | null | undefined;
function getAiClient(): AiClient | null {
  if (client !== undefined) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  client = apiKey ? new AiClient({ apiKey }) : null;
  return client;
}

export interface SemanticAnalysisResult {
  compositionScore: number;
  subjectProminenceScore: number;
  sceneClassification: string;
  momentTags: string[];
  explanation: string;
  confidence: number;
}

const PROMPT = `You are assisting a professional photography studio in reviewing event photos. Look at this photo and assess it purely as a photography-quality judgment, not for any other purpose.

Respond with ONLY a JSON object (no markdown, no prose) with these exact fields:
{
  "compositionScore": <0-100 integer, how well-composed the shot is — framing, rule of thirds, balance>,
  "subjectProminenceScore": <0-100 integer, how clearly the main subject stands out from the background>,
  "sceneClassification": "<a short snake_case label for the scene, e.g. outdoor_ceremony, reception_dancefloor, portrait, candid_details>",
  "momentTags": [<0-3 short snake_case tags from this suggested list if applicable: ${SUGGESTED_MOMENT_TAGS.join(", ")} — or your own if none fit>],
  "explanation": "<one or two sentences explaining your composition/quality assessment, in plain language a studio owner would understand>",
  "confidence": <0-100 integer, your own confidence in this assessment>
}`;

/**
 * The semantic half of the analysis pipeline — composition, subject
 * prominence, scene, and moment tagging all need actual visual
 * understanding, not pixel statistics, which is why this is the one
 * part of the pipeline that calls a vision-capable LLM rather than
 * `sharp`/Rekognition. `explanation` and `confidence` here are what
 * ultimately populate `PhotoAnalysis`'s "every AI result must provide
 * confidence + explanation" fields.
 */
export async function runSemanticAnalysis(imageBytes: Buffer, mimeType: "image/jpeg" | "image/png" | "image/webp"): Promise<SemanticAnalysisResult> {
  const ai = getAiClient();
  if (!ai) throw new AiNotConfiguredError();

  const response = await ai.completeWithImage(PROMPT, imageBytes.toString("base64"), mimeType, 500);

  try {
    const cleaned = response.replace(/^```json\s*|```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<SemanticAnalysisResult>;
    return {
      compositionScore: clampScore(parsed.compositionScore),
      subjectProminenceScore: clampScore(parsed.subjectProminenceScore),
      sceneClassification: parsed.sceneClassification ?? "unclassified",
      momentTags: Array.isArray(parsed.momentTags) ? parsed.momentTags.slice(0, 5) : [],
      explanation: parsed.explanation ?? "No explanation returned.",
      confidence: clampScore(parsed.confidence, 50),
    };
  } catch {
    // A malformed response is still handled honestly — a low-confidence, clearly-labeled fallback, never a thrown error that would silently skip an analysis the pipeline is supposed to always produce.
    return { compositionScore: 50, subjectProminenceScore: 50, sceneClassification: "unclassified", momentTags: [], explanation: "The AI's response couldn't be parsed; this is a fallback assessment.", confidence: 10 };
  }
}

function clampScore(value: number | undefined, fallback = 50): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}
