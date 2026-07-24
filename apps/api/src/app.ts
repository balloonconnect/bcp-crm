import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { logger } from "@bcp/logger";
import { generateRequestId } from "@bcp/observability";
import { healthPlugin } from "./plugins/health";
import { hostnameMiddlewarePlugin } from "./plugins/hostname-middleware";
import { resolveCorsOrigin } from "./plugins/cors-origin";
import { tenantContextPlugin } from "./plugins/tenant-context";
import { requestLoggingPlugin } from "./plugins/request-logging";
import { errorHandlerPlugin } from "./plugins/error-handler";
import { studioAuthRoutes } from "./routes/studio-auth.routes";
import { platformAuthRoutes } from "./routes/platform-auth.routes";
import { brandingRoutes } from "./routes/branding.routes";
import { domainsRoutes } from "./routes/domains.routes";
import { platformAdminRoutes } from "./routes/platform-admin.routes";
import { onboardingRoutes } from "./routes/onboarding.routes";
import { studioManagementRoutes } from "./routes/studio-management.routes";
import { crmRoutes } from "./routes/crm.routes";
import { leadsRoutes } from "./routes/leads.routes";
import { enquiryFormsRoutes } from "./routes/enquiry-forms.routes";
import { enquiryFormPublicRoutes } from "./routes/enquiry-form-public.routes";
import { clientsRoutes } from "./routes/clients.routes";
import { catalogRoutes } from "./routes/catalog.routes";
import { quotationsRoutes } from "./routes/quotations.routes";
import { quotationPublicRoutes } from "./routes/quotation-public.routes";
import { bookingsRoutes } from "./routes/bookings.routes";
import { eventsRoutes } from "./routes/events.routes";
import { workflowRoutes } from "./routes/workflow.routes";
import { teamRoutes } from "./routes/team.routes";
import { equipmentRoutes } from "./routes/equipment.routes";
import { financeRoutes } from "./routes/finance.routes";
import { invoicingRoutes } from "./routes/invoicing.routes";
import { whatsappRoutes } from "./routes/whatsapp.routes";
import { emailRoutes } from "./routes/email.routes";
import { notificationsRoutes } from "./routes/notifications.routes";
import { galleryRoutes } from "./routes/gallery.routes";
import { galleryPublicRoutes } from "./routes/gallery-public.routes";
import { uploadRoutes } from "./routes/upload.routes";
import { faceRecognitionRoutes } from "./routes/face-recognition.routes";
import { photoIntelligenceRoutes } from "./routes/photo-intelligence.routes";
import { cullingRoutes } from "./routes/culling.routes";
import { albumSelectionRoutes } from "./routes/album-selection.routes";
import { albumSelectionPublicRoutes } from "./routes/album-selection-public.routes";
import { albumProductionRoutes } from "./routes/album-production.routes";
import { albumProductionPublicRoutes } from "./routes/album-production-public.routes";
import { ealbumRoutes } from "./routes/ealbum.routes";
import { ealbumPublicRoutes } from "./routes/ealbum-public.routes";
import { clientPortalRoutes } from "./routes/client-portal.routes";
import { contractsRoutes } from "./routes/contracts.routes";
import { contractSigningPublicRoutes } from "./routes/contract-signing-public.routes";
import { productsRoutes } from "./routes/products.routes";
import { commerceOrdersRoutes } from "./routes/commerce-orders.routes";
import { copilotRoutes } from "./routes/copilot.routes";
import { marketingContentRoutes } from "./routes/marketing-content.routes";
import { automationRoutes } from "./routes/automation.routes";
import { reportsRoutes } from "./routes/reports.routes";
import { searchRoutes } from "./routes/search.routes";
import { importJobsRoutes } from "./routes/import-jobs.routes";
import { exportJobsRoutes } from "./routes/export-jobs.routes";
import { backupRestoreRoutes } from "./routes/backup-restore.routes";
import { notesRoutes } from "./routes/notes.routes";
import { accountDeletionRoutes } from "./routes/account-deletion.routes";
import { jobsRoutes } from "./routes/jobs.routes";
import { monitoringRoutes } from "./routes/monitoring.routes";
import { dashboardRoutes } from "./routes/dashboard.routes";

export function buildApp() {
  const app = Fastify({
    loggerInstance: logger.child({ service: "api" }),
    genReqId: (req) => {
      const inbound = req.headers["x-request-id"];
      return typeof inbound === "string" && inbound.length > 0 ? inbound : generateRequestId();
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
  });

  app.register(helmet, {
    contentSecurityPolicy: {
      // "CSP" — a real, restrictive default rather than helmet's own defaults left unexamined.
      // This API only ever serves JSON (and the occasional PDF/CSV/image passthrough with its
      // own Content-Type), so the policy is deliberately locked down: no script/style sources
      // beyond 'self', no plugins, no framing.
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  });
  // "CORS" — replaces the previous origin:true (reflect-any-origin) misconfiguration, which combined
  // with credentials:true meant any website could make authenticated requests against this API from
  // a victim's browser. resolveCorsOrigin checks an explicit allowlist plus each studio's own
  // verified custom domains — see cors-origin.ts.
  app.register(cors, { origin: resolveCorsOrigin, credentials: true });
  app.register(cookie);
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  app.register(errorHandlerPlugin);
  // Hostname middleware runs first — it's the "front door" that validates
  // the Host header and resolves custom-domain tenancy before anything
  // else (including auth) touches the request. tenantContextPlugin's
  // `authenticate` decorator runs independently, per-route, for the
  // session-based resolution authenticated app routes need.
  app.register(hostnameMiddlewarePlugin);
  app.register(tenantContextPlugin);
  app.register(requestLoggingPlugin);

  app.register(healthPlugin);
  app.register(studioAuthRoutes);
  app.register(platformAuthRoutes);
  app.register(brandingRoutes);
  app.register(domainsRoutes);
  app.register(platformAdminRoutes);
  app.register(onboardingRoutes);
  app.register(studioManagementRoutes);
  app.register(crmRoutes);
  app.register(leadsRoutes);
  app.register(enquiryFormsRoutes);
  app.register(enquiryFormPublicRoutes);
  app.register(clientsRoutes);
  app.register(catalogRoutes);
  app.register(quotationsRoutes);
  app.register(quotationPublicRoutes);
  app.register(bookingsRoutes);
  app.register(eventsRoutes);
  app.register(workflowRoutes);
  app.register(teamRoutes);
  app.register(equipmentRoutes);
  app.register(financeRoutes);
  app.register(invoicingRoutes);
  app.register(whatsappRoutes);
  app.register(emailRoutes);
  app.register(notificationsRoutes);
  app.register(galleryRoutes);
  app.register(galleryPublicRoutes);
  app.register(uploadRoutes);
  app.register(faceRecognitionRoutes);
  app.register(photoIntelligenceRoutes);
  app.register(cullingRoutes);
  app.register(albumSelectionRoutes);
  app.register(albumSelectionPublicRoutes);
  app.register(albumProductionRoutes);
  app.register(albumProductionPublicRoutes);
  app.register(ealbumRoutes);
  app.register(ealbumPublicRoutes);
  app.register(clientPortalRoutes);
  app.register(contractsRoutes);
  app.register(contractSigningPublicRoutes);
  app.register(productsRoutes);
  app.register(commerceOrdersRoutes);
  app.register(copilotRoutes);
  app.register(marketingContentRoutes);
  app.register(automationRoutes);
  app.register(reportsRoutes);
  app.register(searchRoutes);
  app.register(importJobsRoutes);
  app.register(exportJobsRoutes);
  app.register(backupRestoreRoutes);
  app.register(notesRoutes);
  app.register(accountDeletionRoutes);
  app.register(jobsRoutes);
  app.register(monitoringRoutes);
  app.register(dashboardRoutes);

  return app;
}
