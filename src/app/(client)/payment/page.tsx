// src/app/(client)/payment/page.tsx
"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function CustomerPaymentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");

  // เมื่อลูกค้าเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  // ฟังก์ชันอัปโหลดรูปขึ้น Cloudinary
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !roomNumber) {
      toast.error("กรุณากรอกเลขห้องและเลือกรูปสลิป");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("กำลังอัปโหลดสลิป...");

    try {
      // 1. เตรียมข้อมูลส่งไป Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      // 2. ยิง API ไปที่ Cloudinary
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.secure_url) {
        // อัปโหลดสำเร็จ จะได้ URL รูปภาพกลับมา
        toast.success("อัปโหลดสลิปสำเร็จ!", { id: toastId });
        console.log("URL รูปที่ได้จาก Cloudinary:", data.secure_url);
        
        // แทนที่ TODO ด้วยโค้ดนี้
        const saveRes = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomNumber: roomNumber,
            slipUrl: data.secure_url,
          }),
        });

        const saveJson = await saveRes.json();
        
        if (saveJson.success) {
          toast.success("ส่งข้อมูลให้ผู้ดูแลระบบเรียบร้อยแล้ว!", { id: toastId });
          setFile(null);
          setPreviewUrl(null);
          setRoomNumber("");
        } else {
          throw new Error("บันทึกลงฐานข้อมูลไม่สำเร็จ");
        }

        // ล้างฟอร์ม
        setFile(null);
        setPreviewUrl(null);
        setRoomNumber("");
      } else {
        throw new Error("อัปโหลดไม่สำเร็จ");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการอัปโหลด", { id: toastId });
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mt-5 max-w-md">
      <h2 className="text-center text-primary mb-4">แจ้งชำระเงิน</h2>
      
      <div className="card shadow-sm border-0 mb-4 p-4">
        <form onSubmit={handleUpload}>
          <div className="mb-3">
            <label className="form-label fw-bold">เลขห้องของคุณ</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="เช่น 101" 
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              disabled={isUploading}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold">อัปโหลดสลิปโอนเงิน</label>
            <input 
              type="file" 
              className="form-control" 
              accept="image/*" 
              onChange={handleFileChange}
              disabled={isUploading}
              required
            />
          </div>

          {previewUrl && (
            <div className="text-center mb-4">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="img-fluid rounded border shadow-sm"
                style={{ maxHeight: "300px", objectFit: "contain" }} 
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-100 py-2" 
            disabled={!file || !roomNumber || isUploading}
          >
            {isUploading ? "กำลังอัปโหลด..." : "📤 ยืนยันการแจ้งชำระเงิน"}
          </button>
        </form>
      </div>
    </div>
  );
}