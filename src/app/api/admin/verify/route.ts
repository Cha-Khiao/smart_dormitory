// src/app/api/admin/verify/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    await connectDB();
    const { userId, password } = await request.json();

    // 1. ค้นหาแอดมินคนนี้ในฐานข้อมูล
    const adminUser = await User.findById(userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    // 2. นำรหัสผ่านที่พิมพ์มา เทียบกับรหัสผ่านที่เข้ารหัสไว้ในฐานข้อมูล
    const isPasswordMatch = await bcrypt.compare(password, adminUser.password);
    
    if (isPasswordMatch) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'ระบบตรวจสอบมีปัญหา' }, { status: 500 });
  }
}