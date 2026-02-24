// src/components/ResidentChat.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function ResidentChat() {
  const { data: session } = useSession();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. ค้นหา Booking ID ของลูกบ้านคนนี้
  useEffect(() => {
    const fetchMyBooking = async () => {
      if (!session?.user) return;
      try {
        const res = await fetch(`/api/bookings?userId=${(session.user as any).id}`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          // ดึงห้องที่ได้รับการอนุมัติแล้ว
          const activeBooking = json.data.find((b: any) => b.status === "approved");
          if (activeBooking) setBookingId(activeBooking._id);
        }
      } catch (error) {
        console.error("Failed to fetch booking", error);
      }
    };
    fetchMyBooking();
  }, [session]);

  // 2. ดึงข้อความแชท (ดึงใหม่ทุก 3 วินาทีเมื่อเปิดแชทอยู่)
  useEffect(() => {
    if (!bookingId || !isChatOpen) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?bookingId=${bookingId}`);
        const json = await res.json();
        if (json.success) {
          setMessages(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [bookingId, isChatOpen]);

  // 3. เลื่อนแชทลงล่างสุด (เฉพาะตอนเปิดหน้าต่างแชท หรือพิมพ์ข้อความใหม่)
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isChatOpen, messages.length]); // อัปเดตเมื่อความยาวข้อความเปลี่ยน

  // 4. ฟังก์ชันส่งข้อความ
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !bookingId) return;

    const msgText = newMessage;
    setNewMessage(""); // เคลียร์ช่องพิมพ์ทันทีให้รู้สึกลื่นไหล

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          senderId: (session?.user as any).id,
          senderName: session?.user?.name || "ลูกบ้าน",
          senderRole: "customer",
          text: msgText,
        }),
      });
      // เลื่อนจอลงล่างสุดทันทีที่ส่ง
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      console.error("Send message failed", error);
    }
  };

  // ฟังก์ชันแปลงลิงก์รูปให้เป็นรูปภาพในแชท (เหมือนที่แอดมินมี)
  const renderMessageContent = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        if (part.includes('cloudinary.com') || part.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
          return (
            <div key={i} className="mt-2 mb-1">
              <a href={part} target="_blank" rel="noopener noreferrer">
                <img src={part} alt="attachment" className="img-fluid rounded-3 shadow-sm border" style={{ maxHeight: "150px", objectFit: "cover" }} />
              </a>
            </div>
          );
        }
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-decoration-underline text-white">[เปิดลิงก์]</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ถ้ายังไม่เจอข้อมูลการเช่า ไม่ต้องโชว์ปุ่มแชท
  if (!bookingId) return null;

  return (
    <>
      {/* 💬 ปุ่มวงกลม ลอยตัวอยู่มุมขวาล่าง */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="btn btn-primary rounded-circle shadow-lg position-fixed d-flex justify-content-center align-items-center transition-all"
        style={{ bottom: "30px", right: "30px", width: "65px", height: "65px", zIndex: 1050 }}
      >
        <span className="fs-2">{isChatOpen ? "⬇️" : "💬"}</span>
      </button>

      {/* 💬 หน้าต่างแชท */}
      {isChatOpen && (
        <div 
          className="card shadow-lg position-fixed border border-secondary-subtle rounded-4 overflow-hidden bg-body" 
          style={{ bottom: "110px", right: "30px", width: "350px", height: "500px", zIndex: 1050, display: 'flex', flexDirection: 'column' }}
        >
          {/* Header แชท */}
          <div className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <span className="fs-5">🏢</span> ติดต่อแอดมิน
            </h6>
            <button onClick={() => setIsChatOpen(false)} className="btn-close btn-close-white" aria-label="Close"></button>
          </div>

          {/* พื้นที่แสดงข้อความ */}
          <div className="card-body overflow-auto bg-body-tertiary p-3 d-flex flex-column gap-3" style={{ flexGrow: 1 }}>
            {messages.length === 0 ? (
              <div className="text-center text-body-secondary my-auto opacity-50 small">
                พิมพ์ข้อความเพื่อสอบถามแอดมินได้เลยครับ
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderRole === "customer";
                return (
                  <div key={idx} className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                    <div className="small text-body-secondary mb-1 px-1" style={{fontSize: "0.7rem"}}>
                      {isMe ? "คุณ" : "ผู้ดูแลระบบ"}
                    </div>
                    <div 
                      className={`px-3 py-2 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-body border border-secondary-subtle text-body'}`}
                      style={{ 
                        maxWidth: "85%", wordBreak: "break-word", 
                        borderRadius: "16px",
                        borderBottomRightRadius: isMe ? "4px" : "16px", 
                        borderBottomLeftRadius: !isMe ? "4px" : "16px" 
                      }}
                    >
                      {renderMessageContent(msg.text)}
                    </div>
                    <div className="text-body-secondary mt-1" style={{ fontSize: "0.6rem" }}>
                      {new Date(msg.createdAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ช่องพิมพ์ข้อความ */}
          <div className="p-3 bg-body border-top border-secondary-subtle">
            <form onSubmit={handleSendMessage} className="d-flex gap-2">
              <input
                type="text"
                className="form-control rounded-pill bg-body-tertiary border-secondary-subtle text-body"
                placeholder="พิมพ์ข้อความ..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="btn btn-primary rounded-circle d-flex justify-content-center align-items-center" style={{ width: "40px", height: "40px" }} disabled={!newMessage.trim()}>
                🚀
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}