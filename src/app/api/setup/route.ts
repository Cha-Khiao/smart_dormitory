// src/app/api/setup/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await connectDB();
    
    // เช็คว่ามีแอดมินในระบบหรือยัง
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) {
      return NextResponse.json({ message: "มีบัญชีแอดมินในระบบอยู่แล้วครับ" });
    }

    // เข้ารหัสผ่านคำว่า "admin1234"
    const hashedPassword = await bcrypt.hash("admin1234", 10);
    
    // สร้างแอดมิน
    await User.create({
      username: "admin",
      password: hashedPassword,
      role: "admin"
    });

    return NextResponse.json({ message: "สร้างแอดมินสำเร็จ! (Username: admin, Password: admin1234)" });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสร้างบัญชี" }, { status: 500 });
  }
}