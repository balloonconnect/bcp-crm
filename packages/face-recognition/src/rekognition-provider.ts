import {
  RekognitionClient,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  IndexFacesCommand,
  DetectFacesCommand,
  SearchFacesByImageCommand,
  DeleteFacesCommand,
} from "@aws-sdk/client-rekognition";
import type { FaceRecognitionProvider, IndexedFace, DetectedFaceQuality, FaceMatchResult, FaceAttributes } from "./provider";

export interface RekognitionConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** The concrete AWS Rekognition implementation of `FaceRecognitionProvider` — the only place this package touches the AWS SDK. */
export class RekognitionProvider implements FaceRecognitionProvider {
  private client: RekognitionClient;

  constructor(config: RekognitionConfig) {
    this.client = new RekognitionClient({ region: config.region, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  }

  async createCollection(collectionId: string): Promise<void> {
    await this.client.send(new CreateCollectionCommand({ CollectionId: collectionId }));
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.client.send(new DeleteCollectionCommand({ CollectionId: collectionId }));
  }

  async indexFacesInImage(collectionId: string, imageBytes: Buffer): Promise<IndexedFace[]> {
    const result = await this.client.send(
      new IndexFacesCommand({ CollectionId: collectionId, Image: { Bytes: imageBytes }, DetectionAttributes: ["DEFAULT"], QualityFilter: "AUTO" }),
    );

    return (result.FaceRecords ?? [])
      .filter((record) => record.Face?.FaceId && record.Face.BoundingBox)
      .map((record) => ({
        providerFaceId: record.Face!.FaceId!,
        confidence: record.Face!.Confidence ?? 0,
        boundingBox: {
          left: record.Face!.BoundingBox!.Left ?? 0,
          top: record.Face!.BoundingBox!.Top ?? 0,
          width: record.Face!.BoundingBox!.Width ?? 0,
          height: record.Face!.BoundingBox!.Height ?? 0,
        },
      }));
  }

  async detectFaces(imageBytes: Buffer): Promise<{ faceCount: number; quality: DetectedFaceQuality | null }> {
    const result = await this.client.send(new DetectFacesCommand({ Image: { Bytes: imageBytes }, Attributes: ["DEFAULT"] }));
    const faces = result.FaceDetails ?? [];
    const primary = faces[0];

    return {
      faceCount: faces.length,
      quality: primary?.Quality ? { brightness: primary.Quality.Brightness ?? 0, sharpness: primary.Quality.Sharpness ?? 0 } : null,
    };
  }

  /** Richer per-face attributes for a delivered photo — smile and eyes-open, used by the photo-intelligence pipeline (Prompt 29), never the guest-facing search flow. */
  async detectFaceAttributes(imageBytes: Buffer): Promise<FaceAttributes[]> {
    const result = await this.client.send(new DetectFacesCommand({ Image: { Bytes: imageBytes }, Attributes: ["ALL"] }));

    return (result.FaceDetails ?? []).map((face) => ({
      smileDetected: face.Smile?.Value ?? false,
      eyesOpen: face.EyesOpen?.Value ?? true,
      confidence: face.Confidence ?? 0,
    }));
  }

  async searchFacesByImage(collectionId: string, imageBytes: Buffer, maxResults: number): Promise<FaceMatchResult[]> {
    const result = await this.client.send(
      new SearchFacesByImageCommand({ CollectionId: collectionId, Image: { Bytes: imageBytes }, MaxFaces: maxResults, FaceMatchThreshold: 0 }), // threshold filtering happens in @bcp/face-recognition's own confidence.ts, not here, so every candidate match is available to that shared logic
    );

    return (result.FaceMatches ?? [])
      .filter((match) => match.Face?.FaceId)
      .map((match) => ({ providerFaceId: match.Face!.FaceId!, confidence: match.Similarity ?? 0 }));
  }

  async deleteFace(collectionId: string, providerFaceId: string): Promise<void> {
    await this.client.send(new DeleteFacesCommand({ CollectionId: collectionId, FaceIds: [providerFaceId] }));
  }
}
