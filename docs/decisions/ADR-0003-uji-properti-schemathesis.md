# ADR-0003 — Uji properti dengan Schemathesis

Status: Diterima | Tanggal: 2026-10-22

## Konteks

Kontrak `docs/api/openapi.yaml` (repo backend) adalah sumber kebenaran. Uji Pact mengunci interaksi yang dipakai web, tetapi tidak memeriksa seluruh permukaan API terhadap skemanya.

## Keputusan

1. Pakai Schemathesis 4.x (`>=4,<5`) terhadap backend yang berjalan, dibungkus `contract/schemathesis.sh` (`BASE_URL`, `SPEC`, `TOKEN` dapat diatur).
2. Bukan bagian `bun run test` dan bukan gerbang PR: dijalankan manual (`workflow_dispatch`) karena butuh backend + DB berjalan.
3. Cakupan bawaan `/web/*`; telemetri nihil (v4 tidak mengirim); laporan JUnit tidak dikomit.
4. Temuan dipandang sebagai ketidaksesuaian backend vs kontrak: ditindaklanjuti di repo backend, bukan dengan melonggarkan pemeriksaan di sini.

## Konsekuensi

- Selama temuan belum diperbaiki, skrip keluar dengan kode bukan nol; karena itu tidak dijadikan status check wajib.
- Operasi berparameter id butuh data awal atau `links` di spec agar teruji dalam.
- Alternatif ditolak: Dredd/Prism (tak ada pembangkitan properti), menjalankan terhadap produksi (berisiko).
