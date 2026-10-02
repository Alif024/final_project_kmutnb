# AI-NOC — AI Network Operation Center

ระบบวิเคราะห์ปัญหาเครือข่ายเสมือนบนแพลตฟอร์ม Virtualization (VMware ESXi / Proxmox VE)
ด้วยปัญญาประดิษฐ์และข้อมูลเชิงสังเกตหลายแหล่ง (Multi-source Observability)

โครงงานปริญญานิพนธ์ — มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB)

---

## สถานะปัจจุบันของแอปพลิเคชัน

> **สถานะ: Prototype / Demo (UI-complete, Mock-driven)**
> ส่วนติดต่อผู้ใช้แบ่งเป็น 8 เมนูหลักและใช้งานโต้ตอบได้จริงในเบราว์เซอร์
> ข้อมูลทั้งหมดมาจากไฟล์ชุดข้อมูลจำลองไฟล์เดียวคือ `lib/mock-data.json` ยกเว้น **AI Chat Assistant** ที่เรียก Gemini API จริงผ่าน API Route

**ผลการตรวจสอบเชิงลึก (30 สิงหาคม 2569):** ระบบ Build ผ่านสมบูรณ์ และผ่านการตรวจ Logic Bug
เชิงลึกทั้งแอป (อ่านโค้ดทุกไฟล์ + ทดสอบคลิกจริงผ่านเบราว์เซอร์) พบ 24 จุด แก้ไขแล้ว 20 จุด —
รายละเอียดทั้งหมดอยู่ใน [`bugs.txt`](bugs.txt)

| การตรวจสอบ | ผลลัพธ์ |
|---|---|
| `npm install` | ✅ ผ่าน (ติดตั้งครบตาม `package-lock.json`) |
| `npx tsc --noEmit` | ✅ ผ่าน ไม่มี Type Error |
| `npm run build` | ✅ ผ่าน — 4 Route (`/` = 278 kB First Load JS, `/_not-found`, `/api/ai/chat`, `/icon.svg`) |
| `npm run lint` | ✅ ผ่าน ไม่มี Warning |
| ทดสอบคลิกจริงผ่าน Headless Chrome | ✅ ยืนยัน 20 จุดที่แก้ไขทำงานถูกต้องตามที่ตั้งใจ |
| ตรวจ Layout และการโต้ตอบด้วย Chrome จริง (รอบ Log Explorer) | ✅ วัดความสูง/การเลื่อนของทุกหน้า และทดสอบคลิกกราฟ ตัวกรอง และการแบ่งหน้าด้วยเมาส์จริง |

**อัปเดต (3 กันยายน 2569):** เพิ่มโมดูลจัดการ Integration บน branch
`feature/add-integration-wizard` — Add Integration Wizard, ลบการเชื่อมต่อพร้อม Modal ยืนยัน
และปุ่มทดสอบการเชื่อมต่อที่แสดง log แบบจำลอง ผ่าน `npx tsc --noEmit`, `npm run lint`
และ `npm run build` ทั้งหมด

**อัปเดตล่าสุด (3 กันยายน 2569):** เพิ่มความสามารถด้าน Logging — พัฒนาบน branch
`feature/graylog-logging` และ merge เข้า `main` แล้ว (PR #2)

ฝั่งฟีเจอร์

- โมดูล **Log Explorer** สำหรับค้นหา Syslog รวมศูนย์แบบ Graylog — ค้นหาอิสระ, ตัวกรองแบบ Facet
  พร้อมปุ่มล้างประจำการ์ด, คลิกแท่งกราฟเพื่อเจาะช่วงเวลา (เลือกได้หลายช่วง), Graylog Query Echo
  และการแบ่งหน้าครั้งละ 20 ข้อความ
- การ์ด **Log Evidence** ในหน้า AI Analysis ที่ผูก Log เข้ากับ Root Cause Chain รายขั้นผ่านฟิลด์ `logRefs`
- ป้อน Syslog ระดับ Error เข้าไปใน System Prompt ของ AI Chat ให้ตอบโดยอ้างอิง Log จริงได้
- ขยายชุดข้อมูลจำลองจาก 4 เป็น **62 ข้อความ** ครอบคลุมช่วง 13:05–15:41 จาก 14 ต้นทาง
  โดย 24 ข้อความผูกกับ `INC-2569-0524-0001` และเพิ่ม Adapter `lib/log-source.ts`
  เป็นจุดต่อ Graylog REST API ในอนาคต

ฝั่งโครงสร้าง/แก้ไข

- ปรับเปลือกแอปเป็น **App Shell สูงเท่าจอ** — หน้าเว็บไม่เลื่อนเอง การเลื่อนทั้งหมดเกิดใน `<main>`
  หรือลึกลงไป ทำให้ TopBar/StatusBar ที่เป็น `fixed` ไม่ทับเนื้อหาในทุกหน้าอีก
  (เดิมใช้ `min-h-screen` ซึ่งเป็นค่าต่ำสุด เนื้อหาจึงดันความสูงเกินจอได้ไม่จำกัด)
- แก้แท็บ Logs ของโหนดใน Infrastructure ที่เดิมแสดง Syslog ของทุกโหนดปนกัน
  ให้กรองตามโหนดที่เลือกจริง พร้อมปุ่มลัดไป Log Explorer
- แก้ Tooltip ของกราฟที่ตัวหนังสือเป็นสีเข้มบนพื้นหลังเข้มจนอ่านไม่ออก
- แก้แท็บที่เลือกอยู่ในหน้า Infrastructure (Topology / Monitoring และแท็บย่อยของแผงโหนดกับ Host
  รวม 4 จุด) ที่ใช้ตัวอักษรสีเข้มบนพื้นน้ำเงินเข้มในโหมดสว่างจนอ่านยาก ให้เป็นสีขาวเหมือนหน้าอื่น

ผ่าน `npx tsc --noEmit`, `npm run lint` และ `npm run build` ทั้งหมด
และตรวจ Layout/การโต้ตอบด้วย Chrome จริงผ่าน `puppeteer-core` (ไม่ได้เพิ่มเป็น dependency ของโปรเจกต์)

**ตรวจสอบซ้ำบน `main` (21 กันยายน 2569):** `npx tsc --noEmit`, `npm run lint` และ `npm run build`
ผ่านครบทั้งสามคำสั่งโดยไม่มี Error หรือ Warning — Next.js 15.5.24 สร้างผลลัพธ์เป็น 4 Route
โดยหน้าหลักยังอยู่ที่ 278 kB First Load JS เท่าเดิม

**อัปเดต (21 กันยายน 2569):** เพิ่มการค้นพบอุปกรณ์และเครื่องมือวาดผังเอง — พัฒนาบน branch
`feature/device-discovery-topology-builder`

- **Device Discovery** — ดึงรายชื่ออุปกรณ์จาก 3 ต้นทางผ่าน `GET /api/discovery`:
  Zabbix (SNMP และ Zabbix Agent), VMware vCenter REST และ Proxmox VE API
  โดยเขียนโค้ดเรียก API จริงไว้ครบ และ fallback เป็นข้อมูลจำลองรายต้นทางเมื่อยังไม่ได้ตั้งค่า env
  พร้อมป้ายบอกบนหน้าจอว่าอุปกรณ์ชุดไหน "จริง" ชุดไหน "จำลอง"
- **Manual Topology Builder** — ผู้ใช้ลากอุปกรณ์จากคลังมาวางบนผังเอง ย้ายตำแหน่ง
  เชื่อมเส้นด้วยโหมดเชื่อมต่อ ลบเส้น/อุปกรณ์ ซูม และ Export/Import ผังเป็นไฟล์ JSON
  **ไม่มีการสร้างผังอัตโนมัติ** ผังจึงสะท้อนการเชื่อมต่อจริงตามที่ผู้ดูแลระบบกำหนดเท่านั้น
- **ชี้เมาส์ที่กล่องอุปกรณ์บนผัง** เพื่อดูว่าพอร์ตไหนต่อกับเครื่องอะไร (เฉพาะคู่พอร์ตกับปลายทาง
  ไม่แสดงสถานะ up/down เพราะสีของเส้นบอกไว้แล้ว) ข้อมูลมาจาก LLDP/CDP เหมือนกับแท็บ Interfaces
- **ตรวจสอบเส้นเชื่อมอัตโนมัติ** — เทียบผังที่วาดไว้กับข้อมูล LLDP/CDP แล้วให้สีเส้นบอกผล
  **เขียว** = ยืนยันแล้ว, **แดง** = พอร์ตที่ผูกไว้สถานะ down, **เทาทึบ** = ต่อผิด (ข้อมูลขัดแย้งกับผัง),
  **เทาจางเส้นประ** = ยังไม่ยืนยัน (ไม่มีข้อมูลให้ตรวจ ซึ่งไม่ได้แปลว่าผิด) ชี้เมาส์ที่เส้นเพื่อดูเหตุผล
- **บันทึกได้หลายผัง** — เลือกผังจากรายการด้านบน สร้างผังใหม่ เปลี่ยนชื่อ ทำสำเนา และลบ
  (มีแถบยืนยันก่อนลบผัง และหน้าต่างยืนยันก่อนล้างอุปกรณ์ทั้งผัง) เหมาะกับการแยกผังตามอาคาร ตามวง VLAN หรือเก็บผัง "ก่อน/หลัง" การปรับปรุงระบบ
  ผังที่ Import เข้ามาจะเป็นผังใบใหม่เสมอ ไม่เขียนทับผังที่เปิดอยู่
- ทุกผังถูกบันทึกใน `localStorage` จึงไม่หายเมื่อรีเฟรชหรือสลับแท็บ และซิงก์ข้ามแท็บเบราว์เซอร์ให้ด้วย
  โดยผังเดียวที่เคยบันทึกไว้ในรูปแบบเดิมจะถูกย้ายเข้าคลังใหม่ให้อัตโนมัติ
- แท็บ **Interfaces** ในแผงรายละเอียดเปลี่ยนจากตารางที่เขียนตายตัว มาอ่านค่ารายพอร์ตจริง
  ของอุปกรณ์ที่ค้นพบผ่าน SNMP (ใช้ type `NetworkDevice` ที่เดิมประกาศไว้แต่ไม่มีใครใช้)
  พร้อมคอลัมน์ **"เชื่อมกับ"** ที่บอก **อัตโนมัติ** ว่าพอร์ตไหนต่อกับอุปกรณ์ตัวใด
  โดยอ่านจากที่อุปกรณ์ประกาศตัวเองผ่าน **LLDP/CDP** (Zabbix เก็บค่าไว้จากการ SNMP walk
  ตาราง LLDP-MIB / CISCO-CDP-MIB) แสดงชื่อปลายทาง พอร์ตปลายทาง IP และป้ายบอกโปรโตคอล
  ถ้าปลายทางไม่ได้อยู่ในรายการที่ระบบค้นพบ (เช่นอุปกรณ์ของผู้ให้บริการ) จะแสดงชื่อที่ประกาศมา
  พร้อมระบุว่าอยู่นอกระบบ ส่วนพอร์ตที่ไม่มีเพื่อนบ้านประกาศมาจะแสดง "—"
  **ระบบไม่เปิดให้กรอกคู่พอร์ตเอง** เพราะค่าที่คนกรอกไว้จะไม่อัปเดตตามเมื่อมีการย้ายสายจริง
  แล้วผังจะค่อย ๆ เพี้ยนจากของจริงโดยไม่มีใครรู้

ผ่าน `npx tsc --noEmit`, `npm run lint` และ `npm run build` ทั้งหมด
(Build ได้ 5 Route โดยหน้าหลักอยู่ที่ 289 kB First Load JS)

ทดสอบด้วย Chrome จริงผ่าน `puppeteer-core` ครบทุกการโต้ตอบ — ลากการ์ดจากคลังมาวาง, ย้ายกล่อง,
สร้างและลบเส้นเชื่อม, สลับ/เปลี่ยนชื่อ/ทำสำเนา/ลบผัง, Import ทั้งไฟล์ปกติและไฟล์ที่ไม่ใช่ผังของระบบ,
ตรวจสีเส้นครบทั้งสี่สถานะในผังเดียว, tooltip บนกล่อง, หน้าต่างยืนยันก่อนล้างอุปกรณ์
และยืนยันว่าทุกผังยังอยู่หลังรีโหลดหน้า

> **บั๊กที่เจอและแก้ระหว่างทาง:** ปุ่มลบอุปกรณ์ออกจากผังกดแล้วไม่ทำงาน เพราะกล่องเรียก
> `setPointerCapture` ตอน pointerdown ทำให้ `click` ไปตกที่กล่องแทนปุ่ม — สคริปต์ทดสอบเดิม
> ใช้ `element.click()` ซึ่งข้าม pointer events จึงผ่านตลอด ต้องคลิกตามพิกัดเมาส์จริงถึงจะเจอ

**อัปเดตล่าสุด (22 กันยายน 2569):** เพิ่มการนำขึ้นเซิร์ฟเวอร์แบบอัตโนมัติ — พัฒนาบน branch
`feature/deploy-workflow`

- `.github/workflows/deploy.yml` — Deploy ขึ้นเซิร์ฟเวอร์ Linux ผ่าน **Self-hosted Runner
  ที่ติดตั้งบนเครื่องปลายทางเอง** Build ที่นั่นแล้วสลับ Symlink `current` ไปเวอร์ชันใหม่
  ก่อนสั่ง `systemctl restart` ตรวจสุขภาพด้วย HTTP และ **ย้อนกลับเวอร์ชันเดิมอัตโนมัติ**
  เมื่อแอปไม่ตอบใน 60 วินาที ไม่ต้องใช้ SSH Key หรือ Secret ใด ๆ ใน GitHub
- `.github/workflows/ci.yml` — ตรวจ `tsc --noEmit`, `eslint` และ `build` ก่อน Merge
- `deploy/` — แม่แบบ systemd unit, ไฟล์สิทธิ์ sudo เฉพาะคำสั่งที่ต้องใช้
  และคู่มือตั้งค่าเครื่อง Linux กับ Self-hosted Runner ทีละขั้น
- **เครื่องปลายทางไม่ต้องตั้งค่าอะไรเลยก็รันได้** ตามสถานะปัจจุบันที่ยังใช้ข้อมูลจำลอง
  (unit ใช้ `EnvironmentFile=-` จึงสตาร์ตได้แม้ไม่มีไฟล์ค่าลับ) ใส่เฉพาะ `GEMINI_API_KEY`
  เมื่อต้องการให้ AI Chat เรียกโมเดลจริง ส่วนตัวแปรของ Zabbix/vCenter/Proxmox เติมทีหลังได้
  ทีละต้นทางโดยไม่ต้องแก้ Workflow

**ทดสอบกับเซิร์ฟเวอร์จริงแล้ว** (Ubuntu 24.04, 2 vCPU / 3 GB) — รันทุกคำสั่งของ `deploy.yml`
ในฐานะผู้ใช้ที่รัน Runner ผ่านครบ: `npm ci` 30 วินาที, `tsc` 9 วินาที, `lint` 12 วินาที,
`build` 61 วินาที, ชุด Release 68 MB, สลับ Symlink และ restart ผ่าน Health Check ในครั้งแรก
รวมประมาณ 2 นาที จากนั้น **ย้ายระบบที่ให้บริการอยู่มาใช้โครงนี้แล้ว** — จากเดิมที่ Deploy
ด้วยมือไว้ใน `/root/project_app` และรันเป็น root มาเป็น `/opt/ai-noc/current`
ที่รันด้วยผู้ใช้ธรรมดา โดยเก็บของเดิมและ unit เดิมไว้เป็นทางถอย

- เพิ่ม `deploy/manual-deploy.sh` — Deploy ด้วยมือด้วยขั้นตอนเดียวกับ Workflow ทุกคำสั่ง
  รวมการย้อนเวอร์ชันอัตโนมัติ ใช้ตอนที่สั่งผ่าน GitHub Actions ไม่ได้
- **พัก trigger อัตโนมัติของทั้งสอง Workflow ไว้ชั่วคราว** (เหลือ `workflow_dispatch`)
  เพราะบัญชี GitHub ถูกล็อกการเรียกเก็บเงิน ทุก Run จึงตายที่ Startup failure แล้วส่งเมลแจ้ง
  คอมเมนต์หัวไฟล์ทั้งสองระบุไว้แล้วว่าต้องใส่ trigger อะไรกลับเมื่อปลดล็อก

ไม่มีการแก้โค้ดแอปในรอบนี้ — ทั้ง `/api/ai/chat` และ `lib/device-discovery.ts`
กลับไปใช้ข้อมูลจำลองรายต้นทางอยู่แล้วเมื่อไม่มีค่าใน env

**อัปเดตล่าสุด (25 กันยายน 2569):** ปรับ UI/UX และโครงสร้างการใช้งานทั้ง 5 ส่วน

- **Dashboard** — ย้าย Alert Summary ขึ้นก่อนข้อมูลอื่น ขยาย Recent Alerts เต็มความกว้าง
  นำ Top 5 Issues ออก และย้าย Network Health / AI Confidence ไป AI Analysis
- **Infrastructure** — แยก Topology กับ Device & Hypervisor Monitoring เป็นคนละเมนูหลัก
  เพิ่ม Auto / Manual, ปุ่มบันทึกผัง, tooltip คู่พอร์ต/สถานะ/ความเร็ว และข้อมูล Storage → SAN Switch แบบ 100G
- **Log Explorer** — นำกราฟและ Query ดิบออก เพิ่มปฏิทินช่วงวันเวลา เหลือ Sidebar เฉพาะ Severity
  และตัดแหล่ง Ticket ก่อนนับยอด โดยยังค้นหาข้อความและเจาะหลักฐาน Incident ได้
- **Action Center** — เปลี่ยน Command Preview จาก Modal เป็นแผงกางในบัตร
  ใช้ Manual เท่านั้น รวม Restart DNS Service และตรวจสิทธิ์/สถานะซ้ำที่ตัวจัดการคำสั่ง
- **AI Analysis** — แสดง Markdown จริง พร้อมหัวข้อ รายการ ตัวหนา และบล็อกคำสั่ง
  ปรับ System Prompt และคำตอบจำลองให้อ่านง่าย รวมทั้งปิดการแสดง HTML ดิบ

การตรวจสอบรอบนี้: ผ่าน `npx tsc --noEmit`, `npm run lint` และ `npm run build`
(5 Route, หน้าหลัก 335 kB First Load JS) พร้อมตรวจ logic แบบเฉพาะกิจด้วย Node.js
(ขอบเขตวันเวลา/Severity/Ticket, การจัดผังโดยไม่ทับ Manual, SAN 100G/พอร์ต down,
สิทธิ์คำสั่ง, Markdown และการบันทึกผัง) — ไม่มีการเพิ่ม Test Runner
ยังไม่ได้ทดสอบคลิก/ลากด้วยเบราว์เซอร์จริงในรอบนี้ เพราะ session ไม่มีเบราว์เซอร์เชื่อมต่อ

**อัปเดต Dashboard ตามไฟล์ HTML (25 กันยายน 2569):** ใช้ `ai_noc_dashboard.html` เป็นแบบล่าสุด
คืน KPI 6 ใบด้านบนและ Top 5 Issues จัดแถวล่างเป็น 3 คอลัมน์ พร้อมโทนการ์ดขอบบางและเงาเบา
เพิ่มตัวกรอง Recent Alerts และการรับทราบที่คงอยู่ข้ามหน้า โดยใช้ข้อมูล Alert ชุดเดียวกับ Infrastructure
ปุ่มวินิจฉัยเชื่อมกับ AI Analysis และปุ่มจัดการคำสั่งเชื่อมกับ Action Center แบบ Manual
รายละเอียดนี้แทนการจัด Dashboard ในอัปเดตรอบก่อน ส่วนเมนูและหน้าจออื่นคงการทำงานเดิม

ตรวจสอบรอบ Dashboard: `npx tsc --noEmit`, `npm run lint` และ `npm run build` ผ่าน
(5 Route, หน้าหลัก 345 kB First Load JS) ยังไม่ได้ตรวจคลิก/ภาพหน้าจอผ่านเบราว์เซอร์จริง
เนื่องจาก session ไม่มีเบราว์เซอร์เชื่อมต่อ

| ด้าน | สถานะ |
|---|---|
| หน้าจอ/ฟีเจอร์ UI | ✅ 8 เมนูหลัก แยก Infrastructure Topology และ Device & Hypervisor Monitoring |
| Human-in-the-Loop (อนุมัติ/ปฏิเสธ + Audit Log) | ✅ ทำงานจริงแบบ in-memory (แก้ปัญหา State ค้างข้ามคำขอแล้ว) |
| ตัวกรอง/แท็บรายละเอียดใน Action Center และ Infrastructure | ✅ กรอง/สลับเนื้อหาได้จริงทุกปุ่ม (เดิมมีหลายจุดกดแล้วไม่มีผล) |
| AI Chat Assistant | ✅ ต่อ Gemini API จริง (มี Mock Fallback เมื่อไม่ตั้งค่า API Key), แยกประวัติสนทนาตาม Session ถูกต้อง |
| AI Diagnosis (RCA) | 🟡 แสดงผลจากชุดข้อมูลจำลอง ยังไม่เรียกโมเดลจริง (มี Log Evidence ประกอบแล้ว) |
| Log Explorer (ค้นหา Syslog รวมศูนย์) | ✅ ค้นหาข้อความ / กรอง Severity / ปฏิทินช่วงวันเวลาไทย / แบ่งหน้า / กาง Parsed Fields โดยไม่แสดงกราฟและ Query ดิบ และตัดแหล่ง Ticket ออกจากผลลัพธ์ |
| Log Evidence ในหน้า AI Analysis | ✅ ผูก Log เข้ากับ Root Cause Chain รายขั้น และข้ามไป Log Explorer แบบกรอง Incident ไว้ให้ |
| จัดการรายการ Integration (เพิ่ม / ลบ / ทดสอบการเชื่อมต่อ) | ✅ ทำงานจริงแบบ in-memory ผ่าน Wizard และ Modal ยืนยัน (ผลการทดสอบเป็นการจำลอง) |
| ค้นพบอุปกรณ์จาก Zabbix / vCenter / Proxmox | 🟡 เขียนโค้ดเรียก API จริงครบแล้วใน `lib/device-discovery.ts` แต่ยังไม่ได้ทดสอบกับเซิร์ฟเวอร์จริง — ถ้าไม่ตั้งค่า env จะใช้ข้อมูลจำลอง 20 อุปกรณ์ |
| จัดผัง Topology (Auto / Manual) | ✅ Auto จัดตำแหน่งโหนดบนผังเดิม / Manual ลากวางและบันทึกตำแหน่ง เก็บหลายผังใน `localStorage` พร้อม Export/Import โดย Auto ไม่ทับตำแหน่ง Manual |
| ตรวจจับอุปกรณ์ปลายสายอัตโนมัติด้วย LLDP/CDP | 🟡 เป็นแหล่งข้อมูลเดียวของคู่พอร์ต (ไม่มีการกรอกเอง) แสดงในแท็บ Interfaces และ tooltip บนผัง พร้อมปุ่มเพิ่มเส้นเชื่อมลงผัง — โค้ดเรียก Zabbix จริงเขียนครบแล้วแต่ยังไม่ได้ทดสอบกับเครื่องจริง |
| ตรวจสอบว่าเส้นบนผังตรงกับการเดินสายจริง | ✅ เทียบกับ LLDP/CDP แล้วให้สีเส้น 4 สถานะ พร้อม tooltip คู่พอร์ต สถานะ และความเร็วที่ทราบ (`lib/link-verification.ts`) |
| การเก็บ Telemetry จริง (vCenter / Proxmox / SNMP / Syslog) | ❌ ยังไม่เชื่อมต่อ — ยังไม่มี Collector จริงอยู่เบื้องหลังรายการ Integration |
| การดึง Log จาก Graylog จริง | ❌ ยังไม่เชื่อมต่อ — อ่านจากข้อมูลจำลองผ่าน Adapter `lib/log-source.ts` ที่เตรียมจุดต่อไว้แล้ว |
| ฐานข้อมูล / การคงข้อมูลถาวร | ❌ ยังไม่มีฐานข้อมูล — State ส่วนใหญ่หายเมื่อรีเฟรช ยกเว้นคลังผัง Topology ที่เก็บใน `localStorage` ของเบราว์เซอร์ |
| การยืนยันตัวตน (Authentication) | ❌ ยังไม่มี — RBAC เป็น Role Switcher สำหรับสาธิต |
| Export PDF / Excel | ❌ เป็นปุ่ม Stub (`alert()`) ยกเว้นปุ่ม Print ที่ใช้ `window.print()` ได้ |
| CI (ตรวจ Type / Lint / Build อัตโนมัติ) | 🟡 เขียน `ci.yml` และ `deploy.yml` ครบแล้ว แต่ **พัก trigger อัตโนมัติไว้ชั่วคราว** เพราะบัญชี GitHub ถูกล็อกการเรียกเก็บเงิน ทุก Run จึงตายที่ Startup failure — ดูข้อจำกัดข้อ 13 |
| Deploy ขึ้นเซิร์ฟเวอร์ Linux (Self-hosted Runner + systemd) | 🟡 ทดสอบทุกคำสั่งบนเซิร์ฟเวอร์จริงแล้วผ่านหมด (`npm ci` → `tsc` → `lint` → `build` → วาง release → สลับ symlink → restart → health check รวม ~2 นาที) และย้ายระบบที่ให้บริการอยู่มาใช้โครงนี้แล้ว เหลือยืนยันการสั่งงานอัตโนมัติจากฝั่ง GitHub Actions ซึ่งติดที่ billing ของบัญชี ระหว่างนี้ปล่อยเวอร์ชันด้วย `deploy/manual-deploy.sh` ได้ |
| Unit Test | ❌ ยังไม่มี — ไม่มี Test Runner หรือไฟล์ทดสอบในโปรเจกต์ |

---

## เทคโนโลยีที่ใช้

| หมวด | รายละเอียด |
|---|---|
| Framework | Next.js 15.5 (App Router, React Server Components + Client Components) |
| UI | React 19.2, TypeScript 5.9 (`strict: true`) |
| Styling | Tailwind CSS v4.1 (`@tailwindcss/postcss`), Frosted Glass, รองรับ Dark/Light Mode (สลับได้ที่ปุ่มบน TopBar, จำค่าไว้ใน `localStorage`) |
| ไอคอน / กราฟ | lucide-react, Recharts 3.10 |
| Animation | motion (ตั้ง `transpilePackages`) |
| AI | `@google/genai` v2 — โมเดล `gemini-3.6-flash` |
| ฟอนต์ | Inter + Prompt (`next/font/google`, รองรับ subset ภาษาไทย) |
| Build Output | `standalone` (Deploy บนเซิร์ฟเวอร์ Linux + systemd ได้ตามคู่มือใน `deploy/` หรือบน Cloud Run / Docker) |

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
| `ZABBIX_URL` / `ZABBIX_TOKEN` | สำหรับ Discovery | Zabbix 6.4 ขึ้นไป ใช้ค้นหาอุปกรณ์ SNMP และ VM ที่ลง Zabbix Agent |
| `ZABBIX_NEIGHBOR_KEYS` | ไม่จำเป็น | คำนำหน้าคีย์ Item ของ LLDP/CDP (ค่าเริ่มต้น `lldp,cdp`) |
| `VCENTER_URL` / `VCENTER_USERNAME` / `VCENTER_PASSWORD` | สำหรับ Discovery | vSphere 7.0 ขึ้นไป ใช้ดึง Host/VM |
| `PROXMOX_URL` / `PROXMOX_TOKEN` | สำหรับ Discovery | Proxmox VE API Token รูปแบบ `user@realm!tokenid=secret` |
| `DISCOVERY_ALLOW_INSECURE_TLS` | ไม่จำเป็น | `true` เพื่อข้ามการตรวจใบรับรอง Self-signed — เครื่องทดสอบเท่านั้น |

### NPM Scripts

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | รัน Development Server |
| `npm run build` | Build สำหรับ Production (โหมด standalone) |
| `npm run start` | รัน Production Server จากผลลัพธ์ Build |
| `npm run lint` | ตรวจสอบโค้ดด้วย ESLint |
| `npm run clean` | ลบโฟลเดอร์ `.next` (ใช้สคริปต์ Node ล้วน ไม่พึ่ง `next clean` ซึ่งไม่มีอยู่จริงใน CLI) |

---

## การนำขึ้นเซิร์ฟเวอร์ (CI/CD)

| Workflow | ทำงานเมื่อ | หน้าที่ |
|---|---|---|
| `.github/workflows/ci.yml` | สั่งเองจากแท็บ Actions (เดิมคือทุก Pull Request — ดูหมายเหตุใต้ตาราง) | `npm ci` → `tsc --noEmit` → `npm run lint` → `npm run build` บน Runner ของ GitHub |
| `.github/workflows/deploy.yml` | สั่งเองจากแท็บ Actions (เดิมคือ push เข้า `main` — ดูหมายเหตุใต้ตาราง) | Build บน **Self-hosted Runner ที่ติดตั้งบนเซิร์ฟเวอร์ Linux ปลายทาง** แล้วสลับ Symlink และ restart systemd service |

> **หมายเหตุ:** ทั้งสอง Workflow ถูกพัก trigger อัตโนมัติไว้ชั่วคราว (เหลือ `workflow_dispatch`)
> เพราะบัญชี GitHub ถูกล็อกการเรียกเก็บเงิน ทุก Run จึงตายที่ Startup failure แล้วส่งเมลแจ้ง
> เมื่อปลดล็อกแล้วต้องใส่ trigger กลับตามคอมเมนต์ที่กำกับไว้หัวไฟล์ทั้งสอง
> ระหว่างนี้ปล่อยเวอร์ชันด้วย [`deploy/manual-deploy.sh`](deploy/manual-deploy.sh) ซึ่งใช้ขั้นตอนเดียวกัน

การ Deploy วางไฟล์ไว้ที่ `/opt/ai-noc/releases/<วันเวลา>-<sha ย่อ>` แล้วชี้ Symlink `current`
ไปยังเวอร์ชันใหม่แบบ Atomic ก่อนสั่ง `systemctl restart` จากนั้นตรวจสุขภาพแอปด้วย HTTP
**ถ้าแอปไม่ตอบภายใน 60 วินาที ระบบจะย้อน Symlink กลับเวอร์ชันเดิมและ restart ให้อัตโนมัติ**
และเก็บเวอร์ชันย้อนหลังไว้ 5 ชุด

Build เกิดบนเครื่องปลายทางทั้งหมด จึงไม่ต้องใช้ SSH Key หรือ Secret ใด ๆ ใน GitHub

**เครื่องที่ Deploy ไม่ต้องตั้งค่าอะไรเลยก็รันได้** เพราะระบบยังเดินด้วยข้อมูลจำลองตาม
สถานะปัจจุบันของโปรเจกต์ ยังไม่ต้องเชื่อม Proxmox / Zabbix / Syslog Server จริง
ค่าที่ควรใส่มีเพียง `GEMINI_API_KEY` — ใส่แล้ว AI Chat จะเรียกโมเดลจริง ไม่ใส่ก็ตอบด้วยข้อความจำลอง
ค่าลับทั้งหมดอยู่ในไฟล์ `/etc/ai-noc/ai-noc.env` ของเครื่อง ซึ่ง systemd อ่านผ่าน
`EnvironmentFile=-` (ไม่มีไฟล์ก็สตาร์ตได้) จึงไม่ติดไปกับชุดไฟล์ที่ Deploy
เมื่ออนาคตพร้อมต่อของจริง ให้เติมตัวแปรของต้นทางนั้นในไฟล์เดียวกันแล้ว restart service — ไม่ต้องแก้ workflow

> unit ของ systemd รัน `node server.js` ในโฟลเดอร์ standalone โดยตรง ไม่ใช้ `npm run start`
> เพราะ `next start` ไม่รองรับ `output: 'standalone'`

### อัปเดตแอปบนเซิร์ฟเวอร์หลัง `main` เปลี่ยน

**ตอนนี้ต้องสั่งเอง** เพราะ Workflow ถูกพัก trigger ไว้ (ดูหมายเหตุด้านบน)
เซิร์ฟเวอร์ดึงโค้ดจาก GitHub เองผ่าน **Deploy Key** (กุญแจอ่านอย่างเดียว ผูกกับ Repository นี้
เท่านั้น) แล้วสั่ง `deploy/manual-deploy.sh` ซึ่งรันขั้นตอนเดียวกับ `deploy.yml` ทุกคำสั่ง

```bash
# เข้าเครื่องแล้วสลับเป็นผู้ใช้ที่เป็นเจ้าของ /opt/ai-noc
ssh root@<server>
sudo -iu ghrunner

# ดึงโค้ดล่าสุดจาก main แล้วสั่ง Deploy (ใช้เวลาประมาณ 2 นาที)
cd ~/src
git fetch --prune
git reset --hard origin/main
./deploy/manual-deploy.sh ~/src
```

`git reset --hard` ทำให้โฟลเดอร์ตรงกับ `main` เป๊ะ ทิ้งการแก้ไฟล์ที่ค้างอยู่บนเครื่องทั้งหมด
ส่วน `node_modules` กับ `.next` ไม่ถูกแตะ จึง Build รอบถัดไปได้เร็วกว่าฝั่ง Workflow

> **ทั้งหมดทำบนเซิร์ฟเวอร์** ไม่ต้องส่งไฟล์จากเครื่องพัฒนา จึงไม่ต้องยุ่งกับ `git archive`,
> `scp` หรือปัญหา CRLF ของ Windows อีก — git บน Linux เช็กเอาต์เป็น LF อยู่แล้ว
> ชื่อโฟลเดอร์ Release จะลงท้ายด้วย sha จริงของคอมมิต เช่น `20260922-051456-3f0d94d`
> ทำให้ย้อนดูได้ว่าเวอร์ชันไหนคือโค้ดตัวใด
>
> สคริปต์ไม่สร้างโฟลเดอร์ชั่วคราวไว้ในซอร์ส ถ้าพบ `~/src/release` แปลว่าเป็นของที่
> สคริปต์รุ่นเก่าทิ้งไว้ (เคยทำให้ `eslint` รอบถัดไปไปตรวจโค้ดที่ build แล้วจนล้ม)
> รุ่นปัจจุบันลบให้เองตอนเริ่ม
>
> การตั้งค่า Deploy Key ทำครั้งเดียวจบ — ขั้นตอนอยู่ใน
> [`deploy/README.md`](deploy/README.md) พร้อมวิธีสำรองแบบส่งไฟล์เองถ้าไม่อยากใช้ Deploy Key

สคริปต์จะ `npm ci` → `tsc --noEmit` → `npm run lint` → `npm run build`
→ ประกอบชุดไฟล์ลงโฟลเดอร์ Release ใหม่โดยตรง → สลับ Symlink → `systemctl restart`
→ ตรวจสุขภาพ 60 วินาที
**ถ้าแอปไม่ตอบ จะย้อน Symlink กลับเวอร์ชันเดิมและ restart ให้เอง** แล้วจบด้วยรหัสข้อผิดพลาด
ถ้าขั้นใดขั้นหนึ่ง (เช่น Type Error หรือ Lint ไม่ผ่าน) ล้มเหลว สคริปต์จะหยุดก่อนแตะของจริง
ระบบที่ให้บริการอยู่จึงไม่ได้รับผลกระทบ

**ตรวจผลหลัง Deploy**

```bash
readlink -f /opt/ai-noc/current                      # รันเวอร์ชันไหนอยู่
systemctl status ai-noc --no-pager --lines=10        # สถานะ service
journalctl -u ai-noc -f                              # ดู log แบบต่อเนื่อง
curl -I http://127.0.0.1:3001/                       # ต้องได้ HTTP 200
```

**ย้อนเวอร์ชันด้วยมือ** (กรณีแอปขึ้นได้แต่ทำงานผิด ซึ่ง Health Check จับไม่ได้)

```bash
ls -1dt /opt/ai-noc/releases/*/                      # รายการเวอร์ชัน ใหม่ไปเก่า
sudo -u ghrunner ln -sfn /opt/ai-noc/releases/<ชื่อเก่า> /opt/ai-noc/current.tmp
sudo -u ghrunner mv -T /opt/ai-noc/current.tmp /opt/ai-noc/current
sudo systemctl restart ai-noc
```

**เมื่อปลดล็อก billing ของบัญชี GitHub แล้ว** ให้ใส่ trigger กลับตามคอมเมนต์หัวไฟล์
`deploy.yml` (`push: branches: [main]`) จากนั้นแค่ push เข้า `main` ระบบจะ Build และ
Deploy ให้เองทั้งหมด ไม่ต้องทำสองขั้นข้างบนอีก หรือจะกด **Run workflow** จากแท็บ Actions
เมื่อต้องการปล่อยเวอร์ชันแบบเลือกจังหวะเองก็ได้

ขั้นตอนตั้งค่าเครื่อง Linux, การติดตั้ง Self-hosted Runner, systemd unit, สิทธิ์ sudo,
ตัวแปรที่ตั้งได้ (`APP_DIR`, `SERVICE_NAME`, `HEALTH_URL`, `KEEP_RELEASES`)
และวิธีย้อนเวอร์ชันด้วยมือ — อ่านได้ที่ [`deploy/README.md`](deploy/README.md)

---

## โครงสร้างโปรเจกต์

```
final_project_kmutnb/
├── .github/workflows/
│   ├── ci.yml                   # ตรวจ Type/Lint/Build ทุก Pull Request
│   └── deploy.yml               # Deploy ขึ้นเซิร์ฟเวอร์ Linux ผ่าน Self-hosted Runner
├── app/
│   ├── api/ai/chat/route.ts     # API Route — เรียก Gemini
│   ├── api/discovery/route.ts   # API Route — ค้นหาอุปกรณ์จาก Zabbix/vCenter/Proxmox
│   ├── globals.css              # Design Tokens + Frosted Glass Utilities
│   ├── icon.svg                 # ไอคอนของแอป (App Icon Convention ของ Next.js)
│   ├── layout.tsx                # Root Layout (lang="th", ฟอนต์ Inter/Prompt)
│   └── page.tsx                  # หน้าเดียวของแอป — จัดการ State และสลับ View
├── components/
│   ├── Sidebar.tsx                # เมนูหลัก 8 รายการ + Role Switcher
│   ├── TopBar.tsx                 # ชื่อหน้า, นาฬิกาไทย (พ.ศ.), Fullscreen, Theme Toggle
│   ├── ThemeToggle.tsx            # ปุ่มสลับ Dark/Light Mode (ผูกกับ class `dark` บน <html>)
│   ├── StatusBar.tsx              # แถบสถานะ Collector / AI Engine / Syslog
│   ├── CommandPreview.tsx         # ตัวอย่างคำสั่งแบบกางในบัตร พร้อมยืนยันด้วยคน
│   ├── AIHealthSummary.tsx       # Network Health / AI Confidence ใน AI Analysis
│   ├── MarkdownContent.tsx       # แสดง Markdown ของคำตอบ AI โดยไม่เปิด HTML ดิบ
│   ├── RejectReasonModal.tsx      # ฟอร์มระบุเหตุผลการปฏิเสธ
│   ├── DeviceInventoryPanel.tsx   # คลังอุปกรณ์ที่ตรวจพบ (ลากไปวางบนผังได้)
│   ├── TopologyBuilder.tsx        # พื้นที่วาดผัง — ลากวาง เชื่อมเส้น ซูม Export/Import
│   ├── AddIntegrationModal.tsx    # Add Integration Wizard 3 ขั้นตอน
│   ├── DeleteIntegrationModal.tsx # ยืนยันก่อนลบการเชื่อมต่อ
│   ├── ClearTopologyModal.tsx     # ยืนยันก่อนล้างอุปกรณ์ทั้งผัง (portal ไป <body>)
│   ├── ConnectionTestConsole.tsx  # กล่อง log ผลการทดสอบ (ใช้ร่วมวิซาร์ด/การ์ด)
│   └── views/                     # 7 View หลัก (ดูตารางฟีเจอร์ด้านล่าง)
├── lib/
│   ├── mock-data.json           # ชุดข้อมูลจำลองทั้งหมดของระบบ (แหล่งข้อมูลเดียว)
│   ├── mock-data.ts             # ผูก TypeScript types ให้ JSON แล้ว re-export
│   ├── integrations.ts          # Metadata ของประเภท Integration + ตัวสร้าง log ทดสอบ
│   ├── log-source.ts            # Log Source Adapter — ค้นหา/กรอง Syslog + จุดต่อ Graylog API
│   ├── device-discovery.ts      # Device Discovery Adapter — Zabbix/vCenter/Proxmox (ฝั่ง Server)
│   ├── link-verification.ts     # ตรวจเส้นบนผังเทียบ LLDP/CDP → สีเส้น 4 สถานะ
│   ├── execution-policy.ts      # สิทธิ์อนุมัติและนโยบาย Manual เท่านั้น
│   ├── topology-layout.ts       # จัดตำแหน่งอัตโนมัติจากโหนดและเส้นบนผังเดิม
│   ├── interface-map.ts         # รวมคู่ "พอร์ต → อุปกรณ์" สำหรับ tooltip บนกล่อง
│   └── utils.ts                 # `cn()` — clsx + tailwind-merge
├── types/ai-noc.ts              # TypeScript Interface ของโดเมนทั้งหมด
├── hooks/
│   ├── use-mobile.ts            # Media Query Hook (ยังไม่มีการเรียกใช้งานจริง)
│   ├── use-connection-test.ts   # จำลองการทดสอบการเชื่อมต่อแบบไล่ log ทีละบรรทัด
│   └── use-topology-layout.ts   # คลังผังหลายใบที่ผู้ใช้วาดเอง (useSyncExternalStore + localStorage)
├── deploy/
│   ├── README.md                # ขั้นตอนตั้งค่าเครื่อง Linux + Self-hosted Runner
│   ├── ai-noc.service           # แม่แบบ systemd unit ของเซิร์ฟเวอร์ปลายทาง
│   ├── ai-noc-deploy.sudoers    # สิทธิ์ sudo เฉพาะคำสั่ง restart/status ของ service
│   └── manual-deploy.sh         # Deploy ด้วยมือ ใช้ขั้นตอนเดียวกับ deploy.yml ทุกคำสั่ง
├── metadata.json                # Manifest สำหรับ Google AI Studio
└── bugs.txt                     # บันทึกผลตรวจสอบบั๊กทั้งแอป (รายการที่แก้แล้ว/ยังไม่แก้)
```

สถาปัตยกรรมปัจจุบันเป็น **Single-page + Client State** — `app/page.tsx` ถือ State ทั้งหมด
(แท็บที่เลือก, บทบาทผู้ใช้, รายการอนุมัติ, Audit Log) แล้วส่งลงไปให้แต่ละ View ผ่าน Props
ยังไม่มี Router-based Navigation และไม่มี State Management Library

**รูปแบบการเลื่อนหน้าจอ (App Shell)** — เปลือกนอกสุดใน `app/page.tsx` สูงเท่าจอพอดี
(`h-screen` + `overflow-hidden`) หน้าเว็บจึงไม่เลื่อนเอง การเลื่อนทั้งหมดเกิดใน `<main>`
ซึ่งเป็นพื้นที่เลื่อนหลัก โดยคอลัมน์เนื้อหากัน TopBar/StatusBar ที่เป็น `fixed` ไว้ด้วย
`pt-14 pb-9` เนื้อหาจึงไม่มีทางมุดใต้สองแถบนั้น

View ทั่วไปสูงตามเนื้อหาแล้วเลื่อนอยู่ใน `<main>` ตามปกติ ส่วน View ที่ต้องการเต็มจอ
(ปัจจุบันคือ Log Explorer) ใส่ `lg:flex-1 lg:min-h-0` ที่ตัวเองเพื่อรับความสูงที่เหลือ
แล้วจัดการเลื่อนภายในคอลัมน์ของตัวเอง — ไม่ต้องคำนวณความสูงจาก `100vh` ด้วยค่าคงที่

---

## ฟีเจอร์ตามโมดูล

### 1. Dashboard — ภาพรวมสุขภาพระบบ
ใช้ดีไซน์ล่าสุดจาก `ai_noc_dashboard.html` (25 กันยายน 2569) แทนการจัดหน้าในรอบก่อน:
- **KPI 6 การ์ด** — Network Health, AI Confidence, Active Alerts, Devices, VMs และ Hypervisors
  ใช้การ์ดขอบบาง เงาเบา ไอคอนพื้นสีอ่อน และแถบสัดส่วนแทน Sparkline
- **แถวล่าง 3 คอลัมน์** — Alert Summary พร้อมโดนัทและ AI Insight / Recent Alerts / Top 5 Issues
  จอเล็กเรียงลงเป็นคอลัมน์เดียว ขยายพื้นที่ Dashboard ได้ถึง 1600px รองรับ Light/Dark Mode
- **Recent Alerts** — แสดงข้อความเต็ม กรองทั้งหมด/วิกฤต/เตือนได้จริง และกดรับทราบได้
  สถานะเก็บใน `app/page.tsx` จึงไม่หายเมื่อสลับหน้า แต่ยังรีเซ็ตเมื่อรีโหลด; Viewer รับทราบไม่ได้
- **Top 5 Issues** — เรียงจาก `occurrenceCount` ของ Alert จริง พร้อมแถบจำนวนครั้งที่เกิดซ้ำ
  ปุ่ม AI วินิจฉัยเปิด Diagnosis สำหรับรายการที่มี Incident และเปิด Chat สำหรับรายการอื่น
- ปุ่มตรวจสอบคำสั่งเปิด Action Center โดยการอนุมัติยังเป็น **Manual**
  ดูตารางทรัพยากร Hypervisor ต่อได้ที่เมนู Monitoring
- Network Health, AI Confidence, Devices และ VMs ยังเป็นตัวเลขสรุปจำลองตามต้นแบบ
  จำนวน Alert และ Hypervisor คำนวณจากข้อมูลของแอป; ตัวเลือกช่วงเวลายังเป็น UI จำลองเหมือน HTML

### 2. Infrastructure Topology — Discovery & Topology Builder
- **คลังอุปกรณ์ที่ตรวจพบ:** ดึงรายชื่อจาก Zabbix (SNMP / Zabbix Agent), VMware vCenter และ
  Proxmox VE ผ่าน `GET /api/discovery` ค้นหาและกรองตามวิธีที่ตรวจพบได้ พร้อมป้ายรายต้นทาง
  ว่าข้อมูลชุดนั้นเป็น "จริง" หรือ "จำลอง" *(ยังไม่ได้ตั้งค่า env = ข้อมูลจำลอง 20 อุปกรณ์)*
- **Topology Builder:** ลากอุปกรณ์จากคลังมาวางเอง ย้ายตำแหน่งแบบดูดเข้ากริด เชื่อมเส้นด้วย
  โหมดเชื่อมต่อ คลิกเส้นเพื่อลบ ซูม และ Export/Import เป็นไฟล์ JSON
  เลือก **Auto** เพื่อจัดตำแหน่งอุปกรณ์บนผังเดิมตามเส้นเชื่อม หรือ **Manual** เพื่อลากย้าย
  Auto ไม่สร้างสายเชื่อมใหม่และไม่ทับตำแหน่ง Manual เมื่อสลับกลับ
  บันทึกได้หลายผัง (สร้าง / เปลี่ยนชื่อ / ทำสำเนา / ลบ) เก็บโหมดและตำแหน่งใน `localStorage`
  มีปุ่มบันทึกผังและ Export/Import ที่รองรับไฟล์เดิมซึ่งไม่มีโหมด
  **คลิกซ้ายค้างบนพื้นที่ว่างแล้วลากเพื่อเลื่อนมุมมองผังได้ทั้งแนวนอนและแนวตั้ง**
  ใช้ได้ทั้ง Auto/Manual และโหมดเชื่อมต่อ โดยไม่เปลี่ยนตำแหน่งที่บันทึกไว้หรือยกเลิกจุดเริ่มเชื่อมเส้น
  ส่วนการลากกล่องใน Manual ยังเป็นการย้ายอุปกรณ์ตามเดิม
- **สีเส้นบอกผลตรวจสอบกับ LLDP/CDP** — เขียว = ยืนยันแล้ว, แดง = พอร์ตที่ใช้สถานะ down,
  เทาทึบ = ต่อผิด (ข้อมูลขัดแย้งกับผัง), เทาจางเส้นประ = ยังไม่มีข้อมูลให้ตรวจ
  แถบคำอธิบายการใช้งานและสีสถานะอยู่เหนือพื้นที่วาด ใต้แถบเครื่องมือ เพื่ออ่านได้ทันทีโดยไม่ต้องเลื่อนลงท้ายผัง
  ชี้เมาส์หรือโฟกัสที่เส้นเพื่อดูชื่ออุปกรณ์ คู่พอร์ต สถานะ up/down/degraded/unknown และความเร็วที่ทราบ
  ข้อมูลที่ยังไม่มีจะแสดงว่าไม่ทราบ พร้อมเหตุผลประกอบ ส่วน tooltip บนกล่องแสดงคู่พอร์ตเดิม
- **สถาปัตยกรรม Storage:** ข้อมูลจำลองเชื่อม Storage-Array-01 → SAN-Switch-01 ที่ **100G**
  และ SAN ต่อไปยัง ESXi ผ่านพอร์ต Storage โดยแยกจากเส้นทาง Firewall
- **แผงรายละเอียดอุปกรณ์ 6 แท็บ** (Overview / Interfaces / Performance / Logs / Alerts / VM Info)
  โยงอุปกรณ์ที่ตรวจพบกลับไปหาเรกคอร์ดจริงในระบบด้วย IP ก่อนแล้วค่อยใช้ชื่อ (เพราะ API ของ
  Hypervisor บางตัวไม่คืน IP ของ Guest) — แท็บ **Interfaces** อ่านค่ารายพอร์ตจริงของอุปกรณ์ SNMP
  พร้อมคอลัมน์ "เชื่อมกับ" ที่มาจาก LLDP/CDP ล้วน ๆ
### 3. Device & Hypervisor Monitoring
แยกเป็นเมนูหลักของตัวเอง ไม่อยู่ในแท็บหรือ dropdown ของ Topology
- **Monitoring:** ตาราง Hypervisor พร้อมเมตริกเฉพาะทาง Virtualization —
  CPU Ready Time, Memory Ballooning, Storage Latency, Virtual Switch Dropped Packets และกราฟย้อนหลัง
  1 ชั่วโมง พร้อมแผงรายละเอียด Host 6 แท็บ (Overview / Performance / VMs / Datastores / Alerts / Logs)
  ที่กรองข้อมูลจริงตาม Host ที่เลือก
- แท็บ **Logs** ของทั้งฝั่งโหนดและฝั่ง Host กรอง Syslog ตามอุปกรณ์ที่เลือกจริง
  (เดิมฝั่งโหนดแสดงของทุกโหนดปนกัน) และมีปุ่มลัดไปค้นต่อใน Log Explorer

### 4. Log Explorer — ค้นหา Syslog รวมศูนย์ (Graylog)
หน้าค้นหา Log จากทุก Host/VM ที่ส่งเข้า Graylog *(อ่านจากข้อมูลจำลอง 62 ข้อความ ผ่าน `lib/log-source.ts`)*
- **ค้นหาแบบข้อความอิสระ** ครอบคลุม message, ชื่อ Source, facility, IP และ Parsed Field
- **Sidebar เหลือ Severity เท่านั้น** ตาม RFC 5424 พร้อมจำนวนผลลัพธ์และปุ่มล้าง
- **ปฏิทินวันเวลาเริ่มต้น/สิ้นสุด** พร้อมช่วงลัด 15 นาที / 1 ชั่วโมง / 4 ชั่วโมง / ทั้งหมด
  ใช้เวลาไทย (UTC+7) และแสดงวันที่ข้อมูลจำลอง 24/05/2569 ชัดเจน เลือกวันอื่นจะไม่พบข้อมูล
  เมื่อเปลี่ยนตัวกรองจะกลับหน้าแรก และแสดงคำเตือนเมื่อวันเริ่มต้นอยู่หลังวันสิ้นสุด
- **นำกราฟสถิติและ Graylog Query Echo ออก** เพื่อเพิ่มพื้นที่อ่านข้อความ
  ยังมีช่องค้นหาข้อความทั่วไป ส่วนตัวสร้างคิวรีเก็บไว้ใน Adapter สำหรับเชื่อม API ในอนาคต
- **ตัดแหล่ง Ticket** ก่อนนับยอดและสร้างตัวกรอง โดยยังเก็บหลักฐานของ Incident ไว้
- **แบ่งหน้าครั้งละ 20 ข้อความ** พร้อมปุ่มก่อนหน้า/ถัดไป และตัวเลขช่วงที่กำลังแสดง
  (เปลี่ยนตัวกรองหรือลำดับการเรียงจะย้อนกลับไปหน้าแรกให้อัตโนมัติ)
- **กางดูรายละเอียดรายข้อความ** — metadata (source, source_ip, facility, level) และ Parsed Fields
  ที่ Extractor แยกไว้ พร้อมปุ่มลัดกรองเฉพาะ Source นั้น และปุ่มข้ามไปดูการวิเคราะห์ของ Incident
- **เลย์เอาต์เต็มจอสองคอลัมน์ที่เลื่อนแยกกัน** — คอลัมน์ตัวกรองด้านซ้ายและคอลัมน์
  ช่องค้นหา/ปฏิทิน/ตารางด้านขวา สูงเท่ากันและจบที่ขอบบนของแถบสถานะพอดี
  เลื่อนฝั่งหนึ่งอีกฝั่งไม่ขยับ และตัวหน้าเว็บเองไม่เลื่อน

### 5. AI Analysis — Diagnosis & Assistant
- **Network Health / AI Confidence:** ย้ายมาจาก Dashboard แสดงก่อนเนื้อหาวิเคราะห์ *(ข้อมูลจำลอง)*
- **คำตอบ Markdown:** แสดงหัวข้อ รายการ ตัวหนา ตาราง และบล็อกคำสั่ง พร้อมระยะห่างระหว่างย่อหน้า
  ใช้ `react-markdown` + `remark-gfm` โดยไม่เปิด HTML ดิบ และกำหนดรูปแบบเดียวกันใน System Prompt
- **AI Diagnosis (RCA):** แสดง Root Cause พร้อมคะแนนความเชื่อมั่น, ห่วงโซ่เหตุการณ์ (Evidence Chain)
  และหลักฐานเชิงเมตริกเทียบกับ Threshold *(ข้อมูลจำลอง)*
- **Log Evidence:** แต่ละขั้นของ Root Cause Chain กางดู Syslog ที่รองรับขั้นนั้นได้ (ผูกผ่านฟิลด์
  `logRefs`) และมีการ์ดรวมหลักฐานฝั่ง Log ทั้ง 24 ข้อความของ Incident พร้อมปุ่มเปิดต่อใน Log Explorer
- **AI Chat Assistant:** สนทนากับ Gemini ผ่าน `POST /api/ai/chat` — System Prompt ภาษาไทย
  ฝังบริบท Telemetry **และ Syslog ระดับ Error ขึ้นไป 20 บรรทัดล่าสุด** ไว้ พร้อมชุดคำถามแนะนำ *(เรียกโมเดลจริง)* แยกประวัติการสนทนาตาม
  Session จริง (สลับ Session แล้วเห็นเฉพาะข้อความของ Session นั้น, "New Chat" ไม่ลบประวัติ Session อื่น)

### 6. Action Center — Recommendation & Approval
- **Recommendations:** ตารางข้อเสนอแนะจาก AI พร้อมลำดับความสำคัญ ความเชื่อมั่น และตัวกรองสถานะ
  ที่กรองข้อมูลจริง (การ์ดสรุปยอดด้านบนคำนวณจากรายการจริงเช่นกัน)
- **Approvals (Human-in-the-Loop):** การ์ดคำขออนุมัติ 3 คอลัมน์ (บริบท / พารามิเตอร์ / ผลกระทบที่คาดการณ์),
  **Command Preview แบบกาง/พับในบัตรเดียวกัน** พร้อมปุ่มยืนยัน และ Modal ระบุเหตุผลการปฏิเสธ
- **Manual เท่านั้น:** นำสวิตช์ Auto-Execute ออก ทุกคำสั่งรวมถึง Restart DNS Service ต้องยืนยันด้วยคน
  ตรวจสิทธิ์และสถานะทั้งในปุ่มและตัวจัดการคำสั่ง: Viewer อ่านได้, Engineer อนุมัติคำขอระดับ operator
  และ Admin อนุมัติได้ทุกระดับ ไม่ดำเนินการซ้ำกับคำขอที่จบแล้ว
  การรันยังเป็นการจำลองเพื่ออัปเดต State/Audit Log ไม่มีการส่ง API หรือ SSH จริง

เมื่อกดอนุมัติหรือปฏิเสธ ระบบจะอัปเดตสถานะคำขอ อัปเดต Recommendation ที่เกี่ยวข้อง
และบันทึก Audit Log ใหม่ทันที (ดูผลได้ที่ Settings → Audit Log)

### 7. Reports & Analytics
- **Executive Summary:** KPI ระดับผู้บริหาร (Availability, Incidents, MTTR, AI Accuracy),
  กราฟแนวโน้ม 7 วัน, การกระจายความรุนแรง และรายงานเชิงบรรยายจาก AI
- **Incident Post-Mortem:** ไทม์ไลน์เหตุการณ์, บทเรียนที่ได้รับ และรายการงานติดตาม

### 8. Settings & Administration
- **Integrations:** สถานะการเชื่อมต่อ vCenter, Proxmox VE, Syslog/Prometheus, LINE Notify *(UI Mock)*
  พร้อม **Add Integration Wizard** 3 ขั้นตอน (เลือกประเภท → กรอกรายละเอียดพร้อมตรวจสอบความถูกต้อง →
  ทดสอบการเชื่อมต่อและยืนยัน) การ์ดที่เพิ่มใหม่จะแสดงต่อท้ายรายการทันที และคงอยู่เมื่อสลับแท็บ
  พร้อมปุ่ม **ลบการเชื่อมต่อ** ที่มี Modal ยืนยันก่อนลบ (สิทธิ์ Viewer เพิ่มหรือลบไม่ได้)
  และปุ่ม **Test Connection / Send Test Alert** ที่แสดง log ผลการทดสอบ (จำลอง) ในการ์ด
  พร้อมปุ่ม "ซ่อนผลลัพธ์ ˄ / แสดงผลลัพธ์ ˅" สำหรับพับกล่อง log โดยไม่ล้างผลเดิม
  หากการ์ดอยู่สถานะ "รอการทดสอบ" แล้วทดสอบผ่าน สถานะจะเปลี่ยนเป็น Connected ให้อัตโนมัติ
- **System Config:** เลือกโมเดล AI และตั้งค่า Threshold (CPU Ready, Storage Latency, Packet Loss)
- **RBAC:** สลับบทบาท Admin / NOC Engineer / Viewer เพื่อสาธิตการควบคุมสิทธิ์
- **Audit Log:** ตารางบันทึกการตัดสินใจทั้งหมด รวมคำสั่งที่ถูกรันและเหตุผลการปฏิเสธ

---

## ข้อจำกัดที่ทราบ (Known Limitations)

> รายการด้านล่างคือสิ่งที่ **ยังไม่แก้ไข** ตามความตั้งใจ (เป็นข้อจำกัดของสถาปัตยกรรม/ข้อมูลจำลอง
> ไม่ใช่บั๊ก) รายการบั๊กที่ตรวจพบและ **แก้ไขแล้ว** ทั้งหมด (20 จุด) อยู่ใน [`bugs.txt`](bugs.txt)

1. **ข้อมูลส่วนใหญ่ไม่ถูกบันทึกถาวร** — State เก็บใน React `useState` การรีเฟรชหน้าจะรีเซ็ต
   กลับสู่ค่าเริ่มต้น **ยกเว้นคลังผัง Topology** ที่เก็บใน `localStorage` จึงอยู่รอดการรีเฟรช
   แต่ยังผูกกับเบราว์เซอร์เครื่องนั้นเท่านั้น ใช้ร่วมกันทั้งทีมไม่ได้
2. **ไม่มีระบบยืนยันตัวตน** — การสลับบทบาทเป็นเพียงการสาธิต RBAC ไม่มีการบังคับสิทธิ์ฝั่ง Server
3. **AI Diagnosis ยังไม่เรียกโมเดล** — ผลการวินิจฉัยอ่านจาก `MOCK_DIAGNOSIS_01` แบบตายตัว
4. **บริบทของ AI Chat ยังฝังแบบ Hard-coded ใน System Prompt** — ค่า Hypervisor/VM ยังเขียนตายในโค้ด
   (ส่วน Syslog ดึงผ่าน `lib/log-source.ts` แล้ว) ยังไม่มีการส่งข้อมูล Telemetry สดจาก Client
   ไปกับทุกคำถาม และค่า `citedEntities` ที่ตอบกลับก็เป็นค่าคงที่
5. **ปุ่มที่ยังเป็น Stub** — Export PDF/Excel ยังเรียกแค่ `alert()` ส่วนปุ่ม Sync Now บนการ์ด
   Integration ยังไม่ทำงาน และการทดสอบการเชื่อมต่อ (ทั้งปุ่ม Test Connection / Send Test Alert
   บนการ์ด และขั้นตอนที่ 3 ของ Add Integration Wizard) เป็นการจำลองผลลัพธ์ — ยังไม่ยิงไปยัง
   vCenter/Proxmox/Syslog/Webhook จริง จึงขึ้นผลสำเร็จเสมอ
   (ปุ่ม Refresh บน TopBar/StatusBar/Dashboard ทำงานจริงแล้ว คืออัปเดตเวลา "Last Update"
   เป็นเวลาปัจจุบัน แต่ยังเป็น Mock Refresh เพราะไม่มี Collector จริงให้ดึงข้อมูลใหม่)
6. **การ Build ต้องใช้อินเทอร์เน็ต** เพราะโหลดฟอนต์ผ่าน `next/font/google`
7. **ESLint ถูกข้ามตอน Build** (`eslint.ignoreDuringBuilds: true`) — ต้องรัน `npm run lint` แยกเอง
   ส่วนการตรวจชนิดข้อมูลของ TypeScript ยังบังคับใช้อยู่ (`ignoreBuildErrors: false`)
8. **โค้ดเรียก Zabbix / vCenter / Proxmox ยังไม่ได้ทดสอบกับเซิร์ฟเวอร์จริง** — เขียนตามเอกสาร
   ของแต่ละ API ครบแล้ว แต่ยังไม่มีเครื่องจริงให้ยิงทดสอบ หากต่อแล้วไม่สำเร็จ ระบบจะไม่ล่ม
   (จะ fallback เป็นข้อมูลจำลองพร้อมแสดงสาเหตุบนหน้าจอ) จุดที่ต้องตรวจก่อนคือเวอร์ชันของ API
   และรูปแบบการยืนยันตัวตน นอกจากนี้ vCenter/Proxmox ไม่คืน IP ของ Guest มากับรายการหลัก
   จึงต้องมี VMware Tools / QEMU Guest Agent และเรียก API เพิ่มรายตัวถึงจะได้ IP
9. **`hooks/use-mobile.ts` (`useIsMobile`) ยังไม่ถูกเรียกใช้ที่ไหน** — Sidebar ยังไม่มีพฤติกรรม
   responsive สำหรับหน้าจอมือถือ (ย่ออัตโนมัติ/เปลี่ยนเป็น Drawer)
10. **ชื่อโมเดล Gemini (`gemini-3.6-flash`) ยังไม่ได้ยืนยันกับบัญชีรายชื่อโมเดลจริง** — หากตั้งค่า
    `GEMINI_API_KEY` จริงแล้วเรียกไม่สำเร็จ ควรตรวจสอบชื่อโมเดลกับเอกสาร Gemini API ปัจจุบันก่อน
11. **ข้อมูลจำลองมี Dangling Reference 1 จุด** — Alert รายการหนึ่ง (`alt-05`) อ้างถึง VM
    (`vm-backup` / "Backup-Server") ที่ไม่มีอยู่จริงใน `lib/mock-data.json`
12. **`types/ai-noc.ts` ยังมี Type ที่ไม่ถูกใช้งาน 1 ตัว** — `MetricSample` ไม่มี Mock Data หรือ
    Component ใดอ้างอิงถึง ส่วน `NetworkDevice` ถูกนำมาใช้จริงแล้ว (ข้อมูลพอร์ตของอุปกรณ์ SNMP
    ในแท็บ Interfaces และการตรวจสถานะพอร์ตใน `lib/link-verification.ts`)
    อนึ่ง ตัวเลข "Total Devices" ในหน้า Dashboard ยังเป็นค่าคงที่ที่ไม่มีข้อมูลต้นทางรองรับ
13. **บัญชี GitHub ถูกล็อกการเรียกเก็บเงิน จึงยังรัน Workflow ไม่ได้** — หน้า Actions ขึ้นว่า
    *"GitHub Actions workflows can't be executed on this repository. Your account's billing is
    currently locked."* Workflow ที่ push ขึ้นไปถูกสร้างเป็น Run จริงทุกครั้งแต่ตายที่
    **Startup failure** ก่อนจับคู่ Runner ทำให้ Runner ไม่เคยได้รับงานเลย
    **ข้อนี้ไม่เกี่ยวกับโค้ด แพ็กเกจ Free หรือ Self-hosted Runner** (งานที่รันบนเครื่องตัวเอง
    ไม่กินโควตานาที) ต้องไปแก้ที่ **Settings → Billing and licensing** ของบัญชีก่อน
    จากนั้น Workflow จะทำงานได้ทันทีโดยไม่ต้องแก้อะไรในโปรเจกต์
    ระหว่างนี้ Deploy ด้วยมือบนเซิร์ฟเวอร์ได้ (ทดสอบแล้วใช้เวลา ~2 นาที)
14. **การ Build เกิดบนเครื่องปลายทางเอง** จึงกิน CPU/RAM ของเครื่องที่ให้บริการอยู่
    และ `actions/checkout` ล้าง `node_modules`/`.next` ทุกรอบ ทำให้ทุกครั้งเป็นการ Build
    แบบเย็น (ช้าแต่ผลลัพธ์แน่นอนกว่า) บนเครื่องจริงวัดได้ ~2 นาทีต่อรอบ

---

## แผนพัฒนาต่อ (Roadmap)

- [ ] เชื่อมต่อ Collector จริง — vCenter API, Proxmox VE API, SNMP และ Syslog
- [ ] ต่อ Graylog REST API จริงใน `lib/log-source.ts` (`/api/search/universal/relative`)
      แล้วย้ายการค้นหาไปเป็น API Route ฝั่ง Server เพื่อไม่ให้ Token หลุดไปฝั่ง Client
- [ ] เพิ่ม Graylog เป็น Integration Type แยกในหน้า Settings (ปัจจุบันรวมอยู่ใน `syslog-metric`)
- [ ] เพิ่มฐานข้อมูลสำหรับ Incident, Approval และ Audit Log
- [ ] ให้ AI Diagnosis (RCA) วิเคราะห์จากข้อมูลจริงผ่าน Gemini
- [ ] เพิ่ม Authentication และบังคับสิทธิ์ RBAC ที่ฝั่ง Server
- [ ] ทำ Export รายงาน PDF/Excel ให้ใช้งานได้จริง
- [ ] เชื่อม Notification Gateway (LINE / Webhook) เข้ากับเหตุการณ์จริง
- [ ] เพิ่มชุดทดสอบ (Unit / E2E) เข้าไปใน CI ที่มีอยู่ — ตอนนี้ `ci.yml` ตรวจแค่ Type/Lint/Build
- [ ] รัน Workflow Deploy กับเซิร์ฟเวอร์ Linux จริง แล้วปรับค่า `APP_DIR` / `HEALTH_URL` ให้ตรงเครื่อง
- [ ] ทดสอบ Device Discovery กับ Zabbix / vCenter / Proxmox เครื่องจริง
- [ ] ยืนยันชื่อคีย์ Item ของ LLDP/CDP กับ Zabbix เครื่องจริง แล้วตั้ง `ZABBIX_NEIGHBOR_KEYS` ให้ตรง
      (ชื่อคีย์ขึ้นกับ Template ที่ใช้ จึงไม่มีค่ามาตรฐาน)
- [ ] ดึง IP ของ Guest VM เพิ่ม (VMware Tools / QEMU Guest Agent) ให้ผังมี IP ครบทุกตัว
- [ ] ย้ายคลังผังจาก `localStorage` ไปเก็บในฐานข้อมูล เพื่อให้ใช้ร่วมกันได้ทั้งทีม
- [ ] เพิ่ม Responsive Layout สำหรับหน้าจอมือถือ (นำ `useIsMobile` มาใช้งานจริง)

---

## License

โครงงานเพื่อการศึกษา (Academic Project) — KMUTNB
