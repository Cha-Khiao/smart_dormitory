// src/app/api/bills/route.ts
export const dynamic = 'force-dynamic'; // 🌟 บังคับไม่ให้ Next.js จำข้อมูลเก่า
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Bill from '@/models/Bill';

// 🌟 1. ดึงข้อมูลบิล (รองรับการกรองสถานะ paid)
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query: any = {};
    if (userId) query.userId = userId;
    if (status) query.status = status;

    const bills = await Bill.find(query).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: bills });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลบิลไม่สำเร็จ' }, { status: 500 });
  }
}

// 2. สร้างบิลใหม่
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

// 🌟 3. อัปเดตบิล (เพิ่มให้รองรับการเซฟ ocrText)
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { id, status, paymentMethod, slipUrl, ocrText } = await request.json();
    
    // จัดกลุ่มข้อมูลที่จะอัปเดต
    const updateData: any = { status };
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (slipUrl !== undefined) updateData.slipUrl = slipUrl;
    if (ocrText !== undefined) updateData.ocrText = ocrText; // รับค่าข้อความที่สแกนได้

    const updatedBill = await Bill.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json({ success: true, data: updatedBill });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'อัปเดตการชำระเงินไม่สำเร็จ' }, { status: 500 });
  }
}