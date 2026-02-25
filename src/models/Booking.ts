// src/models/Booking.ts
import mongoose, { Schema, model, models } from 'mongoose';

const BookingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  roomNumber: { type: String, required: true },
  
  // --- ข้อมูลสำหรับกรณีทำสัญญา "ออนไลน์" ---
  moveInDate: { type: String, required: false }, 
  idCardUrl: { type: String, required: false }, 
  slipUrl: { type: String, required: false }, 
  totalPaid: { type: Number, required: false },

  // --- ข้อมูลสำหรับกรณีทำสัญญา "หน้างาน (Walk-in)" ---
  contractMethod: { type: String, enum: ['online', 'onsite'], required: false }, // วิธีทำสัญญา
  appointmentDate: { type: String, required: false }, // วันเวลาที่นัดเข้ามาดูห้อง/ทำสัญญา

  // --- สถานะการพูดคุยและเช่าห้อง ---
  // chatting = กำลังพูดคุยสอบถาม
  // pending_approval = (ออนไลน์) ลูกค้าส่งเอกสารแล้ว รอแอดมินตรวจ
  // appointment = (หน้างาน) ลูกค้านัดหมายเข้ามาดูห้อง รอแอดมินยืนยัน
  // approved = อนุมัติเข้าอยู่เรียบร้อย (เซ็นสัญญาแล้ว)
  // rejected = ยกเลิก / ปฏิเสธ
  status: { 
    type: String, 
    enum: ['chatting', 'pending_approval', 'appointment', 'approved', 'rejected'], 
    default: 'chatting' 
  },
}, { timestamps: true });

const Booking = models.Booking || model('Booking', BookingSchema);

export default Booking;