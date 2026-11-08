# Pemweb Week 10 - API Produk dengan ExpressJS, Prisma, dan PostgreSQL

Tugas Pemrograman Web Minggu 10. Proyek ini melanjutkan API produk Minggu 9 (ExpressJS 5 + TypeScript). Penyimpanan array di memori diganti dengan **PostgreSQL melalui Prisma ORM**, sehingga data tetap ada setelah server Express dimulai ulang. Endpoint GET, POST, PUT, dan DELETE tersedia.

- Laporan pengujian beserta tangkapan layar: [docs/LAPORAN-PENGUJIAN.md](docs/LAPORAN-PENGUJIAN.md)
- NRP: 5027251091

## Versi yang dipakai

| Komponen | Versi |
|---|---|
| Node.js | 20.19 atau lebih baru (diuji pada v24.20.0) |
| Express | 5.3.0 |
| TypeScript | 5.9.3 (dijalankan dengan `tsx` 4.23.15) |
| Prisma CLI, `@prisma/client`, `@prisma/adapter-pg` | 7.10.1 |
| `pg` | 8.23.1 |
| PostgreSQL | 16 (container `postgres:16-alpine`, diuji pada 16.15) |
| Docker Compose | 2.x, hanya untuk menjalankan PostgreSQL |

## Cara instalasi dan menjalankan

Prasyarat: Node.js, Git, dan Docker (atau PostgreSQL yang sudah berjalan di komputer sendiri).

```bash
# 1. Ambil kode dan pasang dependency
git clone https://github.com/DaffHaxxim/Pemweb-Week10-ExpressJS-Prisma.git
cd Pemweb-Week10-ExpressJS-Prisma
npm install

# 2. Siapkan konfigurasi. Salin contoh lalu ganti USER dan PASSWORD (di dua tempat: POSTGRES_* dan DATABASE_URL)
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env

# 3. Jalankan PostgreSQL
docker compose up -d            # menunggu status healthy: docker compose ps

# 4. Terapkan migration, buat Prisma Client, isi data awal
npm run db:deploy               # prisma migrate deploy
npm run db:generate             # prisma generate (wajib pada Prisma 7)
npm run db:seed                 # opsional: Buku dan Pulpen

# 5. Jalankan server
npm run dev                     # http://localhost:3000
```

Jika memakai PostgreSQL sendiri tanpa Docker, lewati langkah 3 dan arahkan `DATABASE_URL` di `.env` ke database yang sudah dibuat. File `.env` berisi rahasia dan sudah diabaikan Git; hanya `.env.example` (berisi placeholder) yang masuk repositori.

Jika Prisma CLI mengeluh engine tidak ditemukan pada npm versi baru yang memblokir skrip instalasi, jalankan `npm install-scripts approve prisma @prisma/engines` lalu `npm install` kembali.

### Skrip npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dengan `tsx watch` (restart otomatis saat kode berubah) |
| `npm run build` lalu `npm start` | Kompilasi ke `dist/` lalu jalankan `node dist/index.js` |
| `npm run db:migrate` | `prisma migrate dev`: membuat dan menerapkan migration baru saat model berubah (pengembangan) |
| `npm run db:deploy` | `prisma migrate deploy`: menerapkan migration yang sudah ada |
| `npm run db:generate` | `prisma generate`: memperbarui Prisma Client |
| `npm run db:seed` | Mengisi data awal bila tabel masih kosong |
| `npm run db:studio` | Prisma Studio di http://localhost:51212 |
| `npm test` | Pengujian integrasi ke PostgreSQL asli |

## Daftar endpoint

Format error mengikuti Minggu 9: JSON dengan properti `message`. Kesalahan validasi menambahkan `errors` (daftar penjelasan).

| Method | Path | Body | Sukses | Gagal |
|---|---|---|---|---|
| GET | `/products` | - | 200, array seluruh produk | - |
| GET | `/products/:id` | - | 200, satu produk | 400 id tidak valid, 404 tidak ada |
| POST | `/products` | `{ "name": string, "price": integer }` | 201, produk baru dengan id dari database | 400 validasi |
| PUT | `/products` | `{ "id": integer, "name": string, "price": integer }` | 200, produk setelah diubah | 400 validasi, 404 id tidak ada |
| DELETE | `/products/:id` | - | 200, `{ "message", "product" }` | 400 id tidak valid, 404 tidak ada |
| GET | `/hello`, `/hello?nama=Anas` | - | 200, sapaan (contoh demo Minggu 9) | - |

Aturan validasi:

- `name`: teks tidak kosong, maksimal 100 karakter (spasi di tepi dipangkas).
- `price`: bilangan bulat 0 sampai 2147483647 (rupiah bulat, tipe `INTEGER` PostgreSQL).
- `id` (path atau body PUT): bilangan bulat positif.
- Body yang bukan JSON valid menghasilkan 400; route yang tidak dikenal menghasilkan 404; kesalahan tak terduga menghasilkan 500 dengan pesan umum tanpa detail koneksi database.

Contoh (Windows PowerShell memakai `curl.exe`, bukan `curl`):

```bash
curl http://localhost:3000/products
curl -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"Spidol","price":8000}'
curl -X PUT  http://localhost:3000/products -H "Content-Type: application/json" -d '{"id":3,"name":"Spidol Hitam","price":9000}'
curl -X DELETE http://localhost:3000/products/3
```

Model data (`prisma/schema.prisma`) sama dengan format Minggu 9, yaitu `id`, `name`, `price`:

```prisma
model Product {
  id    Int    @id @default(autoincrement())
  name  String
  price Int
}
```

## Uji persistensi (restart Express)

1. `POST /products` dengan produk baru, catat `id` pada response.
2. Matikan server Express saja (Ctrl+C). Jangan menghapus container atau volume database.
3. Jalankan lagi `npm run dev`, lalu `GET /products`: produk tadi masih ada.
4. Periksa tabel `Product` lewat `npm run db:studio`.

Untuk berhenti sementara tanpa kehilangan data gunakan `docker compose stop`. Perintah `docker compose down -v` menghapus volume dan seluruh data.

## Struktur proyek

```text
bruno/                     koleksi request Bruno (16 skenario) + environment local
docs/                      laporan pengujian dan tangkapan layar
prisma/
  schema.prisma            model Product
  migrations/              riwayat migration (masuk Git)
  seed.ts                  data awal
prisma.config.ts           konfigurasi Prisma 7 (DATABASE_URL, lokasi migration, seed)
docker-compose.yml         PostgreSQL 16 dengan volume bernama
src/
  index.ts                 app.listen
  app.ts                   merangkai middleware dan router
  routes/                  memilih handler berdasarkan method dan path
  controllers/             membaca request, memanggil Prisma, mengirim response
  validators/              validasi name, price, dan id
  middleware/              request logger, error handler
  lib/prisma.ts            PrismaClient dengan adapter pg
test/products.test.ts      pengujian integrasi (termasuk restart server)
```

Pemisahan route dan controller dari Minggu 9 dipertahankan. Yang berubah hanya operasi akses data di controller, dari array menjadi Prisma.

## Pengujian

```bash
npm test
```

Pengujian menjalankan server sebagai proses terpisah ke PostgreSQL asli, termasuk skenario mematikan lalu menjalankan ulang server. Setiap produk yang dibuat pengujian dihapus kembali; tabel tidak dikosongkan. Bukti manual (Bruno dan Prisma Studio) ada di [laporan pengujian](docs/LAPORAN-PENGUJIAN.md). Koleksi Bruno dapat dibuka lewat *Open Collection* ke folder `bruno/`, lalu pilih environment `local`.

## Konvensi commit

Format `type(tugas-2): deskripsi`, satu fitur atau satu perubahan per commit. Pemasangan dependency dan setup database dipisah dari commit fitur.
