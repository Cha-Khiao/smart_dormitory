"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

export default function AdminInboxPage() {
  const { data: session } = useSession();
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null); 
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [debugMode, setDebugMode] = useState(false); // 🌟 เพิ่มตัวช่วยเช็คข้อมูล
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. ฟังก์ชันดึงข้อมูล (ทะลวง Cache 100%)
  const fetchBookings = async () => {
    try {
      const res = await fetch(`/api/bookings?t=${new Date().getTime()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBookings(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch bookings");
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 2. ดึงข้อความแชท + เคลียร์ตัวเลขแจ้งเตือน
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?bookingId=${selectedChat._id}&t=${new Date().getTime()}`);
        const json = await res.json();
        
        if (json.success && Array.isArray(json.data)) {
          setMessages(json.data);
          
          const hasUnread = json.data.some((m: any) => m.isRead !== true && m.senderRole === 'customer');
          if (hasUnread) {
            await fetch("/api/messages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId: selectedChat._id, readerRole: "admin" })
            });
            fetchBookings(); 
          }
        }
      } catch (error) {
        console.error("Failed to fetch messages");
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  // ลบ useEffect ตัวเก่าที่คุม messagesEndRef ออก แล้วใช้โค้ดนี้แทน
  useEffect(() => {
    // เลื่อนจอลงล่างสุดเฉพาะตอนคลิกเปลี่ยนคนคุย (เปิดแชทใหม่)
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [selectedChat]); // เปลี่ยน Dependency จาก [messages] เป็น [selectedChat]

  // 3. ฟังก์ชันแอดมินส่งข้อความ
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat) return;

    const newMessage = {
      bookingId: selectedChat._id,
      senderId: (session?.user as any)?.id || "admin_id",
      senderName: "Admin",
      senderRole: "admin",
      text: inputText,
    };

    setMessages((prev) => [...prev, { ...newMessage, createdAt: new Date() }]);
    setInputText("");

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMessage),
    });
  };

  // 4. ฟังก์ชันจัดการสถานะ (อนุมัติ / ปฏิเสธ / จบสัญญา)
  const handleAction = (status: string) => {
    const actionText = status === 'approved' ? 'อนุมัติเข้าอยู่' : 'ปฏิเสธ/จบสัญญา';
    const confirmColor = status === 'approved' ? '#198754' : '#dc3545';

    Swal.fire({
      title: `ยืนยันการ${actionText}?`,
      text: `ห้อง ${selectedChat.roomNumber} ลูกค้า: ${selectedChat.username}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: "#6c757d",
      confirmButtonText: `ใช่, ${actionText}เลย`,
      cancelButtonText: "ยกเลิก"
    }).then(async (result) => {
      if (result.isConfirmed) {
        const toastId = toast.loading(`กำลัง${actionText}...`);
        try {
          const res = await fetch("/api/bookings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              id: selectedChat._id, 
              status, 
              roomId: selectedChat.roomId, 
              userId: selectedChat.userId, 
              roomNumber: selectedChat.roomNumber 
            })
          });
          const json = await res.json();
          
          if (json.success) {
            toast.success(`${actionText}สำเร็จ!`, { id: toastId });
            await fetch("/api/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: selectedChat._id, 
                senderId: (session?.user as any)?.id || "admin_id", 
                senderName: "System", 
                senderRole: "admin",
                text: status === 'approved' ? "🎉 แอดมินได้อนุมัติการเข้าพักของคุณเรียบร้อยแล้ว!" : "❌ ขออภัย คำขอของคุณถูกปฏิเสธ/ยกเลิก"
              })
            });
            fetchBookings(); 
            setSelectedChat(null); 
          }
        } catch (error) {
          toast.error("เกิดข้อผิดพลาดในการทำรายการ", { id: toastId });
        }
      }
    });
  };

  // 5. จัดกลุ่มตามห้องพัก ป้องกันตัวแปร undefined ทะลุเข้ามารบกวนระบบ
  const groupedBookings = bookings.reduce((groups: any, booking: any) => {
    const room = booking.roomNumber || "ไม่ระบุ"; // กันเหนียว
    if (!groups[room]) groups[room] = { list: [], unreadCustomers: 0 };
    
    groups[room].list.push(booking);
    if (booking.unreadCount > 0) {
      groups[room].unreadCustomers += 1;
    }
    return groups;
  }, {});

  const roomList = Object.keys(groupedBookings).sort(); 
  const formatBadge = (count: number) => count > 99 ? '99+' : count;
  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  // ฟังก์ชันสุดล้ำ: สแกนหา URL รูปภาพในข้อความ แล้วแปลงร่างเป็นรูปภาพจริงๆ
  const renderMessageContent = (text: string, isBubbleDark: boolean) => {
    if (!text) return null;
    
    // ตรวจจับ URL 
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        // ถ้าเป็นลิงก์จาก Cloudinary หรือไฟล์รูปภาพ
        if (part.includes('cloudinary.com') || part.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
          return (
            <div key={i} className="mt-2 mb-1">
              <a href={part} target="_blank" rel="noopener noreferrer" title="คลิกเพื่อดูรูปขนาดเต็ม">
                <img 
                  src={part} 
                  alt="เอกสารแนบ" 
                  className="img-fluid rounded-3 shadow-sm border border-light" 
                  style={{ maxHeight: "180px", maxWidth: "100%", objectFit: "cover", cursor: "zoom-in" }} 
                />
              </a>
              <div className="small text-end mt-1" style={{fontSize: "0.6rem", opacity: 0.8}}>🔍 คลิกเพื่อดูรูปเต็ม</div>
            </div>
          );
        }
        // ถ้าเป็นลิงก์เว็บธรรมดา
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
             className={`text-decoration-underline ${isBubbleDark ? 'text-white' : 'text-primary'}`}>
            [เปิดลิงก์แนบ]
          </a>
        );
      }
      // ข้อความธรรมดา
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="container-fluid position-relative" style={{ height: "85vh" }}>
      
      {/* 🌟 ป้ายเช็คข้อมูล (กดที่ป้ายเพื่อดู Debug เผื่อมีปัญหา) */}
      <div className="position-absolute top-0 end-0 mt-2 me-3" onClick={() => setDebugMode(!debugMode)} style={{cursor: 'pointer'}}>
        <span className={`badge ${bookings.length > 0 ? 'bg-success' : 'bg-secondary'}`}>
          ข้อมูลที่ดึงได้: {bookings.length} รายการ
        </span>
      </div>

      <h2 className="mb-4 text-primary fw-bold">ระบบสนทนาลูกค้า (Admin Chat)</h2>

      <div className="row h-100 g-2">
        {/* ==================== คอลัมน์ 1: ห้องพัก ==================== */}
        <div className="col-md-2 h-100">
          <div className="card shadow-sm border-0 h-100 bg-body-tertiary">
            <div className="card-header bg-primary text-white border-0 py-3 rounded-top-4">
              <h6 className="fw-bold mb-0 text-center">🏢 เลือกห้องพัก</h6>
            </div>
            <div className="card-body p-2 overflow-auto">
              {roomList.length === 0 ? (
                <div className="text-center text-muted mt-5 small">
                  {bookings.length === 0 ? "ไม่มีรายการสนทนา" : "กำลังโหลดข้อมูล..."}
                </div>
              ) : (
                <div className="list-group list-group-flush gap-1">
                  {roomList.map((room) => {
                    const unreadCount = groupedBookings[room].unreadCustomers;
                    return (
                      <button 
                        key={room}
                        className={`list-group-item list-group-item-action rounded-3 border-0 py-3 fw-bold d-flex justify-content-between align-items-center ${selectedRoom === room ? 'bg-primary text-white shadow-sm' : 'bg-body'}`}
                        onClick={() => { setSelectedRoom(room); setSelectedChat(null); }}
                      >
                        <span>ห้อง {room}</span>
                        {unreadCount > 0 && (
                          <span className="badge bg-danger rounded-pill shadow-sm">{formatBadge(unreadCount)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== คอลัมน์ 2: ลูกค้า ==================== */}
        <div className="col-md-3 h-100">
          <div className="card shadow-sm border-0 h-100 bg-body-tertiary">
            <div className="card-header bg-white border-bottom py-3 rounded-top-4">
              <h6 className="fw-bold mb-0 text-primary">
                {selectedRoom ? `👤 ลูกค้าที่สนใจห้อง ${selectedRoom}` : '👈 กรุณาเลือกห้องก่อน'}
              </h6>
            </div>
            <div className="card-body p-2 overflow-auto">
              {!selectedRoom ? (
                <div className="text-center text-muted mt-5 opacity-50">
                  <div className="display-4 mb-2">⬅️</div>
                  <small>เลือกห้องจากเมนูด้านซ้าย</small>
                </div>
              ) : (
                <div className="list-group list-group-flush gap-1">
                  {groupedBookings[selectedRoom]?.list.map((b: any) => (
                    <button 
                      key={b._id} 
                      className={`list-group-item list-group-item-action border-0 rounded-3 p-3 mb-1 ${selectedChat?._id === b._id ? 'bg-primary-subtle border-start border-4 border-primary' : 'bg-body'}`}
                      onClick={() => {
                        setSelectedChat(b);
                        setBookings(prev => prev.map(item => item._id === b._id ? { ...item, unreadCount: 0 } : item));
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="text-dark text-truncate" style={{maxWidth: "70%"}}>{b.username}</strong>
                        {b.unreadCount > 0 && (
                           <span className="badge bg-danger rounded-pill shadow-sm">{formatBadge(b.unreadCount)}</span>
                        )}
                      </div>
                      <div className="small text-muted d-flex justify-content-between align-items-center">
                        <span className={`badge ${
                            b.status === 'approved' ? 'bg-success' : 
                            (b.status === 'pending_approval' || b.status === 'appointment') ? 'bg-warning text-dark' : 'bg-light text-dark border'
                          }`} style={{ fontSize: '0.65rem' }}>
                            {b.status === 'approved' ? '⭐ ลูกบ้าน' : 
                             b.status === 'pending_approval' ? 'ส่งเอกสารแล้ว' : 
                             b.status === 'appointment' ? 'มีนัดหมาย' : 'ผู้สนใจ'}
                        </span>
                        <span style={{ fontSize: '0.7rem' }}>{formatTime(b.updatedAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== คอลัมน์ 3: หน้าต่างแชท ==================== */}
        <div className="col-md-7 h-100">
          {selectedChat ? (
            <div className="card shadow-sm border-0 h-100 d-flex flex-column rounded-4">
              
              {(selectedChat.status === 'pending_approval' || selectedChat.status === 'appointment' || selectedChat.status === 'approved') && (
                <div className={`card-header border-0 p-3 rounded-top-4 shadow-sm z-1 ${selectedChat.status === 'approved' ? 'bg-success-subtle' : 'bg-warning-subtle'}`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-1">
                        {selectedChat.status === 'pending_approval' ? '⚠️ ลูกค้าส่งเอกสารทำสัญญาออนไลน์' : 
                         selectedChat.status === 'appointment' ? '⚠️ ลูกค้าขอนัดหมายหน้างาน' : 
                         '⭐ สถานะ: ลูกบ้าน (กำลังเช่าห้องนี้)'}
                      </h6>
                      {selectedChat.status === 'pending_approval' ? (
                         <div className="small text-muted">ย้ายเข้า: {selectedChat.moveInDate} | <a href={selectedChat.idCardUrl} target="_blank" className="ms-2 fw-bold text-primary">ดูบัตร ปชช.</a> | <a href={selectedChat.slipUrl} target="_blank" className="ms-2 fw-bold text-success">ดูสลิปโอนเงิน</a></div>
                      ) : selectedChat.status === 'appointment' ? (
                         <div className="small text-muted fw-bold text-primary">วันเวลานัดหมาย: {new Date(selectedChat.appointmentDate).toLocaleString('th-TH')}</div>
                      ) : (
                         <div className="small text-muted">สามารถพิมพ์แชทเพื่อแจ้งข่าวสารหรือทวงค่าเช่าได้เลย</div>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      {selectedChat.status !== 'approved' ? (
                        <>
                          <button className="btn btn-sm btn-danger fw-bold rounded-pill px-3 shadow-sm" onClick={() => handleAction('rejected')}>❌ ปฏิเสธ</button>
                          <button className="btn btn-sm btn-success fw-bold rounded-pill px-3 shadow-sm" onClick={() => handleAction('approved')}>✅ อนุมัติ</button>
                        </>
                      ) : (
                        <button className="btn btn-sm btn-danger fw-bold rounded-pill px-3 shadow-sm" onClick={() => handleAction('rejected')}>🔴 จบสัญญา / ย้ายออก</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!(selectedChat.status === 'pending_approval' || selectedChat.status === 'appointment' || selectedChat.status === 'approved') && (
                 <div className="card-header bg-white border-bottom p-3 rounded-top-4 d-flex justify-content-between shadow-sm z-1">
                   <h6 className="mb-0 fw-bold text-primary">💬 สนทนากับคุณ {selectedChat.username}</h6>
                   <span className="badge bg-light text-dark border shadow-sm">ห้อง {selectedChat.roomNumber}</span>
                 </div>
              )}

              <div className="card-body p-4 overflow-auto bg-body-tertiary d-flex flex-column gap-3" style={{ flexGrow: 1 }}>
                <div className="text-center text-muted small mb-3">เริ่มการสนทนาห้อง {selectedChat.roomNumber}</div>
                {/* 🌟 เปลี่ยนจุดแสดงผลข้อความให้ฉลาดขึ้น */}
                {messages.map((msg, idx) => {
                  const isAdmin = msg.senderRole === "admin";
                  return (
                    <div key={idx} className={`d-flex flex-column ${isAdmin ? 'align-items-end' : 'align-items-start'}`}>
                      <div className="small text-muted mb-1 px-2">{msg.senderName}</div>
                      <div className="d-flex align-items-end gap-2" style={{ flexDirection: isAdmin ? 'row-reverse' : 'row' }}>
                        <div className={`px-3 py-2 rounded-4 shadow-sm ${isAdmin ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                             style={{ maxWidth: "280px", wordBreak: "break-word", borderBottomRightRadius: isAdmin ? "4px" : "16px", borderBottomLeftRadius: !isAdmin ? "4px" : "16px" }}>
                          
                          {/* 🎯 เรียกใช้ฟังก์ชันแปลงรูปภาพตรงนี้ แทนคำว่า {msg.text} เดิม */}
                          {renderMessageContent(msg.text, isAdmin)}

                        </div>
                        <div className="d-flex flex-column align-items-end" style={{ fontSize: "0.65rem" }}>
                          <span className="text-muted">{formatTime(msg.createdAt)}</span>
                          {isAdmin && msg.isRead && <span className="text-primary fw-bold">อ่านแล้ว</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="card-footer bg-body p-3 border-top-0 rounded-bottom-4 shadow-sm z-1">
                <form onSubmit={handleSendMessage} className="d-flex gap-2">
                  <input type="text" className="form-control rounded-pill px-4 bg-body-tertiary border-0" placeholder="พิมพ์ข้อความ..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
                  <button type="submit" className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }} disabled={!inputText.trim()}>➤</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="card shadow-sm border-0 h-100 d-flex align-items-center justify-content-center bg-body-tertiary rounded-4">
              <div className="text-muted text-center opacity-50">
                <div className="display-1 mb-3">💬</div>
                <h5>เลือกลูกค้าจากเมนูกลางเพื่อเริ่มสนทนา</h5>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}