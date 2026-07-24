import { RekognitionProvider, type FaceRecognitionProvider } from "@bcp/face-recognition";

let provider: FaceRecognitionProvider | null | undefined;

/** Resolves the configured provider once and reuses it — returns null when AWS credentials aren't configured, the same "degrade gracefully, don't crash the app" pattern every other optional external integration in this codebase follows (SES, Razorpay/Cashfree, Web Push). Every caller in this file is expected to handle a null provider by surfacing a clear "not configured" error, not by silently pretending face search succeeded. */
export function getFaceProvider(): FaceRecognitionProvider | null {
  if (provider !== undefined) return provider;
  const region = process.env.AWS_REKOGNITION_REGION;
  const accessKeyId = process.env.AWS_REKOGNITION_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY;
  provider = region && accessKeyId && secretAccessKey ? new RekognitionProvider({ region, accessKeyId, secretAccessKey }) : null;
  return provider;
}
