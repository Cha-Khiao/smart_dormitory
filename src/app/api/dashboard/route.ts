// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Room from '@/models/Room';
import Booking from '@/models/Booking';
import Payment from '@/models/Payment';

export async function GET() {
  try {
    await connectDB();
    
    // นับจำนวนข้อมูลต่างๆ ในฐานข้อมูล
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ status: 'available' });
    const occupiedRooms = await Room.countDocuments({ status: 'occupied' });
    const maintenanceRooms = await Room.countDocuments({ status: 'maintenance' });
    
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });

    return NextResponse.json({
      success: true,
      data: {
        rooms: { 
          total: totalRooms, 
          available: availableRooms, 
          occupied: occupiedRooms, 
          maintenance: maintenanceRooms 
        },
        pendingBookings,
        pendingPayments
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ดึงข้อมูลสถิติไม่สำเร็จ' }, { status: 500 });
  }
}