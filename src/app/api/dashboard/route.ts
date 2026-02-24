// src/app/api/dashboard/route.ts
export const dynamic = 'force-dynamic'; // 🌟 ทะลวง Cache 100% ห้ามจำข้อมูลเก่าเด็ดขาด
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Room from '@/models/Room';
import Booking from '@/models/Booking';
import Bill from '@/models/Bill'; // 🌟 เปลี่ยนมาใช้ตาราง Bill ให้ตรงกับระบบปัจจุบัน

export async function GET() {
  try {
    await connectDB();
    
    // 1. นับจำนวนห้องพัก
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'available' });
    const occupiedRooms = totalRooms - availableRooms;
    
    // 🌟 2. นับคำขอจอง (แหวกม่าน: ดึงทุกอย่างที่ "ไม่ใช่" approved และ rejected)
    const pendingBookingsCount = await Booking.countDocuments({ 
      status: { $nin: ['approved', 'rejected', 'cancelled'] } 
    });

    // 🌟 3. นับสลิปที่รอตรวจสอบ (ดึงบิลที่ "ไม่ใช่" unpaid และ completed)
    const pendingSlipsCount = await Bill.countDocuments({ 
      status: { $nin: ['unpaid', 'completed'] } 
    });

    // 🌟 4. ดึงรายการ 5 อันดับล่าสุด (ใช้เงื่อนไขเดียวกัน)
    const recentBookings = await Booking.find({ 
      status: { $nin: ['approved', 'rejected', 'cancelled'] } 
    }).sort({ createdAt: -1 }).limit(5);
    
    const recentBills = await Bill.find({ 
      status: { $nin: ['unpaid', 'completed'] } 
    }).sort({ updatedAt: -1 }).limit(5);

    // 5. คำนวณรายได้ (Revenue) และเตรียมข้อมูลกราฟ
    const currentMonth = new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    const completedBills = await Bill.find({ status: 'completed' }); // ดึงเฉพาะบิลที่จ่ายสำเร็จ
    
    let totalRevenue = 0;
    const revenueByMonth: Record<string, number> = {};

    completedBills.forEach((bill: any) => {
      // รายได้เฉพาะเดือนนี้
      if (bill.month === currentMonth) {
        totalRevenue += (bill.totalAmount || 0);
      }
      // แยกรายได้ตามเดือนเพื่อทำกราฟ
      if (bill.month) {
        const monthName = bill.month.split(' ')[0]; // เอาแค่คำว่า "มกราคม"
        revenueByMonth[monthName] = (revenueByMonth[monthName] || 0) + (bill.totalAmount || 0);
      }
    });

    // แปลงข้อมูลให้ Recharts เอาไปใช้ต่อได้ทันที
    const chartData = Object.keys(revenueByMonth).map(key => ({
      name: key,
      ยอดรายได้: revenueByMonth[key]
    }));

    // ส่งออกข้อมูลทั้งหมดแบบรวดเดียวจบ!
    return NextResponse.json({
      success: true,
      data: {
        stats: { totalRooms, availableRooms, occupiedRooms, pendingBookings: pendingBookingsCount, pendingSlips: pendingSlipsCount, totalRevenue },
        recentBookings,
        recentBills,
        chartData
      }
    });

  } catch (error: any) {
    // 🌟 สั่งให้มันปริ้นท์ Error สีแดงๆ ลงใน Terminal (จอ Command) ของคุณ
    console.error("🔥 บั๊กแดชบอร์ดหลังบ้าน:", error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'ดึงข้อมูลแดชบอร์ดไม่สำเร็จ',
      details: error.message // 🌟 ส่งสาเหตุที่แท้จริงไปให้หน้าบ้านด้วย
    }, { status: 500 });
  }
}