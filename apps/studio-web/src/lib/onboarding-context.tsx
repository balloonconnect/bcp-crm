"use client";

import * as React from "react";
import { ONBOARDING_STEPS, computeProgress, buildSetupChecklist, type OnboardingStepKey, type OnboardingProgress, type SetupChecklistItem } from "@bcp/onboarding";
import { apiGet, apiPost, setAccessToken } from "./api-client";

const SESSION_STORAGE_KEY = "bcp_onboarding_session_id";

export interface OnboardingSessionData {
  id: string;
  studioId: string | null;
  resumeToken: string;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  status: "in_progress" | "completed" | "abandoned";
}

interface OnboardingContextValue {
  session: OnboardingSessionData | null;
  progress: OnboardingProgress | null;
  checklist: SetupChecklistItem[];
  loading: boolean;
  activeStepKey: OnboardingStepKey;
  setActiveStepKey: (key: OnboardingStepKey) => void;
  start: (input: { name: string; email: string; password: string }) => Promise<void>;
  provision: (input: { name: string; slug: string }) => Promise<void>;
  saveSettingsStep: (stepKey: OnboardingStepKey, data: unknown) => Promise<void>;
  markStepDone: (stepKey: OnboardingStepKey) => Promise<void>;
  skipStep: (stepKey: OnboardingStepKey) => Promise<void>;
  seedSampleData: () => Promise<void>;
  complete: () => Promise<void>;
  refetch: () => Promise<void>;
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

/**
 * Persists the session id (not the full session — that's re-fetched) to
 * `localStorage`, not just React state — this is what makes "resume
 * later" work across a closed tab or a different day, without requiring
 * a login. Reopening the onboarding URL picks the same session back up
 * automatically. The email-able `resumeToken` (see the backend) covers
 * resuming from an entirely different browser/device.
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<OnboardingSessionData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeStepKey, setActiveStepKey] = React.useState<OnboardingStepKey>("owner_account");

  const refetch = React.useCallback(async () => {
    const sessionId = typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;
    if (!sessionId) {
      setLoading(false);
      return;
    }
    const res = await apiGet<{ session: OnboardingSessionData }>(`/onboarding/${sessionId}`);
    if (res.ok && res.data) {
      setSession(res.data.session);
      const nextStepDef = ONBOARDING_STEPS.find(
        (s) => !res.data!.session.completedSteps.includes(s.key) && !res.data!.session.skippedSteps.includes(s.key),
      );
      setActiveStepKey(nextStepDef?.key ?? "final_review");
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  const persistSessionId = (id: string) => {
    if (typeof window !== "undefined") localStorage.setItem(SESSION_STORAGE_KEY, id);
  };

  const start: OnboardingContextValue["start"] = async (input) => {
    const res = await apiPost<{ sessionId: string; resumeToken: string }>("/onboarding/start", input);
    if (!res.ok || !res.data) throw new Error(res.error?.message ?? "Could not start onboarding");
    persistSessionId(res.data.sessionId);
    await refetch();
    setActiveStepKey("studio_name");
  };

  const provision: OnboardingContextValue["provision"] = async (input) => {
    if (!session) throw new Error("No onboarding session in progress");
    const res = await apiPost<{ studio: unknown; accessToken?: string }>(`/onboarding/${session.id}/provision`, input);
    if (!res.ok || !res.data) throw new Error(res.error?.message ?? "Could not create your studio");
    if (res.data.accessToken) setAccessToken(res.data.accessToken);
    await refetch();
  };

  const saveSettingsStep: OnboardingContextValue["saveSettingsStep"] = async (stepKey, data) => {
    if (!session) throw new Error("No onboarding session in progress");
    const res = await apiPost(`/onboarding/${session.id}/steps/${stepKey}/save`, data);
    if (!res.ok) throw new Error(res.error?.message ?? "Could not save this step");
    await refetch();
  };

  const markStepDone: OnboardingContextValue["markStepDone"] = async (stepKey) => {
    if (!session) throw new Error("No onboarding session in progress");
    await apiPost(`/onboarding/${session.id}/steps/${stepKey}/complete`);
    await refetch();
  };

  const skipStep: OnboardingContextValue["skipStep"] = async (stepKey) => {
    if (!session) throw new Error("No onboarding session in progress");
    const res = await apiPost(`/onboarding/${session.id}/steps/${stepKey}/skip`);
    if (!res.ok) throw new Error(res.error?.message ?? "This step can't be skipped");
    await refetch();
  };

  const seedSampleData: OnboardingContextValue["seedSampleData"] = async () => {
    if (!session) return;
    await apiPost(`/onboarding/${session.id}/sample-data`);
  };

  const complete: OnboardingContextValue["complete"] = async () => {
    if (!session) throw new Error("No onboarding session in progress");
    const res = await apiPost(`/onboarding/${session.id}/complete`);
    if (!res.ok) throw new Error(res.error?.message ?? "Finish the required steps first");
    await refetch();
  };

  const progress = session ? computeProgress(session.completedSteps, session.skippedSteps) : null;
  const checklist = session ? buildSetupChecklist(session.completedSteps, session.skippedSteps) : [];

  const value: OnboardingContextValue = {
    session,
    progress,
    checklist,
    loading,
    activeStepKey,
    setActiveStepKey,
    start,
    provision,
    saveSettingsStep,
    markStepDone,
    skipStep,
    seedSampleData,
    complete,
    refetch,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within an <OnboardingProvider>");
  return ctx;
}
