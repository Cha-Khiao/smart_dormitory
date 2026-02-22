// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
// นำเข้าเครื่องมือสร้างกราฟจาก Chart.js
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// ลงทะเบียนใช้งานกราฟ
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        if (json.success) setStats(json.data);
      } catch (error) {
        console.error("ดึงข้อมูลสถิติไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-primary"></div></div>;
  }

  // ข้อมูลสำหรับกราฟโดนัท (Doughnut Chart) แสดงสถานะห้อง
  const roomChartData = {
    labels: ['ห้องว่าง (Available)', 'มีผู้เช่า (Occupied)', 'ซ่อมบำรุง (Maintenance)'],
    datasets: [
      {
        data: [stats?.rooms.available || 0, stats?.rooms.occupied || 0, stats?.rooms.maintenance || 0],
        backgroundColor: ['#198754', '#dc3545', '#ffc107'], // เขียว, แดง, เหลือง
        borderWidth: 0,
      },
    ],
  };

  // ข้อมูลสำหรับกราฟแท่ง (Bar Chart) แสดงงานที่ต้องทำ
  const taskChartData = {
    labels: ['รายการรออนุมัติ'],
    datasets: [
      {
        label: 'คำขอจองห้อง (Pending Bookings)',
        data: [stats?.pendingBookings || 0],
        backgroundColor: '#0d6efd', // น้ำเงิน
      },
      {
        label: 'สลิปรอตรวจสอบ (Pending Payments)',
        data: [stats?.pendingPayments || 0],
        backgroundColor: '#0dcaf0', // ฟ้า
      },
    ],
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold text-primary">ภาพรวมระบบ (Dashboard)</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => window.location.reload()}>
          🔄 รีเฟรชข้อมูล
        </button>
      </div>
      
      {/* แถวที่ 1: การ์ดสรุปตัวเลข 4 ใบ */}
      <div className="row g-3 mb-4">
        <div className="col-md-3 col-sm-6">
          <div className="card text-white bg-primary shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="card-title text-white-50">จำนวนห้องพักทั้งหมด</h6>
              <h2 className="display-5 fw-bold mb-0">{stats?.rooms.total || 0} <span className="fs-5 fw-normal">ห้อง</span></h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card text-white bg-success shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="card-title text-white-50">ห้องว่างพร้อมปล่อยเช่า</h6>
              <h2 className="display-5 fw-bold mb-0">{stats?.rooms.available || 0} <span className="fs-5 fw-normal">ห้อง</span></h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card text-white bg-warning shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="card-title text-dark opacity-75">คำขอจองที่รออนุมัติ</h6>
              <h2 className="display-5 fw-bold text-dark mb-0">{stats?.pendingBookings || 0} <span className="fs-5 fw-normal">รายการ</span></h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6">
          <div className="card text-white bg-info shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="card-title text-dark opacity-75">สลิปรอการตรวจสอบ (OCR)</h6>
              <h2 className="display-5 fw-bold text-dark mb-0">{stats?.pendingPayments || 0} <span className="fs-5 fw-normal">รายการ</span></h2>
            </div>
          </div>
        </div>
      </div>

      {/* แถวที่ 2: พื้นที่แสดงกราฟ */}
      <div className="row g-4">
        {/* กราฟโดนัท สัดส่วนห้องพัก */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body d-flex flex-column align-items-center">
              <h5 className="card-title text-secondary fw-bold mb-4">สัดส่วนสถานะห้องพัก</h5>
              <div style={{ width: "300px", height: "300px" }}>
                <Doughnut 
                  data={roomChartData} 
                  options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* กราฟแท่ง สรุปงานค้าง */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h5 className="card-title text-secondary fw-bold mb-4">ภาระงานที่ต้องดำเนินการ (To-Do)</h5>
              <div style={{ height: "300px" }}>
                <Bar 
                  data={taskChartData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: { legend: { position: 'bottom' } }
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}