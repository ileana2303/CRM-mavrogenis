import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CRM-Mavrogenis SA", template: "%s · CRM-Mavrogenis SA" },
  description: "Diagnostic Equipment – CRM Πωλητών",
  applicationName: "CRM-Mavrogenis SA",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CRM-Mavrogenis SA" },
  // iPad Safari would otherwise turn ΑΦΜ and other 9–10 digit numbers into phone links
  formatDetection: { telephone: false, address: false, email: false, date: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0b5fa5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
