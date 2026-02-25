// src/app/(client)/layout.tsx
import Navbar from "@/components/Navbar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100 bg-body">
      {/* Navbar จะแสดงอยู่ด้านบนสุดของทุกหน้าในฝั่งลูกค้า */}
      <Navbar />
      
      {/* พื้นที่แสดงเนื้อหาของแต่ละหน้า */}
      <div className="flex-grow-1">
        {children}
      </div>
    </div>
  );
}