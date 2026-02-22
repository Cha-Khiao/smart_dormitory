// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // เพิ่ม State ยืนยันรหัสผ่าน
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. ตรวจสอบว่ารหัสผ่านตรงกันไหม (มาตรฐานเว็บทั่วไป)
    if (password !== confirmPassword) {
      toast.error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน!");
      return;
    }
    
    // 2. ตรวจสอบความยาวรหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)
    if (password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("กำลังสร้างบัญชี...");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ", { id: toastId });
        router.push("/login"); 
      } else {
        toast.error(json.error || "เกิดข้อผิดพลาด", { id: toastId });
      }
    } catch (error) {
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              <h3 className="fw-bold text-success">สมัครสมาชิก</h3>
              <p className="text-muted">สร้างบัญชีเพื่อใช้งานระบบหอพัก</p>
            </div>
            
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="form-label fw-semibold">ตั้งชื่อผู้ใช้งาน (Username)</label>
                <input 
                  type="text" 
                  className="form-control form-control-lg bg-body-tertiary" 
                  placeholder="เช่น john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required disabled={isLoading} 
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">ตั้งรหัสผ่าน (Password)</label>
                <input 
                  type="password" 
                  className="form-control form-control-lg bg-body-tertiary" 
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required disabled={isLoading} 
                />
              </div>
              
              {/* เพิ่มช่องยืนยันรหัสผ่าน */}
              <div className="mb-4">
                <label className="form-label fw-semibold">ยืนยันรหัสผ่านอีกครั้ง</label>
                <input 
                  type="password" 
                  className="form-control form-control-lg bg-body-tertiary" 
                  placeholder="กรอกรหัสผ่านให้ตรงกัน"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required disabled={isLoading} 
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm" 
                disabled={isLoading}
              >
                {isLoading ? "กำลังบันทึก..." : "ยืนยันการสมัคร"}
              </button>
            </form>
            
            {/* ลิงก์กลับไปหน้า Login */}
            <div className="text-center mt-4 pt-3 border-top">
              <span className="text-muted">มีบัญชีอยู่แล้วใช่ไหม? </span>
              <Link href="/login" className="text-primary fw-bold text-decoration-none">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}