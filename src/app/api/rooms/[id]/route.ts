// src/app/api/rooms/[id]/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Room from '@/models/Room';
import User from '@/models/User'; // 👈 1. อย่าลืม import User เข้ามาด้วย

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    // ค้นหาและลบข้อมูลจาก MongoDB
    const deletedRoom = await Room.findByIdAndDelete(id);
    
    // 🌟 2. ถ้าลบห้องทิ้ง ให้เคลียร์เลขห้องของลูกค้าที่เคยอยู่ห้องนี้ด้วย
    if (deletedRoom) {
      await User.updateMany({ roomNumber: deletedRoom.roomNumber }, { $set: { roomNumber: "" } });
    }
    
    return NextResponse.json({ success: true, message: 'ลบห้องพักสำเร็จ' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ไม่สามารถลบข้อมูลได้' }, { status: 500 });
  }
}

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

    // 🌟 3. ถ้าแอดมินเปลี่ยนสถานะห้องกลับมาเป็น "ว่าง" (available) 
    // ให้ถอดเลขห้องออกจาก User ทุกคนที่มีเลขห้องนี้
    if (body.status === 'available') {
      await User.updateMany({ roomNumber: updatedRoom.roomNumber }, { $set: { roomNumber: "" } });
    }

    return NextResponse.json({ success: true, data: updatedRoom });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ไม่สามารถอัปเดตข้อมูลได้' }, { status: 500 });
  }
}