// src/app/(client)/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { Modal } from "react-bootstrap"; // 🌟 นำเข้า Modal สำหรับทำหน้าต่าง QR Code

export default function Home() {
  const { data: session, status, update } = useSession();
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 🌟 State สำหรับเปิด/ปิด QR Code LINE
  const [showQR, setShowQR] = useState(false);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "authenticated" && !(session?.user as any)?.roomNumber) {
      interval = setInterval(async () => {
        try {
          const userId = (session?.user as any).id;
          const res = await fetch(`/api/users/${userId}`);
          const json = await res.json();

          if (json.success && json.roomNumber) {
            clearInterval(interval); 
            await update({ roomNumber: json.roomNumber });
            toast.success("แอดมินอนุมัติการเข้าพักของคุณแล้ว! 🎉", { duration: 5000 });
            router.push("/my-room");
          }
        } catch (error) {
          console.error("Auto refresh error", error);
        }
      }, 3000); 
    }
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
                    onClick={() => router.push(`/rooms/${room._id}`)}
                    disabled={(session?.user as any)?.roomNumber}
                  >
                    👀 ดูรายละเอียดห้องพัก
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================= */}
      {/* 🌟 ช่องทางการติดต่ออื่นๆ (แสดงด้านล่างสุดของหน้าแรก) */}
      {/* ======================================================= */}
      <div className="mt-5 pt-5 border-top text-center">
        <h4 className="fw-bold mb-3">📞 สอบถามข้อมูลเพิ่มเติม</h4>
        <p className="text-muted mb-4">หากไม่สะดวกใช้งานระบบแชท สามารถติดต่อเราได้ผ่านช่องทางด้านล่างนี้เลยครับ</p>
        
        <div className="d-flex flex-wrap justify-content-center gap-3">
          <a href="tel:0812345678" className="btn btn-outline-dark rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2">
            <span style={{fontSize: "1.2rem"}}>📱</span> โทร: 081-234-5678
          </a>
          <button onClick={() => setShowQR(true)} className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2">
            <span style={{fontSize: "1.2rem"}}>💬</span> LINE Official
          </button>
          <a href="https://m.me/yourfacebookpage" target="_blank" rel="noopener noreferrer" className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2">
            <span style={{fontSize: "1.2rem"}}>📘</span> Facebook Inbox
          </a>
        </div>
      </div>

      {/* 🌟 Modal สำหรับแสดง QR Code LINE */}
      <Modal show={showQR} onHide={() => setShowQR(false)} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-success w-100 text-center">แอด LINE ของเรา</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center pb-4">
          {/* สามารถเปลี่ยน URL รูป QR Code ด้านล่างนี้เป็นของจริงได้เลย */}
          <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="LINE QR Code" className="img-fluid mb-3 rounded-4 shadow-sm" style={{ width: "200px" }} />
          <p className="text-muted small mb-0">สแกนคิวอาร์โค้ดนี้เพื่อติดต่อแอดมิน</p>
          <p className="fw-bold fs-5 mt-2 text-dark">ID: @yourdorm</p>
          <a href="https://line.me/ti/p/~@yourdorm" target="_blank" className="btn btn-success rounded-pill w-100 fw-bold mt-2">
            หรือคลิกเพื่อแอดไลน์
          </a>
        </Modal.Body>
      </Modal>

    </main>
  );
}