import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DARWIN - Evolutionary Trading Agent",
  description: "BNB HACK AI Trading Agent - Tournament Evolution Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
