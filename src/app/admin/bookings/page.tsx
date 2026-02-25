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
  const [debugMode, setDebugMode] = useState(false); 
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [selectedChat]); 

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
    
    // เลื่อนจอลงเวลาพิมพ์ข้อความใหม่
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
            setSelectedChat({ ...selectedChat, status: status }); // อัปเดต UI ทันที
          }
        } catch (error) {
          toast.error("เกิดข้อผิดพลาดในการทำรายการ", { id: toastId });
        }
      }
    });
  };

  // 5. จัดกลุ่มตามห้องพัก
  const groupedBookings = bookings.reduce((groups: any, booking: any) => {
    const room = booking.roomNumber || "ไม่ระบุ"; 
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

  // ฟังก์ชันแปลงลิงก์เป็นรูปภาพ
  const renderMessageContent = (text: string, isBubbleDark: boolean) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        if (part.includes('cloudinary.com') || part.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
          return (
            <div key={i} className="mt-2 mb-1">
              <a href={part} target="_blank" rel="noopener noreferrer" title="คลิกเพื่อดูรูปขนาดเต็ม">
                <img 
                  src={part} 
                  alt="เอกสารแนบ" 
                  className="img-fluid rounded-3 shadow-sm border border-secondary-subtle" 
                  style={{ maxHeight: "180px", maxWidth: "100%", objectFit: "cover", cursor: "zoom-in" }} 
                />
              </a>
              <div className="small text-end mt-1" style={{fontSize: "0.6rem", opacity: 0.8}}>🔍 คลิกเพื่อดูรูปเต็ม</div>
            </div>
          );
        }
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
             className={`text-decoration-underline ${isBubbleDark ? 'text-white' : 'text-primary'}`}>
            [เปิดลิงก์แนบ]
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="container-fluid py-3 position-relative" style={{ height: "88vh" }}>
      
      <div className="position-absolute top-0 end-0 mt-3 me-3" onClick={() => setDebugMode(!debugMode)} style={{cursor: 'pointer'}}>
        <span className={`badge ${bookings.length > 0 ? 'bg-success' : 'bg-secondary'}`}>
          ข้อมูลลูกค้า: {bookings.length}
        </span>
      </div>

      <h2 className="mb-4 text-primary fw-bold">💬 ระบบสนทนา & จัดการผู้เช่า</h2>

      <div className="row h-100 g-3">
        {/* ==================== คอลัมน์ 1: ห้องพัก ==================== */}
        <div className="col-md-2 h-100">
          <div className="card shadow-sm border-secondary-subtle h-100 bg-body-tertiary rounded-4">
            <div className="card-header bg-primary text-white border-0 py-3 rounded-top-4">
              <h6 className="fw-bold mb-0 text-center">🏢 ห้องพัก</h6>
            </div>
            <div className="card-body p-2 overflow-auto">
              {roomList.length === 0 ? (
                <div className="text-center text-body-secondary mt-5 small">
                  {bookings.length === 0 ? "ไม่มีรายการสนทนา" : "กำลังโหลดข้อมูล..."}
                </div>
              ) : (
                <div className="list-group list-group-flush gap-1">
                  {roomList.map((room) => {
                    const unreadCount = groupedBookings[room].unreadCustomers;
                    return (
                      <button 
                        key={room}
                        className={`list-group-item list-group-item-action rounded-3 border-0 py-3 fw-bold d-flex justify-content-between align-items-center ${selectedRoom === room ? 'bg-primary text-white shadow-sm' : 'bg-body text-body'}`}
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
          <div className="card shadow-sm border-secondary-subtle h-100 bg-body-tertiary rounded-4">
            <div className="card-header bg-body border-secondary-subtle py-3 rounded-top-4">
              <h6 className="fw-bold mb-0 text-primary">
                {selectedRoom ? `👤 ลูกค้าห้อง ${selectedRoom}` : '👈 เลือกห้องก่อน'}
              </h6>
            </div>
            <div className="card-body p-2 overflow-auto">
              {!selectedRoom ? (
                <div className="text-center text-body-secondary mt-5 opacity-50">
                  <div className="display-4 mb-2">⬅️</div>
                  <small>คลิกเลือกห้องจากเมนูด้านซ้าย</small>
                </div>
              ) : (
                <div className="list-group list-group-flush gap-2">
                  {groupedBookings[selectedRoom]?.list.map((b: any) => (
                    <button 
                      key={b._id} 
                      className={`list-group-item list-group-item-action border border-secondary-subtle rounded-3 p-3 ${selectedChat?._id === b._id ? 'bg-primary-subtle border-primary' : 'bg-body'}`}
                      onClick={() => {
                        setSelectedChat(b);
                        setBookings(prev => prev.map(item => item._id === b._id ? { ...item, unreadCount: 0 } : item));
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className="text-body text-truncate" style={{maxWidth: "75%"}}>{b.username}</strong>
                        {b.unreadCount > 0 && (
                           <span className="badge bg-danger rounded-pill shadow-sm">{formatBadge(b.unreadCount)}</span>
                        )}
                      </div>
                      <div className="small text-body-secondary d-flex flex-column gap-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className={`badge ${b.status === 'approved' ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {b.status === 'approved' ? '⭐ ลูกบ้าน' : 'รอตรวจสอบ'}
                          </span>
                          <span style={{ fontSize: '0.7rem' }}>{formatTime(b.updatedAt)}</span>
                        </div>
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
            <div className="card shadow-sm border-secondary-subtle h-100 d-flex flex-column rounded-4 bg-body">
              
              {/* 🌟 รวบ Header เป็นอันเดียว ตรรกะง่ายๆ: เป็นลูกบ้าน หรือ ยังไม่เป็น */}
              <div className={`card-header border-bottom border-secondary-subtle p-3 rounded-top-4 shadow-sm z-1 ${selectedChat.status === 'approved' ? 'bg-success-subtle' : 'bg-warning-subtle'}`}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="fw-bold mb-1" style={{ color: 'var(--bs-heading-color)' }}>
                      💬 สนทนากับคุณ {selectedChat.username}
                    </h5>
                    <div className="small" style={{ color: 'var(--bs-body-color)', opacity: 0.8 }}>
                      {selectedChat.status === 'approved' 
                        ? '⭐ สถานะ: ลูกบ้าน (สามารถพิมพ์แจ้งข่าวสารหรือทวงค่าเช่าได้เลย)' 
                        : '⚠️ สถานะ: ผู้สนใจ / รอดำเนินการ (ตรวจสอบเอกสารในแชทให้เรียบร้อยก่อนกดอนุมัติ)'}
                    </div>
                  </div>
                  
                  {/* ปุ่ม Action */}
                  <div className="d-flex gap-2">
                    {selectedChat.status !== 'approved' ? (
                      <>
                        <button className="btn btn-sm btn-danger fw-bold rounded-pill px-3 shadow-sm" onClick={() => handleAction('rejected')}>❌ ปฏิเสธ</button>
                        <button className="btn btn-sm btn-success fw-bold rounded-pill px-3 shadow-sm" onClick={() => handleAction('approved')}>✅ อนุมัติให้เข้าอยู่</button>
                      </>
                    ) : (
                      <button className="btn btn-outline-danger btn-sm fw-bold rounded-pill px-3 shadow-sm bg-body" onClick={() => handleAction('rejected')}>🔴 จบสัญญา (ย้ายออก)</button>
                    )}
                  </div>
                </div>
              </div>

              {/* พื้นที่แชท */}
              <div className="card-body p-4 overflow-auto bg-body-tertiary d-flex flex-column gap-3" style={{ flexGrow: 1 }}>
                <div className="text-center text-body-secondary small mb-3 opacity-50">เริ่มการสนทนาห้อง {selectedChat.roomNumber}</div>
                
                {messages.map((msg, idx) => {
                  const isAdmin = msg.senderRole === "admin";
                  return (
                    <div key={idx} className={`d-flex flex-column ${isAdmin ? 'align-items-end' : 'align-items-start'}`}>
                      <div className="small text-body-secondary mb-1 px-2">{msg.senderName}</div>
                      <div className="d-flex align-items-end gap-2" style={{ flexDirection: isAdmin ? 'row-reverse' : 'row' }}>
                        
                        <div className={`px-3 py-2 rounded-4 shadow-sm ${isAdmin ? 'bg-primary text-white' : 'bg-body border border-secondary-subtle text-body'}`}
                             style={{ maxWidth: "320px", wordBreak: "break-word", borderBottomRightRadius: isAdmin ? "4px" : "16px", borderBottomLeftRadius: !isAdmin ? "4px" : "16px" }}>
                          {renderMessageContent(msg.text, isAdmin)}
                        </div>
                        
                        <div className="d-flex flex-column align-items-end" style={{ fontSize: "0.65rem" }}>
                          <span className="text-body-secondary">{formatTime(msg.createdAt)}</span>
                          {isAdmin && msg.isRead && <span className="text-primary fw-bold">อ่านแล้ว</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* ช่องพิมพ์ข้อความ */}
              <div className="card-footer bg-body p-3 border-top border-secondary-subtle rounded-bottom-4 shadow-sm z-1">
                <form onSubmit={handleSendMessage} className="d-flex gap-2">
                  <input 
                    type="text" 
                    className="form-control rounded-pill px-4 bg-body-tertiary border-secondary-subtle text-body" 
                    placeholder="พิมพ์ข้อความตอบกลับ..." 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                  />
                  <button type="submit" className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: "45px", height: "45px" }} disabled={!inputText.trim()}>
                    ➤
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="card shadow-sm border-secondary-subtle h-100 d-flex align-items-center justify-content-center bg-body-tertiary rounded-4">
              <div className="text-body-secondary text-center opacity-50">
                <div className="display-1 mb-3">💬</div>
                <h5>เลือกลูกค้าจากเมนูกลางเพื่อเริ่มตรวจสอบเอกสาร</h5>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}