// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import Link from "next/link"; // ใช้ Link ของ Next.js เพื่อให้โหลดหน้าไวขึ้น

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading("กำลังเข้าสู่ระบบ...");

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      toast.error(res.error, { id: toastId });
      setIsLoading(false);
    } else {
      toast.success("เข้าสู่ระบบสำเร็จ!", { id: toastId });
      window.location.href = "/admin"; // ถ้าเป็นลูกค้า Middleware จะเด้งกลับไปหน้าแรก (/) เอง
    }
  };

  return (
    // ใช้ bg-body-tertiary เพื่อให้พื้นหลังสว่าง/มืดตามโหมด
    <div className="d-flex align-items-center justify-content-center bg-body-tertiary" style={{ minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: "450px" }}>
        
        {/* ปุ่มกลับหน้าแรก */}
        <div className="mb-3">
          <Link href="/" className="text-decoration-none text-muted">
            ← กลับหน้าหลัก
          </Link>
        </div>

        <div className="card shadow-lg border-0 rounded-4 bg-body">
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="display-4 mb-3">🏢</div>
              <h3 className="fw-bold text-primary">เข้าสู่ระบบ</h3>
              <p className="text-muted">ยินดีต้อนรับกลับสู่ระบบหอพักอัจฉริยะ</p>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label fw-semibold">ชื่อผู้ใช้งาน</label>
                <input 
                  type="text" 
                  className="form-control form-control-lg bg-body-tertiary" 
                  placeholder="กรอกชื่อผู้ใช้งาน"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  disabled={isLoading}
                />
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold">รหัสผ่าน</label>
                <input 
                  type="password" 
                  className="form-control form-control-lg bg-body-tertiary" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  disabled={isLoading}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-lg w-100 rounded-pill fw-bold shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
            
            {/* ลิงก์ไปหน้าสมัครสมาชิก */}
            <div className="text-center mt-4 pt-3 border-top">
              <span className="text-muted">ยังไม่มีบัญชีใช่ไหม? </span>
              <Link href="/register" className="text-primary fw-bold text-decoration-none">
                สมัครสมาชิกที่นี่
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}