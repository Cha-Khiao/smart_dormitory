// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { username, password } = await request.json();

    // เช็คว่ามี Username นี้ในระบบหรือยัง
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ success: false, error: "ชื่อผู้ใช้งานนี้ถูกใช้ไปแล้ว" }, { status: 400 });
    }

    // เข้ารหัสผ่านก่อนบันทึก
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // สร้างบัญชีใหม่ โดยกำหนด Role เป็น 'customer' อัตโนมัติ
    await User.create({
      username,
      password: hashedPassword,
      role: "customer"
    });

    return NextResponse.json({ success: true, message: "สมัครสมาชิกสำเร็จ" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" }, { status: 500 });
  }
}