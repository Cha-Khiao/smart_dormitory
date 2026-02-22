// src/app/api/payments/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';

// แอดมินดึงรายการสลิปทั้งหมด (GET)
export async function GET() {
  try {
    await connectDB();
    // ดึงข้อมูลเรียงจากใหม่ไปเก่า
    const payments = await Payment.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ลูกค้าส่งสลิปเข้าระบบ (POST)
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const payment = await Payment.create(body);
    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'บันทึกข้อมูลไม่สำเร็จ' }, { status: 400 });
  }
}

// แอดมินอัปเดตสถานะ อนุมัติ/ปฏิเสธ (PATCH)
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { id, status } = await request.json();
    const updatedPayment = await Payment.findByIdAndUpdate(id, { status }, { new: true });
    return NextResponse.json({ success: true, data: updatedPayment });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'อัปเดตสถานะไม่สำเร็จ' }, { status: 400 });
  }
}