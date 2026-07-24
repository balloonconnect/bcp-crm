const GROUP_PHOTO_FACE_THRESHOLD = 4; // 4+ distinct faces reads as a "group photo" rather than a portrait/couple shot

/** "Group-photo detection" derived directly from the face count Rekognition already returns — no separate model or classifier needed for something this threshold-based. */
export function isGroupPhoto(faceCount: number): boolean {
  return faceCount >= GROUP_PHOTO_FACE_THRESHOLD;
}
