import type { Metadata } from "next";
import { Inter, Heebo } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MindCET Accounts and Payments",
  description: "ניהול שירותים, חשבונות ותשלומים — לצוות MindCET",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${heebo.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
