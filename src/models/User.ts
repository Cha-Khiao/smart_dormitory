// src/models/User.ts
import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true }, // ชื่อผู้ใช้
  password: { type: String, required: true }, // รหัสผ่าน (ที่ผ่านการเข้ารหัสแล้ว)
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' }, // สิทธิ์การใช้งาน
  roomNumber: { type: String }, // เฉพาะลูกค้า: เพื่อบอกว่าอยู่ห้องไหน
}, { timestamps: true });

const User = models.User || model('User', UserSchema);

export default User;