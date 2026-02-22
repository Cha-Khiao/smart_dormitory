// src/app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Room from '@/models/Room';
import User from '@/models/User';

// แอดมินดึงรายการจองทั้งหมด
export async function GET() {
  try {
    await connectDB();
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// src/app/api/bookings/route.ts (แก้ไขฟังก์ชัน POST)

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { userId, username, roomId, roomNumber } = body;
    
    // เช็คด่าน 1: ข้อมูลลูกค้ามาครบไหม
    if (!userId || !roomId) {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (กรุณาล็อกเอาต์แล้วเข้าสู่ระบบใหม่)' }, { status: 400 });
    }

    // เช็คด่าน 2: ห้องว่างไหม
    const room = await Room.findById(roomId);
    if (!room || room.status !== 'available') {
      return NextResponse.json({ success: false, error: 'ขออภัย ห้องนี้มีผู้เช่าแล้ว หรือสถานะไม่ว่าง' }, { status: 400 });
    }

    // เช็คด่าน 3: มีแชทค้างไหม
    const existingBooking = await Booking.findOne({
      userId,
      roomId,
      status: { $in: ['chatting', 'pending_approval', 'appointment'] }
    });

    if (existingBooking) {
      return NextResponse.json({ success: true, data: existingBooking }, { status: 200 });
    }

    // สร้างห้องแชทใหม่ (บังคับส่งแค่นี้พอ เพื่อเลี่ยง Error)
    const newBooking = await Booking.create({
      userId,
      username,
      roomId,
      roomNumber,
      status: 'chatting'
    });
    
    return NextResponse.json({ success: true, data: newBooking }, { status: 201 });
  } catch (error) {
    // 🌟 ให้มันปริ้นท์ Error สีแดงออกมาใน Terminal เพื่อให้เรารู้ว่าผิดที่ไหน
    console.error("🔥 เกิดข้อผิดพลาดตอนสร้างห้องแชท:", error);
    
    return NextResponse.json({ success: false, error: 'ไม่สามารถเริ่มการสนทนาได้' }, { status: 500 });
  }
}

// แอดมินอัปเดตสถานะ (อนุมัติ/ปฏิเสธ)
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { id, status, roomId, userId, roomNumber } = await request.json();
    
    const updatedBooking = await Booking.findByIdAndUpdate(id, { status }, { new: true });
    
    // ถ้า "อนุมัติ" ให้เปลี่ยนสถานะห้องเป็น "ไม่ว่าง" และผูกเลขห้องให้ User
    if (status === 'approved') {
      await Room.findByIdAndUpdate(roomId, { status: 'occupied' });
      await User.findByIdAndUpdate(userId, { roomNumber: roomNumber });
    }

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'อัปเดตสถานะไม่สำเร็จ' }, { status: 400 });
  }
}