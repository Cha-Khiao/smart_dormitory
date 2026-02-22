// src/app/(client)/chat/[id]/page.tsx
"use client";

import { useState, useEffect, useRef, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { Modal, Button, Form, Tab, Tabs } from "react-bootstrap";

export default function CustomerChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomNumber = searchParams.get("roomNumber") || "";

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State สำหรับ Modal ทำสัญญา
  const [showModal, setShowModal] = useState(false);
  const [contractMethod, setContractMethod] = useState("online");
  const [moveInDate, setMoveInDate] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ดึงข้อความแชท (ทำแบบ Polling เรียลไทม์)
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");

    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?bookingId=${bookingId}`);
      const json = await res.json();
      if (json.success) setMessages(json.data);
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // อัปเดตทุก 3 วินาที
    return () => clearInterval(interval);
  }, [bookingId, status, router]);

  // เลื่อนจอลงมาล่างสุดเวลามีข้อความใหม่
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ฟังก์ชันส่งข้อความแชท
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      bookingId,
      senderId: (session?.user as any).id,
      senderName: session?.user?.name,
      senderRole: "customer",
      text: inputText,
    };

    // แสดงข้อความบนจอก่อนเพื่อความไว (Optimistic UI)
    setMessages((prev) => [...prev, { ...newMessage, createdAt: new Date() }]);
    setInputText("");

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMessage),
    });
  };

  // ฟังก์ชันช่วยอัปโหลดรูป
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  // ฟังก์ชันส่งเรื่องทำสัญญา (อัปเดต Booking)
  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("กำลังส่งข้อมูลให้แอดมิน...");

    try {
      let payload: any = { id: bookingId, roomId: "ignore_but_needed_for_api" }; // ต้องปรับ API PATCH นิดหน่อยให้รองรับการอัปเดตแบบอิสระ

      if (contractMethod === "online") {
        if (!moveInDate || !idCardFile || !slipFile) throw new Error("กรุณากรอกข้อมูลออนไลน์ให้ครบ");
        const idCardUrl = await uploadToCloudinary(idCardFile);
        const slipUrl = await uploadToCloudinary(slipFile);
        payload = { ...payload, status: "pending_approval", contractMethod: "online", moveInDate, idCardUrl, slipUrl };
      } else {
        if (!appointmentDate) throw new Error("กรุณาเลือกวันนัดหมาย");
        payload = { ...payload, status: "appointment", contractMethod: "onsite", appointmentDate };
      }

      // ยิงไปอัปเดตสถานะ Booking
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("ส่งเรื่องสำเร็จ! กรุณารอแอดมินตอบกลับ", { id: toastId });
        setShowModal(false);
        // ส่งข้อความอัตโนมัติแจ้งแอดมินในแชท
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId, senderId: (session?.user as any).id, senderName: "System", senderRole: "customer",
            text: contractMethod === "online" ? "📄 ลูกค้าได้ส่งเอกสารทำสัญญาออนไลน์แล้ว" : "📅 ลูกค้าขอนัดหมายเข้ามาดูห้อง/ทำสัญญาหน้างาน",
          }),
        });
      } else {
        throw new Error(json.error);
      }
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mt-4 mb-5 max-w-2xl mx-auto" style={{ maxWidth: "800px" }}>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Link href="/" className="text-decoration-none text-muted">← กลับหน้าหลัก</Link>
        {/* ปุ่มทองคำ! เปิดเมนูทำสัญญา */}
        <button className="btn btn-warning fw-bold shadow-sm rounded-pill px-4" onClick={() => setShowModal(true)}>
          📝 ดำเนินการเช่าห้องพัก
        </button>
      </div>

      <div className="card shadow-sm border-0 rounded-4 bg-body d-flex flex-column" style={{ height: "70vh" }}>
        {/* Header แชท */}
        <div className="card-header bg-primary text-white p-3 rounded-top-4 border-0 d-flex align-items-center gap-3">
          <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: "45px", height: "45px", fontSize: "1.2rem" }}>
            {roomNumber}
          </div>
          <div>
            <h5 className="mb-0 fw-bold">สอบถามห้องพัก {roomNumber}</h5>
            <small className="opacity-75">แอดมินจะตอบกลับในเวลาทำการ</small>
          </div>
        </div>

        {/* พื้นที่แสดงข้อความ */}
        <div className="card-body p-4 overflow-auto bg-body-tertiary d-flex flex-column gap-3" style={{ flexGrow: 1 }}>
          <div className="text-center text-muted small mb-3">เริ่มการสนทนาเกี่ยวกับห้อง {roomNumber}</div>
          
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === (session?.user as any).id;
            return (
              <div key={idx} className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                <div className="small text-muted mb-1 px-2">{msg.senderName}</div>
                <div 
                  className={`px-4 py-2 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                  style={{ maxWidth: "75%", borderBottomRightRadius: isMe ? "4px" : "16px", borderBottomLeftRadius: !isMe ? "4px" : "16px" }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ฟอร์มพิมพ์ข้อความ */}
        <div className="card-footer bg-body p-3 border-top-0 rounded-bottom-4">
          <form onSubmit={handleSendMessage} className="d-flex gap-2">
            <input type="text" className="form-control rounded-pill px-4 bg-body-tertiary" placeholder="พิมพ์ข้อความสอบถามที่นี่..." value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={status === "loading"} />
            <button type="submit" className="btn btn-primary rounded-circle shadow-sm" style={{ width: "45px", height: "45px" }} disabled={!inputText.trim()}>
              ➤
            </button>
          </form>
        </div>
      </div>

      {/* ======================================================= */}
      {/* Modal: เลือกวิธีดำเนินการเช่า (ออนไลน์ vs นัดหมาย) */}
      {/* ======================================================= */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-primary px-2">ดำเนินการเช่าห้อง {roomNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Tabs activeKey={contractMethod} onSelect={(k) => setContractMethod(k || 'online')} className="mb-4 nav-fill">
            <Tab eventKey="online" title="🌐 ทำสัญญาและจ่ายเงินออนไลน์ (รวดเร็ว)">
              <Form onSubmit={handleSubmitContract} className="mt-3">
                <div className="alert alert-info border-0 rounded-3 small">
                  อัปโหลดเอกสารและสลิปโอนเงิน (ค่าเช่าล่วงหน้า + มัดจำ) เพื่อให้แอดมินอนุมัติห้องพักทันที
                </div>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">📅 วันที่ต้องการย้ายเข้า</Form.Label>
                  <Form.Control type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} required={contractMethod === 'online'} />
                </Form.Group>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <Form.Label className="fw-bold text-primary">🪪 รูปบัตรประชาชน</Form.Label>
                    <Form.Control type="file" accept="image/*" onChange={(e: any) => setIdCardFile(e.target.files[0])} required={contractMethod === 'online'} />
                  </div>
                  <div className="col-md-6">
                    <Form.Label className="fw-bold text-success">🧾 สลิปโอนเงินมัดจำ</Form.Label>
                    <Form.Control type="file" accept="image/*" onChange={(e: any) => setSlipFile(e.target.files[0])} required={contractMethod === 'online'} />
                  </div>
                </div>
                <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งเอกสารทำสัญญาออนไลน์"}
                </Button>
              </Form>
            </Tab>

            <Tab eventKey="onsite" title="🤝 นัดหมายดูห้อง/ทำสัญญาหน้างาน">
              <Form onSubmit={handleSubmitContract} className="mt-3">
                <div className="alert alert-warning border-0 rounded-3 small text-dark">
                  นัดหมายวันเวลาเพื่อเข้ามาดูห้องพักจริง และชำระเงิน/เซ็นสัญญาที่สำนักงาน
                </div>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">📅 เลือกวันและเวลาที่จะเข้ามา</Form.Label>
                  <Form.Control type="datetime-local" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required={contractMethod === 'onsite'} />
                </Form.Group>
                <Button variant="warning" type="submit" className="w-100 rounded-pill fw-bold" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังส่งข้อมูล..." : "ยืนยันการนัดหมายหน้างาน"}
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
      </Modal>

    </div>
  );
}