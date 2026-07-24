import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Status — BCP Studio OS",
  description: "Public system status and incident history page",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
