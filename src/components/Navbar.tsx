// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "./ThemeToggle";
import { useEffect } from "react";

export default function Navbar() {
  const { data: session } = useSession();

  // โหลด Bootstrap JS เพื่อให้ Dropdown ทำงานได้
  useEffect(() => {
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary shadow-sm py-3 sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold text-primary fs-4" href="/">✨ Smart Dorm</Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">
            <ThemeToggle />
            
            {session?.user ? (
              <div className="dropdown">
                <button className="btn btn-outline-primary dropdown-toggle rounded-pill px-4 fw-bold bg-body" type="button" data-bs-toggle="dropdown">
                  👤 {session.user.name}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 rounded-4 p-2">
                  {/* เช็คสิทธิ์เพื่อแสดงเมนูให้ตรงกับประเภทผู้ใช้ */}
                  {(session.user as any).role === 'admin' ? (
                    <li><Link className="dropdown-item rounded py-2" href="/admin">⚙️ จัดการระบบ (Admin)</Link></li>
                  ) : (
                    <li><Link className="dropdown-item rounded py-2 text-success fw-bold" href="/my-room">🔑 ห้องพักของฉัน</Link></li>
                  )}
                  <li><Link className="dropdown-item rounded py-2" href="/payment">💳 แจ้งชำระเงิน</Link></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item text-danger rounded py-2 fw-bold" onClick={() => signOut({ callbackUrl: "/login" })}>
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