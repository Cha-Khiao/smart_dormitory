// src/components/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      className={`btn ${theme === "dark" ? "btn-light" : "btn-dark"} px-4 py-2`}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      style={{ borderRadius: "20px", fontWeight: "500" }}
    >
      {theme === "dark" ? "🌞 สลับเป็นโหมดสว่าง" : "🌙 สลับเป็นโหมดมืด"}
    </button>
  );
}