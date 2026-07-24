"use client";

import * as React from "react";
import type { PlatformPermissionKey, StudioPermissionKey } from "../catalog";

export interface PermissionState {
  actorType: "studio_user" | "platform_user";
  permissions: (StudioPermissionKey | PlatformPermissionKey | string)[];
  /** Studio-side only: `null` = not restricted to one branch. */
  branchId?: string | null;
}

const PermissionContext = React.createContext<PermissionState | null>(null);

export interface PermissionProviderProps {
  value: PermissionState;
  children: React.ReactNode;
}

/**
 * Wraps an app (or a section of one) with the permission list resolved
 * server-side for the current session — see @bcp/auth's tenant resolution
 * and apps/api's `/auth/session` response, which is where `value` comes
 * from. This provider never re-derives permissions from anything the
 * client controls.
 */
export function PermissionProvider({ value, children }: PermissionProviderProps) {
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

function usePermissionState(): PermissionState {
  const ctx = React.useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermission/useBranchAccess must be used within a <PermissionProvider>");
  }
  return ctx;
}

/** `usePermission("booking:manage")` → boolean, reactive to the current session's permission list. */
export function usePermission(permission: StudioPermissionKey | PlatformPermissionKey | string): boolean {
  const { permissions } = usePermissionState();
  return permissions.includes(permission);
}

export function usePermissions(): PermissionState["permissions"] {
  return usePermissionState().permissions;
}

/** True if the current user can act on the given branch (see @bcp/permissions branch-access.ts for the server-side equivalent). */
export function useBranchAccess(targetBranchId: string | null | undefined): boolean {
  const { branchId } = usePermissionState();
  if (branchId === null || branchId === undefined) return true;
  if (targetBranchId === null || targetBranchId === undefined) return true;
  return branchId === targetBranchId;
}

export interface CanProps {
  permission: StudioPermissionKey | PlatformPermissionKey | string;
  /** Rendered when the permission check fails. Omit to render nothing. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/** Declarative conditional rendering: `<Can permission="booking:manage">...</Can>`. */
export function Can({ permission, fallback = null, children }: CanProps) {
  const allowed = usePermission(permission);
  return <>{allowed ? children : fallback}</>;
}
