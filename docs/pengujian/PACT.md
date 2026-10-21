# Uji kontrak konsumen (Pact)

pasaree-web adalah konsumen, `pasaree-backend-service` adalah provider. Spec sumber: `docs/api/openapi.yaml` di repo backend.

## Menjalankan

```bash
bun install
bun run test:pact   # menulis pacts/pasaree-web-pasaree-backend-service.json
```

Berkas kontrak di `pacts/` dikomit agar provider dapat memverifikasinya.

## Cakupan (v1)

`GET /web/lapak-saya`, `POST /web/produk/draf`, `PUT /web/produk/{id}`, `POST /web/produk/{id}/ajukan-kurasi` (200 dan 422), `POST /web/media/presigned`, serta 401 berskema `Error`. Ditambah per tiket fitur.

## Verifikasi provider

Dimiliki backend: issue di pasaree-backend-service meminta verifikasi `pacts/*.json` (Pact provider verifier + state handler untuk setiap `given`). Repo ini tidak mengubah kode backend.

## Broker

Publikasi ke Pact Broker belum dikonfigurasi (tanpa kredensial di repo). Bila broker tersedia: `pact-broker publish pacts --consumer-app-version $(git rev-parse --short HEAD) --branch $(git branch --show-current)` dengan token dari secret CI.

## Catatan ketidaksesuaian dokumen

- Kontrak living §3 menyebut `422` pada `PUT /web/produk/{id}` tidak ada; openapi mendefinisikan 200 (dengan `cek_otomatis`) dan 422 (`Error`). Klien mengikuti openapi.
- Bentuk `detail` pada `Error` 422 untuk `ajukan-kurasi` tidak dirinci (kolom bermasalah belum dipastikan); kontrak hanya mengunci `kode` dan `pesan`.
