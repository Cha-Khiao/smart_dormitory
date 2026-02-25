// src/app/api/rooms/[id]/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Room from '@/models/Room';
import User from '@/models/User';
import Booking from '@/models/Booking';

// ==========================================
// 🌟 1. ดึงข้อมูลห้องพักรายห้อง (GET) - ฟังก์ชันที่หายไป!
// ==========================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const room = await Room.findById(id);
    
    if (!room) {
      return NextResponse.json({ success: false, error: 'ไม่พบห้องพักนี้' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: room }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ==========================================
// 2. ลบห้องพัก (DELETE)
// ==========================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deletedRoom = await Room.findByIdAndDelete(id);
    
    if (deletedRoom) {
      await User.updateMany({ roomNumber: deletedRoom.roomNumber }, { $set: { roomNumber: "" } });
      await Booking.updateMany({ roomId: id }, { $set: { status: 'rejected' } });
    }
    
    return NextResponse.json({ success: true, message: 'ลบห้องพักสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ไม่สามารถลบข้อมูลได้' }, { status: 500 });
  }
}

// ==========================================
// 3. อัปเดตห้องพัก (PUT) + ระบบ Self-Healing
// ==========================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const updatedRoom = await Room.findByIdAndUpdate(id, body, { new: true });

    if (!updatedRoom) {
      return NextResponse.json({ success: false, error: 'ไม่พบห้องพักนี้' }, { status: 404 });
    }

    // ถ้าแอดมินเปลี่ยนห้องกลับเป็น "ว่าง"
    if (body.status === 'available') {
      await User.updateMany({ roomNumber: updatedRoom.roomNumber }, { $set: { roomNumber: "" } });
      await Booking.updateMany(
        { roomId: id, status: { $ne: 'rejected' } }, 
        { $set: { status: 'rejected' } }
      );
    }

    return NextResponse.json({ success: true, data: updatedRoom });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ไม่สามารถอัปเดตข้อมูลได้' }, { status: 500 });
  }
}