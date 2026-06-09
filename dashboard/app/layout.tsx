import type { Metadata } from "next";
import { MarketDataProvider } from "../lib/websocket-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOLO_BOAT / DARWIN — Professional Trading Terminal",
  description: "Industry-grade trading terminal with real-time Binance WebSocket data, portfolio tracking, and AI-powered execution for BNB Chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MarketDataProvider>
          {children}
        </MarketDataProvider>
      </body>
    </html>
  );
}
