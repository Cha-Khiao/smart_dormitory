// src/app/layout.tsx
import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css"; // ตอนนี้ไฟล์นี้ควรจะว่างเปล่าแล้ว
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "ระบบจัดการหอพักอัจฉริยะ",
  description: "Smart Dormitory Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${kanit.className} bg-body text-body`}>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster position="top-right" />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}