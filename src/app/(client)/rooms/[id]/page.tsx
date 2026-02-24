// src/app/(client)/rooms/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Modal, Form, Button } from "react-bootstrap";

export default function RoomDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [room, setRoom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==========================================
  // 🌟 State สำหรับระบบขอจองห้องพัก
  // ==========================================
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [moveInDate, setMoveInDate] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // ดึงข้อมูลรายละเอียดห้องพัก
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${id}`);
        const json = await res.json();
        if (json.success) {
          setRoom(json.data);
        } else {
          toast.error("ไม่พบข้อมูลห้องพัก");
          router.push("/");
        }
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchRoom();
  }, [id, router]);

  // ==========================================
  // 🌟 ฟังก์ชันอัปโหลดเอกสารไป Cloudinary
  // ==========================================
  const uploadToCloudinary = async (file: File) => {
    // 🚨 อย่าลืมเปลี่ยน 2 บรรทัดนี้ เป็นของ Cloudinary ของคุณจริงๆ
    const CLOUD_NAME = "dosnpexmy"; 
    const UPLOAD_PRESET = "smart-dormitory"; 

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { 
        method: "POST", 
        body: formData 
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.secure_url; // คืนค่าลิงก์รูปภาพ
    } catch (error) {
      console.error("Cloudinary Error:", error);
      return null;
    }
  };

  // ==========================================
  // 🌟 ฟังก์ชันกดยืนยันการจอง (ส่งเอกสารเข้าแชท)
  // ==========================================
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return toast.error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
    if (!moveInDate) return toast.error("กรุณาเลือกวันที่คาดว่าจะเข้าพัก");
    if (!documentFile) return toast.error("กรุณาแนบสำเนาบัตรประชาชน หรือเอกสารยืนยันตัวตน!");

    setIsSubmittingBooking(true);
    const toastId = toast.loading("กำลังอัปโหลดเอกสาร...");

    try {
      // 1. อัปโหลดรูปบัตรประชาชนขึ้น Cloudinary
      const documentUrl = await uploadToCloudinary(documentFile);
      if (!documentUrl) {
        toast.error("อัปโหลดเอกสารไม่สำเร็จ", { id: toastId });
        setIsSubmittingBooking(false);
        return;
      }

      // 2. สร้างคำขอจองห้องพัก
      toast.loading("กำลังส่งคำขอจอง...", { id: toastId });
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room._id,
          roomNumber: room.roomNumber,
          userId: (session.user as any).id,
          username: session.user.name,
          status: "pending_approval",
          moveInDate: moveInDate, // ส่งวันที่เข้าพักไปด้วย
        }),
      });

      const json = await res.json();

      if (res.ok) {
        // 🌟 3. ส่งรูปเอกสารเข้าแชทแอดมินทันที เป็นข้อความเปิดบทสนทนา
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: json.data._id, // ใช้ ID การจองที่เพิ่งสร้างเสร็จ
            senderId: (session.user as any).id,
            senderName: session.user.name,
            senderRole: "customer",
            text: `📝 ส่งคำขอจองห้องพัก ${room.roomNumber} (คาดว่าจะเข้าพักวันที่: ${new Date(moveInDate).toLocaleDateString('th-TH')}) \nแนบสำเนาบัตรประชาชนเพื่อทำสัญญาเช่า: ${documentUrl}`
          }),
        });

        toast.success("ส่งคำขอจองเรียบร้อย! กรุณารอแอดมินตรวจสอบเอกสารและตอบกลับ", { id: toastId });
        setShowBookingModal(false);
        setRoom({ ...room, status: 'pending' }); // อัปเดต UI ชั่วคราวว่าห้องไม่ว่างแล้ว
        router.push("/my-room"); // เด้งไปหน้าห้องพักของฉัน เพื่อรอคุยกับแอดมิน
      } else {
        throw new Error(json.error || "จองไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการจอง", { id: toastId });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  if (isLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;
  if (!room) return <div className="text-center mt-5 text-body-secondary">ไม่พบข้อมูลห้องพัก</div>;

  return (
    <div className="container py-5 position-relative">
      
      {/* 🌟 ปุ่มย้อนกลับที่จัดวางอย่างเหมาะสม (รองรับ Dark Mode) */}
      <div className="row justify-content-center mb-4">
        <div className="col-lg-10">
          <Link 
            href="/" 
            className="btn btn-sm btn-outline-secondary rounded-pill fw-bold px-4 shadow-sm d-inline-flex align-items-center gap-2 bg-body text-body transition-all"
          >
            <span>&larr;</span> ย้อนกลับไปดูห้องทั้งหมด
          </Link>
        </div>
      </div>
      
      {/* 🌟 การ์ดแสดงรายละเอียดห้อง (ปรับ CSS เป็น Dark Mode Semantic 100%) */}
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card bg-body text-body border-secondary-subtle shadow-sm rounded-4 overflow-hidden">
            <div className="row g-0">
              
              {/* ฝั่งรูปภาพห้อง */}
              <div className="col-md-6 bg-body-tertiary">
                <img 
                  src={room.image || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=800&auto=format&fit=crop"} 
                  alt={`ห้อง ${room.roomNumber}`} 
                  className="img-fluid h-100 w-100" 
                  style={{ objectFit: "cover", minHeight: "350px" }}
                />
              </div>
              
              {/* ฝั่งข้อมูลห้อง */}
              <div className="col-md-6 p-4 p-md-5 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h2 className="fw-bold mb-0 text-primary">ห้อง {room.roomNumber}</h2>
                  <span className={`badge px-3 py-2 rounded-pill fs-6 shadow-sm ${room.status === 'available' ? 'bg-success' : 'bg-secondary'}`}>
                    {room.status === 'available' ? 'ว่างพร้อมอยู่' : 'ไม่ว่าง'}
                  </span>
                </div>
                
                <h3 className="fw-bold text-danger mb-4">
                  {room.price.toLocaleString()} <span className="fs-6 text-body-secondary fw-normal">บาท / เดือน</span>
                </h3>

                <div className="mb-4">
                  <h6 className="fw-bold text-body">รายละเอียดห้องพัก:</h6>
                  <p className="text-body-secondary lh-lg">{room.description || "ห้องพักสะอาด กว้างขวาง เฟอร์นิเจอร์ครบจบในที่เดียว หิ้วกระเป๋าใบเดียวเข้าอยู่ได้เลย"}</p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold text-body mb-3">สิ่งอำนวยความสะดวก:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    <span className="badge bg-body-tertiary text-body border border-secondary-subtle px-3 py-2 rounded-pill">🛏️ เตียง 5 ฟุต</span>
                    <span className="badge bg-body-tertiary text-body border border-secondary-subtle px-3 py-2 rounded-pill">❄️ เครื่องปรับอากาศ</span>
                    <span className="badge bg-body-tertiary text-body border border-secondary-subtle px-3 py-2 rounded-pill">📺 ทีวี</span>
                    <span className="badge bg-body-tertiary text-body border border-secondary-subtle px-3 py-2 rounded-pill">🚿 เครื่องทำน้ำอุ่น</span>
                    <span className="badge bg-body-tertiary text-body border border-secondary-subtle px-3 py-2 rounded-pill">🛜 ฟรี Wi-Fi</span>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-top border-secondary-subtle">
                  {room.status === 'available' ? (
                    status === "authenticated" ? (
                      <button 
                        className="btn btn-primary w-100 rounded-pill fw-bold py-3 shadow-sm fs-5 transition-all" 
                        onClick={() => setShowBookingModal(true)}
                      >
                        📝 ขอจองห้องพักนี้
                      </button>
                    ) : (
                      <Link href="/login" className="btn btn-outline-primary w-100 rounded-pill fw-bold py-3 shadow-sm transition-all">
                        🔒 เข้าสู่ระบบเพื่อทำจอง
                      </Link>
                    )
                  ) : (
                    <button className="btn btn-secondary w-100 rounded-pill fw-bold py-3 opacity-50" disabled>
                      ❌ ห้องพักนี้มีผู้เช่าแล้ว
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* 🌟 Modal: ฟอร์มขอจองห้องพัก (ปรับ UI รองรับ Dark Mode) */}
      {/* ======================================================= */}
      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} centered backdrop="static" size="lg">
        {/* ให้ Modal เปลี่ยนสีตามโหมดด้วยคลาส bg-body text-body */}
        <Modal.Header closeButton className="border-secondary-subtle bg-body text-body pb-0">
          <Modal.Title className="fw-bold text-primary d-flex align-items-center gap-2">
            <span className="fs-3">📝</span> ยืนยันคำขอจอง ห้อง {room?.roomNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-body text-body p-4">
          <Form onSubmit={handleBookingSubmit}>
            
            {/* 1. ข้อมูลวันที่ */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-body">📅 วันที่คาดว่าจะเข้าพัก</Form.Label>
              <Form.Control 
                type="date" 
                required 
                className="bg-body border-secondary-subtle text-body py-2"
                value={moveInDate} 
                onChange={(e) => setMoveInDate(e.target.value)} 
                min={new Date().toISOString().split('T')[0]} // ห้ามเลือกย้อนหลัง
              />
            </Form.Group>

            {/* 🌟 2. อัปโหลดเอกสาร (ฟีเจอร์ใหม่สุดไฮเทค) */}
            <div className="mb-4 p-4 bg-body-tertiary rounded-4 border border-secondary-subtle">
              <Form.Label className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                <span>📄</span> เอกสารประกอบการจอง (บังคับ)
              </Form.Label>
              <p className="small text-body-secondary mb-3 lh-base">
                กรุณาแนบภาพถ่าย <strong>สำเนาบัตรประชาชน หรือ พาสปอร์ต</strong> (เซ็นรับรองสำเนาถูกต้อง) เพื่อใช้เป็นหลักฐานยืนยันตัวตนในการทำสัญญาเช่า
              </p>
              
              <Form.Control 
                type="file" 
                accept="image/*"
                required
                className="bg-body border-secondary-subtle text-body py-2"
                onChange={(e: any) => setDocumentFile(e.target.files?.[0] || null)}
              />
              
              {/* พรีวิวรูปบัตรประชาชนให้ดูความเรียบร้อยก่อนส่ง */}
              {documentFile && (
                <div className="mt-3 text-center bg-body p-2 rounded-3 border border-secondary-subtle">
                  <span className="d-block small text-success fw-bold mb-2">✅ ไฟล์พร้อมส่ง</span>
                  <img 
                    src={URL.createObjectURL(documentFile)} 
                    alt="ID Card Preview" 
                    className="img-fluid rounded-3 shadow-sm" 
                    style={{ maxHeight: "200px", objectFit: "contain" }} 
                  />
                </div>
              )}
            </div>

            {/* แจ้งเตือนข้อตกลง */}
            <div className="alert alert-info border-0 rounded-4 small text-body-secondary d-flex gap-2">
              <span className="fs-5">💡</span>
              <div>
                เมื่อกดยืนยัน ระบบจะส่งเอกสารของคุณไปให้แอดมินตรวจสอบผ่าน <strong>ระบบแชท</strong> 
                คุณสามารถเข้าไปติดตามสถานะการจองและพูดคุยกับแอดมินได้ที่เมนู <strong>"ห้องพักของฉัน"</strong>
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <Button variant="light" className="w-50 rounded-pill fw-bold border border-secondary-subtle bg-body text-body transition-all" onClick={() => setShowBookingModal(false)}>
                ยกเลิก
              </Button>
              <Button variant="primary" type="submit" className="w-50 rounded-pill fw-bold shadow-sm transition-all" disabled={isSubmittingBooking || !documentFile}>
                {isSubmittingBooking ? "⏳ กำลังอัปโหลดข้อมูล..." : "🚀 ยืนยันการขอจอง"}
              </Button>
            </div>

          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
}