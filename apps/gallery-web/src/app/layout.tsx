import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gallery — BCP Studio OS",
  description: "Public/private photo gallery delivery and selection experience",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
