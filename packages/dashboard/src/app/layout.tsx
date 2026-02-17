import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentLens",
  description: "MCP Agent Session Replay & Visual Debugger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <header className="border-b border-card-border px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4" fill="currentColor"/>
              <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2"/>
              <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="text-lg font-semibold">AgentLens</span>
          </div>
          <span className="text-muted text-sm">MCP Agent Debugger</span>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
