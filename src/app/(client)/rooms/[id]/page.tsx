// src/app/(client)/rooms/[id]/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Modal, Button, Form, Tabs, Tab, Carousel } from "react-bootstrap";

const generateRoomImages = (roomId: string | string[], count: number = 5) => {
  if (!roomId) return [];
  const idStr = Array.isArray(roomId) ? roomId[0] : roomId;
  let seed = 0;
  for (let i = 0; i < idStr.length; i++) seed += idStr.charCodeAt(i);
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${seed + i}/800/500`);
};

export default function RoomDetailsPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [room, setRoom] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [contractMethod, setContractMethod] = useState("online");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌟 State สำหรับเปิด/ปิด QR Code LINE ในหน้านี้
  const [showQR, setShowQR] = useState(false);

  const carouselImages = useMemo(() => generateRoomImages(roomId, 5), [roomId]);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`);
        const json = await res.json();
        if (json.success) setRoom(json.data);
      } catch (error) {
        toast.error("ดึงข้อมูลห้องไม่สำเร็จ");
      }
    };
    if (roomId) fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (!isChatOpen || !booking) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?bookingId=${booking._id}&t=${new Date().getTime()}`);
        const json = await res.json();
        if (json.success) setMessages(json.data);
      } catch (error) {
        console.error("Failed to fetch messages");
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [isChatOpen, booking]);

  useEffect(() => {
    if (isChatOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen]);

  const handleOpenChat = async () => {
    if (status === "unauthenticated") {
      toast.error("กรุณาเข้าสู่ระบบก่อนสอบถามข้อมูล");
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (session?.user as any).id,
          username: session?.user?.name || "ลูกค้า",
          roomId: room._id,
          roomNumber: room.roomNumber,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBooking(json.data);
        setIsChatOpen(true);
      } else {
        toast.error(json.error || "ไม่สามารถเปิดแชทได้");
      }
    } catch (error) {
      toast.error("ระบบมีปัญหา กรุณาลองใหม่");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !booking) return;
    const newMessage = {
      bookingId: booking._id, senderId: (session?.user as any).id, senderName: session?.user?.name || "ลูกค้า", senderRole: "customer", text: inputText,
    };
    setMessages((prev) => [...prev, { ...newMessage, createdAt: new Date() }]);
    setInputText("");
    await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newMessage),
    });
  };

  const handleSubmitContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("กำลังส่งข้อมูล...");
    try {
      let payload: any = { id: booking._id, roomId: room._id };
      let systemMessage = "";
      if (contractMethod === "online") {
        if (!moveInDate) throw new Error("กรุณาเลือกวันย้ายเข้า");
        payload = { ...payload, status: "pending_approval", contractMethod: "online", moveInDate };
        systemMessage = `📄 ส่งเอกสารทำสัญญาออนไลน์ (ย้ายเข้า: ${new Date(moveInDate).toLocaleDateString('th-TH')})`;
      } else {
        if (!appointmentDate) throw new Error("กรุณาเลือกวันนัดหมาย");
        payload = { ...payload, status: "appointment", contractMethod, appointmentDate };
        systemMessage = `🗓️ ขอนัดหมาย${contractMethod === "view_room" ? "ดูห้อง" : "ทำสัญญา"} วันที่: ${new Date(appointmentDate).toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })} น.`;
      }
      const res = await fetch("/api/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("ดำเนินการสำเร็จ!", { id: toastId });
        setShowModal(false);
        await fetch("/api/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking._id, senderId: (session?.user as any).id, senderName: "System", senderRole: "customer", text: systemMessage }),
        });
        setBooking(json.data);
      } else {
        throw new Error(json.error);
      }
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!room) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container py-5 position-relative">
      
      {/* 🌟 ปุ่มย้อนกลับแบบมินิมอล */}
      <div className="row justify-content-center mb-3">
        <div className="col-lg-10">
          <button 
            onClick={() => router.back()} 
            className="btn btn-link text-decoration-none text-muted px-0 fw-bold d-flex align-items-center gap-2 hover-opacity"
          >
            <span className="fs-5">←</span> ย้อนกลับไปหน้าแรก
          </button>
        </div>
      </div>
      
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="row g-0">
              
              <div className="col-md-7 bg-light p-0">
                <Carousel fade interval={3000} indicators={false} className="h-100">
                  {carouselImages.map((imgUrl, index) => (
                    <Carousel.Item key={index} className="h-100">
                      <div style={{ height: "500px" }}>
                        <img src={imgUrl} alt={`Slide ${index + 1}`} className="d-block w-100 h-100 object-fit-cover" />
                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>
              </div>
              
              <div className="col-md-5 p-5 d-flex flex-column justify-content-center bg-white">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h1 className="fw-bold text-primary mb-0">ห้อง {room.roomNumber}</h1>
                  <span className={`badge fs-6 ${room.status === 'available' ? 'bg-success' : 'bg-danger'}`}>
                    {room.status === 'available' ? 'ว่างพร้อมอยู่' : 'มีผู้เช่าแล้ว'}
                  </span>
                </div>
                
                <h3 className="text-danger fw-bold mb-4">฿{room.price?.toLocaleString()} <span className="fs-6 text-muted fw-normal">/ เดือน</span></h3>
                
                <h5 className="fw-bold mb-3">รายละเอียด</h5>
                <p className="text-muted mb-4" style={{ lineHeight: "1.8" }}>
                  {room.description || "ห้องพักสะอาด ปลอดภัย เดินทางสะดวก ใกล้แหล่งของกินและสถานศึกษา พร้อมเข้าอยู่ได้ทันที"}
                </p>

                <div className="row g-3 mb-4">
                  <div className="col-6"><div className="p-3 bg-light rounded-3 text-center fw-bold" style={{fontSize: '0.9rem'}}>❄️ เครื่องปรับอากาศ</div></div>
                  <div className="col-6"><div className="p-3 bg-light rounded-3 text-center fw-bold" style={{fontSize: '0.9rem'}}>🛏️ เฟอร์นิเจอร์ครบ</div></div>
                  <div className="col-6"><div className="p-3 bg-light rounded-3 text-center fw-bold" style={{fontSize: '0.9rem'}}>🚿 เครื่องทำน้ำอุ่น</div></div>
                  <div className="col-6"><div className="p-3 bg-light rounded-3 text-center fw-bold" style={{fontSize: '0.9rem'}}>📶 ฟรี Wi-Fi</div></div>
                </div>

                {room.status === 'available' && (
                  status === "unauthenticated" ? (
                    <button onClick={() => router.push("/login")} className="btn btn-outline-primary btn-lg rounded-pill fw-bold w-100 py-3 mb-3">
                      🔒 เข้าสู่ระบบเพื่อสอบถามข้อมูล
                    </button>
                  ) : (
                    <button onClick={handleOpenChat} className="btn btn-primary btn-lg rounded-pill fw-bold shadow-sm w-100 py-3 mb-3 pulse-animation">
                      💬 สนใจ / สอบถามข้อมูลเพิ่มเติม
                    </button>
                  )
                )}

                {/* ======================================================= */}
                {/* 🌟 ช่องทางการติดต่ออื่นๆ (แสดงอยู่ใต้ปุ่มจอง/แชทเสมอ) */}
                {/* ======================================================= */}
                <div className="mt-2 pt-3 border-top">
                  <div className="text-muted small mb-3 text-center fw-bold">หรือติดต่อแอดมินโดยตรงผ่านช่องทางอื่น</div>
                  <div className="row g-2">
                    <div className="col-4">
                      <a href="tel:0812345678" className="btn btn-light w-100 rounded-3 border fw-bold text-dark d-flex flex-column align-items-center py-2" style={{fontSize: "0.8rem"}}>
                        <span className="fs-5 mb-1">📞</span> โทร
                      </a>
                    </div>
                    <div className="col-4">
                      <button onClick={() => setShowQR(true)} className="btn btn-success w-100 rounded-3 fw-bold border-0 shadow-sm d-flex flex-column align-items-center py-2" style={{fontSize: "0.8rem"}}>
                        <span className="fs-5 mb-1">💬</span> LINE
                      </button>
                    </div>
                    <div className="col-4">
                      <a href="https://m.me/yourfacebookpage" target="_blank" className="btn btn-primary w-100 rounded-3 fw-bold border-0 shadow-sm d-flex flex-column align-items-center py-2" style={{fontSize: "0.8rem"}}>
                        <span className="fs-5 mb-1">📘</span> FB Inbox
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {!isChatOpen && status === "authenticated" && (
        <button 
          onClick={handleOpenChat}
          className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center pulse-animation"
          style={{ position: "fixed", bottom: "30px", right: "30px", width: "65px", height: "65px", zIndex: 1000, fontSize: "28px" }}
        >
          💬
        </button>
      )}

      {isChatOpen && (
        <div 
          className="card shadow-lg border-0 rounded-4 d-flex flex-column slide-in-bottom"
          style={{ position: "fixed", bottom: "30px", right: "30px", width: "360px", height: "500px", zIndex: 1050, overflow: "hidden" }}
        >
          <div className="card-header bg-primary text-white p-3 d-flex justify-content-between align-items-center border-0">
            <h6 className="mb-0 fw-bold">💬 สอบถามห้อง {room.roomNumber}</h6>
            <button onClick={() => setIsChatOpen(false)} className="btn btn-sm btn-light text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: "28px", height: "28px", padding: 0}}>✖</button>
          </div>

          {booking?.status !== 'approved' && booking?.status !== 'rejected' && (
            <div className="bg-light p-2 text-center border-bottom">
              <button className="btn btn-sm btn-warning fw-bold rounded-pill shadow-sm px-4" onClick={() => setShowModal(true)}>
                📝 ทำสัญญา / นัดดูห้อง
              </button>
            </div>
          )}

          <div className="card-body p-3 overflow-auto bg-body-tertiary d-flex flex-column gap-3" style={{ flexGrow: 1 }}>
            <div className="text-center text-muted small mb-2 opacity-50">--- เริ่มการสนทนา ---</div>
            {messages.map((msg, idx) => {
              const isMe = msg.senderRole === "customer";
              return (
                <div key={idx} className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                  <div className="small text-muted mb-1 px-1" style={{fontSize: "0.65rem"}}>{msg.senderName}</div>
                  <div className={`px-3 py-2 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                       style={{ maxWidth: "85%", wordBreak: "break-word", borderBottomRightRadius: isMe ? "4px" : "16px", borderBottomLeftRadius: !isMe ? "4px" : "16px", fontSize: "0.9rem" }}>
                    {msg.text}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: "0.6rem" }}>
                    {new Date(msg.createdAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="card-footer bg-white p-2 border-top">
            <form onSubmit={handleSendMessage} className="d-flex gap-2">
              <input type="text" className="form-control rounded-pill px-3 bg-light border-0" placeholder="พิมพ์ข้อความ..." value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={booking?.status === 'approved' || booking?.status === 'rejected'} />
              <button type="submit" className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: "40px", height: "40px" }} disabled={!inputText.trim()}>➤</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal ทำสัญญา/นัดหมาย */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        {/* ... (โค้ด Modal ทำสัญญาเหมือนเดิม) ... */}
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-primary px-2">ดำเนินการห้อง {room.roomNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Tabs activeKey={contractMethod} onSelect={(k) => setContractMethod(k || 'online')} className="mb-4 nav-fill">
            
            <Tab eventKey="online" title="🌐 ทำสัญญาออนไลน์">
              <Form onSubmit={handleSubmitContract} className="mt-3">
                <div className="alert alert-info border-0 rounded-3 small">ระบบจะให้กรอกเอกสารออนไลน์ (ย่อไว้เพื่อทดสอบ)</div>
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">📅 วันที่ต้องการย้ายเข้า</Form.Label>
                  <Form.Control type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} required={contractMethod === 'online'} />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังส่ง..." : "ส่งคำขอทำสัญญา"}
                </Button>
              </Form>
            </Tab>

            <Tab eventKey="view_room" title="👀 นัดดูห้องพัก">
              <Form onSubmit={handleSubmitContract} className="mt-3">
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">📅 เลือกวันและเวลาที่จะเข้ามาดูห้อง</Form.Label>
                  <Form.Control type="datetime-local" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required={contractMethod === 'view_room'} />
                </Form.Group>
                <Button variant="secondary" type="submit" className="w-100 rounded-pill fw-bold text-dark" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังส่ง..." : "ยืนยันการนัดหมาย"}
                </Button>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
      </Modal>

      {/* 🌟 Modal สำหรับแสดง QR Code LINE */}
      <Modal show={showQR} onHide={() => setShowQR(false)} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-success w-100 text-center">แอด LINE ของเรา</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center pb-4">
          <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="LINE QR Code" className="img-fluid mb-3 rounded-4 shadow-sm" style={{ width: "200px" }} />
          <p className="text-muted small mb-0">สแกนคิวอาร์โค้ดนี้เพื่อติดต่อแอดมิน</p>
          <p className="fw-bold fs-5 mt-2 text-dark">ID: @yourdorm</p>
          <a href="https://line.me/ti/p/~@yourdorm" target="_blank" className="btn btn-success rounded-pill w-100 fw-bold mt-2">
            หรือคลิกเพื่อแอดไลน์
          </a>
        </Modal.Body>
      </Modal>

    </div>
  );
}