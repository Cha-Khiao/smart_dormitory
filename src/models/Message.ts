// src/models/Message.ts
import mongoose, { Schema, model, models } from 'mongoose';

const MessageSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true }, // ผูกกับ Thread การจอง
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // รหัสคนส่ง
  senderName: { type: String, required: true }, // ชื่อคนส่ง
  senderRole: { type: String, enum: ['admin', 'customer'], required: true }, // สถานะคนส่ง (เอาไว้แยกสีแชทซ้าย-ขวา)
  text: { type: String, required: true }, // ข้อความที่พิมพ์
}, { timestamps: true });

const Message = models.Message || model('Message', MessageSchema);

export default Message;