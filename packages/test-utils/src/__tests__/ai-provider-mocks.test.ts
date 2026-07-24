import { describe, expect, it } from "vitest";
import { MockFaceRecognitionProvider, MockAiClient } from "../ai-provider-mocks";

describe("MockFaceRecognitionProvider", () => {
  it("indexes and later finds faces within the same collection", async () => {
    const provider = new MockFaceRecognitionProvider();
    const indexed = await provider.indexFacesInImage("collection-1", Buffer.from(""));
    const matches = await provider.searchFacesByImage("collection-1", Buffer.from(""), 5);
    expect(matches.map((m) => m.providerFaceId)).toEqual(indexed.map((f) => f.providerFaceId));
  });

  it("never returns a match for a different collection — the same no-cross-gallery-search guarantee the real provider enforces", async () => {
    const provider = new MockFaceRecognitionProvider();
    await provider.indexFacesInImage("collection-1", Buffer.from(""));
    const matches = await provider.searchFacesByImage("collection-2", Buffer.from(""), 5);
    expect(matches).toEqual([]);
  });

  it("removes a deleted face from subsequent searches", async () => {
    const provider = new MockFaceRecognitionProvider();
    const [face] = await provider.indexFacesInImage("collection-1", Buffer.from(""));
    await provider.deleteFace("collection-1", face!.providerFaceId);
    const matches = await provider.searchFacesByImage("collection-1", Buffer.from(""), 5);
    expect(matches).toEqual([]);
  });
});

describe("MockAiClient", () => {
  it("returns a configured completion instead of a real model call", async () => {
    const client = new MockAiClient({ complete: "Configured response" });
    expect(await client.complete("any prompt")).toBe("Configured response");
  });

  it("returns a configured tool-call response", async () => {
    const client = new MockAiClient({ completeWithTools: { text: "", toolCalls: [{ id: "1", name: "list_events", input: {} }], stopReason: "tool_use" } });
    const result = await client.completeWithTools();
    expect(result.toolCalls[0]!.name).toBe("list_events");
  });
});
