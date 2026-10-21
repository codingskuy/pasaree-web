# Berkontribusi ke pasaree-web

Baca dulu `AGENTS.md` dan semua ADR di `docs/decisions/` sebelum menulis kode.

## Alur: fork → branch → atomic commit → PR

1. Fork `Coding-Skuy/pasaree-web` ke akun sendiri, lalu clone fork dan tambahkan remote `upstream`:
   ```bash
   git remote add upstream https://github.com/Coding-Skuy/pasaree-web
   ```
2. Buat branch dari `upstream/main`, satu branch = satu tiket = satu PR:
   `feat/<kode-tiket>-<slug>`, `fix/…`, `test/…`, `docs/…`, `chore/…`
   (kode tiket huruf kecil, contoh `feat/psr-web-002-draf-produk`).
3. Commit atomic (satu perubahan logis per commit), conventional commits berbahasa Indonesia:
   `feat: tambah formulir draf produk`. Perbarui `CHANGELOG.md` pada perubahan yang terlihat pengguna.
4. Jalankan lokal sebelum PR: `bun install && bun run check && bun run test`.
5. Push ke fork, buka PR ke `Coding-Skuy/pasaree-web` base `main`. Isi template PR dan cantumkan `Closes #N`.
6. Tinjauan manusia wajib. Jangan merge PR sendiri, jangan force-push ke `main`.

## Aturan

- Stack terkunci (lihat `AGENTS.md`): Bun + Svelte 5 + SvelteKit 2 + TS; dilarang Next.js/React.
- Kode baru disertai uji. Tipe/klien API diturunkan dari `docs/api/openapi.yaml` backend, tidak ditebak.
- Dokumen `versions/v*` dan ADR lama immutable. Keputusan baru = ADR baru bernomor berikutnya.
- Jangan commit rahasia (`.env`, kunci, token). Token tidak boleh sampai ke browser atau `localStorage`.
