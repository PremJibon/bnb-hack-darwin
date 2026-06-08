import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YOLO_BOAT / MSAF-1 — MEV-Shield & Arbitrage-Frontrunner",
  description: "Professional trading interface for The Sandman — AI-powered MEV-shielding and micro-arbitrage agent on BNB Chain",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
