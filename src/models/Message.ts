// src/models/Message.ts
import mongoose, { Schema, model, models } from 'mongoose';

const MessageSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['admin', 'customer'], required: true },
  text: { type: String, required: true },
  
  // 🌟 เพิ่มบรรทัดนี้: เก็บสถานะว่าข้อความนี้ถูกอ่านหรือยัง
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

const Message = models.Message || model('Message', MessageSchema);

export default Message;