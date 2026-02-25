// src/app/admin/payments/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import Tesseract from "tesseract.js"; // 🌟 นำเข้า Tesseract เหมือนที่คุณเคยทำผ่าน

export default function AdminPaymentsPage() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // State สำหรับ OCR
  const [ocrText, setOcrText] = useState<string>("");
  const [extractedAmount, setExtractedAmount] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/bills?status=paid&t=${new Date().getTime()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setPayments(json.data);
    } catch (error) {
      toast.error("ดึงข้อมูลรายการไม่สำเร็จ");
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // ==========================================
  // 🌟 พลังความฉลาด: สแกนอัตโนมัติเมื่อเลือกสลิป
  // ==========================================
  useEffect(() => {
    const autoVerifySlip = async () => {
      // ถ้าไม่มีสลิปที่เลือก หรือสลิปนี้เคยมี ocrText ที่สแกนเสร็จแล้ว ให้ข้ามไป
      if (!selectedPayment || !selectedPayment.slipUrl || ocrText) return;
      
      setIsProcessing(true);
      const toastId = toast.loading("AI กำลังสแกนสลิปอัตโนมัติ...");

      try {
        const result = await Tesseract.recognize(selectedPayment.slipUrl, 'tha+eng');
        const rawText = result.data.text;
        
        setOcrText(rawText);

        const amountMatch = rawText.match(/[\d,]+\.\d{2}/);
        if (amountMatch) {
          setExtractedAmount(amountMatch[0]);
          toast.success(`สแกนเสร็จสิ้น พบยอด: ${amountMatch[0]} บาท`, { id: toastId });
        } else {
          toast.success("สแกนข้อความสำเร็จ แต่อาจหาตัวเลขยอดเงินไม่เจอ", { id: toastId });
        }
      } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการอ่านสลิป", { id: toastId });
      } finally {
        setIsProcessing(false);
      }
    };

    autoVerifySlip();
  }, [selectedPayment]); // ทำงานอัตโนมัติทุกครั้งที่ selectedPayment เปลี่ยนค่า

  // เมื่อแอดมินคลิกเลือกสลิปจากตาราง (เคลียร์ค่าเก่าออกให้หมด)
  const handleSelectSlip = (payment: any) => {
    if (selectedPayment?._id === payment._id) return; // ถ้าคลิกอันเดิมไม่ต้องทำอะไร
    setOcrText(""); 
    setExtractedAmount(null);
    setSelectedPayment(payment);
  };

  // ✅ อนุมัติการชำระเงิน
  const handleApprove = async () => {
    Swal.fire({
      title: "ยืนยันยอดถูกต้อง?",
      text: `ห้อง ${selectedPayment.roomNumber} ยอดชำระ ${selectedPayment.totalAmount?.toLocaleString()} บาท`,
      icon: "success",
      showCancelButton: true,
      confirmButtonColor: "#198754",
      confirmButtonText: "✅ อนุมัติ"
    }).then(async (result) => {
      if (result.isConfirmed) {
        const toastId = toast.loading("กำลังบันทึก...");
        try {
          const res = await fetch("/api/bills", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedPayment._id, status: "completed" })
          });
          if (res.ok) {
            await fetch("/api/messages", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: selectedPayment.bookingId, senderId: (session?.user as any)?.id, senderName: "System", senderRole: "admin",
                text: `✅ แอดมินตรวจสอบยอดชำระเงินเดือน ${selectedPayment.month} เรียบร้อยแล้ว ขอบคุณครับ`
              })
            });
            toast.success("อนุมัติสำเร็จ!", { id: toastId });
            setSelectedPayment(null); fetchPayments();
          }
        } catch (error) { toast.error("เกิดข้อผิดพลาด", { id: toastId }); }
      }
    });
  };

  // ❌ ปฏิเสธสลิป
  const handleReject = async () => {
    Swal.fire({
      title: "ปฏิเสธสลิป?",
      input: "text", inputPlaceholder: "ระบุเหตุผล...", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc3545", confirmButtonText: "❌ ปฏิเสธ",
      inputValidator: (v) => !v ? "กรุณาระบุเหตุผล" : undefined
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const toastId = toast.loading("กำลังส่งเรื่องกลับ...");
        try {
          const res = await fetch("/api/bills", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedPayment._id, status: "unpaid", slipUrl: "" })
          });
          if (res.ok) {
            await fetch("/api/messages", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: selectedPayment.bookingId, senderId: (session?.user as any)?.id, senderName: "System", senderRole: "admin",
                text: `❌ การชำระเงินไม่ผ่าน\n📌 เหตุผล: ${result.value}\n(กรุณาแนบหลักฐานใหม่ที่เมนูห้องพักของฉัน)`
              })
            });
            toast.success("ตีกลับเรียบร้อย", { id: toastId });
            setSelectedPayment(null); fetchPayments();
          }
        } catch (error) { toast.error("เกิดข้อผิดพลาด", { id: toastId }); }
      }
    });
  };

  return (
    <div className="container-fluid py-4">
      <h2 className="mb-4 fw-bold text-primary">🔎 ตรวจสอบสลิปชำระเงิน</h2>
      <div className="row">
        
        {/* รายการรอตรวจสอบ */}
        <div className="col-md-5 mb-4">
          <div className="card shadow-sm border-0 h-100 rounded-4">
            <div className="card-body p-4">
              <h5 className="card-title text-dark fw-bold mb-4">รายการรอตรวจสอบ <span className="badge bg-warning text-dark ms-2 rounded-pill px-3">{payments.length}</span></h5>
              <div className="list-group list-group-flush gap-2">
                {payments.length === 0 ? <div className="text-muted text-center py-5 bg-light rounded-4">ไม่มีรายการใหม่</div> : 
                  payments.map((p) => (
                    <button key={p._id} className={`list-group-item list-group-item-action border-0 rounded-4 p-3 shadow-sm ${selectedPayment?._id === p._id ? 'bg-primary text-white' : 'bg-light'}`} onClick={() => handleSelectSlip(p)}>
                      <div className="d-flex justify-content-between">
                        <strong className="fs-5">ห้อง {p.roomNumber}</strong>
                        <span className="badge bg-warning text-dark">รอตรวจสอบ</span>
                      </div>
                      <div className="small opacity-75 mt-1">เวลาส่ง: {new Date(p.updatedAt).toLocaleString('th-TH')}</div>
                    </button>
                  ))
                }
              </div>
            </div>
          </div>
        </div>

        {/* แสดงผลการตรวจสอบ */}
        <div className="col-md-7 mb-4">
          <div className="card shadow-sm border-0 h-100 rounded-4">
            <div className="card-body p-4">
              {selectedPayment ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                    <div>
                      <h4 className="text-success fw-bold mb-1">ห้อง {selectedPayment.roomNumber}</h4>
                      <div className="text-muted small">ยอดเรียกเก็บ: <strong className="text-danger fs-5">{selectedPayment.totalAmount?.toLocaleString()} ฿</strong></div>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-danger fw-bold rounded-pill px-4" onClick={handleReject}>❌ ปฏิเสธ</button>
                      <button className="btn btn-success fw-bold rounded-pill px-4" onClick={handleApprove}>✅ อนุมัติ</button>
                    </div>
                  </div>

                  <div className="row g-4">
                    <div className="col-md-6 text-center">
                      <a href={selectedPayment.slipUrl} target="_blank" rel="noopener noreferrer">
                        <img src={selectedPayment.slipUrl} alt="Slip" className="img-fluid rounded-4 border shadow-sm" style={{ maxHeight: "400px", objectFit: "contain" }} />
                      </a>
                    </div>

                    <div className="col-md-6">
                      <h6 className="fw-bold text-primary mb-3">📝 ข้อมูลสแกน (OCR)</h6>
                      {isProcessing ? (
                        <div className="alert alert-info text-center py-4 rounded-4"><div className="spinner-border spinner-border-sm text-primary me-2"></div> กำลังให้ AI อ่านข้อความ...</div>
                      ) : (
                        <>
                          {extractedAmount && (
                            <div className="alert alert-success border-0 shadow-sm rounded-4 mb-3 d-flex align-items-center gap-2">
                              <span className="fs-3">💰</span><div><div className="small opacity-75 fw-bold">ยอดโอนในสลิป:</div><div className="fs-5 fw-bold">{extractedAmount} บาท</div></div>
                            </div>
                          )}
                          {ocrText ? (
                            <div className="bg-light p-3 rounded-4 border text-dark small" style={{ whiteSpace: "pre-wrap", maxHeight: "250px", overflowY: "auto", fontFamily: "monospace" }}>{ocrText}</div>
                          ) : (
                            <div className="alert alert-warning border-0 rounded-4 py-3 small text-center text-dark">ไม่สามารถอ่านข้อความได้ <br/>(แอดมินต้องตรวจสอบด้วยตาเปล่า)</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">คลิกเลือกรายการด้านซ้ายเพื่อทำการตรวจสอบ</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}