// src/components/ThemeProvider.tsx
"use client"; // บังคับให้ไฟล์นี้ทำงานฝั่ง Client (เบราว์เซอร์)

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // ป้องกันปัญหา Hydration Mismatch ตอนโหลดหน้าเว็บครั้งแรก
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    // ให้ next-themes ไปเปลี่ยน attribute="data-bs-theme" ซึ่งเป็นค่าที่ Bootstrap ใช้
    <NextThemesProvider attribute="data-bs-theme" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}