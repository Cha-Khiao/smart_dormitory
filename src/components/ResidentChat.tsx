// src/components/ResidentChat.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function ResidentChat() {
  const { data: session, status } = useSession();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🌟 1. ค้นหาว่าลูกค้าคนนี้เคยเปิดแชท (หรือเคยจองห้อง) ไว้หรือยัง?
  useEffect(() => {
    const fetchMyBooking = async () => {
      if (!session?.user) return;
      const userId = (session.user as any).id || (session.user as any)._id;

      try {
        const res = await fetch(`/api/bookings?userId=${userId}&t=${new Date().getTime()}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.success && json.data.length > 0) {
          // หาการจอง หรือ แชท ที่ยังแอคทีฟอยู่
          const activeBooking = json.data.find((b: any) => 
            ['pending', 'pending_approval', 'appointment', 'approved', 'contacting', 'chatting'].includes(b.status.toLowerCase())
          );
          if (activeBooking) setBookingId(activeBooking._id);
        }
      } catch (error) {
        console.error("Failed to fetch booking", error);
      }
    };
    
    if (status === "authenticated") {
      fetchMyBooking();
      const interval = setInterval(fetchMyBooking, 5000); 
      return () => clearInterval(interval);
    }
  }, [session, status]);

  // 🌟 2. ดึงข้อความแชท (ถ้าเคยมีประวัติการคุย)
  useEffect(() => {
    if (!bookingId || !isChatOpen) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?bookingId=${bookingId}&t=${new Date().getTime()}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setMessages(json.data);
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [bookingId, isChatOpen]);

  // 3. เลื่อนแชทลงล่างสุด
  useEffect(() => {
    if (isChatOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isChatOpen, messages.length]);

  // 🌟 4. ฟังก์ชันส่งข้อความ (ฉลาดขึ้น: สร้างห้องแชทอัตโนมัติถ้ายังไม่เคยจอง)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage;
    setNewMessage(""); 

    // โชว์ข้อความให้ลูกค้าเห็นทันที (Optimistic UI)
    setMessages(prev => [...prev, {
      senderRole: "customer",
      senderName: session?.user?.name || "คุณ",
      text: msgText,
      createdAt: new Date().toISOString()
    }]);

    try {
      let currentBookingId = bookingId;
      const userId = (session?.user as any).id || (session?.user as any)._id;

      // 🚨 จุดพีค: ถ้าลูกค้ายังไม่เคยจองห้อง (ไม่มี bookingId) ให้สร้างแชท "ติดต่อสอบถาม" ขึ้นมาก่อน!
      if (!currentBookingId) {
        const resBooking = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomNumber: "ติดต่อสอบถาม", // 👈 ตั้งชื่อห้องเป็นสอบถาม แอดมินจะได้รู้
            userId: userId,
            username: session?.user?.name || "ผู้สนใจ",
            status: "chatting", // 👈 ใช้สถานะที่เราเพิ่งเพิ่มไป
          }),
        });
        const jsonBooking = await resBooking.json();
        if (jsonBooking.success) {
          currentBookingId = jsonBooking.data._id;
          setBookingId(currentBookingId); // จำ ID ไว้ใช้ครั้งหน้า
        } else {
          throw new Error("Cannot create chat session");
        }
      }

      // ส่งข้อความเข้าฐานข้อมูล
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: currentBookingId,
          senderId: userId,
          senderName: session?.user?.name || "ลูกค้า",
          senderRole: "customer",
          text: msgText,
        }),
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      console.error("Send message failed", error);
    }
  };

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
                <img src={part} alt="attachment" className="img-fluid rounded-3 shadow-sm border border-secondary-subtle" style={{ maxHeight: "150px", objectFit: "cover" }} />
              </a>
            </div>
          );
        }
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-decoration-underline text-white">[เปิดลิงก์]</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ซ่อนปุ่มถ้ายังไม่ได้ล็อกอิน (บังคับให้ล็อกอินก่อนถึงจะแชทได้)
  if (status === "unauthenticated") return null;

  return (
    <>
      {/* 💬 ปุ่มวงกลมสีน้ำเงิน โชว์ทุกสภาวะ! */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="btn btn-primary rounded-circle shadow-lg position-fixed d-flex justify-content-center align-items-center transition-all hover-scale"
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
          <div className="text-white p-3 d-flex justify-content-between align-items-center shadow-sm z-1 bg-primary">
            <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <span className="fs-5">🏢</span> สอบถามแอดมิน
            </h6>
            <button onClick={() => setIsChatOpen(false)} className="btn-close btn-close-white" aria-label="Close"></button>
          </div>

          <div className="card-body overflow-auto bg-body-tertiary p-3 d-flex flex-column gap-3" style={{ flexGrow: 1 }}>
            
            {/* ข้อความต้อนรับสำหรับคนยังไม่เคยทัก */}
            {messages.length === 0 ? (
              <div className="text-center text-body-secondary my-auto small">
                <div className="fs-1 mb-2">👋</div>
                <h6 className="fw-bold mb-1">ยินดีต้อนรับครับ!</h6>
                <p className="opacity-75 mb-0">มีข้อสงสัยเกี่ยวกับห้องพัก กฎระเบียบ <br/>หรือต้องการนัดดูห้อง พิมพ์ถามได้เลยครับ</p>
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
                      style={{ maxWidth: "85%", wordBreak: "break-word", borderRadius: "16px", borderBottomRightRadius: isMe ? "4px" : "16px", borderBottomLeftRadius: !isMe ? "4px" : "16px" }}
                    >
                      {renderMessageContent(msg.text)}
                    </div>
                    <div className="text-body-secondary mt-1" style={{ fontSize: "0.65rem" }}>
                      {new Date(msg.createdAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-body border-top border-secondary-subtle shadow-sm z-1">
            <form onSubmit={handleSendMessage} className="d-flex gap-2">
              <input
                type="text"
                className="form-control rounded-pill bg-body-tertiary border-secondary-subtle text-body px-3"
                placeholder="พิมพ์ข้อความ..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="btn btn-primary rounded-circle d-flex justify-content-center align-items-center shadow-sm" style={{ width: "40px", height: "40px" }} disabled={!newMessage.trim()}>
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}