# Nongkrong Planner — Backend (Express + MongoDB + JWT)

## Backend untuk fitur:

- Register & Login (JWT)
- Login dengan Google (Google Identity Services → backend verify → app JWT)
- Dashboard events (list events milik user)
- Create event + invite code/link
- Join event via code (wajib login)
- Polling:
  - tambah opsi date/time & location
  - vote date/time & location
  - polling ditutup otomatis saat lewat deadline
- Auto-finalize setelah deadline (server set status FINAL saat event di-fetch)
- Discussion/chat per event (wajib login)
- Split Bill:
  - **EVENLY** & **BY ITEM**
  - support pajak/service: remaining dibagi rata → **no remaining balance** di final
- Finalize / End event (owner only)

---

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- JWT (Authorization: Bearer `<token>`)
- CORS untuk Live Server `http://localhost:5500`

---

## Requirements

- Node.js (disarankan LTS)
- MongoDB lokal (default `mongodb://127.0.0.1:27017`)
- (Opsional) `mongosh` untuk reset database

---

## Setup

1. Konfigurasi Environment (buat file .env)
   Copy dari .env.example:

```bash
cp .env.example .env
```

Lalu edit nilai JWT_SECRET (wajib).

2. Install dependencies

```bash
npm install
```

3. Jalankan server

```bash
npm run dev
```

Server jalan di:
API: http://localhost:3000

Frontend (Live Server): http://localhost:5500

Reset Database

```bash
mongosh
use nongkrong_planner
db.dropDatabase()
exit
```

Lalu restart server:

```bash
npm run dev
```

Catatan: di terminal mongosh prompt awal bisa test>. Setelah use nongkrong_planner akan berubah jadi nongkrong_planner>.

## Authentication Rules

Semua fitur (dashboard, create event, detail event, vote, chat, split bill) wajib login.

Header wajib untuk endpoint non-auth:

```makefile
Authorization: Bearer <JWT_TOKEN>
```

Untuk request body JSON:

```makefile
Content-Type: application/json
```

## Main Flow (Frontend Integration)

A. Login

1. Frontend panggil POST /api/auth/login
2. Simpan token ke localStorage
3. Untuk request berikutnya, kirim header Authorization: Bearer <token>

B. Login (Google)

1. Frontend mendapatkan Google ID token (GIS)
2. Frontend kirim ke backend POST /api/auth/google dengan body { credential }
3. Backend balas token (JWT aplikasi) → simpan ke localStorage

C. Dashboard

- GET /api/events → tampilkan upcoming/past
- Saran filter:
  --Upcoming: status POLLING / FINAL dan (kalau ada finalDateTime) finalDateTime >= sekarang
  --Past: status ENDED atau (kalau ada finalDateTime) finalDateTime < sekarang

D. Create Event

- POST /api/events → response mengembalikan code
- Link shareable dibuat dari frontend:
  --detailevent.html?code=XXXXXX

E. Detail Event

- Saat buka detailevent.html?code=XXXXXX:

1. pastikan token ada (kalau tidak → redirect ke login)
2. POST /api/events/:code/join (auto-join)
3. GET /api/events/:code untuk render detail

F. Real-time (tanpa websocket)

- Gunakan polling sederhana:
  --setInterval(() => GET /api/events/:code, 1500)
  untuk update votes, members, messages, bill.

G. Deadline Voting & Auto-Finalize

- Jika deadline sudah lewat:
  --endpoint vote / add options akan ditolak (polling closed)
  --saat detail event di-fetch (GET /api/events/:code), server otomatis set:
  -----status = FINAL
  -----finalDateTime dan finalLocation diambil dari vote tertinggi (kalau ada opsi)

H. Split Bill Behavior
Split bill mendukung:

- EVENLY: total bill dibagi rata ke semua attendee
- BY ITEM: item di-assign ke member tertentu
  --Jika total bill > sum(items), sisa (pajak/service) otomatis dibagi rata ke semua attendee
  --Output final: tidak ada remaining balance (sum semua orang = total)

## Endpoint Summary

- Auth:
  --POST /api/auth/register
  --POST /api/auth/login
  --POST /api/auth/google

- Events:
  --GET /api/events (dashboard)
  --POST /api/events (create)
  --GET /api/events/:code (detail, member-only)
  --POST /api/events/:code/join (join via code)

- Polling / Chat / Bill:
  --Tergantung implementasi route di eventRoutes (vote/options/messages/bill)

- Admin event:
  --POST /api/events/:code/finalize (owner-only)
  --POST /api/events/:code/end (owner-only, jika ada)

## Quick Testing (cURL)

1. Register

```bash
curl -i -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

2. Login (ambil token)

```bash
curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

3. List events

```bash
curl -i "http://localhost:3000/api/events" \
  -H "Authorization: Bearer <TOKEN>"
```

4. Create event

```bash
curl -i -X POST "http://localhost:3000/api/events" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ngopi","description":"Tes","deadline":"2025-12-31","proposedDates":[],"locationOptions":[]}'
```

### Common Issues saat Quick Testing (cURL)

1. Missing Bearer token
   Pastikan format tepat:

```makefile
Authorization: Bearer <token>
```

2. Git Bash command “kepotong”

- Kalau pakai multiline \:
  --pastikan \ adalah karakter terakhir di baris
  --jangan ada spasi setelah \

3. 403 saat akses detail event

- User harus join dulu:
  --POST /api/events/:code/join
  baru boleh:
  --GET /api/events/:code
