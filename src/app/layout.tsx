import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymCard Pro — Gestione Schede Palestra",
  description:
    "Applicazione web per gestire atleti, schede di allenamento periodiche e registro serie/ripetizioni e carichi giornalieri.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
