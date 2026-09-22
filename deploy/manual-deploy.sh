#!/usr/bin/env bash
# Deploy ด้วยมือ — ใช้ขั้นตอนเดียวกับ .github/workflows/deploy.yml ทุกคำสั่ง
# มีไว้ใช้ตอนที่สั่งงานผ่าน GitHub Actions ไม่ได้ (เช่นบัญชีถูกล็อกการเรียกเก็บเงิน)
#
# วิธีใช้ — ต้องรันในฐานะผู้ใช้ที่เป็นเจ้าของ /opt/ai-noc (บนเครื่องนี้คือ ghrunner)
#   sudo -iu ghrunner
#   ~/manual-deploy.sh ~/src          # ชี้ไปที่โฟลเดอร์ซอร์สที่เตรียมไว้
#
# เตรียมซอร์สไว้ก่อนด้วยวิธีใดก็ได้ที่ ghrunner อ่านได้ เช่น
#   ก) จากเครื่องพัฒนา:  git archive --format=tar HEAD | gzip > src.tgz
#      แล้วส่งขึ้นเครื่องด้วย scp และแตกไว้ที่ /home/ghrunner/src
#   ข) บนเครื่อง (ต้องมีสิทธิ์เข้าถึง repo): git clone <url> /home/ghrunner/src
set -euo pipefail

SRC="${1:-$PWD}"
APP_DIR="${APP_DIR:-/opt/ai-noc}"
SERVICE_NAME="${SERVICE_NAME:-ai-noc}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3001/}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
export NEXT_TELEMETRY_DISABLED=1

log() { printf '### [%s] %s\n' "$(date +%T)" "$*"; }
die() { printf '!!! %s\n' "$*" >&2; exit 1; }

[ -f "$SRC/package.json" ] || die "ไม่พบ package.json ใน $SRC — ชี้ไปที่โฟลเดอร์ซอร์สให้ถูกต้อง"
[ -w "$APP_DIR" ] || die "เขียน $APP_DIR ไม่ได้ — ต้องรันในฐานะเจ้าของโฟลเดอร์ (ghrunner)"

cd "$SRC"

# สคริปต์รุ่นเก่าเคยประกอบชุดไฟล์ไว้ที่ release/ ในโฟลเดอร์ซอร์ส ทำให้รอบถัดไป
# `eslint .` เดินไปตรวจโค้ดที่ build แล้วจนขึ้น error — ลบทิ้งถ้ายังค้างอยู่
rm -rf release

log "ติดตั้ง Dependencies"
npm ci --include=dev

log "ตรวจ Type"
npx tsc --noEmit

log "ตรวจ Lint"
npm run lint

log "Build (output: standalone)"
npm run build

log "ปล่อยเวอร์ชันใหม่และสลับ Symlink"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
REV="$(git -C "$SRC" rev-parse --short=7 HEAD 2>/dev/null || echo manual)"
RELEASE_DIR="$APP_DIR/releases/$STAMP-$REV"

PREVIOUS_RELEASE=""
if [ -L "$APP_DIR/current" ]; then
  PREVIOUS_RELEASE="$(readlink -f "$APP_DIR/current")"
  echo "เวอร์ชันเดิม: $PREVIOUS_RELEASE"
fi

# ประกอบลงโฟลเดอร์ปลายทางตรง ๆ — ห้ามสร้างโฟลเดอร์ชั่วคราวไว้ในซอร์ส
# ไม่งั้นรอบถัดไป eslint จะไปตรวจผลลัพธ์ของ build แล้วล้ม
# (Symlink current ยังไม่ขยับจนกว่าจะคัดลอกครบ ของที่ให้บริการอยู่จึงไม่กระทบ)
mkdir -p "$RELEASE_DIR"
cp -r .next/standalone/. "$RELEASE_DIR/"
mkdir -p "$RELEASE_DIR/.next"
cp -r .next/static "$RELEASE_DIR/.next/static"
if [ -d public ]; then cp -r public "$RELEASE_DIR/public"; fi

ln -sfn "$RELEASE_DIR" "$APP_DIR/current.tmp"
mv -T "$APP_DIR/current.tmp" "$APP_DIR/current"
echo "เวอร์ชันใหม่: $RELEASE_DIR"

log "Restart Service"
sudo -n systemctl restart "$SERVICE_NAME"

log "ตรวจสุขภาพแอป"
healthy=0
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 5 "$HEALTH_URL" -o /dev/null; then
    echo "แอปตอบสนองแล้วในครั้งที่ $attempt"
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" != "1" ]; then
  echo "!!! แอปไม่ตอบสนองภายใน 60 วินาที ($HEALTH_URL)" >&2
  sudo -n systemctl status "$SERVICE_NAME" --no-pager --lines=40 || true
  if [ -n "$PREVIOUS_RELEASE" ]; then
    log "ย้อนกลับไปที่ $PREVIOUS_RELEASE"
    ln -sfn "$PREVIOUS_RELEASE" "$APP_DIR/current.tmp"
    mv -T "$APP_DIR/current.tmp" "$APP_DIR/current"
    sudo -n systemctl restart "$SERVICE_NAME"
  else
    echo "ไม่มีเวอร์ชันก่อนหน้าให้ย้อนกลับ" >&2
  fi
  exit 1
fi

log "ลบเวอร์ชันเก่าที่เกินโควตา (เก็บ $KEEP_RELEASES ชุด)"
cd "$APP_DIR/releases"
ls -1dt -- */ 2>/dev/null | tail -n "+$((KEEP_RELEASES + 1))" | xargs -r rm -rf || true

log "Deploy สำเร็จ — current -> $(readlink -f "$APP_DIR/current")"
