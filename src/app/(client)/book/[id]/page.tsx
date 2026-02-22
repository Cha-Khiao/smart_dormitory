// src/app/(client)/book/[id]/page.tsx
"use client";

import { useState, use, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function BookingProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params); // ใช้ React.use() แกะ Promise ของ params
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ดึงข้อมูลห้องจาก URL
  const roomNumber = searchParams.get("roomNumber");
  const price = Number(searchParams.get("price") || 0);
  
  // คำนวณค่าใช้จ่าย (ล่วงหน้า 1 เดือน + ประกัน 1 เดือน = จ่าย 2 เท่าของค่าห้อง)
  const deposit = price;
  const totalAmount = price + deposit;

  const [moveInDate, setMoveInDate] = useState("");
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("กรุณาเข้าสู่ระบบก่อนทำเรื่องเข้าพัก");
      router.push("/login");
    }
  }, [status, router]);

  // ฟังก์ชันตัวช่วยอัปโหลดรูปขึ้น Cloudinary
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveInDate || !idCardFile || !slipFile) {
      toast.error("กรุณากรอกข้อมูลและอัปโหลดเอกสารให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("กำลังอัปโหลดเอกสารและส่งคำขอ...");

    try {
      // 1. อัปโหลดรูปทั้ง 2 ใบขึ้น Cloudinary
      const idCardUrl = await uploadToCloudinary(idCardFile);
      const slipUrl = await uploadToCloudinary(slipFile);

      // 2. ส่งข้อมูลทั้งหมดไปบันทึกลง Database
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (session?.user as any).id,
          username: session?.user?.name,
          roomId,
          roomNumber,
          moveInDate,
          idCardUrl,
          slipUrl,
          totalPaid: totalAmount,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("ส่งคำขอเข้าพักสำเร็จ! กรุณารอแอดมินตรวจสอบ", { id: toastId });
        router.push("/my-room"); // ส่งไปรอที่หน้าห้องของฉัน
      } else {
        toast.error(json.error, { id: toastId });
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการทำรายการ", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container mt-4 mb-5 max-w-2xl mx-auto" style={{ maxWidth: "800px" }}>
      <div className="mb-3">
        <Link href="/" className="text-decoration-none text-muted">← กลับไปหน้าเลือกห้อง</Link>
      </div>
      
      <div className="card shadow-lg border-0 rounded-4 bg-body">
        <div className="card-header bg-primary text-white p-4 rounded-top-4 border-0">
          <h3 className="mb-0 fw-bold">ทำสัญญาและแจ้งชำระเงินเข้าพัก</h3>
          <p className="mb-0 opacity-75">ห้อง {roomNumber}</p>
        </div>
        
        <div className="card-body p-4 p-md-5">
          {/* สรุปยอดเงิน */}
          <div className="alert alert-info border-0 shadow-sm rounded-3 mb-4">
            <h5 className="fw-bold text-info-emphasis mb-3">สรุปค่าใช้จ่ายแรกเข้า</h5>
            <div className="d-flex justify-content-between mb-2">
              <span>ค่าเช่าล่วงหน้า 1 เดือน:</span>
              <strong>{price.toLocaleString()} บาท</strong>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>ค่าประกันความเสียหาย (มัดจำ):</span>
              <strong>{deposit.toLocaleString()} บาท</strong>
            </div>
            <hr />
            <div className="d-flex justify-content-between fs-5 text-primary">
              <strong>ยอดรวมที่ต้องชำระ:</strong>
              <strong className="fw-bold">{totalAmount.toLocaleString()} บาท</strong>
            </div>
            <div className="mt-3 p-3 bg-white rounded border text-center">
              <span className="text-muted d-block mb-1">โอนเงินเข้าบัญชี:</span>
              <strong className="fs-5">ธนาคารกสิกรไทย 123-4-56789-0 (ชื่อหอพัก)</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label fw-bold">📅 วันที่ต้องการย้ายเข้า</label>
              <input type="date" className="form-control form-control-lg bg-body-tertiary" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} required disabled={isSubmitting} />
            </div>

            <div className="row g-4 mb-5">
              <div className="col-md-6">
                <label className="form-label fw-bold text-primary">🪪 อัปโหลดรูปบัตรประชาชน</label>
                <div className="p-3 border rounded-3 bg-body-tertiary">
                  <input type="file" className="form-control" accept="image/*" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} required disabled={isSubmitting} />
                  <small className="text-muted mt-2 d-block">* สำหรับใช้เป็นหลักฐานทำสัญญาเช่า</small>
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold text-success">🧾 อัปโหลดสลิปโอนเงิน</label>
                <div className="p-3 border rounded-3 bg-body-tertiary">
                  <input type="file" className="form-control" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} required disabled={isSubmitting} />
                  <small className="text-muted mt-2 d-block">* ยอดโอน {totalAmount.toLocaleString()} บาท</small>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-100 rounded-pill fw-bold shadow-sm" disabled={isSubmitting}>
              {isSubmitting ? "กำลังส่งข้อมูล..." : "ยืนยันการทำเรื่องเข้าพัก"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}