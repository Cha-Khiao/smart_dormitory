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

// src/app/api/bills/route.ts

// ... (ส่วน import และฟังก์ชัน GET ปล่อยไว้เหมือนเดิม) ...

// 🌟 สร้างบิลใหม่ (อัปเกรดเกราะป้องกันบิลซ้ำ 100%)
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // 🛡️ ด่านตรวจเหล็กไหล: ค้นหาว่าในฐานข้อมูล มีบิลของ "ห้องนี้" ใน "เดือนนี้" หรือยัง?
    const existingBill = await Bill.findOne({
      roomNumber: body.roomNumber,
      month: body.month
    });

    // 🚫 ถ้าเจอบิลเก่าอยู่แล้ว ให้เตะกลับทันที ห้ามสร้างใหม่เด็ดขาด!
    if (existingBill) {
      return NextResponse.json({ 
        success: false, 
        error: `ระบบปฏิเสธการทำงาน: ห้อง ${body.roomNumber} มีบิลประจำเดือน "${body.month}" อยู่แล้วในระบบ` 
      }, { status: 400 }); // แจ้งกลับไปว่า Bad Request (ทำรายการไม่ถูกต้อง)
    }

    // ✅ ถ้ารอดด่านตรวจมาได้ (ยังไม่มีบิล) ถึงจะยอมให้เซฟลงฐานข้อมูล
    const newBill = await Bill.create(body);
    return NextResponse.json({ success: true, data: newBill });
    
  } catch (error) {
    console.error("🔥 Error สร้างบิล:", error);
    return NextResponse.json({ success: false, error: 'สร้างบิลไม่สำเร็จ' }, { status: 500 });
  }
}

// ... (ฟังก์ชัน PATCH ปล่อยไว้เหมือนเดิม) ...

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