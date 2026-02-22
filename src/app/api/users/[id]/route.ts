// src/app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    // ดึงข้อมูลลูกค้าคนนี้มาดูว่า มีการใส่เลขห้อง (roomNumber) ให้หรือยัง
    const user = await User.findById(id);
    
    if (!user) return NextResponse.json({ success: false });

    return NextResponse.json({ success: true, roomNumber: user.roomNumber });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}