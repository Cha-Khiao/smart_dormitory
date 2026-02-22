// src/app/admin/payments/page.tsx
"use client";

import { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import toast from "react-hot-toast";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null); // สลิปที่เลือกตรวจสอบ
  const [ocrText, setOcrText] = useState<string>("");
  const [extractedAmount, setExtractedAmount] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // ดึงข้อมูลรายการสลิป
  const fetchPayments = async () => {
    const res = await fetch("/api/payments");
    const json = await res.json();
    if (json.success) setPayments(json.data);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // เมื่อแอดมินคลิกเลือกสลิปจากตาราง
  const handleSelectSlip = (payment: any) => {
    setSelectedPayment(payment);
    setOcrText("");
    setExtractedAmount(null);
    setProgress(0);
  };

  // AI ตรวจสอบ
  const verifySlip = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);
    const toastId = toast.loading("AI กำลังตรวจสอบสลิป...");

    try {
      const result = await Tesseract.recognize(selectedPayment.slipUrl, 'tha+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        }
      });
      
      const rawText = result.data.text;
      setOcrText(rawText);

      const amountMatch = rawText.match(/[\d,]+\.\d{2}/);
      if (amountMatch) {
        setExtractedAmount(amountMatch[0]);
        toast.success(`พบยอดเงินโอน: ${amountMatch[0]} บาท`, { id: toastId });
      } else {
        toast.success("อ่านข้อความสำเร็จ แต่อาจหาตัวเลขยอดเงินไม่เจอ", { id: toastId });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอ่านสลิป", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // อัปเดตสถานะ อนุมัติ/ปฏิเสธ
  const updateStatus = async (status: string) => {
    const toastId = toast.loading("กำลังอัปเดตสถานะ...");
    try {
      const res = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedPayment._id, status })
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success("อัปเดตสถานะสำเร็จ", { id: toastId });
        fetchPayments(); // โหลดตารางใหม่
        setSelectedPayment(null); // เคลียร์หน้าจอ
      }
    } catch (error) {
      toast.error("อัปเดตไม่สำเร็จ", { id: toastId });
    }
  };

  return (
    <div className="container-fluid">
      <h2 className="mb-4">ตรวจสอบสลิปชำระเงิน</h2>
      
      <div className="row">
        {/* คอลัมน์ซ้าย: รายการสลิปที่รอดำเนินการ */}
        <div className="col-md-5 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title text-primary mb-3">รายการแจ้งชำระเงิน</h5>
              <div className="list-group">
                {payments.length === 0 ? (
                  <p className="text-muted text-center mt-3">ไม่มีรายการใหม่</p>
                ) : (
                  payments.map((p) => (
                    <button 
                      key={p._id} 
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedPayment?._id === p._id ? 'active' : ''}`}
                      onClick={() => handleSelectSlip(p)}
                    >
                      <div>
                        <strong>ห้อง: {p.roomNumber}</strong>
                        <div className="small text-muted">เวลา: {new Date(p.createdAt).toLocaleString('th-TH')}</div>
                      </div>
                      <span className={`badge ${p.status === 'pending' ? 'bg-warning text-dark' : p.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา: แสดงสลิปและ AI */}
        <div className="col-md-7 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              {selectedPayment ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title text-success mb-0">ตรวจสอบข้อมูล (ห้อง {selectedPayment.roomNumber})</h5>
                    {/* ปุ่มอนุมัติ / ปฏิเสธ */}
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => updateStatus('rejected')}>❌ ปฏิเสธ</button>
                      <button className="btn btn-sm btn-success" onClick={() => updateStatus('approved')}>✅ อนุมัติ</button>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 text-center">
                      <img 
                        src={selectedPayment.slipUrl} 
                        alt="Slip" 
                        className="img-fluid rounded border shadow-sm mb-3"
                        style={{ maxHeight: "350px", objectFit: "contain" }} 
                      />
                    </div>
                    <div className="col-md-6">
                      <button 
                        className="btn btn-primary w-100 py-2 mb-3" 
                        onClick={verifySlip}
                        disabled={isProcessing}
                      >
                        {isProcessing ? `กำลังวิเคราะห์... ${progress}%` : "🔍 สั่ง AI สแกนสลิปนี้"}
                      </button>
                      
                      {extractedAmount && (
                        <div className="alert alert-success mt-2 shadow-sm">
                          <strong>💰 ยอดเงิน: </strong> <span className="fs-5 ms-1">{extractedAmount} บาท</span>
                        </div>
                      )}
                      
                      {ocrText && (
                        <textarea className="form-control mt-2 bg-light text-muted" rows={6} readOnly value={ocrText} style={{ fontSize: "12px" }}></textarea>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  คลิกเลือกรายการสลิปด้านซ้ายเพื่อตรวจสอบ
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}