import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudentStay · Your accommodation workspace",
  description: "Compare accommodation offers, review call evidence, update preferences and approve follow-ups.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
