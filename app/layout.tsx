import type { Metadata, Viewport } from "next";
import "./globals.css";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Heartbeat",
  description: "Every time you think of them, tap. Each thought is a beat.",
  applicationName: "Heartbeat",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "Heartbeat",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: `${base}/icons/icon.svg`, type: "image/svg+xml" },
      { url: `${base}/icons/icon-192.png`, sizes: "192x192" },
    ],
    apple: [{ url: `${base}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" style={{ background: "#000" }}>
      <body>{children}</body>
    </html>
  );
}
