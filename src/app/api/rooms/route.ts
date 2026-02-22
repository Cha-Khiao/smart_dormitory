// src/app/api/rooms/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Room from '@/models/Room';

// ดึงข้อมูลห้องพักทั้งหมด (GET)
export async function GET() {
  try {
    await connectDB();
    // ดึงข้อมูลและเรียงจากห้องที่สร้างล่าสุด
    const rooms = await Room.find({}).sort({ createdAt: -1 }); 
    return NextResponse.json({ success: true, data: rooms });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// เพิ่มห้องพักใหม่ (POST)
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const room = await Room.create(body);
    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (error) {
    // กรณีใส่เลขห้องซ้ำ Mongoose จะโยน error มา
    return NextResponse.json({ success: false, error: 'เพิ่มข้อมูลไม่สำเร็จ หรือเลขห้องซ้ำ' }, { status: 400 });
  }
}