import type { Metadata } from "next";
import "./globals.css";
import { PlatformAuthProvider } from "../lib/auth-context";
import { AuthenticatedApp } from "../components/authenticated-app";

export const metadata: Metadata = {
  title: "Platform Admin — BCP Studio OS",
  description: "Internal console: tenant management, license issuance, plans & billing oversight",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <PlatformAuthProvider>
          <AuthenticatedApp>{children}</AuthenticatedApp>
        </PlatformAuthProvider>
      </body>
    </html>
  );
}
