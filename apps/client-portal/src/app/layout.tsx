import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaProvider } from "../components/pwa/pwa-provider";

export const metadata: Metadata = {
  title: "Client Portal — BCP Studio OS",
  description: "Where a studio's clients track bookings, payments, and deliverables",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Client Portal",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/splash/splash-1170x2532.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/splash/splash-1668x2388.png" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <PwaProvider />
      </body>
    </html>
  );
}
