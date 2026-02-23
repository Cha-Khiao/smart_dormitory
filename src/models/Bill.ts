import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  roomId: { type: String, required: true },
  bookingId: { type: String, required: true },
  roomNumber: { type: String, required: true },
  month: { type: String, required: true },
  roomFee: { type: Number, required: true },
  waterFee: { type: Number, default: 0 },
  electricFee: { type: Number, default: 0 },
  otherFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'unpaid' },
  paymentMethod: { type: String, default: '' },
  slipUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Bill || mongoose.model('Bill', billSchema);