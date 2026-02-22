// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// ฟังก์ชันนี้จะทำงานก่อนที่ผู้ใช้จะเข้าถึงหน้าเว็บที่เราระบุไว้
export default withAuth(
  function middleware(req) {
    // ดึงข้อมูล Role (สิทธิ์) จาก Token ของคนที่ล็อกอินเข้ามา
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // กฎข้อที่ 1: ถ้าพยายามเข้าหน้า /admin แต่ไม่ได้เป็น admin ให้เตะกลับไปหน้าแรก (/)
    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    
    // กฎข้อที่ 2: ถ้าเข้าหน้า /payment (แจ้งชำระเงิน) ต้องล็อกอินก่อน (เป็นลูกค้าหรือแอดมินก็ได้)
    // ตรงนี้ withAuth จัดการให้แล้ว ถ้าไม่มี Token จะโดนเด้งไปหน้า /login อัตโนมัติ
  },
  {
    callbacks: {
      // เงื่อนไขแรกสุด: อนุญาตให้ผ่านด่านตรวจได้ก็ต่อเมื่อ "มี Token" (ล็อกอินแล้ว)
      authorized: ({ token }) => !!token,
    },
  }
);

// ระบุว่า URL ไหนบ้างที่ต้องเดินผ่านการ์ดคนนี้ (Middleware)
export const config = {
  // เราจะล็อคทุกหน้าที่ขึ้นต้นด้วย /admin และ /payment
  matcher: ["/admin/:path*", "/payment/:path*"],
};