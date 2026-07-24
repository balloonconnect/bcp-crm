"use client";

import { Card, CardContent, CardHeader, CardTitle, ResponsiveContentContainer, ResponsivePageHeader, LoadingState, ErrorState, Badge } from "@bcp/ui";
import { useApiGet } from "../lib/use-api";

interface DashboardMetrics {
  studios: { total: number; active: number; trial: number; expired: number; suspended: number };
  revenue: { mrr: number; arr: number; currency: string };
  renewalsChurn: { upcomingRenewals: number; cancelledLast30Days: number; churnRatePercent: number };
  usage: { storageGb: number; aiRequests: number; whatsappMessages: number; emailsSent: number };
  payments: { succeeded: number; failed: number; successRatePercent: number };
  jobs: { failedJobsLast24h: number; queuedJobs: number };
  health: { status: "healthy" | "degraded" | "unhealthy"; databaseOk: boolean; failedJobsLast24h: number };
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const healthVariant = { healthy: "success", degraded: "warning", unhealthy: "destructive" } as const;

export default function DashboardPage() {
  const { data, loading, error } = useApiGet<DashboardMetrics>("/platform/dashboard");

  return (
    <ResponsiveContentContainer maxWidth="wide">
      <ResponsivePageHeader title="Dashboard" description="Platform-wide metrics across every studio." />

      {loading && <LoadingState label="Loading dashboard metrics…" />}
      {error && <ErrorState description={error} />}

      {data && (
        <div className="flex flex-col gap-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">Studios</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <MetricCard label="Total studios" value={String(data.studios.total)} />
              <MetricCard label="Active" value={String(data.studios.active)} />
              <MetricCard label="Trial" value={String(data.studios.trial)} />
              <MetricCard label="Expired" value={String(data.studios.expired)} />
              <MetricCard label="Suspended" value={String(data.studios.suspended)} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Revenue</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard label="MRR" value={`${data.revenue.currency} ${data.revenue.mrr.toLocaleString()}`} />
              <MetricCard label="ARR" value={`${data.revenue.currency} ${data.revenue.arr.toLocaleString()}`} />
              <MetricCard label="Upcoming renewals" value={String(data.renewalsChurn.upcomingRenewals)} hint="Next 30 days" />
              <MetricCard label="Churn rate" value={`${data.renewalsChurn.churnRatePercent}%`} hint="Trailing 30 days" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Usage this month</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard label="Storage used" value={`${data.usage.storageGb.toLocaleString()} GB`} />
              <MetricCard label="AI requests" value={data.usage.aiRequests.toLocaleString()} />
              <MetricCard label="WhatsApp messages" value={data.usage.whatsappMessages.toLocaleString()} />
              <MetricCard label="Emails sent" value={data.usage.emailsSent.toLocaleString()} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Payments & jobs</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MetricCard label="Payment success rate" value={`${data.payments.successRatePercent}%`} hint="Trailing 30 days" />
              <MetricCard label="Failed background jobs" value={String(data.jobs.failedJobsLast24h)} hint="Last 24h" />
              <MetricCard label="Queued jobs" value={String(data.jobs.queuedJobs)} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">System health</h2>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Overall status</CardTitle>
                <Badge variant={healthVariant[data.health.status]}>{data.health.status}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>Database: {data.health.databaseOk ? "responding" : "unreachable"}</p>
                <p>Failed jobs (24h): {data.health.failedJobsLast24h}</p>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </ResponsiveContentContainer>
  );
}
