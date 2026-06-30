import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tucci Elite Admin",
  description: "Operations admin for Tucci Elite Baseball and Softball.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Tucci Admin",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
