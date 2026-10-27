import type { Metadata } from "next";
import { Assistant, Heebo } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "One Loop Social",
  description: "סטודיו יצירת תוכן לרשתות חברתיות",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${assistant.variable}`}>
      <body className="min-h-screen bg-studio-bg font-heebo antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
