import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maison Solenne · Concierge",
  description: "A voice-first AI concierge for an intimate seaside retreat."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
