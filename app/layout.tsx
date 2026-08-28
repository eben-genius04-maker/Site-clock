import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
// CSS is processed by Next.js at runtime and has no TypeScript module declaration.
// @ts-ignore -- intentional side-effect import handled by the Next.js bundler.
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SiteClock — Workforce Attendance",
  description: "AI-powered employee attendance and workforce management.",
  manifest: "/manifest.json",
  themeColor: "#0B1E3D",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SiteClock",
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontClasses = display.variable + " " + body.variable + " " + mono.variable + " font-sans antialiased";
  return (
    <html lang="en">
      <body className={fontClasses}>
        {children}
      </body>
    </html>
  );
}