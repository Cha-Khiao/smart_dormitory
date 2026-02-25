# 🏢 Smart Dormitory Management System

ระบบจัดการหอพักอัจฉริยะแบบครบวงจร สร้างด้วย **Next.js 15**, **MongoDB** และ **NextAuth.js** รองรับทั้ง Light/Dark Mode พร้อมระบบแชทเรียลไทม์และการจัดการบิลอัตโนมัติ

---

## ✨ ฟีเจอร์หลัก

### 👤 ฝั่งลูกค้า (Customer)
- **ดูห้องพักที่ว่าง** — เรียกดูรายละเอียดห้องพร้อมราคาและสิ่งอำนวยความสะดวก
- **ขอจองห้องพัก** — แนบสำเนาบัตรประชาชนและส่งคำขอผ่านระบบ
- **ระบบแชทกับแอดมิน** — สอบถามข้อมูลและติดตามสถานะแบบเรียลไทม์ (Polling ทุก 3 วินาที)
- **ดำเนินการเช่าห้อง 3 รูปแบบ:**
  - 🌐 ทำสัญญาออนไลน์ (อัปโหลดบัตรประชาชน + สลิปโอนเงิน)
  - 👀 นัดดูห้องพักก่อนตัดสินใจ
  - ✍️ นัดทำสัญญาและชำระเงินหน้างาน
- **ชำระค่าเช่ารายเดือน** — แนบสลิปและรอแอดมินตรวจสอบ
- **แชทลอยตัว (Floating Chat)** — สำหรับลูกบ้านที่เข้าพักแล้ว ติดต่อแอดมินได้ทุกหน้า

### 🔧 ฝั่งแอดมิน (Admin)
- **แดชบอร์ดภาพรวม** — KPI สำคัญ, รายได้เดือนปัจจุบัน, อัตราการเช่า, คำขอรอดำเนินการ
- **จัดการห้องพัก** — เพิ่ม/แก้ไข/ลบห้องพัก พร้อมจัดการสถานะ
- **ระบบสนทนา** — จัดการแชทแยกตามห้อง, แสดงตัวเลขข้อความที่ยังไม่อ่าน, อนุมัติ/ปฏิเสธคำขอ
- **ตรวจสอบสลิป** — OCR อ่านยอดเงินในสลิปอัตโนมัติด้วย Tesseract.js
- **ระบบออกบิลอัตโนมัติ** — ตั้งเวลาเปิด-ปิดรอบบิล, ป้องกันออกบิลซ้ำ, ปลดล็อกฉุกเฉินรายห้อง

---

## 🛠️ Tech Stack

| หมวดหมู่ | เทคโนโลยี |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | MongoDB + Mongoose |
| Authentication | NextAuth.js (JWT Strategy) |
| Styling | Bootstrap 5 + Custom CSS |
| Theme | next-themes (Dark/Light Mode) |
| Image Upload | Cloudinary |
| OCR | Tesseract.js |
| Notifications | react-hot-toast |
| Alerts | SweetAlert2 |
| Charts | Recharts |
| UI Components | React Bootstrap |

---

## 📁 โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── (client)/               # หน้าฝั่งลูกค้า (มี Navbar)
│   │   ├── page.tsx            # หน้าแรก (แสดงห้องว่าง)
│   │   ├── rooms/[id]/         # รายละเอียดห้องพัก
│   │   ├── chat/[id]/          # หน้าแชทก่อนเช่า
│   │   ├── my-room/            # ห้องพักของฉัน (จ่ายบิล, แชท)
│   │   ├── book/[id]/          # หน้าทำสัญญาออนไลน์ (Legacy)
│   │   └── payment/            # แจ้งชำระเงิน (Legacy)
│   ├── admin/                  # หน้าแอดมิน (มี Sidebar)
│   │   ├── page.tsx            # แดชบอร์ด
│   │   ├── rooms/              # จัดการห้องพัก
│   │   ├── bookings/           # ระบบสนทนา & อนุมัติ
│   │   ├── billing/            # ออกบิลรายเดือน
│   │   └── payments/           # ตรวจสอบสลิป (OCR)
│   ├── api/                    # API Routes (Next.js)
│   │   ├── auth/[...nextauth]/ # Authentication
│   │   ├── rooms/              # CRUD ห้องพัก
│   │   ├── bookings/           # จัดการคำขอจอง
│   │   ├── messages/           # ระบบแชท
│   │   ├── bills/              # ระบบบิล
│   │   ├── payments/           # Legacy สลิป
│   │   ├── dashboard/          # ข้อมูลแดชบอร์ด
│   │   ├── users/[id]/         # ดึงข้อมูลผู้ใช้
│   │   ├── admin/verify/       # ยืนยันตัวตนแอดมิน
│   │   ├── register/           # สมัครสมาชิก
│   │   └── setup/              # สร้างแอดมินครั้งแรก
│   ├── login/                  # หน้าเข้าสู่ระบบ
│   └── register/               # หน้าสมัครสมาชิก
├── components/
│   ├── Navbar.tsx              # แถบเมนูด้านบน
│   ├── ResidentChat.tsx        # แชทลอยตัวสำหรับลูกบ้าน
│   ├── ThemeProvider.tsx       # ระบบธีม Dark/Light
│   ├── ThemeToggle.tsx         # ปุ่มสลับธีม
│   └── AuthProvider.tsx        # SessionProvider wrapper
├── models/                     # Mongoose Schemas
│   ├── User.ts
│   ├── Room.ts
│   ├── Booking.ts
│   ├── Message.ts
│   ├── Bill.ts
│   └── Payment.ts
├── lib/
│   └── mongodb.ts              # Connection handler (with caching)
└── middleware.ts               # Route protection (Admin & Payment)
```

---

## 🗄️ โครงสร้างฐานข้อมูล

### User
| Field | Type | Description |
|---|---|---|
| username | String (unique) | ชื่อผู้ใช้งาน |
| password | String (hashed) | รหัสผ่าน (bcrypt) |
| role | `admin` / `customer` | สิทธิ์การใช้งาน |
| roomNumber | String | เลขห้องที่เข้าพัก (ลูกค้า) |

### Room
| Field | Type | Description |
|---|---|---|
| roomNumber | String (unique) | เลขห้อง |
| status | `available` / `occupied` / `maintenance` | สถานะห้อง |
| price | Number | ราคาต่อเดือน (บาท) |

### Booking
| Field | Type | Description |
|---|---|---|
| userId | ObjectId | อ้างอิง User |
| roomId | ObjectId | อ้างอิง Room |
| roomNumber | String | เลขห้อง |
| status | Enum | สถานะการดำเนินการ (ดูด้านล่าง) |
| contractMethod | `online` / `onsite` | วิธีทำสัญญา |
| moveInDate | String | วันที่ย้ายเข้า |
| idCardUrl | String | URL รูปบัตรประชาชน |
| slipUrl | String | URL สลิปโอนเงิน |
| appointmentDate | String | วันนัดหมาย |

**Booking Status Flow:**
```
chatting → pending_approval → approved
         → appointment    ↗
                         rejected
```

### Message
| Field | Type | Description |
|---|---|---|
| bookingId | ObjectId | อ้างอิง Booking |
| senderId | ObjectId | ผู้ส่ง |
| senderRole | `admin` / `customer` | บทบาทผู้ส่ง |
| text | String | เนื้อหาข้อความ |
| isRead | Boolean | อ่านแล้วหรือยัง |

### Bill
| Field | Type | Description |
|---|---|---|
| userId | String | อ้างอิง User |
| bookingId | String | อ้างอิง Booking |
| roomNumber | String | เลขห้อง |
| month | String | เดือนที่ออกบิล (เช่น "มีนาคม 2026") |
| roomFee | Number | ค่าห้อง |
| waterFee | Number | ค่าน้ำ |
| electricFee | Number | ค่าไฟ |
| otherFee | Number | ค่าอื่น ๆ |
| totalAmount | Number | ยอดรวม |
| status | `unpaid` / `paid` / `completed` | สถานะการชำระ |
| slipUrl | String | URL สลิปที่ลูกค้าส่ง |

---

## 🚀 การติดตั้งและรันโปรเจกต์

### 1. Clone โปรเจกต์

```bash
git clone <your-repository-url>
cd smart-dormitory
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

### 4. สร้างบัญชีแอดมินครั้งแรก

หลังจากรันโปรเจกต์แล้ว เปิดเบราว์เซอร์ไปที่:

```
http://localhost:3000/api/setup
```

จะได้บัญชีแอดมิน:
- **Username:** `admin`
- **Password:** `admin1234`

> ⚠️ **แนะนำให้เปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบครั้งแรก**

### 5. รันโปรเจกต์

```bash
# Development
npm run dev

# Production Build
npm run build
npm start
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

---

## ☁️ การตั้งค่า Cloudinary

1. สมัครบัญชีที่ [cloudinary.com](https://cloudinary.com)
2. ไปที่ **Settings → Upload**
3. สร้าง **Upload Preset** แบบ **Unsigned**
4. นำค่า `Cloud Name` และ `Upload Preset Name` ไปใส่ใน `.env.local`

---

## 🔐 ระบบสิทธิ์การใช้งาน

| Route | สิทธิ์ที่ต้องการ |
|---|---|
| `/` | ทุกคน (ไม่ต้องล็อกอิน) |
| `/rooms/[id]` | ทุกคน (ต้องล็อกอินเพื่อจอง) |
| `/my-room` | Customer เท่านั้น |
| `/chat/[id]` | Customer เท่านั้น |
| `/admin/*` | Admin เท่านั้น |
| `/payment/*` | ต้องล็อกอิน |

การป้องกัน Route จัดการผ่าน `src/middleware.ts` โดยใช้ `withAuth` จาก NextAuth

---

## 📱 หน้าจอหลักของระบบ

### ลูกค้า
- **หน้าแรก** `/` — รายการห้องว่าง, ช่องทางติดต่อ, QR Code LINE
- **รายละเอียดห้อง** `/rooms/[id]` — ข้อมูลห้อง, ปุ่มขอจอง, Modal อัปโหลดเอกสาร
- **แชท** `/chat/[id]` — สนทนากับแอดมิน, Modal ดำเนินการเช่า 3 รูปแบบ
- **ห้องของฉัน** `/my-room` — ดูบิล, แจ้งชำระเงิน, แชทลอยตัว

### แอดมิน
- **แดชบอร์ด** `/admin` — KPI, กราฟรายได้, รายการรอดำเนินการ
- **จัดการห้อง** `/admin/rooms` — ตาราง CRUD พร้อม Modal แก้ไข
- **ระบบสนทนา** `/admin/bookings` — 3 คอลัมน์ (ห้อง → ลูกค้า → แชท), ปุ่มอนุมัติ/ปฏิเสธ
- **ออกบิล** `/admin/billing` — นาฬิกานับถอยหลัง, ตารางลูกบ้าน, Modal สร้างบิล
- **ตรวจสลิป** `/admin/payments` — ดูสลิป, OCR อัตโนมัติ, อนุมัติ/ปฏิเสธ

---

## 🔄 Flow การเช่าห้องพัก

```
ลูกค้าดูห้อง → กดขอจอง → อัปโหลดบัตรประชาชน
       ↓
   ห้องแชทถูกสร้าง (status: chatting)
       ↓
ลูกค้ากด "ดำเนินการเช่าห้องพัก" → เลือกวิธี:
   ├── ออนไลน์  → อัปโหลด ID + สลิป → status: pending_approval
   ├── นัดดูห้อง → เลือกวันที่       → status: appointment
   └── นัดทำสัญญา → เลือกวันที่     → status: appointment
       ↓
แอดมินตรวจสอบในระบบสนทนา
       ↓
กด "อนุมัติ" → status: approved
              → ห้อง: occupied
              → User.roomNumber = เลขห้อง
       ↓
ลูกค้ารับการแจ้งเตือน → เด้งไปหน้า /my-room
```

---

## 🧾 Flow การออกบิลและชำระเงิน

```
แอดมินเปิดระบบออกบิล (ตั้งเวลา)
       ↓
กด "สร้างบิล" สำหรับแต่ละห้อง → กรอกค่าน้ำ/ไฟ/อื่นๆ
       ↓
บิลถูกสร้าง + ส่งข้อความแจ้งเตือนในแชท
       ↓
ลูกค้าเห็นบิลในหน้า /my-room
       ↓
กด "ชำระเงิน" → เลือกช่องทาง → อัปโหลดสลิป
       ↓
แอดมินได้รับแจ้งในระบบตรวจสลิป
       ↓
OCR อ่านยอดเงินอัตโนมัติ → แอดมินกด "อนุมัติ"
       ↓
บิล: status → completed
```

---

## ⚙️ API Endpoints

### Rooms
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/rooms` | ดึงห้องทั้งหมด |
| POST | `/api/rooms` | สร้างห้องใหม่ |
| GET | `/api/rooms/[id]` | ดึงข้อมูลห้องเดียว |
| PUT | `/api/rooms/[id]` | อัปเดตห้อง |
| DELETE | `/api/rooms/[id]` | ลบห้อง |

### Bookings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bookings` | ดึง Booking ทั้งหมด (แอดมิน) |
| POST | `/api/bookings` | สร้าง/เปิดห้องแชทใหม่ |
| PATCH | `/api/bookings` | อัปเดตสถานะ (อนุมัติ/ปฏิเสธ) |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages?bookingId=xxx` | ดึงข้อความในห้องแชท |
| POST | `/api/messages` | ส่งข้อความใหม่ |
| PATCH | `/api/messages` | มาร์คข้อความว่าอ่านแล้ว |

### Bills
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bills?userId=xxx` | ดึงบิลของลูกค้า |
| GET | `/api/bills?status=paid` | ดึงบิลตามสถานะ |
| POST | `/api/bills` | สร้างบิลใหม่ (ป้องกันซ้ำ) |
| PATCH | `/api/bills` | อัปเดตสถานะบิล |

### Others
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | ดึงข้อมูลแดชบอร์ดทั้งหมด |
| GET | `/api/users/[id]` | ดึง roomNumber ของ User |
| POST | `/api/register` | สมัครสมาชิก |
| GET | `/api/setup` | สร้างบัญชีแอดมินครั้งแรก |
| POST | `/api/admin/verify` | ยืนยันตัวตนแอดมินด้วยรหัสผ่าน |

---

## 🛡️ ฟีเจอร์ความปลอดภัย

- **Password Hashing** — bcryptjs (salt rounds: 10)
- **JWT Session** — ข้อมูล session ไม่เปิดเผย role ออกมาใน client โดยตรง
- **Route Protection** — Middleware ป้องกัน `/admin/*` และ `/payment/*`
- **Admin Verify** — การตั้งค่าสำคัญ (เช่น เวลาออกบิล) ต้องยืนยันรหัสผ่านก่อน
- **Duplicate Bill Prevention** — ตรวจสอบ unique index (roomNumber + month) ทั้งฝั่ง Frontend และ Backend
- **Resident Lock** — ลูกค้าที่เป็นลูกบ้านแล้วไม่สามารถเปิดแชทห้องอื่นได้
- **Self-Healing Data** — ระบบตรวจสอบและล้าง Booking "ขยะ" ที่ค้างในฐานข้อมูลอัตโนมัติ

---

## 🌙 Dark Mode

ระบบรองรับ Dark Mode อย่างสมบูรณ์ผ่าน:
- `next-themes` สำหรับจัดการธีม
- `data-bs-theme` attribute ของ Bootstrap 5
- CSS override ใน `globals.css` สำหรับคลาสที่ถูก hardcode สีไว้

---

## 📦 Scripts

```bash
npm run dev      # รัน Development Server (port 3000)
npm run build    # Build สำหรับ Production
npm run start    # รัน Production Server
npm run lint     # ตรวจสอบ Code ด้วย ESLint
```

---

## 🤝 Contributing

1. Fork โปรเจกต์
2. สร้าง Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add amazing feature'`)
4. Push ไป Branch (`git push origin feature/amazing-feature`)
5. เปิด Pull Request

---

## 📄 License

This project is for educational purposes.

---

*สร้างด้วย ❤️ และ Next.js*