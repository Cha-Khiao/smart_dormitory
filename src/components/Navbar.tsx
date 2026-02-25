// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  const isAdmin = (session?.user as any)?.role === 'admin';

  return (
    // ใช้ bg-body-tertiary เพื่อให้สีพื้นหลังเปลี่ยนตาม Dark/Light โหมดอัตโนมัติ
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom border-secondary-subtle py-3 sticky-top transition-theme">
      <div className="container">
        {/* โลโก้ */}
        <Link className="navbar-brand fw-bold text-primary fs-4 d-flex align-items-center gap-2" href={isAdmin ? "/admin" : "/"}>
          <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: "36px", height: "36px", fontSize: "1.2rem" }}>
            🏢
          </div>
          <span className="text-body">Smart Dorm</span>
        </Link>
        
        <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          
          {/* 🌟 เปลี่ยน me-auto เป็น ms-auto เพื่อดันเมนูทั้งหมดไปชิดขวา */}
          <ul className="navbar-nav ms-auto mt-3 mt-lg-0 gap-2 fw-semibold align-items-lg-center">
            {isAdmin ? (
              <>
                <li className="nav-item"><Link href="/admin" className={`nav-link px-3 rounded-pill ${pathname === '/admin' ? 'bg-primary text-white shadow-sm' : 'text-body-secondary'}`}>แดชบอร์ด</Link></li>
                <li className="nav-item"><Link href="/admin/rooms" className={`nav-link px-3 rounded-pill ${pathname === '/admin/rooms' ? 'bg-primary text-white shadow-sm' : 'text-body-secondary'}`}>จัดการห้องพัก</Link></li>
                <li className="nav-item"><Link href="/admin/bookings" className={`nav-link px-3 rounded-pill ${pathname === '/admin/bookings' ? 'bg-primary text-white shadow-sm' : 'text-body-secondary'}`}>ระบบสนทนา</Link></li>
                <li className="nav-item"><Link href="/admin/billing" className={`nav-link px-3 rounded-pill ${pathname === '/admin/billing' ? 'bg-primary text-white shadow-sm' : 'text-body-secondary'}`}>ระบบออกบิล</Link></li>
              </>
            ) : (
              <>
                {/* 🌟 ตัดคำว่า "หน้าแรก" ออก เหลือแค่ "ห้องพักของฉัน" */}
                {session?.user && (
                  <li className="nav-item">
                    <Link href="/my-room" className={`nav-link px-4 py-2 rounded-pill ${pathname === '/my-room' ? 'bg-primary text-white shadow-sm' : 'text-body-secondary'}`}>
                      🔑 ห้องพักของฉัน
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>

          {/* โซนโปรไฟล์และปุ่มต่างๆ */}
          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0 ms-lg-3 ps-lg-3 border-start border-secondary-subtle pt-3 pt-lg-0">
            <ThemeToggle />
            
            {session?.user ? (
              <div className="dropdown">
                <button className="btn btn-sm btn-outline-secondary dropdown-toggle rounded-pill px-3 py-2 fw-bold bg-body text-body d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
                  <div className="bg-secondary-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: "24px", height: "24px" }}>👤</div>
                  {session.user.name}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border border-secondary-subtle mt-2 rounded-4 p-2 bg-body" style={{ minWidth: "220px" }}>
                  <li className="px-3 py-2 text-body-secondary small text-center border-bottom border-secondary-subtle mb-2">
                    เข้าสู่ระบบในฐานะ<br/>
                    <strong className={`fs-6 ${isAdmin ? "text-primary" : "text-success"}`}>{isAdmin ? "ผู้ดูแลระบบ" : "ลูกบ้าน"}</strong>
                  </li>
                  <li>
                    <button className="dropdown-item text-danger rounded-3 py-2 fw-bold text-center d-flex justify-content-center align-items-center gap-2" onClick={() => signOut({ callbackUrl: "/login" })}>
                      🚪 ออกจากระบบ
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link href="/login" className="btn btn-outline-primary rounded-pill px-4 fw-bold">เข้าสู่ระบบ</Link>
                <Link href="/register" className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm">สมัครเข้าพัก</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}