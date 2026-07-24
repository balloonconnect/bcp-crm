import { getEnv } from "@bcp/config";
import { buildApp } from "./app";

async function main() {
  const env = getEnv();
  const app = buildApp();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`api listening on :${port} (${env.NODE_ENV})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
