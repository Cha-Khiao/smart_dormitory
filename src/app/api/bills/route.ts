// src/app/api/bills/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bill from '@/models/Bill';

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // ดึงบิลของลูกค้าคนนั้นๆ เรียงจากใหม่ไปเก่า
    const bills = await Bill.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: bills });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลบิลไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const newBill = await Bill.create(body);
    return NextResponse.json({ success: true, data: newBill });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'สร้างบิลไม่สำเร็จ' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { id, status, paymentMethod, slipUrl } = await request.json();
    const updatedBill = await Bill.findByIdAndUpdate(
      id, { status, paymentMethod, slipUrl }, { new: true }
    );
    return NextResponse.json({ success: true, data: updatedBill });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'อัปเดตการชำระเงินไม่สำเร็จ' }, { status: 500 });
  }
}