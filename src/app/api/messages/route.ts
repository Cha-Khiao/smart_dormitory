// src/app/api/messages/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';

// ดึงข้อความแชทของห้องนั้นๆ (GET)
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) return NextResponse.json({ success: false, error: 'ไม่พบรหัสห้องแชท' }, { status: 400 });

    // ดึงข้อความเรียงตามเวลาที่ส่ง (เก่าไปใหม่)
    const messages = await Message.find({ bookingId }).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อความไม่สำเร็จ' }, { status: 500 });
  }
}

// ส่งข้อความใหม่ (POST)
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const newMessage = await Message.create(body);
    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ส่งข้อความไม่สำเร็จ' }, { status: 400 });
  }
}