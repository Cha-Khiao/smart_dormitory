// src/app/(client)/my-room/page.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function MyRoomPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // ป้องกันคนยังไม่ล็อกอิน หรือยังไม่มีห้อง แอบเข้าหน้านี้
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === "authenticated" && (session?.user as any)?.roomNumber) {
      interval = setInterval(async () => {
        try {
          const userId = (session?.user as any).id;
          const res = await fetch(`/api/users/${userId}`);
          const json = await res.json();

          // ถ้า DB ตอบกลับมาว่า "สำเร็จ" แต่ "roomNumber เป็นค่าว่าง" แปลว่าแอดมินเปลี่ยนห้องเป็น "ว่าง" แล้ว!
          if (json.success && !json.roomNumber) {
            clearInterval(interval); // หยุดเช็ค
            
            // อัปเดต Session ให้ห้องเป็นค่าว่าง
            await update({ roomNumber: "" });
            
            toast.error("สัญญาเช่าสิ้นสุด หรือแอดมินยกเลิกห้องของคุณแล้ว", { duration: 5000, icon: "🚪" });
            
            // เตะกลับไปหน้าแรกเพื่อให้จองห้องใหม่ได้
            router.push("/");
          }
        } catch (error) {
          console.error("Auto refresh error", error);
        }
      }, 3000); // เช็คทุกๆ 3 วินาที
    }

    return () => clearInterval(interval);
  }, [status, session, update, router]);

  if (status === "loading") {
    return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;
  }

  const roomNumber = (session?.user as any)?.roomNumber;

  if (!roomNumber) {
    return (
      <div className="container mt-5 text-center">
        <div className="card shadow-sm border-0 rounded-4 p-5 bg-body-tertiary">
          <div className="display-1 mb-3">⏳</div>
          <h2 className="fw-bold text-warning mb-3">คุณยังไม่มีห้องพักที่ได้รับการอนุมัติ</h2>
          <p className="text-muted fs-5 mb-4">กรุณากดจองห้องพักในหน้าแรก หรือรอผู้ดูแลระบบอนุมัติคำขอของคุณ</p>
          <Link href="/" className="btn btn-primary btn-lg rounded-pill fw-bold shadow-sm px-5">
            ไปดูห้องพักที่ว่าง
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5 mb-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 text-center">
          <div className="card border-0 shadow-lg p-5 rounded-4" style={{ background: "linear-gradient(135deg, var(--bs-body-bg) 0%, rgba(16, 185, 129, 0.05) 100%)" }}>
            <div className="display-1 mb-3">🔑</div>
            <h2 className="fw-bold text-success mb-2">ยินดีต้อนรับผู้เช่าห้อง {roomNumber}</h2>
            <p className="text-muted fs-5 mb-5">จัดการข้อมูลและชำระค่าเช่ารายเดือนของคุณได้ที่นี่</p>
            
            <div className="row g-4 justify-content-center">
              <div className="col-md-6">
                <div className="card hover-card border-0 shadow-sm h-100 rounded-4 bg-body">
                  <div className="card-body p-4">
                    <div className="fs-1 mb-3">📄</div>
                    <h4 className="fw-bold text-body">รอบบิลเดือนนี้</h4>
                    <p className="text-muted">ตรวจสอบยอดและส่งสลิปโอนเงิน</p>
                    <Link href="/payment" className="btn btn-success w-100 rounded-pill py-2 fw-bold shadow-sm">แจ้งชำระเงิน</Link>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card hover-card border-0 shadow-sm h-100 rounded-4 bg-body">
                  <div className="card-body p-4">
                    <div className="fs-1 mb-3">🔧</div>
                    <h4 className="fw-bold text-body">แจ้งซ่อมบำรุง</h4>
                    <p className="text-muted">แจ้งปัญหาหลอดไฟขาด แอร์ไม่เย็น</p>
                    <button className="btn btn-outline-secondary w-100 rounded-pill py-2 fw-bold" onClick={() => alert('ฟีเจอร์แจ้งซ่อมกำลังพัฒนา')}>ส่งเรื่องแจ้งปัญหา</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}