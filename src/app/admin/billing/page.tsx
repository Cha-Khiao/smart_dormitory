// src/app/admin/billing/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { Modal, Form, Button } from "react-bootstrap";

const getLocalISOString = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function BillingDashboard() {
  const { data: session } = useSession();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // การตั้งค่าระบบ
  const [billingConfig, setBillingConfig] = useState({ startDateTime: "", endDateTime: "" });
  const [tempConfig, setTempConfig] = useState({ startDateTime: "", endDateTime: "" });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // ระบบตั้งเวลา 
  const [timerState, setTimerState] = useState<"WAITING" | "OPEN" | "ENDED">("WAITING");
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [manuallyUnlockedRooms, setManuallyUnlockedRooms] = useState<string[]>([]);
  
  // 🌟 State ใหม่: เก็บข้อมูลห้องที่กรอกบิลเสร็จแล้วในรอบนี้
  const [billedRooms, setBilledRooms] = useState<string[]>([]);

  // 🌟 State ใหม่: สำหรับระบบแบ่งหน้า (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [billForm, setBillForm] = useState({ month: "", room: 0, water: 0, electric: 0, other: 0 });

  useEffect(() => {
    const savedConfig = localStorage.getItem("billingConfigV2");
    if (savedConfig) {
      setBillingConfig(JSON.parse(savedConfig));
    } else {
      const now = new Date();
      const next5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      setBillingConfig({
        startDateTime: getLocalISOString(now),
        endDateTime: getLocalISOString(next5Days)
      });
    }
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch(`/api/bookings?t=${new Date().getTime()}`);
      const json = await res.json();
      if (json.success) setTenants(json.data.filter((b: any) => b.status === "approved"));
    } catch (error) {
      toast.error("ดึงข้อมูลลูกบ้านไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!billingConfig.startDateTime || !billingConfig.endDateTime) return;
      const now = new Date().getTime();
      const start = new Date(billingConfig.startDateTime).getTime();
      const end = new Date(billingConfig.endDateTime).getTime();
      let difference = 0;

      if (now < start) {
        setIsSystemUnlocked(false);
        setTimerState("WAITING");
        difference = start - now;
      } else if (now >= start && now <= end) {
        setIsSystemUnlocked(true);
        setTimerState("OPEN");
        difference = end - now;
      } else {
        setIsSystemUnlocked(false);
        setTimerState("ENDED");
        difference = 0;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [billingConfig]);

  const handleOpenSettings = () => {
    Swal.fire({
      title: "🔐 ยืนยันตัวตนแอดมิน",
      html: `กรุณากรอกรหัสผ่านของคุณ เพื่อเข้าสู่หน้าตั้งค่าเวลา`,
      input: "password",
      inputAttributes: { autocapitalize: "off", placeholder: "รหัสผ่านของคุณ" },
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "ตรวจสอบสิทธิ์",
      cancelButtonText: "ยกเลิก",
      showLoaderOnConfirm: true,
      preConfirm: async (password) => {
        if (!password) { Swal.showValidationMessage("กรุณากรอกรหัสผ่าน"); return false; }
        try {
          const res = await fetch('/api/admin/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: (session?.user as any)?.id, password })
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || "รหัสผ่านไม่ถูกต้อง");
          return true;
        } catch (error: any) {
          Swal.showValidationMessage(error.message);
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        setTempConfig(billingConfig);
        setShowConfigModal(true);
      }
    });
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(tempConfig.startDateTime).getTime();
    const end = new Date(tempConfig.endDateTime).getTime();
    
    if (start >= end) return toast.error("เวลาปิดระบบ ต้องอยู่หลังเวลาเปิดระบบเสมอ!");

    Swal.fire({
      title: "ยืนยันการเปลี่ยนแปลง?",
      text: `รอบบิลใหม่จะถูกกำหนดตามวันและเวลาที่คุณระบุอย่างแม่นยำ`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#198754",
      confirmButtonText: "บันทึกการตั้งค่า"
    }).then((result) => {
      if (result.isConfirmed) {
        setBillingConfig(tempConfig);
        localStorage.setItem("billingConfigV2", JSON.stringify(tempConfig));
        setShowConfigModal(false);
        toast.success("อัปเดตวันและเวลาสำเร็จ!", { icon: '⚙️' });
      }
    });
  };

  const handleForceUnlock = (roomNumber: string) => {
    Swal.fire({
      title: "⚠️ ปลดล็อกฉุกเฉิน?",
      text: `ปลดล็อกระบบออกบิลให้ห้อง ${roomNumber} ก่อนกำหนด ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "ใช่, ดำเนินการต่อ",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "🔒 ยืนยันความปลอดภัย",
          html: `กรุณาพิมพ์เลขห้อง <b>${roomNumber}</b> เพื่อยืนยัน`,
          input: "text",
          inputAttributes: { autocapitalize: "off" },
          showCancelButton: true,
          confirmButtonText: "ปลดล็อกระบบ",
          preConfirm: (val) => {
            if (val !== roomNumber) Swal.showValidationMessage("เลขห้องไม่ตรงกัน");
            return val === roomNumber;
          }
        }).then((finalResult) => {
          if (finalResult.isConfirmed) {
            setManuallyUnlockedRooms((prev) => [...prev, roomNumber]);
            toast.success(`ปลดล็อกห้อง ${roomNumber} แล้ว!`, { icon: '🔓' });
          }
        });
      }
    });
  };

  const openBillModal = (tenant: any) => {
    setSelectedTenant(tenant);
    const currentMonth = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    setBillForm({ month: currentMonth, room: 4000, water: 0, electric: 0, other: 0 });
    setShowBillModal(true);
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    const total = Number(billForm.room) + Number(billForm.water) + Number(billForm.electric) + Number(billForm.other);
    const toastId = toast.loading("กำลังส่งบิลให้ลูกค้า...");

    try {
      const res = await fetch("/api/bills", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedTenant.userId, roomId: selectedTenant.roomId, bookingId: selectedTenant._id,
          roomNumber: selectedTenant.roomNumber, month: billForm.month,
          roomFee: Number(billForm.room), waterFee: Number(billForm.water),
          electricFee: Number(billForm.electric), otherFee: Number(billForm.other), totalAmount: total
        })
      });

      if (res.ok) {
        await fetch("/api/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: selectedTenant._id, senderId: (session?.user as any)?.id, senderName: "System", senderRole: "admin",
            text: `🧾 ออกบิลค่าเช่าเดือน ${billForm.month} เรียบร้อยแล้ว ยอดรวม: ${total.toLocaleString()} บาท (กรุณาชำระเงินที่เมนู "ห้องพักของฉัน")`
          })
        });
        toast.success("ส่งบิลสำเร็จ!", { id: toastId });
        setShowBillModal(false);
        
        // 🌟 เพิ่มห้องนี้ลงในรายการ "ออกบิลแล้ว" เพื่อให้มันเด้งไปอยู่ล่างสุด
        setBilledRooms((prev) => [...prev, selectedTenant.roomNumber]);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการส่งบิล", { id: toastId });
    }
  };

  // =======================================================
  // 🌟 ระบบจัดเรียง (Sorting) และ แบ่งหน้า (Pagination)
  // =======================================================
  
  // 1. เรียงข้อมูล: คนที่ยังไม่ออกบิลอยู่บนสุด, คนที่ออกบิลแล้วไปอยู่ล่างสุด, เรียงตามเลขห้อง
  const sortedTenants = [...tenants].sort((a, b) => {
    const aIsBilled = billedRooms.includes(a.roomNumber);
    const bIsBilled = billedRooms.includes(b.roomNumber);
    
    if (aIsBilled && !bIsBilled) return 1;  // a ออกบิลแล้ว ให้เอาไปไว้ล่าง b
    if (!aIsBilled && bIsBilled) return -1; // b ออกบิลแล้ว ให้เอา a ไว้บน b
    
    // ถ้าสถานะเหมือนกัน ให้เรียงตามเลขห้อง (101, 102, 103...)
    return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  });

  // 2. ตัดข้อมูลให้แสดงแค่ 10 แถวต่อหน้า
  const totalPages = Math.ceil(sortedTenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTenants = sortedTenants.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container py-4 position-relative">
      
      <div className="position-absolute top-0 end-0 mt-4 me-3" style={{ zIndex: 10 }}>
        <button onClick={handleOpenSettings} className="btn btn-outline-secondary rounded-pill shadow-sm bg-white d-flex align-items-center gap-2 px-3 py-2 fw-bold border">
          <span style={{fontSize: '1.2rem'}}>⚙️</span> ตั้งค่าเวลาออกบิล
        </button>
      </div>

      <h2 className="mb-4 text-primary fw-bold">🧾 ระบบออกบิลอัตโนมัติ (Billing System)</h2>

      {/* นาฬิกานับถอยหลัง */}
      <div className={`card border-0 shadow-lg rounded-4 mb-4 overflow-hidden text-white ${timerState === 'OPEN' ? 'bg-success' : timerState === 'WAITING' ? 'bg-dark' : 'bg-danger'}`}>
        <div className="card-body p-4 p-md-5 text-center position-relative">
          <div className="display-1 position-absolute opacity-25" style={{ right: "50px", top: "20px" }}>{timerState === 'OPEN' ? '🔓' : '🔒'}</div>
          <h3 className="fw-bold mb-3">{timerState === 'OPEN' ? '✅ ระบบออกบิลเปิดทำงานแล้ว' : timerState === 'WAITING' ? '⏳ ระบบออกบิลยังไม่เปิดทำงาน' : '❌ รอบบิลนี้สิ้นสุดการทำงานแล้ว'}</h3>
          <p className="text-white-50 mb-4 fw-bold">{timerState === 'OPEN' ? `จะปิดระบบ (หมดเขตออกบิล) ในอีก:` : timerState === 'WAITING' ? `จะปลดล็อกอัตโนมัติ (เริ่มออกบิล) ในอีก:` : `กรุณาตั้งค่าวันเปิด-ปิดรอบบิลใหม่ที่เมนูมุมขวาบน`}</p>

          {timerState !== 'ENDED' && (
            <div className="d-flex justify-content-center gap-2 gap-md-3">
              <div className="bg-white bg-opacity-10 rounded-4 p-2 p-md-3 min-w-80px min-w-md-100px text-center">
                <div className="fs-1 fw-bold">{timeLeft.days}</div><div className="small text-uppercase">วัน</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-4 p-2 p-md-3 min-w-80px min-w-md-100px text-center">
                <div className="fs-1 fw-bold">{timeLeft.hours}</div><div className="small text-uppercase">ชม.</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-4 p-2 p-md-3 min-w-80px min-w-md-100px text-center">
                <div className="fs-1 fw-bold">{timeLeft.minutes}</div><div className="small text-uppercase">นาที</div>
              </div>
              <div className="bg-white bg-opacity-10 rounded-4 p-2 p-md-3 min-w-80px min-w-md-100px text-warning text-center">
                <div className="fs-1 fw-bold">{timeLeft.seconds}</div><div className="small text-uppercase">วินาที</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* 🌟 รายการห้องพัก (แบบตาราง Table Layout) */}
      {/* ======================================================= */}
      <div className="d-flex justify-content-between align-items-center mb-3 mt-5">
        <h4 className="fw-bold mb-0">🏠 รายการห้องพัก ({tenants.length} ห้อง)</h4>
        <span className="text-muted small">
          ออกบิลแล้ว <strong className="text-success">{billedRooms.length}</strong> / {tenants.length} ห้อง
        </span>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white mb-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">เลขห้อง</th>
                <th className="py-3">ชื่อลูกค้า</th>
                <th className="py-3">วันที่เริ่มสัญญา</th>
                <th className="py-3 text-center">สถานะระบบ</th>
                <th className="px-4 py-3 text-end">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted py-5">ไม่มีข้อมูลลูกบ้าน</td></tr>
              ) : (
                currentTenants.map((tenant) => {
                  const isManuallyUnlocked = manuallyUnlockedRooms.includes(tenant.roomNumber);
                  const canBill = isSystemUnlocked || isManuallyUnlocked;
                  const isAlreadyBilled = billedRooms.includes(tenant.roomNumber);

                  return (
                    // 🌟 ถ้าออกบิลแล้ว แถวจะจางลง (opacity-50) และไฮไลต์สีเขียวอ่อน
                    <tr key={tenant._id} className={isAlreadyBilled ? "bg-success bg-opacity-10" : ""}>
                      <td className="px-4 py-3">
                        <span className="badge bg-dark fs-6 shadow-sm">ห้อง {tenant.roomNumber}</span>
                      </td>
                      <td className="py-3 fw-bold text-dark">{tenant.username}</td>
                      <td className="py-3 text-muted">{new Date(tenant.updatedAt).toLocaleDateString('th-TH')}</td>
                      <td className="py-3 text-center">
                        {isAlreadyBilled ? (
                          <span className="badge bg-success px-3 py-2 rounded-pill">✅ ออกบิลแล้ว</span>
                        ) : canBill ? (
                          <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 rounded-pill">พร้อมออกบิล</span>
                        ) : (
                          <span className="badge bg-secondary px-3 py-2 rounded-pill">🔒 ล็อกอยู่</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        {isAlreadyBilled ? (
                           <button className="btn btn-sm btn-outline-success fw-bold rounded-pill px-4" disabled>
                             ออกบิลสำเร็จ
                           </button>
                        ) : canBill ? (
                          <button className="btn btn-sm btn-primary fw-bold rounded-pill px-4 shadow-sm" onClick={() => openBillModal(tenant)}>
                            🧾 สร้างบิล
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-outline-danger fw-bold rounded-pill px-3" onClick={() => handleForceUnlock(tenant.roomNumber)}>
                            ⚠️ ปลดล็อก (ย้ายออก)
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🌟 ระบบเปลี่ยนหน้า (Pagination) */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-2 mb-5">
          <button 
            className="btn btn-outline-primary rounded-pill px-3" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            &laquo; หน้าก่อนหน้า
          </button>
          <span className="fw-bold text-muted mx-3">หน้า {currentPage} จาก {totalPages}</span>
          <button 
            className="btn btn-outline-primary rounded-pill px-3" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            หน้าถัดไป &raquo;
          </button>
        </div>
      )}

      {/* ======================================================= */}
      {/* Modal: ตั้งเวลาละเอียด และ Modal ออกบิล (คงเดิมทั้งหมด) */}
      {/* ======================================================= */}
      <Modal show={showConfigModal} onHide={() => setShowConfigModal(false)} centered backdrop="static" size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-dark d-flex align-items-center gap-2">
            <span className="fs-3">⚙️</span> ตั้งเวลาเปิด-ปิด ระบบออกบิลแบบละเอียด
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleSaveConfig}>
            <div className="alert alert-success border-0 rounded-3 small text-dark fw-bold mb-4">✅ ยืนยันตัวตนสำเร็จ: คุณสามารถระบุ วัน-เดือน-ปี และเวลา ได้อย่างแม่นยำ</div>
            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-4 border">
                  <Form.Label className="fw-bold text-primary mb-2">🟢 เวลาเริ่มเปิดระบบ (Start)</Form.Label>
                  <Form.Control type="datetime-local" required value={tempConfig.startDateTime || ''} onChange={(e) => setTempConfig({...tempConfig, startDateTime: e.target.value})} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-4 border">
                  <Form.Label className="fw-bold text-danger mb-2">🛑 เวลาปิดระบบ (End)</Form.Label>
                  <Form.Control type="datetime-local" required value={tempConfig.endDateTime || ''} onChange={(e) => setTempConfig({...tempConfig, endDateTime: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 mt-4">
              <Button variant="light" className="w-50 rounded-pill fw-bold border" onClick={() => setShowConfigModal(false)}>ยกเลิก</Button>
              <Button variant="success" type="submit" className="w-50 rounded-pill fw-bold shadow-sm">💾 บันทึกและเริ่มนับเวลา</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showBillModal} onHide={() => setShowBillModal(false)} centered backdrop="static">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-primary">🧾 ออกบิลห้อง {selectedTenant?.roomNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateBill}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold text-muted small">ประจำเดือน</Form.Label>
              <Form.Control type="text" required value={billForm.month} onChange={(e) => setBillForm({...billForm, month: e.target.value})} />
            </Form.Group>
            <div className="row g-3 mb-4">
              <div className="col-6"><Form.Label className="fw-bold small mb-1">ค่าห้อง (บาท)</Form.Label><Form.Control type="number" required value={billForm.room || ''} onChange={(e) => setBillForm({...billForm, room: Number(e.target.value)})} /></div>
              <div className="col-6"><Form.Label className="fw-bold small mb-1 text-primary">💧 ค่าน้ำ (บาท)</Form.Label><Form.Control type="number" required value={billForm.water || ''} onChange={(e) => setBillForm({...billForm, water: Number(e.target.value)})} /></div>
              <div className="col-6"><Form.Label className="fw-bold small mb-1 text-warning">⚡ ค่าไฟ (บาท)</Form.Label><Form.Control type="number" required value={billForm.electric || ''} onChange={(e) => setBillForm({...billForm, electric: Number(e.target.value)})} /></div>
              <div className="col-6"><Form.Label className="fw-bold small mb-1 text-danger">🛠️ ค่าปรับ/อื่นๆ</Form.Label><Form.Control type="number" value={billForm.other || ''} onChange={(e) => setBillForm({...billForm, other: Number(e.target.value)})} /></div>
            </div>
            <div className="p-3 bg-primary-subtle rounded-4 d-flex justify-content-between align-items-center mb-4 border border-primary border-opacity-25">
              <span className="fw-bold text-primary">ยอดรวม:</span>
              <span className="fs-3 fw-bold text-primary">{(Number(billForm.room) + Number(billForm.water) + Number(billForm.electric) + Number(billForm.other)).toLocaleString()} ฿</span>
            </div>
            <Button variant="primary" type="submit" className="w-100 rounded-pill fw-bold shadow-sm py-2">🚀 ส่งบิลทันที</Button>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
}