"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ResponsiveAppShell, LoadingState, type NavItem } from "@bcp/ui";
import { PermissionProvider } from "@bcp/permissions/client";
import { usePlatformAuth } from "../lib/auth-context";
import { PLATFORM_MODULES } from "../lib/nav";
import { LoginForm } from "./login-form";

export function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = usePlatformAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return <LoadingState label="Loading BCP Studio OS Platform Admin…" />;
  }

  if (!user) {
    return <LoginForm />;
  }

  const permissions = user.permissions;
  const visibleModules = PLATFORM_MODULES.filter((m) => permissions.includes(m.permission));

  const navItems: NavItem[] = visibleModules.map((m) => ({
    id: m.id,
    label: m.label,
    href: m.href,
    icon: m.icon,
    isActive: m.href === "/" ? pathname === "/" : pathname.startsWith(m.href),
  }));

  return (
    <PermissionProvider value={{ actorType: "platform_user", permissions }}>
      <ResponsiveAppShell
        activeMobileNavId="home"
        mobileNavItems={[
          { id: "home", label: "Home", href: "/" },
          { id: "leads", label: "Studios", href: "/studios" },
          { id: "events", label: "Jobs", href: "/jobs" },
          { id: "payments", label: "Payments", href: "/payments" },
          { id: "more", label: "More", onSelect: () => router.push("/audit-logs") },
        ]}
        primaryNavItems={navItems}
        productName="BCP Studio OS — Platform Admin"
        user={{ id: user.id, name: user.name, email: user.email, role: user.roles.map((r) => r.name).join(", ") }}
        onSignOut={() => {
          void logout();
        }}
      >
        {children}
      </ResponsiveAppShell>
    </PermissionProvider>
  );
}
