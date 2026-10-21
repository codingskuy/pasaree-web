# ADR-0004 — Alur E2E web dengan Maestro (mode web beta)

Status: Diterima | Tanggal: 2026-10-22

## Konteks

Perlu uji alur pengguna lapak di browser. Maestro (2.11.0) mendukung web tetapi masih berstatus **beta** ("Web support is in Beta").

## Keputusan

1. Alur ada di `.maestro/` (`smoke.yaml`, `draf-ajukan-kurasi.yaml`); selector memakai `id` dan `data-testid` (keduanya dipasang; Maestro web mencocokkan atribut `id`, `data-testid` saja tidak ditemukan).
2. Harness `.maestro/jalankan.sh`: mock API (Bun) + Vite dev + proksi yang menyuntikkan cookie sesi `psr_akses` fiktif, tanpa mengubah kode produk. Telemetri dimatikan (`MAESTRO_CLI_NO_ANALYTICS=1`, `E2E_TELEMETRY_DISABLED=1`).
3. Maestro web tidak dijadikan gerbang PR/CI sampai stabil.

## Status kestabilan (hasil jalan 2026-10-22, mesin lokal, Chrome dipakai bersama proses lain)

- `smoke`: lulus pada 3 dari 3 jalan terakhir dengan Vite dev yang sudah dipanaskan; gagal saat Vite memuat ulang di tengah alur atau Chrome berebut sumber daya ("Could not retrieve hierarchy").
- `draf-ajukan-kurasi`: isian teks lulus (dengan `retry` karena `stale element reference` saat hidrasi); **belum lulus** pada asersi akhir (lihat docs/pengujian/MAESTRO.md).
- `<select>` native tidak dapat dioperasikan (`element not interactable`; opsi tidak dapat diketuk; `pressKey` web hanya Enter/Backspace). Jalur sukses (kategori terpilih -> "Diajukan ke kurasi.") belum bisa diuji; usulan: ganti `<select>` kategori dengan kelompok radio atau listbox kustom.
- Build produksi + `vite preview` dicoba dan tidak lebih stabil di mesin ini.

## Konsekuensi

- Repo semula tidak punya `vite.config.ts` dan `src/app.html`, sehingga `vite dev`/`build` mengembalikan 404; keduanya ditambahkan (scaffold, bukan perilaku produk).
- Alternatif bila Maestro web tetap tidak stabil: Playwright untuk E2E web.
