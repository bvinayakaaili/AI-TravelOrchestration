import type { Metadata } from "next";
import { Orbitron, Space_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "600", "700", "900"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "AOHCAP — AI-Orchestrated Headless Composable Application Platform",
  description:
    "The AI-native platform assembling applications from intelligent, headless, composable modules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${spaceMono.variable} font-space antialiased bg-sapphire-night text-text-primary`}>
        {children}
      </body>
    </html>
  );
}
