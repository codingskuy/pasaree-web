# Uji properti (Schemathesis)

Schemathesis membangkitkan permintaan dari `docs/api/openapi.yaml` (repo `pasaree-backend-service`, sumber kebenaran kontrak) lalu memeriksa respons backend terhadap skema. Cakupan bawaan: operasi `/web/*` (yang dipakai web lapak).

## Menjalankan lokal

1. Jalankan backend (Postgres lokal, migrasi otomatis saat start):
   ```bash
   cd ../pasaree-backend-service
   createdb pasaree_st
   DATABASE_URL=postgres://localhost/pasaree_st JWT_SECRET=<minimal-32-karakter> \
   LUMBUNG_BASE_URL=http://127.0.0.1:1 LUMBUNG_SERVICE_KEY=k PORT=8101 cargo run
   ```
2. Daftarkan pengguna lalu naikkan perannya (khusus DB uji lokal) dan ambil token:
   ```bash
   curl -XPOST localhost:8101/auth/daftar -H 'content-type: application/json' \
     -d '{"email":"admin-st@uji.test","kata_sandi":"rahasia-123","nama":"Admin Uji"}'
   psql pasaree_st -c "update pengguna set peran='ADMIN' where email='admin-st@uji.test'"
   TOKEN=$(curl -s -XPOST localhost:8101/auth/login -H 'content-type: application/json' \
     -d '{"email":"admin-st@uji.test","kata_sandi":"rahasia-123"}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["access_token"])')
   ```
3. Jalankan uji:
   ```bash
   pip install 'schemathesis>=4,<5'
   BASE_URL=http://localhost:8101 TOKEN=$TOKEN ./contract/schemathesis.sh
   ```

Variabel: `BASE_URL`, `SPEC` (berkas/URL), `TOKEN`, `PATH_REGEX`, `MAX_EXAMPLES`, `SEED`, `PHASES`, `REPORT_DIR` (lihat kepala `contract/schemathesis.sh`). Laporan JUnit di `contract/laporan/` (diabaikan git). Kode keluar bukan nol bila ada temuan. Schemathesis v4 tidak mengirim telemetri; tidak ada laporan yang diunggah.

CI: workflow `Schemathesis (manual)` (`workflow_dispatch`) menjalankan skrip yang sama terhadap `base_url` yang diberikan. Rahasia opsional: `SCHEMATHESIS_TOKEN`, `BACKEND_REPO_TOKEN` (bila repo backend privat). Workflow ini belum pernah dijalankan di GitHub.

## Hasil jalan lokal (nyata)

Dijalankan 2026-10-22 terhadap backend cabang `feat/psr-be-006-komisi-escrow-payout-rekonsiliasi` (spec dari cabang yang sama), Schemathesis 4.32.2, seed 20261022, 25 contoh/operasi, fase examples+coverage+fuzzing, token peran ADMIN: 25 dari 45 operasi (`/web/*`) diuji, **29 temuan unik**, 1666 kasus. Backend tidak crash (tanpa 5xx). Pengelompokan:

| Kode | Jumlah | Pokok temuan | Kemungkinan akar |
|---|---|---|---|
| ST103 status tak terdokumentasi | 14 | `400 VALIDASI_GAGAL` ("Expected request with Content-Type: application/json", "Failed to parse the request body as JSON") pada semua operasi bertubuh; `404 LAPAK_TIDAK_DITEMUKAN` pada `GET /web/produk` dan `GET /web/pesanan-masuk` | spec belum mencantumkan 400/404 |
| ST105 Content-Type tak terdokumentasi | 3 | `400 text/plain` ("Failed to deserialize query string ...") pada `GET /web/produk`, `/web/kurasi/antrean`, `/web/admin/tiket-rekonsiliasi` (parameter ganda/tak valid) | backend: penolak query bawaan Axum tidak memakai envelope `Error` JSON |
| ST202 permintaan valid ditolak | 11 | spec lebih longgar dari aturan bisnis: `cursor` kosong, `status` kosong, `alasan`, `kode_serah` 4-64, `nama_berkas` 1-120, `titik_serah_lumbung_id`, tarif berlaku_mulai minimal 14 hari, `PUT /web/produk/{id}` dengan `detail.kesalahan` kosong | spec kurang batasan (minLength/pattern/enum/required bersyarat) |
| ST201 permintaan melanggar skema diterima | 1 | `POST /web/admin/rekonsiliasi` menerima `tanggal` bertipe salah dan menjawab 200 (`GAGAL_LUMBUNG`) | backend: tubuh tak divalidasi ketat |

Peringatan: 9 operasi berparameter id mengembalikan 404 karena data awal tidak ada (Schemathesis tidak membuat lapak/produk), sehingga logika inti operasi itu belum teruji; perlu data benih/`links` pada spec atau fase stateful.

## Tindak lanjut (di luar repo ini)

Repo ini tidak mengubah backend. Usulan untuk `pasaree-backend-service`: (1) dokumentasikan 400/404 dan batasan skema pada openapi; (2) bungkus penolak query/JSON Axum ke envelope `Error`; (3) validasi tipe `tanggal` rekonsiliasi; (4) benih data uji untuk fase stateful. Temuan ini belum menjadi issue (hanya manajer yang membuat issue).
