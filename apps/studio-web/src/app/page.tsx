"use client";

import Link from "next/link";
import { LoadingState, ErrorState, Button, Card, CardContent, CardHeader, CardTitle } from "@bcp/ui";
import { DashboardProvider, useDashboard } from "../lib/dashboard-context";
import { getAccessToken, apiPost, setAccessToken } from "../lib/api-client";
import { DashboardToolbar } from "../components/dashboard/dashboard-toolbar";
import { QuickActionsBar } from "../components/dashboard/quick-actions-bar";
import { WidgetGrid } from "../components/dashboard/widget-grid";
import * as React from "react";

function DashboardBody() {
  const { loading, error, refetch } = useDashboard();

  if (loading) return <LoadingState label="Loading your dashboard…" />;
  if (error) return <ErrorState title="Could not load your dashboard" description={error} onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <DashboardToolbar />
      <QuickActionsBar />
      <WidgetGrid />
    </div>
  );
}

function SignedOutState() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Studio Console</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>Sign in to see your studio&apos;s dashboard, or finish setting up your studio if you haven&apos;t yet.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/onboarding">Set up your studio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function Page() {
  const [checkedAuth, setCheckedAuth] = React.useState(false);
  const [hasToken, setHasToken] = React.useState(false);

  React.useEffect(() => {
    async function check() {
      if (getAccessToken()) {
        setHasToken(true);
        setCheckedAuth(true);
        return;
      }
      // No token in this tab's sessionStorage (e.g. a fresh tab) — the
      // refresh cookie from a prior sign-in may still be valid, so try
      // it silently before deciding the person is signed out.
      const res = await apiPost<{ accessToken: string }>("/auth/refresh");
      if (res.ok && res.data) setAccessToken(res.data.accessToken);
      setHasToken(Boolean(res.ok && res.data));
      setCheckedAuth(true);
    }
    void check();
  }, []);

  if (!checkedAuth) return null;
  if (!hasToken) return <SignedOutState />;

  return (
    <DashboardProvider>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8" data-tour="dashboard-summary">
        <DashboardBody />
      </main>
    </DashboardProvider>
  );
}
