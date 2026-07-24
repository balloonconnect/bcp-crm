import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { otpVerifySchema, witnessSignSchema, clientSignSchema } from "@bcp/contracts";
import * as signingPublic from "../services/contract-signing-public.service";

const tokenParamsSchema = z.object({ token: z.string().min(10) });

function requestMeta(request: { ip: string; headers: { "user-agent"?: string } }) {
  return { ipAddress: request.ip, userAgent: request.headers["user-agent"] };
}

export async function contractSigningPublicRoutes(app: FastifyInstance) {
  app.get("/public/contracts/:token", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const { contract, bodyHtml } = await signingPublic.viewContract(token, requestMeta(request));
    return { ok: true, data: { title: contract.title, status: contract.status, witnessRequired: contract.witnessRequired, bodyHtml, currentVersionNumber: contract.currentVersionNumber } };
  });

  app.post("/public/contracts/:token/request-otp", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    return { ok: true, data: await signingPublic.requestSigningOtp(token, requestMeta(request)) };
  });

  app.post("/public/contracts/:token/verify-otp", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = otpVerifySchema.parse(request.body);
    return { ok: true, data: await signingPublic.verifySigningOtp(token, body.code, requestMeta(request)) };
  });

  app.post("/public/contracts/:token/witness", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = witnessSignSchema.parse(request.body);
    return { ok: true, data: await signingPublic.witnessSign(token, body.witnessName, requestMeta(request)) };
  });

  app.post("/public/contracts/:token/sign", async (request) => {
    const { token } = tokenParamsSchema.parse(request.params);
    const body = clientSignSchema.parse(request.body);
    return { ok: true, data: await signingPublic.signContract(token, body.signedByName, requestMeta(request)) };
  });
}
