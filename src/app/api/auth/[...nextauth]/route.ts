// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectDB();
        
        // 1. ค้นหาผู้ใช้ในระบบ
        const user = await User.findOne({ username: credentials?.username });
        if (!user) throw new Error("ไม่พบชื่อผู้ใช้งานนี้");

        // 2. ตรวจสอบรหัสผ่าน
        const isValid = await bcrypt.compare(credentials!.password, user.password);
        if (!isValid) throw new Error("รหัสผ่านไม่ถูกต้อง");

        // 3. ส่งข้อมูลกลับไปสร้าง Session
        return {
          id: user._id.toString(),
          name: user.username,
          role: user.role, // ส่ง Role ไปด้วย
          roomNumber: user.roomNumber,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.roomNumber = (user as any).roomNumber;
      }
      
      // 🌟 แก้ไขบรรทัดนี้: ให้รองรับการอัปเดตแม้เลขห้องจะเป็น "" (ค่าว่าง) ก็ตาม
      if (trigger === "update" && session?.roomNumber !== undefined) {
        token.roomNumber = session.roomNumber;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).roomNumber = token.roomNumber;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // กำหนดว่าหน้า Login ของเราจะอยู่ที่ URL นี้นะ
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };