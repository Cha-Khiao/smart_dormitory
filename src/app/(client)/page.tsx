// src/app/(client)/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Home() {
  const { data: session, status, update } = useSession();
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/rooms");
        const json = await res.json();
        if (json.success) {
          setAvailableRooms(json.data.filter((r: any) => r.status === "available"));
        }
      } catch (error) {
        console.error("ดึงข้อมูลห้องไม่สำเร็จ", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const handleBookRoom = async (roomId: string, roomNumber: string) => {
    if (!session?.user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนครับ");
      return;
    }
    if ((session.user as any).roomNumber) {
      toast.error("คุณมีห้องพักอยู่แล้ว");
      return;
    }

    const toastId = toast.loading("กำลังเปิดห้องสนทนา...");
    try {
      // ยิง API ไปสร้างห้องแชท (หรือดึงห้องแชทเดิม)
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (session.user as any).id,
          username: session.user.name,
          roomId,
          roomNumber,
        }),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.dismiss(toastId);
        // พาไปหน้าห้องแชท (ใช้ _id ของ booking เป็นตัวอ้างอิงห้องแชท)
        router.push(`/chat/${json.data._id}?roomNumber=${roomNumber}`);
      } else {
        toast.error(json.error, { id: toastId });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด", { id: toastId });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    // ถ้าล็อกอินแล้ว แต่ยังไม่มีห้องพัก ให้เริ่มระบบ "แอบเช็คข้อมูล"
    if (status === "authenticated" && !(session?.user as any)?.roomNumber) {
      interval = setInterval(async () => {
        try {
          const userId = (session?.user as any).id;
          const res = await fetch(`/api/users/${userId}`);
          const json = await res.json();

          // ถ้าพบว่าแอดมินใส่เลขห้องให้แล้ว (อนุมัติแล้ว)
          if (json.success && json.roomNumber) {
            clearInterval(interval); // หยุดการแอบเช็ค
            
            // อัปเดต Session ทันที
            await update({ roomNumber: json.roomNumber });
            
            toast.success("แอดมินอนุมัติการเข้าพักของคุณแล้ว! 🎉", { duration: 5000 });
            
            // เด้งพาไปหน้าห้องพักของฉันอัตโนมัติ
            router.push("/my-room");
          }
        } catch (error) {
          console.error("Auto refresh error", error);
        }
      }, 3000); // เช็คทุกๆ 3 วินาที
    }

    // ล้างการทำงานเมื่อผู้ใช้ออกจากหน้านี้
    return () => clearInterval(interval);
  }, [status, session, update, router]);

  return (
    <main className="container mt-4 mb-5">
      {/* Hero Section */}
      <div className="hero-section text-center text-white mb-5 mt-3 py-5 rounded-4 shadow-lg" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)" }}>
        <h1 className="display-4 fw-bold mb-3">ยกระดับการใช้ชีวิตที่เหนือกว่า</h1>
        <p className="fs-5 opacity-75 mb-4 max-w-2xl mx-auto px-3">
          ระบบหอพักอัจฉริยะ จองง่าย จ่ายสะดวก บริการครบจบในที่เดียว
        </p>
        
        {/* ถ้าลูกค้ามีห้องแล้ว ให้แสดงปุ่มไปหน้าห้องตัวเองแทน */}
        {(session?.user as any)?.roomNumber && (
          <Link href="/my-room" className="btn btn-light text-primary btn-lg rounded-pill fw-bold shadow">
            กลับไปที่ห้องพักของคุณ ({(session?.user as any).roomNumber})
          </Link>
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-body">🚪 ห้องพักที่พร้อมเข้าอยู่</h3>
        <span className="badge bg-primary fs-6 rounded-pill px-3 py-2 shadow-sm">{availableRooms.length} ห้องว่าง</span>
      </div>

      {isLoading ? (
        <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>
      ) : availableRooms.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5 rounded-4 bg-body-tertiary">
          <div className="display-3 mb-3">😔</div>
          <h4 className="text-muted">ขออภัย ขณะนี้ห้องพักเต็มทั้งหมด</h4>
        </div>
      ) : (
        <div className="row g-4">
          {availableRooms.map((room) => (
            <div key={room._id} className="col-lg-3 col-md-4 col-sm-6">
              <div className="card hover-card h-100 p-2 border-0 shadow-sm rounded-4 bg-body">
                <div className="rounded-4 mb-3 d-flex align-items-center justify-content-center" style={{ height: "160px", backgroundColor: "#e2e8f0", backgroundImage: "url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=400&auto=format&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }}>
                  <span className="badge bg-dark bg-opacity-75 fs-5 shadow-sm">ห้อง {room.roomNumber}</span>
                </div>
                
                <div className="card-body p-2 text-center">
                  <p className="card-text text-muted mb-3">
                    ค่าเช่า <strong className="text-primary fs-4">{room.price.toLocaleString()}</strong> ฿/เดือน
                  </p>
                  <button 
                    className="btn btn-primary w-100 py-2 rounded-pill fw-bold shadow-sm" 
                    onClick={() => handleBookRoom(room._id, room.roomNumber)}
                    disabled={(session?.user as any)?.roomNumber}
                  >
                    💬 สอบถาม / จองห้องนี้
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}