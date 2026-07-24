import { Worker, type Job } from "bullmq";
import { WhatsAppClient } from "@bcp/whatsapp";
import { getEnv } from "@bcp/config";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface WhatsAppJobData {
  jobRecordId: string;
  studioId: string | null;
  to: string;
  body: string;
}

const env = getEnv();
const whatsappClient = env.WHATSAPP_API_URL && env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID
  ? new WhatsAppClient({ apiUrl: env.WHATSAPP_API_URL, accessToken: env.WHATSAPP_ACCESS_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID })
  : null;

export const whatsappWorker = new Worker<WhatsAppJobData>(
  "whatsapp",
  (job: Job<WhatsAppJobData>) =>
    withJobTracking("whatsapp", job, async () => {
      if (!whatsappClient) throw new Error("WhatsApp isn't configured for this environment (WHATSAPP_API_URL/ACCESS_TOKEN/PHONE_NUMBER_ID unset).");
      const result = await whatsappClient.sendText({ to: job.data.to, body: job.data.body });
      return { wamid: result.id };
    }),
  { connection },
);
