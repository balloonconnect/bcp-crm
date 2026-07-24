import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CommandMenu } from "../components/search/command-menu";
import { PwaProvider } from "../components/pwa/pwa-provider";
import { TourProvider } from "../components/tour/tour-context";
import { TourOverlay } from "../components/tour/tour-overlay";

export const metadata: Metadata = {
  title: "Studio Console — BCP Studio OS",
  description: "The core CRM app photography studios use day-to-day",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Studio Console",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* "Splash screens" — iOS has no manifest-driven splash screen mechanism; these <link> tags are the only way it shows one, one per representative device size rather than the full ~30-combination matrix Apple's spec technically allows for. */}
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/splash/splash-1170x2532.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/splash/splash-1668x2388.png" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <TourProvider>
          {children}
          <CommandMenu />
          <PwaProvider />
          <TourOverlay />
        </TourProvider>
      </body>
    </html>
  );
}
