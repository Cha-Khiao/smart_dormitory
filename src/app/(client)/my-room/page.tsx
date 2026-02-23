// src/app/(client)/my-room/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Tesseract from "tesseract.js";

// 🌟 ฟังก์ชันอัปโหลดสลิปไป Cloudinary (อย่าลืมเปลี่ยน Upload Preset ของคุณ)
const uploadToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "your_preset_here"); // ใส่ Preset ของคุณ
  const res = await fetch("https://api.cloudinary.com/v1_1/your_cloud_name/image/upload", { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
};

export default function MyRoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State สำหรับการจ่ายเงิน
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("โอนเงินผ่านธนาคาร");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ดึงข้อมูลบิล
  const fetchBills = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch(`/api/bills?userId=${(session.user as any).id}`);
      const json = await res.json();
      if (json.success) setBills(json.data);
    } catch (error) {
      toast.error("ดึงข้อมูลบิลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetchBills();
  }, [status]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipFile || !selectedBill) return toast.error("กรุณาแนบสลิปการโอนเงิน");

    setIsSubmitting(true);
    const toastId = toast.loading("กำลังตรวจสอบสลิปและส่งข้อมูล..."); // เปลี่ยนข้อความให้ดูไฮเทค

    try {
      // 1. อัปโหลดรูปไป Cloudinary (เหมือนเดิม)
      const slipUrl = await uploadToCloudinary(slipFile);

      // 🌟 2. Auto-OCR: แอบสแกนสลิปบนเครื่องลูกค้าเลย
      toast.loading("กำลังประมวลผลข้อมูลการโอนเงิน...", { id: toastId });
      const { data: { text: ocrText } } = await Tesseract.recognize(slipUrl, 'tha+eng');

      // 3. ส่งข้อมูลทั้งหมด (สลิป + ข้อความ OCR) ไปอัปเดตบิล
      const res = await fetch("/api/bills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedBill._id, 
          status: "paid", 
          paymentMethod, 
          slipUrl,
          ocrText // 🌟 ส่งข้อความที่สแกนได้ไปให้แอดมิน
        })
      });

      if (res.ok) {
        // 4. สื่อสารกลับไปที่แชทแอดมิน
        await fetch("/api/messages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: selectedBill.bookingId, senderId: (session?.user as any).id, senderName: "System", senderRole: "customer",
            text: `💸 แจ้งชำระเงินค่าห้องเดือน ${selectedBill.month} เรียบร้อยแล้ว ยอดชำระ: ${selectedBill.totalAmount.toLocaleString()} บาท \nดูสลิป: ${slipUrl}`
          })
        });

        toast.success("แจ้งชำระเงินสำเร็จ! แอดมินจะตรวจสอบสลิปของคุณ", { id: toastId });
        setSelectedBill(null); setSlipFile(null); fetchBills();
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปโหลดสลิป", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const userRoom = (session?.user as any)?.roomNumber;

  if (isLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          
          {/* Header ห้องพักของฉัน */}
          <div className="card border-0 shadow-sm rounded-4 mb-4 bg-primary text-white overflow-hidden">
            <div className="card-body p-4 p-md-5 position-relative">
              <h2 className="fw-bold mb-1">ยินดีต้อนรับสู่ห้อง {userRoom || "ไม่พบข้อมูลห้อง"}</h2>
              <p className="opacity-75 mb-0">ระบบจัดการห้องพักและชำระเงินออนไลน์</p>
              <div className="display-1 position-absolute opacity-25" style={{ right: "20px", bottom: "-20px" }}>🏠</div>
            </div>
          </div>

          <h4 className="fw-bold mb-3 text-dark">🧾 บิลค่าใช้จ่ายของคุณ</h4>
          
          {bills.length === 0 ? (
            <div className="alert alert-light border text-center py-5 rounded-4">
              <div className="display-4 mb-2">🎉</div>
              <h5 className="text-muted">ยังไม่มีบิลค่าใช้จ่ายที่ต้องชำระ</h5>
            </div>
          ) : (
            bills.map((bill) => (
              <div key={bill._id} className="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden">
                <div className={`card-header border-0 p-3 d-flex justify-content-between align-items-center ${bill.status === 'paid' ? 'bg-success-subtle' : 'bg-warning-subtle'}`}>
                  <h6 className="mb-0 fw-bold">ประจำเดือน: {bill.month}</h6>
                  <span className={`badge ${bill.status === 'paid' ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {bill.status === 'paid' ? '✅ ชำระเงินแล้ว' : '⏳ รอการชำระเงิน'}
                  </span>
                </div>
                <div className="card-body p-4">
                  <div className="row mb-3">
                    <div className="col-6 text-muted">ค่าห้องพัก:</div><div className="col-6 text-end fw-bold">{bill.roomFee.toLocaleString()} ฿</div>
                    <div className="col-6 text-muted">ค่าน้ำประปา:</div><div className="col-6 text-end fw-bold">{bill.waterFee.toLocaleString()} ฿</div>
                    <div className="col-6 text-muted">ค่าไฟฟ้า:</div><div className="col-6 text-end fw-bold">{bill.electricFee.toLocaleString()} ฿</div>
                    {bill.otherFee > 0 && (
                      <><div className="col-6 text-muted">ค่าอื่นๆ:</div><div className="col-6 text-end fw-bold">{bill.otherFee.toLocaleString()} ฿</div></>
                    )}
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between align-items-center mb-0">
                    <h5 className="fw-bold mb-0">ยอดรวมทั้งสิ้น</h5>
                    <h4 className="fw-bold text-danger mb-0">{bill.totalAmount.toLocaleString()} ฿</h4>
                  </div>

                  {/* ปุ่มกดเปิดฟอร์มชำระเงิน */}
                  {bill.status === 'unpaid' && selectedBill?._id !== bill._id && (
                    <button className="btn btn-primary w-100 rounded-pill fw-bold mt-4" onClick={() => setSelectedBill(bill)}>
                      💳 ชำระเงินบิลนี้
                    </button>
                  )}

                  {/* ฟอร์มชำระเงิน (จะแสดงเมื่อกดปุ่มชำระเงิน) */}
                  {selectedBill?._id === bill._id && (
                    <div className="mt-4 p-4 bg-light rounded-4 border">
                      <h6 className="fw-bold text-primary mb-3">วิธีการชำระเงิน (เลือกได้อย่างอิสระ)</h6>
                      <form onSubmit={handlePaymentSubmit}>
                        <select className="form-select mb-3" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                          <option value="โอนเงินผ่านธนาคาร">🏦 โอนเงินผ่านธนาคาร (กสิกรไทย 123-4-56789-0)</option>
                          <option value="พร้อมเพย์ (PromptPay)">📱 พร้อมเพย์ (PromptPay: 081-234-5678)</option>
                          <option value="บัตรเครดิต/เดบิต">💳 บัตรเครดิต/เดบิต (ตัดบัตรออนไลน์)</option>
                        </select>
                        
                        <div className="mb-4">
                          <label className="fw-bold text-muted small mb-2">📸 แนบหลักฐานการชำระเงิน (สลิป)</label>
                          <input type="file" className="form-control" accept="image/*" onChange={(e: any) => setSlipFile(e.target.files[0])} required />
                        </div>

                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-light border rounded-pill w-50 fw-bold" onClick={() => setSelectedBill(null)}>ยกเลิก</button>
                          <button type="submit" className="btn btn-success rounded-pill w-50 fw-bold shadow-sm" disabled={isSubmitting}>
                            {isSubmitting ? "กำลังอัปโหลด..." : "ยืนยันการชำระเงิน"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ดูสลิป (ถ้าจ่ายแล้ว) */}
                  {bill.status === 'paid' && bill.slipUrl && (
                    <div className="mt-3 text-end">
                      <a href={bill.slipUrl} target="_blank" className="btn btn-sm btn-outline-success rounded-pill px-3 fw-bold">
                        👁️ ดูหลักฐานการชำระเงิน
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

        </div>
      </div>
    </div>
  );
}