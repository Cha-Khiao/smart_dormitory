// src/app/admin/layout.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle"; // นำเข้าปุ่มสลับโหมด

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* แถบเมนูด้านข้าง (Sidebar) - เปลี่ยนจาก bg-dark เป็น bg-body-tertiary เพื่อให้รองรับ Dark Mode */}
      <aside className="bg-body-tertiary border-end p-4 d-flex flex-column" style={{ width: "250px", transition: "all 0.3s" }}>
        <div>
          <h4 className="text-center text-primary mb-4 fw-bold">Admin Panel</h4>
          
          {session?.user && (
            <div className="text-center mb-4 pb-3 border-bottom">
              <small className="text-muted d-block">ผู้ดูแลระบบ:</small>
              <strong className="text-body">{session.user.name}</strong>
            </div>
          )}

          <ul className="nav flex-column gap-2">
            <li className="nav-item">
              <a href="/admin" className="nav-link text-body rounded hover-bg">🏠 แดชบอร์ด</a>
            </li>
            <li className="nav-item">
              <a href="/admin/rooms" className="nav-link text-body rounded hover-bg">🚪 จัดการห้องพัก</a>
            </li>
            <li className="nav-item">
              <a href="/admin/bookings" className="nav-link text-body rounded hover-bg">📋 รายการขอจอง</a>
            </li>
            <li className="nav-item">
              <a href="/admin/payments" className="nav-link text-body rounded hover-bg">💰 ตรวจสอบสลิป</a>
            </li>
          </ul>
        </div>

        {/* ส่วนล่างของ Sidebar */}
        <div className="mt-auto pt-4 border-top d-flex flex-column gap-3">
          {/* เพิ่มปุ่มสลับโหมดให้แอดมิน */}
          <ThemeToggle /> 
          
          <button 
            className="btn btn-outline-danger w-100"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* พื้นที่เนื้อหาหลัก - เปลี่ยนจาก bg-light เป็น bg-body */}
      <main className="flex-grow-1 p-4 bg-body" style={{ transition: "all 0.3s" }}>
        {children}
      </main>
    </div>
  );
}