// src/app/admin/rooms/page.tsx
"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { Modal, Button, Form } from "react-bootstrap"; // นำเข้าคอมโพเนนต์จาก react-bootstrap

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [newRoom, setNewRoom] = useState({ roomNumber: "", price: "" });

  // State สำหรับจัดการหน้าต่างแก้ไข (Modal)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState({ id: "", roomNumber: "", price: "", status: "" });

  const fetchRooms = async () => {
    const res = await fetch("/api/rooms");
    const json = await res.json();
    if (json.success) setRooms(json.data);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // ฟังก์ชันเพิ่มห้อง
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("กำลังบันทึกข้อมูล...");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomNumber: newRoom.roomNumber, price: Number(newRoom.price) }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("เพิ่มห้องพักสำเร็จ!", { id: toastId });
        setNewRoom({ roomNumber: "", price: "" });
        fetchRooms();
      } else {
        toast.error("เกิดข้อผิดพลาด หรือเลขห้องซ้ำ", { id: toastId });
      }
    } catch (error) {
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", { id: toastId });
    }
  };

  // ฟังก์ชันลบห้อง
  const handleDelete = (id: string, roomNumber: string) => {
    Swal.fire({
      title: `ยืนยันการลบห้อง ${roomNumber}?`,
      text: "ข้อมูลนี้ถูกลบแล้วจะไม่สามารถกู้คืนได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
          const json = await res.json();
          if (json.success) {
            Swal.fire("ลบสำเร็จ!", `ห้อง ${roomNumber} ถูกลบแล้ว`, "success");
            fetchRooms();
          }
        } catch (error) {
          Swal.fire("ผิดพลาด!", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
        }
      }
    });
  };

  // ---------------------------------------------------
  // ส่วนของการแก้ไขห้องพัก
  // ---------------------------------------------------
  // เปิด Modal และโหลดข้อมูลห้องที่จะแก้
  const openEditModal = (room: any) => {
    setEditingRoom({
      id: room._id,
      roomNumber: room.roomNumber,
      price: room.price,
      status: room.status
    });
    setShowEditModal(true);
  };

  // ฟังก์ชันบันทึกการแก้ไข
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("กำลังอัปเดตข้อมูล...");
    
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: editingRoom.roomNumber,
          price: Number(editingRoom.price),
          status: editingRoom.status
        }),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success("แก้ไขข้อมูลสำเร็จ!", { id: toastId });
        setShowEditModal(false); // ปิด Modal
        fetchRooms(); // โหลดข้อมูลตารางใหม่
      } else {
        toast.error("เกิดข้อผิดพลาดในการแก้ไข", { id: toastId });
      }
    } catch (error) {
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", { id: toastId });
    }
  };

  return (
    <div>
      <h2 className="mb-4">จัดการห้องพัก</h2>
      
      {/* ฟอร์มเพิ่มห้อง */}
      <div className="card mb-4 shadow-sm border-0">
        <div className="card-body">
          <h5 className="card-title text-primary mb-3">เพิ่มห้องพักใหม่</h5>
          <form onSubmit={handleSubmit} className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">เลขห้อง</label>
              <input type="text" className="form-control" placeholder="เช่น 101, 102" value={newRoom.roomNumber} onChange={(e) => setNewRoom({...newRoom, roomNumber: e.target.value})} required />
            </div>
            <div className="col-md-4">
              <label className="form-label">ราคา (บาท/เดือน)</label>
              <input type="number" className="form-control" placeholder="เช่น 4500" value={newRoom.price} onChange={(e) => setNewRoom({...newRoom, price: e.target.value})} required />
            </div>
            <div className="col-md-4">
              <button type="submit" className="btn btn-success w-100">+ บันทึกห้องพัก</button>
            </div>
          </form>
        </div>
      </div>

      {/* ตารางแสดงข้อมูล */}
      <div className="table-responsive bg-body rounded shadow-sm">
        <table className="table table-hover mb-0 align-middle">
          <thead className="table-dark">
            <tr>
              <th>เลขห้อง</th>
              <th>สถานะ</th>
              <th>ราคา (บาท)</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-4">ยังไม่มีข้อมูลห้องพักในระบบ</td></tr>
            ) : (
              rooms.map((room) => (
                <tr key={room._id}>
                  <td><strong>{room.roomNumber}</strong></td>
                  <td>
                    <span className={`badge ${room.status === 'available' ? 'bg-success' : room.status === 'occupied' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                      {room.status === 'available' ? 'ว่าง' : room.status === 'occupied' ? 'ไม่ว่าง' : 'ซ่อมบำรุง'}
                    </span>
                  </td>
                  <td>{room.price.toLocaleString()}</td>
                  <td className="text-center">
                    {/* ปุ่มแก้ไข (เรียกเปิด Modal) */}
                    <button onClick={() => openEditModal(room)} className="btn btn-sm btn-outline-primary me-2">
                      ✏️ แก้ไข
                    </button>
                    {/* ปุ่มลบ */}
                    <button onClick={() => handleDelete(room._id, room.roomNumber)} className="btn btn-sm btn-outline-danger">
                      🗑️ ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal หน้าต่างแก้ไขข้อมูล */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>แก้ไขห้องพัก {editingRoom.roomNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdate}>
            <Form.Group className="mb-3">
              <Form.Label>เลขห้อง</Form.Label>
              <Form.Control 
                type="text" 
                value={editingRoom.roomNumber} 
                onChange={(e) => setEditingRoom({...editingRoom, roomNumber: e.target.value})} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>ราคา (บาท/เดือน)</Form.Label>
              <Form.Control 
                type="number" 
                value={editingRoom.price} 
                onChange={(e) => setEditingRoom({...editingRoom, price: e.target.value})} 
                required 
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>สถานะห้อง</Form.Label>
              <Form.Select 
                value={editingRoom.status} 
                onChange={(e) => setEditingRoom({...editingRoom, status: e.target.value})}
              >
                <option value="available">🟢 ว่าง</option>
                <option value="occupied">🔴 ไม่ว่าง (มีผู้เช่า)</option>
                <option value="maintenance">🟡 ซ่อมบำรุง</option>
              </Form.Select>
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                ยกเลิก
              </Button>
              <Button variant="primary" type="submit">
                บันทึกการเปลี่ยนแปลง
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
}