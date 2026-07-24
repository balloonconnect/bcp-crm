export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface IndexedFace {
  providerFaceId: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface DetectedFaceQuality {
  brightness: number; // 0-100
  sharpness: number; // 0-100
}

export interface FaceMatchResult {
  providerFaceId: string;
  confidence: number;
}

export interface FaceAttributes {
  smileDetected: boolean;
  eyesOpen: boolean;
  confidence: number;
}

/**
 * "AWS Rekognition behind an AI provider abstraction" — nothing in
 * `apps/api`'s face-search flow calls the AWS SDK directly; it only
 * ever calls through this interface. `RekognitionProvider` (this
 * package) is the only implementation today, but swapping to a
 * different face-recognition vendor later means writing one new class
 * against this same interface, not touching the search flow, the
 * schema, or any calling code.
 */
export interface FaceRecognitionProvider {
  createCollection(collectionId: string): Promise<void>;
  deleteCollection(collectionId: string): Promise<void>;

  /** Indexes every face found in an already-uploaded photo (referenced by storage key) into the collection — called once per delivered gallery photo, not per search. */
  indexFacesInImage(collectionId: string, imageBytes: Buffer): Promise<IndexedFace[]>;

  /** Detects faces in a guest's selfie/scan frame *before* searching — this is what the multiple-face and low-light warnings are computed from, separate from the search step itself so a bad capture can be rejected before spending a search call on it. */
  detectFaces(imageBytes: Buffer): Promise<{ faceCount: number; quality: DetectedFaceQuality | null }>;

  /** Richer per-face attributes (smile, eyes open) for a *delivered* gallery photo — distinct from `detectFaces()`, which is scoped to a guest's live capture and only ever returns count/quality, never expression detail a search doesn't need. Used by the photo-intelligence pipeline (Prompt 29), not the face-search flow. */
  detectFaceAttributes(imageBytes: Buffer): Promise<FaceAttributes[]>;

  /** Searches one collection (and only one — see `FaceCollection`'s doc comment on why this is structurally never cross-gallery) for faces matching the guest's captured image. */
  searchFacesByImage(collectionId: string, imageBytes: Buffer, maxResults: number): Promise<FaceMatchResult[]>;

  deleteFace(collectionId: string, providerFaceId: string): Promise<void>;
}
