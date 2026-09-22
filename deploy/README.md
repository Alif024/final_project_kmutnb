# การนำ AI-NOC ขึ้นเซิร์ฟเวอร์ Linux ด้วย GitHub Actions

เอกสารนี้อธิบายการตั้งค่าเครื่องปลายทางให้ทำงานกับ
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

## ภาพรวม

```
push เข้า main
   │
   ▼
Self-hosted Runner (ติดตั้งอยู่บนเซิร์ฟเวอร์ Linux เครื่องเดียวกับที่แอปรัน)
   │  npm ci → tsc --noEmit → eslint → next build (output: standalone)
   ▼
/opt/ai-noc/releases/20260922-081500-13514d3/   ← ชุดไฟล์ใหม่ (วันเวลา UTC + sha ย่อ)
/opt/ai-noc/current -> releases/2026...     ← สลับ Symlink แบบ Atomic
   │
   ▼
sudo systemctl restart ai-noc  →  ตรวจสุขภาพ  →  ไม่ผ่าน = ย้อน Symlink กลับอัตโนมัติ
```

Build เกิดบนเครื่องปลายทางทั้งหมด จึง **ไม่ต้องใช้ SSH Key หรือ Secret ใด ๆ ใน GitHub**
ตัว Runner เป็นฝ่ายเชื่อมออกไปหา GitHub เอง เซิร์ฟเวอร์จึงไม่ต้องเปิดพอร์ตขาเข้าเพิ่ม

## เครื่องจริงของโปรเจกต์นี้

ค่าทั้งหมดในเอกสารนี้ตั้งให้ตรงกับเครื่องที่ใช้งานอยู่แล้ว ถ้านำไปใช้กับเครื่องอื่นต้องไล่แก้ตามตาราง

| รายการ | ค่าบนเครื่องจริง |
|---|---|
| ระบบปฏิบัติการ | Ubuntu 24.04 LTS (x86_64, 2 vCPU, RAM 2.9 GB) |
| ผู้ใช้ที่รัน Runner และ Service | `ghrunner` |
| ชื่อ Runner บน GitHub | `ai-noc-vm` (Label: `ai-noc`) |
| โฟลเดอร์ปลายทาง | `/opt/ai-noc` (`releases/` + Symlink `current`) |
| systemd unit | `ai-noc.service` |
| พอร์ตของแอป | `127.0.0.1:3001` |
| Reverse Proxy | Nginx site `ai-noc.n8n-lifrpi.uk` → `proxy_pass http://127.0.0.1:3001` |
| ไฟล์ค่าลับ | `/etc/ai-noc/ai-noc.env` (ยังไม่มี `GEMINI_API_KEY` — AI Chat จึงอยู่ในโหมดจำลอง) |

> **ย้ายมาใช้โครงนี้แล้วเมื่อ 22 กันยายน 2569** — ก่อนหน้านั้นแอปถูก Deploy ด้วยมือไว้ที่
> `/root/project_app` และรันเป็น root ตอนนี้ service รันเป็น `ghrunner` จาก `/opt/ai-noc/current`
> ส่วน `/root/project_app` (1.1 GB) และ unit เดิมที่สำรองไว้ที่
> `/root/ai-noc.service.bak-before-migration` ยังอยู่ ใช้เป็นทางถอยได้ถ้าโครงใหม่มีปัญหา

## ข้อกำหนดเครื่อง

| รายการ | ค่า |
|---|---|
| ระบบปฏิบัติการ | Linux ที่ใช้ systemd (Ubuntu 22.04/24.04, Debian 12, Rocky 9) |
| Node.js | ติดตั้งในระบบเป็น **22** ให้ตรงกับที่ workflow ใช้ build — systemd เรียก `/usr/bin/node` ของเครื่อง ไม่ใช่ Node ที่ `setup-node` ติดตั้งให้เฉพาะตอนรัน Job (ขั้นต่ำที่ Next.js 15 รับคือ 20) |
| เครื่องมือ | `git`, `curl`, `tar` (แพ็กเกจพื้นฐานที่ Runner และ `actions/checkout` ต้องใช้) |
| เครือข่าย | ออกอินเทอร์เน็ตได้ — Runner ต้องคุยกับ GitHub และ `npm ci` ต้องดึงแพ็กเกจ |
| พื้นที่ดิสก์ | แนะนำว่างอย่างน้อย 5 GB — ชุด Release ~70 MB ต่อเวอร์ชัน (เก็บ 5 ชุด ≈ 350 MB) ส่วนที่กินจริงคือพื้นที่ทำงานของ Runner (`node_modules` + `.next` ราว 1–1.5 GB) |

---

## 1. เตรียมผู้ใช้และโฟลเดอร์

```bash
# ผู้ใช้สำหรับรันแอปและรัน Runner (ใช้คนเดียวกันเพื่อลดปัญหาสิทธิ์ไฟล์)
# เครื่องของโปรเจกต์นี้มี ghrunner อยู่แล้ว — ข้ามบรรทัดนี้ได้
sudo useradd --system --create-home --shell /bin/bash ghrunner

# โฟลเดอร์ปลายทาง — ต้องอยู่นอก /home เพราะ unit ตั้ง ProtectHome=true
# และต้องเป็นของผู้ใช้ที่รัน Runner เพราะ Workflow เขียนไฟล์ลงที่นี่โดยไม่ใช้ sudo
sudo mkdir -p /opt/ai-noc/releases
sudo chown -R ghrunner:ghrunner /opt/ai-noc
```

ติดตั้ง Node.js 22 (ตัวอย่าง Ubuntu/Debian):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
command -v node        # ต้องได้ /usr/bin/node ให้ตรงกับ ExecStart ใน unit
```

## 2. ไฟล์ค่าลับของเครื่อง (ไม่บังคับ)

ตอนนี้ระบบ **เดินด้วยข้อมูลจำลองทั้งหมด** ยังไม่ต้องเชื่อม Proxmox / Zabbix / Syslog Server จริง
ถ้าไม่สร้างไฟล์นี้เลย แอปก็ขึ้นได้ตามปกติ — unit ตั้ง `EnvironmentFile=-` (มีขีดนำหน้า)
ไว้แล้ว systemd จึงข้ามไปเมื่อไม่มีไฟล์ ไม่ถือเป็น Error

สิ่งเดียวที่ควรใส่ตอนนี้คือ **คีย์ AI** — ใส่แล้ว `/api/ai/chat` จะเรียกโมเดลจริง
ไม่ใส่ก็ตอบด้วยข้อความจำลอง (Mock Mode) ส่วนหน้าจออื่นไม่ต่างกัน

```bash
sudo mkdir -p /etc/ai-noc
sudo tee /etc/ai-noc/ai-noc.env >/dev/null <<'EOF'
GEMINI_API_KEY=...
EOF
sudo chown root:ghrunner /etc/ai-noc/ai-noc.env
sudo chmod 640 /etc/ai-noc/ai-noc.env
```

> ถ้าเครื่องนี้ยังไม่เคย Deploy ให้ข้ามไปข้อ 3 ต่อได้เลย — service ยังไม่ถูกติดตั้ง สั่ง restart
> ตอนนี้จะขึ้นว่า `Unit ai-noc.service not found` ส่วนกรณีที่ระบบวิ่งอยู่แล้วและเพิ่งมาเติมคีย์
> ต้องสั่ง `sudo systemctl restart ai-noc` ด้วย เพราะ systemd อ่าน `EnvironmentFile`
> ตอนเริ่มโปรเซสเท่านั้น

> ไฟล์นี้ใช้รูปแบบของ systemd (`KEY=value` ล้วน ๆ ไม่มี `export` และไม่มีเครื่องหมายคำพูดครอบ
> เว้นแต่ต้องการให้เป็นส่วนหนึ่งของค่า)

### เผื่อไว้ในอนาคต — เชื่อมต้นทางจริง

เมื่อพร้อมต่อของจริง ให้เติมตัวแปรของต้นทางนั้นลงในไฟล์เดิมแล้ว `systemctl restart ai-noc`
ไม่ต้องแก้ workflow หรือ Deploy ใหม่ **ต้นทางใดยังไม่ได้ตั้งค่า ระบบจะใช้ข้อมูลจำลองของต้นทางนั้นต่อไป
และแจ้งบนหน้า Infrastructure ว่าอุปกรณ์ชุดนั้นยังไม่ใช่ของจริง** จึงเติมทีละต้นทางได้

```bash
# ตัวอย่าง — ยังไม่ต้องใส่ตอนนี้ (รายละเอียดทุกตัวอยู่ใน .env.example)
ZABBIX_URL=http://10.0.2.10/zabbix
ZABBIX_TOKEN=...
VCENTER_URL=https://10.0.0.100
VCENTER_USERNAME=administrator@vsphere.local
VCENTER_PASSWORD=...
PROXMOX_URL=https://10.0.0.201:8006
PROXMOX_TOKEN=root@pam!ainoc=...
```

ส่วน Syslog ยังไม่มีตัวแปรให้ตั้งค่า — `lib/log-source.ts` เตรียมไว้เป็นจุดต่อ Graylog REST API
แต่ยังอ่านจาก `lib/mock-data.json` อยู่ ต้องแก้โค้ดในไฟล์นั้นก่อนจึงจะมีค่าให้ตั้งใน env

## 3. ติดตั้ง systemd Service

ขั้นนี้ยังไม่มีซอร์สโค้ดบนเครื่อง (Runner มาติดตั้งในข้อ 4) จึงต้อง Clone มาก่อนเพื่อหยิบแม่แบบ
ในโฟลเดอร์ `deploy/` — Clone ไว้ที่ไหนก็ได้ ไม่เกี่ยวกับโฟลเดอร์ที่ใช้ให้บริการจริง

```bash
git clone https://github.com/Alif024/final_project_kmutnb.git /tmp/ai-noc-src
cd /tmp/ai-noc-src

sudo cp deploy/ai-noc.service /etc/systemd/system/ai-noc.service
sudo nano /etc/systemd/system/ai-noc.service   # แก้ User/Group/PORT/HOSTNAME ให้ตรงเครื่อง
sudo systemctl daemon-reload
sudo systemctl enable ai-noc                   # ให้สตาร์ตเองตอนบูต แต่ยังไม่ต้อง start
```

ยัง **ไม่ต้อง** `systemctl start` ตอนนี้ เพราะ `/opt/ai-noc/current` ยังไม่มีไฟล์
การ Deploy ครั้งแรกจะสร้างให้แล้วสั่ง restart เอง

## 4. ติดตั้ง Self-hosted Runner

ไปที่ **Settings → Actions → Runners → New self-hosted runner** ของ Repository
แล้วทำตามคำสั่งที่หน้านั้นให้ — ช่วงดาวน์โหลดและ `config.sh` ต้องรันในฐานะผู้ใช้ `ghrunner`
(`config.sh` ปฏิเสธถ้ารันด้วย root) ส่วน `svc.sh install` ต้องใช้ sudo เพราะไปสร้าง systemd unit

```bash
sudo -iu ghrunner
mkdir -p ~/actions-runner && cd ~/actions-runner
# curl ... && tar xzf ...   (คัดลอกจากหน้า GitHub เพราะเลขเวอร์ชันเปลี่ยนบ่อย)

# ตอน config ให้ใส่ Label เพิ่มคือ ai-noc ให้ตรงกับ runs-on ใน workflow
./config.sh --url https://github.com/<org>/<repo> --token <TOKEN> --labels ai-noc
exit

# ติดตั้งเป็น service ให้ Runner ขึ้นเองตอนบูต
cd /home/ghrunner/actions-runner
sudo ./svc.sh install ghrunner
sudo ./svc.sh start
```

`runs-on: ai-noc` ใน workflow จะจับเฉพาะ Runner ที่มี Label นี้ ถ้าสะกดไม่ตรงกัน
งานจะค้างอยู่ในคิวเงียบ ๆ โดยไม่มี Error — ตรวจ Label ที่หน้า Settings -> Actions -> Runners ได้
(`self-hosted`, `Linux`, `X64` เป็น Label ที่ GitHub ติดให้เองอยู่แล้ว ไม่ต้องตั้ง)

## 5. ให้สิทธิ์ sudo เฉพาะคำสั่งที่จำเป็น

workflow ต้องสั่ง `systemctl restart` และอ่าน `systemctl status` ได้โดยไม่ถามรหัสผ่าน
(ใช้ `sudo -n` คือห้ามถามรหัสผ่านเด็ดขาด)

```bash
cd /tmp/ai-noc-src          # โฟลเดอร์ที่ Clone ไว้ในข้อ 3
sudo install -m 0440 -o root -g root \
  deploy/ai-noc-deploy.sudoers /etc/sudoers.d/ai-noc-deploy
sudo visudo -c              # ต้องขึ้นว่า parsed OK ถ้าไม่ผ่านให้ลบไฟล์นี้ทิ้งทันที
```

แม่แบบตั้งชื่อผู้ใช้เป็น `ghrunner` ไว้แล้ว ถ้าใช้ชื่ออื่นต้องแก้ทุกบรรทัดในไฟล์ให้ตรงกัน
จากนั้นทดสอบในฐานะผู้ใช้นั้นว่าใช้ได้จริง — ต้องไม่ถามรหัสผ่านและไม่ขึ้น `a password is required`

```bash
sudo -iu ghrunner
sudo -n systemctl status ai-noc --no-pager --lines=5
exit
```

## 6. ตั้งค่า Variables ใน GitHub (ถ้าไม่ใช้ค่าเริ่มต้น)

**Settings → Secrets and variables → Actions → Variables**

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `APP_DIR` | `/opt/ai-noc` | โฟลเดอร์ปลายทางบนเซิร์ฟเวอร์ |
| `SERVICE_NAME` | `ai-noc` | ชื่อ systemd unit |
| `HEALTH_URL` | `http://127.0.0.1:3001/` | URL ที่ใช้ตรวจว่าแอปฟื้นแล้วหลัง restart |
| `KEEP_RELEASES` | `5` | จำนวนเวอร์ชันเก่าที่เก็บไว้เพื่อย้อนกลับ |

workflow นี้ **ไม่ใช้ Secret ใด ๆ** — ค่าลับทั้งหมดอยู่ในไฟล์ของเครื่องตามข้อ 2

### ข้อจำกัดของแพ็กเกจ Free

Repository นี้เป็นแบบส่วนตัวบนแพ็กเกจ Free — **Environment ของ GitHub ใช้ไม่ได้**
(ต้องเป็น Pro/Team/Enterprise หรือเป็น Repository สาธารณะ) workflow จึงไม่อ้าง Environment
และไม่มีขั้นตอนอนุมัติก่อน Deploy ถ้าอยากได้ขั้นตอนอนุมัติโดยไม่อัปเกรดแพ็กเกจ
ให้ตัด trigger `push` ออกจาก `deploy.yml` เหลือแค่ `workflow_dispatch`
แล้วสั่ง Run workflow เองทุกครั้งจากแท็บ Actions

ส่วนอื่นใช้ได้ครบบน Free:

| รายการ | สถานะบน Free |
|---|---|
| Self-hosted Runner (`deploy.yml`) | ✅ ไม่จำกัดนาที — งานที่รันบนเครื่องตัวเองไม่นับโควตา |
| GitHub-hosted Runner (`ci.yml`) | ✅ 2,000 นาที/เดือน — งานนี้ใช้ ~3 นาทีต่อ Pull Request |
| Repository Secrets และ Variables | ✅ ใช้ได้ตามปกติ |
| Cache ของ `actions/setup-node` | ✅ ใช้ได้ (โควตา 10 GB) |
| Environment / Environment Secrets / Required reviewers | ❌ ต้องอัปเกรดแพ็กเกจ |

## 7. Deploy ครั้งแรก

```bash
git push origin main          # หรือกด Run workflow ที่แท็บ Actions
sudo systemctl status ai-noc
journalctl -u ai-noc -f       # ดู log ของแอปแบบต่อเนื่อง
```

---

## Reverse Proxy (ตัวเลือก)

unit ตัวอย่างผูกแอปไว้ที่ `127.0.0.1:3001` เพื่อให้มี Nginx อยู่ด้านหน้า

```nginx
server {
    listen 80;
    server_name ai-noc.example.ac.th;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

ถ้าไม่ใช้ Reverse Proxy ให้แก้ `Environment=HOSTNAME=0.0.0.0` ใน unit แล้วเปิดพอร์ต 3001

## คำสั่งที่ใช้บ่อย

```bash
# ดูว่าตอนนี้รันเวอร์ชันไหน
readlink -f /opt/ai-noc/current

# รายการเวอร์ชันที่ยังเก็บไว้ (ใหม่ไปเก่า)
ls -1dt /opt/ai-noc/releases/*/

# ย้อนกลับด้วยมือ
sudo -u ghrunner ln -sfn /opt/ai-noc/releases/<ชื่อโฟลเดอร์เก่า> /opt/ai-noc/current.tmp
sudo -u ghrunner mv -T /opt/ai-noc/current.tmp /opt/ai-noc/current
sudo systemctl restart ai-noc
```

## ข้อควรรู้

- **ย้อนกลับอัตโนมัติมีเฉพาะกรณี Health Check ไม่ผ่าน** ถ้าแอปขึ้นได้แต่ทำงานผิด
  ต้องย้อนเองด้วยคำสั่งด้านบน
- **Build กินแรงเครื่อง** `next build` ใช้ CPU/RAM พอสมควรบนเครื่องเดียวกับที่แอปรัน
  ถ้าเซิร์ฟเวอร์เล็ก ให้ตั้งเวลา Deploy นอกเวลาทำการ หรือย้ายไป Build บนเครื่องอื่นแล้วส่งไฟล์มาแทน
- **ทุกครั้งเป็นการ Build แบบเย็น** `actions/checkout` ล้าง Workspace ด้วย `git clean -ffdx`
  ทั้ง `node_modules` และ `.next` จึงหายทุกรอบ ผลลัพธ์แน่นอนกว่าแต่ช้ากว่า ถ้าช้าจนชน
  `timeout-minutes: 30` ค่อยเพิ่ม `with: clean: false` ให้ `actions/checkout` เพื่อเก็บแคช `.next` ไว้
- **`npm ci` ดึง `firebase-tools` มาด้วยทุกรอบ** ทั้งที่ `next build` ไม่ได้ใช้ เพราะอยู่ใน
  `devDependencies` ซึ่งจำเป็นต่อ build ตัวอื่น (typescript/tailwind) จึงตัดทิ้งทั้งชุดไม่ได้
  ถ้าต้องการให้เร็วขึ้นจริง ๆ ต้องถอด `firebase-tools` ออกจาก `package.json` ซึ่งเป็นการแก้โปรเจกต์
  ไม่ใช่แก้ Workflow (แพ็กเกจ `re2` ที่พ่วงมาเป็น optional — คอมไพล์ไม่ผ่านก็ข้ามไป ไม่ทำให้ `npm ci` ล้ม)
- **ฐานข้อมูลผังเครือข่ายอยู่ที่ `localStorage` ของเบราว์เซอร์** (`ai-noc:topology-workspace`)
  การ Deploy จึงไม่กระทบผังที่ผู้ใช้วาดไว้ และการย้ายเครื่องก็ไม่ได้พาผังไปด้วย
- **ไฟล์ `.env*` ถูก `.gitignore` ไว้** ชุดไฟล์ที่ปล่อยขึ้นเซิร์ฟเวอร์จึงไม่มีค่าลับติดไปด้วย
  ค่าทุกตัวมาจาก `EnvironmentFile` ของ systemd เท่านั้น
- **ห้ามใช้ `npm run start`** เพราะ `next start` ไม่รองรับ `output: 'standalone'`
  ต้องรัน `node server.js` ในโฟลเดอร์ Release ตามที่ unit ตั้งไว้
