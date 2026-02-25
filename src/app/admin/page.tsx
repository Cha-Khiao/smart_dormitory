"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  
  // State สำหรับเก็บสถิติภาพรวม
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    pendingBookings: 0,
    pendingSlips: 0,
    totalRevenue: 0 // ยอดเงินเดือนนี้ (ที่จ่ายแล้ว)
  });

  // State สำหรับดึงรายการล่าสุดมาโชว์
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);

  const [chartData, setChartData] = useState<any[]>([]);

  // ... (ส่วน import และ state ด้านบนคงเดิม) ...

  // ดึงข้อมูลทั้งหมดจาก API เส้นเดียว! (โหลดไวกว่าเดิมมาก)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // ยิงไปที่ API เส้นใหม่ที่เราเพิ่งทำ
        const res = await fetch(`/api/dashboard?t=${new Date().getTime()}`, { cache: 'no-store' });
        const json = await res.json();
        
        console.log("🔥 ข้อมูลที่ API ส่งมาให้ Dashboard:", json);

        if (json.success) {
          // รับข้อมูลมาแล้วยัดใส่ State ได้เลย
          setStats(json.data.stats);
          setRecentBookings(json.data.recentBookings);
          setRecentBills(json.data.recentBills);
          setChartData(json.data.chartData);
        }else {
          // 🌟 ถ้า API พัง ให้แจ้งเตือนแอดมินเลย
          toast.error(`API Error: ${json.details || json.error}`);
        }
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    const autoRefreshInterval = setInterval(fetchDashboardData, 10000); // รีเฟรชอัตโนมัติทุก 10 วิ
    return () => clearInterval(autoRefreshInterval);
    
  }, []);

  if (isLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  const currentMonthName = new Date().toLocaleDateString('th-TH', { month: 'long' });

  return (
    <div className="container py-4">
      {/* 🌟 Header & Greeting */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-body mb-1">👋 สวัสดี, {session?.user?.name || "แอดมิน"}</h2>
          <p className="text-body-secondary mb-0">นี่คือภาพรวมของหอพักคุณในขณะนี้</p>
        </div>
        <div className="text-md-end">
          <div className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-3 py-2 rounded-pill fs-6">
            📅 ข้อมูลประจำเดือน {currentMonthName}
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* 🌟 KPI Cards (สรุปตัวเลขสำคัญ) รองรับ Dark Mode 100% */}
      {/* ======================================================= */}
      <div className="row g-4 mb-5">
        
        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 bg-body border-secondary-subtle shadow-sm rounded-4 transition-all hover-shadow">
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-body-secondary fw-bold">รายได้เดือนนี้</span>
                <span className="fs-3">💰</span>
              </div>
              <h3 className="fw-bold text-success mb-0">{stats.totalRevenue.toLocaleString()} ฿</h3>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 bg-body border-secondary-subtle shadow-sm rounded-4 transition-all hover-shadow">
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-body-secondary fw-bold">อัตราการเช่า (ห้อง)</span>
                <span className="fs-3">🏢</span>
              </div>
              <div className="d-flex align-items-baseline gap-2 mb-0">
                <h3 className="fw-bold text-primary mb-0">{stats.occupiedRooms}</h3>
                <span className="text-body-secondary">/ {stats.totalRooms}</span>
              </div>
              <div className="progress mt-3" style={{ height: "6px" }}>
                <div className="progress-bar bg-primary rounded-pill" style={{ width: `${(stats.occupiedRooms / stats.totalRooms) * 100 || 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 bg-body border-secondary-subtle shadow-sm rounded-4 transition-all hover-shadow">
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-body-secondary fw-bold">คำขอจองใหม่</span>
                <span className="fs-3">📝</span>
              </div>
              <div className="d-flex align-items-center gap-3 mt-auto">
                <h3 className={`fw-bold mb-0 ${stats.pendingBookings > 0 ? 'text-danger' : 'text-body'}`}>{stats.pendingBookings}</h3>
                {stats.pendingBookings > 0 && <span className="badge bg-danger rounded-pill pulse-animation">รอตรวจสอบ!</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-lg-3">
          <div className="card h-100 bg-body border-secondary-subtle shadow-sm rounded-4 transition-all hover-shadow">
            <div className="card-body p-4 d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-body-secondary fw-bold">สลิปรอตรวจสอบ</span>
                <span className="fs-3">🧾</span>
              </div>
              <div className="d-flex align-items-center gap-3 mt-auto">
                <h3 className={`fw-bold mb-0 ${stats.pendingSlips > 0 ? 'text-warning' : 'text-body'}`}>{stats.pendingSlips}</h3>
                {stats.pendingSlips > 0 && <span className="badge bg-warning text-dark rounded-pill">ต้องตรวจ!</span>}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================= */}
      {/* 🌟 Action Boards (สิ่งที่แอดมินต้องจัดการด่วน) */}
      {/* ======================================================= */}
      <div className="row g-4">
        
        {/* กล่องซ้าย: รายการเอกสารรออนุมัติ */}
        <div className="col-lg-6">
          <div className="card border-secondary-subtle shadow-sm rounded-4 h-100 bg-body">
            <div className="card-header bg-transparent border-secondary-subtle p-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-body d-flex align-items-center gap-2">
                <span>📝</span> คำขอเข้าพักล่าสุด
              </h5>
              <Link href="/admin/bookings" className="btn btn-sm btn-outline-primary rounded-pill fw-bold">ดูทั้งหมด</Link>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush rounded-bottom-4">
                {recentBookings.length === 0 ? (
                  <div className="p-5 text-center text-body-secondary">
                    <div className="fs-1 mb-2 opacity-50">✨</div>
                    <p className="mb-0">ไม่มีคำขอจองค้างอยู่เลย งานเคลียร์หมดแล้ว!</p>
                  </div>
                ) : (
                  recentBookings.map((b) => (
                    <div key={b._id} className="list-group-item bg-body text-body border-secondary-subtle p-4 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-dark rounded-pill">ห้อง {b.roomNumber}</span>
                          <span className="fw-bold text-body">{b.username}</span>
                        </div>
                        <div className="small text-body-secondary">
                          ยื่นเอกสาร: {new Date(b.createdAt).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                      <Link href="/admin/bookings" className="btn btn-sm btn-primary rounded-pill px-3 shadow-sm">
                        ตรวจเอกสาร ➡️
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* กล่องขวา: รายการสลิปรอตรวจสอบ */}
        <div className="col-lg-6">
          <div className="card border-secondary-subtle shadow-sm rounded-4 h-100 bg-body">
            <div className="card-header bg-transparent border-secondary-subtle p-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-body d-flex align-items-center gap-2">
                <span>🧾</span> แจ้งชำระเงินล่าสุด
              </h5>
              <Link href="/admin/payments" className="btn btn-sm btn-outline-success rounded-pill fw-bold">ไปที่ตรวจสอบสลิปชำระเงิน</Link>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush rounded-bottom-4">
                {recentBills.length === 0 ? (
                  <div className="p-5 text-center text-body-secondary">
                    <div className="fs-1 mb-2 opacity-50">💸</div>
                    <p className="mb-0">ไม่มีสลิปใหม่รอตรวจสอบ</p>
                  </div>
                ) : (
                  recentBills.map((bill) => (
                    <div key={bill._id} className="list-group-item bg-body text-body border-secondary-subtle p-4 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-dark rounded-pill">ห้อง {bill.roomNumber}</span>
                          <span className="fw-bold text-danger">{bill.totalAmount.toLocaleString()} ฿</span>
                        </div>
                        <div className="small text-body-secondary">
                          ส่งสลิปเมื่อ: {new Date(bill.updatedAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </div>
                      </div>
                      <Link href="/admin/billing" className="btn btn-sm btn-success rounded-pill px-3 shadow-sm">
                        ตรวจสลิป ➡️
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}