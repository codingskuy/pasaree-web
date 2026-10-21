# Alur E2E Maestro (web)

Prasyarat: Bun, Maestro CLI >= 2 (`maestro`), Google Chrome. Jalankan semua alur:

```bash
.maestro/jalankan.sh                      # smoke + draf-ajukan-kurasi
.maestro/jalankan.sh .maestro/smoke.yaml  # satu alur
```

Skrip menyalakan mock API (`:18931`), Vite dev (`:18932`), dan proksi sesi (`:18930`, menyuntik cookie `psr_akses` fiktif), lalu memanggil `maestro test -e WEB_URL=...`. Port dapat diubah lewat `MOCK_PORT`, `VITE_PORT`, `PROXY_PORT`.

## Alur

| Berkas | Isi | Status jalan lokal |
|---|---|---|
| `smoke.yaml` | beranda dan halaman draf termuat | lulus |
| `draf-ajukan-kurasi.yaml` | isi draf lalu Ajukan Kurasi; kategori sengaja kosong, validasi klien harus menahan dan menampilkan `galat-kategori` | gagal di asersi akhir |

Selector: `id` = `data-testid` (mis. `input-judul`, `varian-0-sku`, `ajukan-kurasi`, `galat-kategori`).

## Yang belum beres (jujur)

- `draf-ajukan-kurasi`: setelah mengetuk Ajukan Kurasi, tangkapan layar menunjukkan semua isian kosong dan `galat-kategori` tidak muncul. Penyebab belum dipastikan: bisa harness/Maestro web beta (halaman termuat ulang) atau perilaku halaman (formulir ter-reset). Perlu diselidiki sebelum alur dijadikan gerbang.
- Pengamatan terpisah: saat mengetik, mock API menerima `POST /web/produk/draf` berulang (bukan satu draf lalu PUT); kunci idempoten tetap sama sehingga backend nyata semestinya meredamnya, tetapi perlu dicek apakah `produk_id` dipakai ulang.
- Jalur sukses butuh `<select>` kategori yang bisa dioperasikan (lihat ADR-0004).
- Tidak dijalankan di CI.
