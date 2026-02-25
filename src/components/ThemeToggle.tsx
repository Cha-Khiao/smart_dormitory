// src/components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // โหลดค่า ธีม จาก LocalStorage ตอนเปิดเว็บ
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-bs-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    // 🌟 พระเอกอยู่ตรงนี้: สั่งเปลี่ยนธีมของ Bootstrap ทั้งระบบ
    document.documentElement.setAttribute("data-bs-theme", newTheme);
  };

  return (
    <button 
      onClick={toggleTheme} 
      className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-2"
      title={theme === 'light' ? 'เปลี่ยนเป็นโหมดมืด' : 'เปลี่ยนเป็นโหมดสว่าง'}
    >
      {theme === "light" ? "🌙 โหมดมืด" : "☀️ โหมดสว่าง"}
    </button>
  );
}