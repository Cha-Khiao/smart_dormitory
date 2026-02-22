// src/models/Payment.ts
import mongoose, { Schema, model, models } from 'mongoose';

const PaymentSchema = new Schema({
  roomNumber: { type: String, required: true },
  slipUrl: { type: String, required: true }, // เก็บแค่ URL จาก Cloudinary
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // สถานะ
}, { timestamps: true });

const Payment = models.Payment || model('Payment', PaymentSchema);

export default Payment;