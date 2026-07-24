import { Worker, type Job } from "bullmq";
import { EmailClient } from "@bcp/email";
import { getEnv } from "@bcp/config";
import { connection } from "../queues";
import { withJobTracking } from "../lib/job-tracker";

export interface EmailJobData {
  jobRecordId: string;
  studioId: string | null;
  to: string;
  subject: string;
  html: string;
}

const env = getEnv();
const emailClient = new EmailClient({ host: env.SMTP_HOST, port: env.SMTP_PORT, user: env.SMTP_USER, password: env.SMTP_PASSWORD, from: env.EMAIL_FROM });

export const emailWorker = new Worker<EmailJobData>(
  "email",
  (job: Job<EmailJobData>) =>
    withJobTracking("email", job, async () => {
      const result = await emailClient.send({ to: job.data.to, subject: job.data.subject, html: job.data.html });
      return { messageId: result.messageId };
    }),
  { connection },
);
