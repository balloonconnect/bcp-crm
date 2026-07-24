import type { FaceRecognitionProvider, IndexedFace, FaceMatchResult, DetectedFaceQuality, FaceAttributes } from "@bcp/face-recognition";

/**
 * "AI provider mocks" — deterministic stand-ins for the two AI-SDK
 * provider interfaces this platform depends on
 * (`FaceRecognitionProvider` and Claude's `AiClient`), so every test
 * that exercises AI-adjacent business logic (face search flows, photo
 * intelligence, the Copilot's tool loop, marketing content generation)
 * can run without live AWS/Anthropic credentials and without
 * network calls — and, just as importantly, without the
 * non-determinism a real model's output would introduce into an
 * assertion.
 */
export class MockFaceRecognitionProvider implements FaceRecognitionProvider {
  public indexedFaces: Map<string, IndexedFace[]> = new Map();
  public deletedCollections: string[] = [];

  async createCollection(_collectionId: string): Promise<void> {}

  async deleteCollection(collectionId: string): Promise<void> {
    this.deletedCollections.push(collectionId);
  }

  async indexFacesInImage(collectionId: string, _imageBytes: Buffer): Promise<IndexedFace[]> {
    const faces: IndexedFace[] = [{ providerFaceId: `mock-face-${Math.random().toString(36).slice(2)}`, boundingBox: { left: 0.1, top: 0.1, width: 0.2, height: 0.2 }, confidence: 99.5 }];
    this.indexedFaces.set(collectionId, [...(this.indexedFaces.get(collectionId) ?? []), ...faces]);
    return faces;
  }

  async detectFaces(_imageBytes: Buffer): Promise<{ faceCount: number; quality: DetectedFaceQuality | null }> {
    return { faceCount: 1, quality: { sharpness: 90, brightness: 80 } };
  }

  async detectFaceAttributes(_imageBytes: Buffer): Promise<FaceAttributes[]> {
    return [{ smileDetected: true, eyesOpen: true, confidence: 98.1 }];
  }

  async searchFacesByImage(collectionId: string, _imageBytes: Buffer, _maxResults: number): Promise<FaceMatchResult[]> {
    const indexed = this.indexedFaces.get(collectionId) ?? [];
    return indexed.map((f) => ({ providerFaceId: f.providerFaceId, confidence: 96.2 }));
  }

  async deleteFace(collectionId: string, providerFaceId: string): Promise<void> {
    const existing = this.indexedFaces.get(collectionId) ?? [];
    this.indexedFaces.set(collectionId, existing.filter((f) => f.providerFaceId !== providerFaceId));
  }
}

/** A deterministic stand-in for `@bcp/ai`'s `AiClient` — every call returns a fixed, configurable response instead of a real Claude completion, so tests assert against known output rather than whatever the model happens to say this run. */
export class MockAiClient {
  constructor(private responses: { complete?: string; completeWithTools?: { text: string; toolCalls: { id: string; name: string; input: Record<string, unknown> }[]; stopReason: string | null } } = {}) {}

  async complete(_prompt: string, _maxTokens?: number): Promise<string> {
    return this.responses.complete ?? "Mock completion response.";
  }

  async completeWithTools(): Promise<{ text: string; toolCalls: { id: string; name: string; input: Record<string, unknown> }[]; stopReason: string | null }> {
    return this.responses.completeWithTools ?? { text: "Mock response.", toolCalls: [], stopReason: "end_turn" };
  }
}
