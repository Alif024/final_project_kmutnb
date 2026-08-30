# AI-NOC — AI Network Operation Center

ระบบวิเคราะห์ปัญหาเครือข่ายเสมือนบนแพลตฟอร์ม Virtualization (VMware ESXi / Proxmox VE)
ด้วยปัญญาประดิษฐ์และข้อมูลเชิงสังเกตหลายแหล่ง (Multi-source Observability)

โครงงานปริญญานิพนธ์ — มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)

---

## สถานะปัจจุบันของแอปพลิเคชัน

> **สถานะ: Prototype / Demo (UI-complete, Mock-driven)**
> ส่วนติดต่อผู้ใช้ครบทั้ง 6 โมดูลและใช้งานโต้ตอบได้จริงในเบราว์เซอร์
> ข้อมูลทั้งหมดมาจากชุดข้อมูลจำลอง (`lib/mock-data.ts`) ยกเว้น **AI Chat Assistant** ที่เรียก Gemini API จริงผ่าน API Route

**ผลการตรวจสอบล่าสุด (30 สิงหาคม 2568):** ระบบ Build ผ่านสมบูรณ์

| การตรวจสอบ | ผลลัพธ์ |
|---|---|
| `npm install` | ✅ ผ่าน (1,002 packages) |
| `npx tsc --noEmit` | ✅ ผ่าน ไม่มี Type Error |
| `npm run build` | ✅ ผ่าน — 3 Route (`/` = 256 kB First Load JS, `/_not-found`, `/api/ai/chat`) |
| `npm run lint` | ✅ ผ่าน ไม่มี Warning |

| ด้าน | สถานะ |
|---|---|
| หน้าจอ/ฟีเจอร์ UI | ✅ ครบทั้ง 6 โมดูล รวม 13 หน้าย่อย |
| Human-in-the-Loop (อนุมัติ/ปฏิเสธ + Audit Log) | ✅ ทำงานจริงแบบ in-memory |
| AI Chat Assistant | ✅ ต่อ Gemini API จริง (มี Mock Fallback เมื่อไม่ตั้งค่า API Key) |
| AI Diagnosis (RCA) | 🟡 แสดงผลจากชุดข้อมูลจำลอง ยังไม่เรียกโมเดลจริง |
| การเก็บ Telemetry จริง (vCenter / Proxmox / SNMP / Syslog) | ❌ ยังไม่เชื่อมต่อ (หน้า Integrations เป็น UI Mock) |
| ฐานข้อมูล / การคงข้อมูลถาวร | ❌ ยังไม่มี — State หายเมื่อรีเฟรชหน้า |
| การยืนยันตัวตน (Authentication) | ❌ ยังไม่มี — RBAC เป็น Role Switcher สำหรับสาธิต |
| Export PDF / Excel | ❌ เป็นปุ่ม Stub (`alert()`) ยกเว้นปุ่ม Print ที่ใช้ `window.print()` ได้ |
| Unit Test / CI | ❌ ยังไม่มี |

---

## เทคโนโลยีที่ใช้

| หมวด | รายละเอียด |
|---|---|
| Framework | Next.js 15.5 (App Router, React Server Components + Client Components) |
| UI | React 19.2, TypeScript 5.9 (`strict: true`) |
| Styling | Tailwind CSS v4.1 (`@tailwindcss/postcss`), ธีม Dark + Frosted Glass |
| ไอคอน / กราฟ | lucide-react, Recharts 3.10 |
| Animation | motion (ตั้ง `transpilePackages`) |
| AI | `@google/genai` v2 — โมเดล `gemini-3.6-flash` |
| ฟอนต์ | Inter + Prompt (`next/font/google`, รองรับ subset ภาษาไทย) |
| Build Output | `standalone` (พร้อม Deploy บน Cloud Run / Docker) |

---

## การติดตั้งและใช้งาน

**ข้อกำหนดเบื้องต้น:** Node.js 20 ขึ้นไป

```bash
# 1. ติดตั้ง dependencies
npm install          # หรือ bun install (โปรเจกต์มี bun.lock ให้แล้ว)

# 2. ตั้งค่า Environment Variable
cp .env.example .env.local
#    แล้วแก้ค่า GEMINI_API_KEY ในไฟล์ .env.local

# 3. รันโหมดพัฒนา
npm run dev          # เปิดที่ http://localhost:3000
```

> **หมายเหตุ:** หากไม่ตั้งค่า `GEMINI_API_KEY` แอปยังรันได้ตามปกติ
> โดย AI Chat Assistant จะตอบกลับด้วยข้อความจำลอง (Mock Mode) แทนการเรียกโมเดลจริง

### Environment Variables

| ตัวแปร | จำเป็น | คำอธิบาย |
|---|---|---|
| `GEMINI_API_KEY` | สำหรับ AI Chat | คีย์ Gemini API ใช้ใน `/api/ai/chat` (ฝั่ง Server เท่านั้น) |
| `APP_URL` | ไม่จำเป็น | URL ที่โฮสต์แอป (AI Studio ใส่ค่าให้อัตโนมัติ) |
| `DISABLE_HMR` | ไม่จำเป็น | ตั้ง `true` เพื่อปิด File Watching ในโหมด dev |

### NPM Scripts

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | รัน Development Server |
| `npm run build` | Build สำหรับ Production (โหมด standalone) |
| `npm run start` | รัน Production Server จากผลลัพธ์ Build |
| `npm run lint` | ตรวจสอบโค้ดด้วย ESLint |
| ~~`npm run clean`~~ | ⚠️ ใช้งานไม่ได้ — Next.js CLI ไม่มีคำสั่ง `clean` (ให้ลบโฟลเดอร์ `.next` เองแทน) |

---

## โครงสร้างโปรเจกต์

```
final_project_kmutnb/
├── app/
│   ├── api/ai/chat/route.ts     # API Route เดียวของระบบ — เรียก Gemini
│   ├── globals.css              # Design Tokens + Frosted Glass Utilities
│   ├── layout.tsx               # Root Layout (lang="th", ฟอนต์ Inter/Prompt)
│   └── page.tsx                 # หน้าเดียวของแอป — จัดการ State และสลับ View
├── components/
│   ├── Sidebar.tsx              # เมนูหลัก 6 โมดูล + Role Switcher
│   ├── TopBar.tsx               # ชื่อหน้า, นาฬิกาไทย (พ.ศ.), Fullscreen
│   ├── StatusBar.tsx            # แถบสถานะ Collector / AI Engine / Syslog
│   ├── CommandPreviewModal.tsx  # ตัวอย่างคำสั่งก่อนอนุมัติ (Human-in-the-Loop)
│   ├── RejectReasonModal.tsx    # ฟอร์มระบุเหตุผลการปฏิเสธ
│   └── views/                   # 6 View หลัก (ดูตารางฟีเจอร์ด้านล่าง)
├── lib/
│   ├── mock-data.ts             # ชุดข้อมูลจำลองทั้งหมดของระบบ
│   └── utils.ts                 # `cn()` — clsx + tailwind-merge
├── types/ai-noc.ts              # TypeScript Interface ของโดเมนทั้งหมด
├── hooks/use-mobile.ts          # Media Query Hook
└── metadata.json                # Manifest สำหรับ Google AI Studio
```

สถาปัตยกรรมปัจจุบันเป็น **Single-page + Client State** — `app/page.tsx` ถือ State ทั้งหมด
(แท็บที่เลือก, บทบาทผู้ใช้, รายการอนุมัติ, Audit Log) แล้วส่งลงไปให้แต่ละ View ผ่าน Props
ยังไม่มี Router-based Navigation และไม่มี State Management Library

---

## ฟีเจอร์ตามโมดูล

### 1. Dashboard — ภาพรวมสุขภาพระบบ
KPI 6 การ์ด (Network Health, AI Confidence, Devices, VMs, Hypervisors, Active Alerts) พร้อม Sparkline,
โดนัทสรุประดับความรุนแรงของ Alert, รายการ Alert ล่าสุด, Top 5 Issues,
และตารางการใช้ทรัพยากรรายเครื่อง Hypervisor — คลิกลิงก์เพื่อ Deep-link ไปแท็บย่อยอื่นได้

### 2. Infrastructure — Topology & Monitoring
- **Topology:** ผังลำดับชั้น (Internet → Firewall → Core Switch → Edge/VM) วาดด้วย SVG พร้อม Legend,
  Minimap, ค้นหา/กรอง และแผงรายละเอียดโหนด 3 แท็บ (Overview / Logs / Interfaces)
- **Monitoring:** ตาราง Hypervisor พร้อมเมตริกเฉพาะทาง Virtualization —
  CPU Ready Time, Memory Ballooning, Storage Latency, Virtual Switch Dropped Packets และกราฟย้อนหลัง 1 ชั่วโมง

### 3. AI Analysis — Diagnosis & Assistant
- **AI Diagnosis (RCA):** แสดง Root Cause พร้อมคะแนนความเชื่อมั่น, ห่วงโซ่เหตุการณ์ (Evidence Chain)
  และหลักฐานเชิงเมตริกเทียบกับ Threshold *(ข้อมูลจำลอง)*
- **AI Chat Assistant:** สนทนากับ Gemini ผ่าน `POST /api/ai/chat` — System Prompt ภาษาไทย
  ฝังบริบท Telemetry ของระบบไว้ พร้อมชุดคำถามแนะนำ *(เรียกโมเดลจริง)*

### 4. Action Center — Recommendation & Approval
- **Recommendations:** ตารางข้อเสนอแนะจาก AI พร้อมลำดับความสำคัญ ความเชื่อมั่น และตัวกรอง
- **Approvals (Human-in-the-Loop):** การ์ดคำขออนุมัติ 3 คอลัมน์ (บริบท / พารามิเตอร์ / ผลกระทบที่คาดการณ์),
  Modal ดูตัวอย่างคำสั่งก่อนรัน, Modal ระบุเหตุผลการปฏิเสธ, สวิตช์ Auto-Execute Rules (ค่าเริ่มต้นปิด, เฉพาะ Admin)

เมื่อกดอนุมัติหรือปฏิเสธ ระบบจะอัปเดตสถานะคำขอ อัปเดต Recommendation ที่เกี่ยวข้อง
และบันทึก Audit Log ใหม่ทันที (ดูผลได้ที่ Settings → Audit Log)

### 5. Reports & Analytics
- **Executive Summary:** KPI ระดับผู้บริหาร (Availability, Incidents, MTTR, AI Accuracy),
  กราฟแนวโน้ม 7 วัน, การกระจายความรุนแรง และรายงานเชิงบรรยายจาก AI
- **Incident Post-Mortem:** ไทม์ไลน์เหตุการณ์, บทเรียนที่ได้รับ และรายการงานติดตาม

### 6. Settings & Administration
- **Integrations:** สถานะการเชื่อมต่อ vCenter, Proxmox VE, Syslog/Prometheus, LINE Notify *(UI Mock)*
- **System Config:** เลือกโมเดล AI และตั้งค่า Threshold (CPU Ready, Storage Latency, Packet Loss)
- **RBAC:** สลับบทบาท Admin / NOC Engineer / Viewer เพื่อสาธิตการควบคุมสิทธิ์
- **Audit Log:** ตารางบันทึกการตัดสินใจทั้งหมด รวมคำสั่งที่ถูกรันและเหตุผลการปฏิเสธ

---

## ข้อจำกัดที่ทราบ (Known Limitations)

1. **ข้อมูลไม่ถูกบันทึกถาวร** — State ทั้งหมดเก็บใน React `useState` การรีเฟรชหน้าจะรีเซ็ตกลับสู่ค่าเริ่มต้น
2. **ไม่มีระบบยืนยันตัวตน** — การสลับบทบาทเป็นเพียงการสาธิต RBAC ไม่มีการบังคับสิทธิ์ฝั่ง Server
3. **AI Diagnosis ยังไม่เรียกโมเดล** — ผลการวินิจฉัยอ่านจาก `MOCK_DIAGNOSIS_01` แบบตายตัว
4. **บริบทของ AI Chat ยังฝังแบบ Hard-coded** — API Route รับพารามิเตอร์ `contextData` แต่ฝั่ง Client
   ยังไม่ได้ส่งมา และค่า `citedEntities` ที่ตอบกลับก็เป็นค่าคงที่
5. **ปุ่มที่ยังเป็น Stub** — Export PDF/Excel และ Add Integration ยังเรียกแค่ `alert()`;
   ปุ่ม Refresh บน TopBar/StatusBar ยังไม่ผูกกับการดึงข้อมูลใหม่ และ `lastUpdate` เป็นค่าคงที่
6. **Badge จำนวนคำขออนุมัติบน Sidebar ยังเป็นค่าคงที่ 3** — Prop `pendingApprovalCount`
   ถูกส่งเข้าไปแล้วแต่ยังไม่ได้ถูกนำไปใช้แสดงผล
7. **ESLint ถูกข้ามตอน Build** (`eslint.ignoreDuringBuilds: true`) — ต้องรัน `npm run lint` แยกเอง
   ส่วนการตรวจชนิดข้อมูลของ TypeScript ยังบังคับใช้อยู่ (`ignoreBuildErrors: false`)
8. **การ Build ต้องใช้อินเทอร์เน็ต** เพราะโหลดฟอนต์ผ่าน `next/font/google`
9. **มีไฟล์ตั้งค่า ESLint ซ้ำซ้อน** — `.eslintrc.json` (รูปแบบเดิม) ยังอยู่คู่กับ `eslint.config.mjs`
   (Flat Config) ซึ่ง ESLint 9 ใช้เฉพาะไฟล์หลัง จึงควรลบไฟล์เดิมทิ้ง
10. **สคริปต์ `npm run clean` ใช้งานไม่ได้** — ชี้ไปที่คำสั่ง `next clean` ที่ไม่มีอยู่จริง

---

## แผนพัฒนาต่อ (Roadmap)

- [ ] เชื่อมต่อ Collector จริง — vCenter API, Proxmox VE API, SNMP และ Syslog
- [ ] เพิ่มฐานข้อมูลสำหรับ Incident, Approval และ Audit Log
- [ ] ให้ AI Diagnosis (RCA) วิเคราะห์จากข้อมูลจริงผ่าน Gemini
- [ ] เพิ่ม Authentication และบังคับสิทธิ์ RBAC ที่ฝั่ง Server
- [ ] ทำ Export รายงาน PDF/Excel ให้ใช้งานได้จริง
- [ ] เชื่อม Notification Gateway (LINE / Webhook) เข้ากับเหตุการณ์จริง
- [ ] เพิ่มชุดทดสอบและ CI Pipeline

---

## License

โครงงานเพื่อการศึกษา (Academic Project) — KMUTNB
