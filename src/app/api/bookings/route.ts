export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Room from '@/models/Room';
import User from '@/models/User';
import Message from '@/models/Message';

export async function GET() {
  try {
    await connectDB();
    const rawBookings = await Booking.find().sort({ updatedAt: -1 }).lean();

    // 1. เครื่องกรองแชทซ้ำ (ใช้ roomNumber ป้องกันบั๊กห้องถูกลบ)
    const uniqueBookingsMap = new Map();
    rawBookings.forEach((b: any) => {
      const key = `${b.userId}_${b.roomNumber}`; 
      if (!uniqueBookingsMap.has(key)) {
        uniqueBookingsMap.set(key, b);
      } else {
        const existing = uniqueBookingsMap.get(key);
        if (b.status === 'approved' && existing.status !== 'approved') {
          uniqueBookingsMap.set(key, b);
        } else if (new Date(b.updatedAt) > new Date(existing.updatedAt)) {
          uniqueBookingsMap.set(key, b);
        }
      }
    });
    
    const uniqueBookings = Array.from(uniqueBookingsMap.values());

    // 2. นับข้อความที่ยังไม่อ่าน
    const unreadCounts = await Message.aggregate([
      { $match: { senderRole: 'customer', isRead: { $ne: true } } },
      { $group: { _id: '$bookingId', count: { $sum: 1 } } }
    ]);

    // 🌟 3. เช็คว่าลูกค้าแต่ละคน "เคยส่งข้อความมาหรือยัง?"
    const customerMessages = await Message.aggregate([
      { $match: { senderRole: 'customer' } },
      { $group: { _id: '$bookingId', count: { $sum: 1 } } }
    ]);

    // 4. ประกอบร่างข้อมูล
    const enrichedBookings = uniqueBookings.map((b: any) => {
      const unread = unreadCounts.find(u => u._id && b._id && u._id.toString() === b._id.toString())?.count || 0;
      // เช็คว่ามีประวัติข้อความจากลูกค้าคนนี้ไหม
      const hasMessaged = customerMessages.some(m => m._id && b._id && m._id.toString() === b._id.toString());
      return { ...b, unreadCount: unread, hasCustomerMessage: hasMessaged };
    });

    // 🌟 5. กรองแชทขยะทิ้ง! (แสดงเฉพาะคนที่พิมพ์ข้อความมาแล้ว หรือคนที่มีการส่งเอกสาร/นัดหมาย/เป็นลูกบ้านแล้ว)
    const validBookings = enrichedBookings.filter(b => b.hasCustomerMessage || b.status !== 'chatting');

    return NextResponse.json({ success: true, data: validBookings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลไม่สำเร็จ' }, { status: 500 });
  }
}

// ==========================================
// 2. เริ่มการสนทนา (POST) + บล็อกลูกบ้าน
// ==========================================
// src/app/api/bookings/route.ts (แก้ไขฟังก์ชัน POST)
// src/app/api/bookings/route.ts (แทนที่ฟังก์ชัน POST ทั้งหมดด้วยโค้ดนี้)

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { userId, username, roomId, roomNumber } = body;
    
    if (!userId || !roomId) return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });

    const targetRoom = await Room.findById(roomId);
    if (!targetRoom || targetRoom.status !== 'available') {
      return NextResponse.json({ success: false, error: 'ขออภัย ห้องนี้มีผู้เช่าแล้ว หรือไม่พร้อมใช้งาน' }, { status: 400 });
    }

    // 🌟 ด่านที่ 1: กวาดล้างข้อมูลบั๊ก และเช็คสถานะลูกบ้านที่แท้จริง
    // ค้นหา "ทุกแชท" ที่บอกว่าลูกค้ารายนี้เป็นลูกบ้าน (เผื่อมีข้อมูลซ้ำซ้อน)
    const approvedBookings = await Booking.find({ userId, status: 'approved' });
    
    let isTrulyResident = false;
    let residentRoomNumber = "";

    for (const booking of approvedBookings) {
      const actualRoom = await Room.findById(booking.roomId);
      
      // 🚨 ตรรกะเพชฌฆาต: ถ้าห้องถูกลบไปแล้ว (!actualRoom) 
      // หรือ ห้องไม่ได้อยู่ในสถานะ "มีผู้เช่า" (actualRoom.status !== 'occupied')
      // แปลว่าข้อมูล Booking นี้คือ "ขยะ" -> ทำลายสถานะลูกบ้านทิ้งทันที!
      if (!actualRoom || actualRoom.status !== 'occupied') {
        await Booking.findByIdAndUpdate(booking._id, { status: 'rejected' });
        await User.findByIdAndUpdate(userId, { roomNumber: "" });
      } else {
        // ถ้าห้องยังมีอยู่จริง และมีคนเช่าอยู่จริง = เป็นลูกบ้านของจริง
        isTrulyResident = true;
        residentRoomNumber = booking.roomNumber;
      }
    }

    // ถ้าสรุปแล้วเป็นลูกบ้านของจริง (ไม่มีบั๊ก)
    if (isTrulyResident) {
      // ถ้ากดจองห้องเดิม อนุญาตให้เด้งเข้าแชทเดิมได้
      const existingResidentChat = await Booking.findOne({ userId, roomId, status: 'approved' });
      if (existingResidentChat) {
         return NextResponse.json({ success: true, data: existingResidentChat }, { status: 200 });
      }
      // ถ้ากดจองห้องอื่น บล็อกทันที!
      return NextResponse.json({ 
        success: false, 
        error: `คุณเป็นผู้เช่าห้อง ${residentRoomNumber} อยู่แล้ว หากต้องการย้ายห้อง กรุณาแจ้งแอดมินผ่านแชทห้องเดิมครับ` 
      }, { status: 400 });
    }

    // 🌟 ด่านที่ 2: ค้นหาว่าเคยทักแชทห้อง "นี้" ไหม?
    const existingChat = await Booking.findOne({ userId, roomId });
    if (existingChat) {
      if (existingChat.status === 'rejected') {
        existingChat.status = 'chatting'; // ปลุกผีแชทเดิมกลับมาให้คุยต่อ
        await existingChat.save();
      }
      return NextResponse.json({ success: true, data: existingChat }, { status: 200 });
    }

    // 🌟 ด่านที่ 3: แอบไปทักห้อง "อื่น" ค้างไว้ไหม?
    const activeOtherChat = await Booking.findOne({
      userId,
      status: { $in: ['chatting', 'pending_approval', 'appointment'] }
    });
    
    if (activeOtherChat) {
      return NextResponse.json({ 
        success: false, 
        error: `คุณกำลังพูดคุยเรื่องห้อง ${activeOtherChat.roomNumber} อยู่ กรุณาจบเคสก่อนสอบถามห้องใหม่ครับ` 
      }, { status: 400 });
    }

    // ผ่านทุกด่าน (เคลียร์บั๊กหมดแล้ว) ค่อยสร้างห้องแชทใหม่เอี่ยม
    const newBooking = await Booking.create({ userId, username, roomId, roomNumber, status: 'chatting' });
    return NextResponse.json({ success: true, data: newBooking }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ไม่สามารถเริ่มการสนทนาได้' }, { status: 500 });
  }
}

// ==========================================
// 3. แอดมินกดอนุมัติ/ปฏิเสธ (PATCH)
// ==========================================
// src/app/api/bookings/route.ts (แก้ไขฟังก์ชัน PATCH ด้านล่างสุด)

export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { id, status, roomId, userId, roomNumber, contractMethod, moveInDate, idCardUrl, slipUrl, appointmentDate } = await request.json();
    
    const updatedBooking = await Booking.findByIdAndUpdate(
      id, 
      { status, contractMethod, moveInDate, idCardUrl, slipUrl, appointmentDate }, 
      { new: true }
    );
    
    if (status === 'approved') {
      await Room.findByIdAndUpdate(roomId, { status: 'occupied' });
      await User.findByIdAndUpdate(userId, { roomNumber: roomNumber });
    }
    
    // 🌟 แก้ไขส่วนนี้: ถ้าแอดมินกด "❌ ปฏิเสธ" หรือ "ยกเลิกเคส" ในแชท
    if (status === 'rejected') {
      // 1. คืนห้องให้กลับมาว่าง
      await Room.findByIdAndUpdate(roomId, { status: 'available' });
      // 2. ถอดเลขห้องออกจากตัวลูกค้า (ถ้าเคยมี) ป้องกันลูกค้าติดบั๊ก!
      await User.findByIdAndUpdate(userId, { roomNumber: "" });
    }

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'อัปเดตสถานะไม่สำเร็จ' }, { status: 400 });
  }
}