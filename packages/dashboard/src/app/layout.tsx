import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
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
        className={`${ibmPlexSans.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <header className="sticky top-0 z-30 border-b border-card-border/60 px-6 py-3 flex items-center gap-4 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-accent">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
              </svg>
              <div className="absolute inset-0 blur-md bg-accent/15 rounded-full" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground-bright">AgentLens</span>
          </div>
          <div className="h-3.5 w-px bg-card-border/60" />
          <span className="text-muted text-[11px] font-mono tracking-wider uppercase">MCP Debugger</span>
        </header>
        <main className="p-5">{children}</main>
      </body>
    </html>
  );
}
