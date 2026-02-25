// src/models/Room.ts
import mongoose, { Schema, model, models } from 'mongoose';

const RoomSchema = new Schema({
  roomNumber: { type: String, required: true, unique: true }, // เลขห้อง
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' }, // สถานะ
  price: { type: Number, required: true }, // ราคา
}, { timestamps: true });

// เช็คว่ามี Model นี้ถูกสร้างไว้หรือยัง (ป้องกัน Error ตอน Hot Reload)
const Room = models.Room || model('Room', RoomSchema);

export default Room;