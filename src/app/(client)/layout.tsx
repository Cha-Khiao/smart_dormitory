import Navbar from "@/components/Navbar";
import ResidentChat from "@/components/ResidentChat";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-vh-100 bg-body-tertiary">
        {children}
      </main>
      
      {/* 🌟 2. วางไว้ล่างสุดของ Layout เพื่อให้โชว์ทุกหน้าของลูกค้า */}
      <ResidentChat /> 
    </>
  );
}