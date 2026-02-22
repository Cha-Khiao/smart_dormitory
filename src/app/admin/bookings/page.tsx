// src/app/admin/bookings/page.tsx
"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = async () => {
    const res = await fetch("/api/bookings");
    const json = await res.json();
    if (json.success) setBookings(json.data);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleUpdateStatus = (booking: any, status: string) => {
    const actionText = status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';
    const confirmColor = status === 'approved' ? '#198754' : '#dc3545';

    Swal.fire({
      title: `ยืนยันการ${actionText}?`,
      text: `ห้อง ${booking.roomNumber} สำหรับลูกค้า: ${booking.username}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: confirmColor,
      cancelButtonColor: "#6c757d",
      confirmButtonText: `ใช่, ${actionText}เลย!`,
      cancelButtonText: "ยกเลิก"
    }).then(async (result) => {
      if (result.isConfirmed) {
        const toastId = toast.loading(`กำลัง${actionText}...`);
        try {
          const res = await fetch("/api/bookings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              id: booking._id, 
              status, 
              roomId: booking.roomId, 
              userId: booking.userId, 
              roomNumber: booking.roomNumber 
            })
          });
          const json = await res.json();
          if (json.success) {
            toast.success(`${actionText}สำเร็จ!`, { id: toastId });
            fetchBookings();
          }
        } catch (error) {
          toast.error("เกิดข้อผิดพลาด", { id: toastId });
        }
      }
    });
  };

  return (
    <div>
      <h2 className="mb-4">รายการขอจองห้องพัก</h2>
      
      <div className="table-responsive bg-body rounded shadow-sm p-3">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-dark">
            <tr>
              <th>ลูกค้า</th>
              <th>ห้องที่จอง</th>
              <th>วันที่ขอจอง</th>
              <th>สถานะ</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-muted">ยังไม่มีรายการขอจองห้องพัก</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <strong>{b.username}</strong>
                    {/* เพิ่มวันที่ต้องการเข้าพักให้แอดมินดู */}
                    <div className="small text-muted mt-1">ย้ายเข้า: {b.moveInDate ? new Date(b.moveInDate).toLocaleDateString('th-TH') : '-'}</div>
                  </td>
                  <td><span className="badge bg-primary fs-6">{b.roomNumber}</span></td>
                  
                  {/* เพิ่มปุ่มกดดูเอกสารของลูกค้า */}
                  <td>
                    {b.idCardUrl && b.slipUrl ? (
                      <div className="d-flex flex-column gap-1">
                        <a href={b.idCardUrl} target="_blank" className="btn btn-sm btn-outline-info">🪪 ดูบัตร ปชช.</a>
                        <a href={b.slipUrl} target="_blank" className="btn btn-sm btn-outline-success">🧾 ดูสลิป ({b.totalPaid?.toLocaleString()} ฿)</a>
                      </div>
                    ) : (
                      <span className="text-muted small">ไม่มีเอกสาร</span>
                    )}
                  </td>
                  
                  <td>
                    <span className={`badge ${b.status === 'pending' ? 'bg-warning text-dark' : b.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-center">
                    {b.status === 'pending' && (
                      <div className="d-flex justify-content-center gap-2">
                        <button onClick={() => handleUpdateStatus(b, 'approved')} className="btn btn-sm btn-success">✅ อนุมัติ</button>
                        <button onClick={() => handleUpdateStatus(b, 'rejected')} className="btn btn-sm btn-outline-danger">❌ ปฏิเสธ</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}