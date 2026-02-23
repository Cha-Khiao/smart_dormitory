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
    <nav className="navbar navbar-expand-lg bg-body-tertiary shadow-sm py-3 sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold text-primary fs-4" href={isAdmin ? "/admin" : "/"}>
          ✨ Smart Dorm
        </Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          
          {/* ======================================================= */}
          {/* 🌟 เมนูนำทางหลัก (Nav Links) ไว้ตรงนี้ที่เดียว ไม่ซ้ำซ้อน */}
          {/* ======================================================= */}
          <ul className="navbar-nav me-auto mt-3 mt-lg-0 gap-1 fw-semibold">
            {isAdmin ? (
              <>
                <li className="nav-item">
                  <Link href="/admin" className={`nav-link px-3 rounded-pill ${pathname === '/admin' ? 'bg-primary text-white shadow-sm' : ''}`}>📊 แดชบอร์ด</Link>
                </li>
                <li className="nav-item">
                  <Link href="/admin/rooms" className={`nav-link px-3 rounded-pill ${pathname === '/admin/rooms' ? 'bg-primary text-white shadow-sm' : ''}`}>🚪 จัดการห้องพัก</Link>
                </li>
                <li className="nav-item">
                  <Link href="/admin/bookings" className={`nav-link px-3 rounded-pill ${pathname === '/admin/bookings' ? 'bg-primary text-white shadow-sm' : ''}`}>💬 ระบบสนทนา</Link>
                </li>
                <li className="nav-item">
                  <Link href="/admin/billing" className={`nav-link px-3 rounded-pill ${pathname === '/admin/billing' ? 'bg-primary text-white shadow-sm' : ''}`}>🧾 ระบบออกบิล</Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link href="/" className={`nav-link px-3 rounded-pill ${pathname === '/' ? 'bg-primary text-white shadow-sm' : ''}`}>🏠 หน้าแรก</Link>
                </li>
                {session?.user && (
                  <li className="nav-item">
                    <Link href="/my-room" className={`nav-link px-3 rounded-pill ${pathname === '/my-room' ? 'bg-primary text-white shadow-sm' : ''}`}>🔑 ห้องพักของฉัน</Link>
                  </li>
                )}
              </>
            )}
          </ul>

          {/* ======================================================= */}
          {/* 🌟 โซนจัดการบัญชี มุมขวา (Dropdown มีแค่ออกจากระบบ) */}
          {/* ======================================================= */}
          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0 border-start ps-lg-3">
            <ThemeToggle />
            
            {session?.user ? (
              <div className="dropdown">
                <button className="btn btn-outline-primary dropdown-toggle rounded-pill px-4 fw-bold bg-body" type="button" data-bs-toggle="dropdown">
                  👤 {session.user.name}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 rounded-4 p-2" style={{ minWidth: "200px" }}>
                  
                  {/* แสดงสถานะบัญชีให้ชัดเจน */}
                  <li className="px-3 py-2 text-muted small text-center border-bottom mb-2">
                    เข้าสู่ระบบในฐานะ<br/>
                    <strong className={`fs-6 ${isAdmin ? "text-primary" : "text-success"}`}>
                      {isAdmin ? "ผู้ดูแลระบบ (Admin)" : "ผู้เช่า / ลูกค้า"}
                    </strong>
                  </li>
                  
                  {/* เหลือแค่ปุ่มออกจากระบบ */}
                  <li>
                    <button className="dropdown-item text-danger rounded py-2 fw-bold text-center d-flex justify-content-center align-items-center gap-2" onClick={() => signOut({ callbackUrl: "/login" })}>
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