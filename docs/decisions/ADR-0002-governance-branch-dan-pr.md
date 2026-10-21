# ADR-0002 — Governance branch dan PR

Status: Diterima | Tanggal: 2026-10-21

## Konteks

Repo dikerjakan manusia dan agent AI secara paralel. Tanpa alur baku, branch bercampur antar tiket dan `main` rawan berubah tanpa tinjauan.

## Keputusan

1. Kontribusi lewat fork; branch dibuat dari `upstream/main` dengan nama `feat|fix|test|docs|chore/<kode-tiket>-<slug>`; satu branch = satu tiket = satu PR.
2. Commit atomic, conventional commits berbahasa Indonesia; `CHANGELOG.md` diperbarui.
3. PR memakai `.github/pull_request_template.md` dan `Closes #N`; penutupan issue terjadi saat merge.
4. `CODEOWNERS` default `@Coding-Skuy`.
5. Dilarang merge sendiri tanpa tinjauan manusia dan dilarang force-push ke `main`.

## Usulan proteksi branch `main` (belum diterapkan; keputusan pengelola org)

- Wajib PR + minimal 1 persetujuan, termasuk dari code owner.
- Wajib status check lulus (`bun run check`, `bun run test`) sebelum merge.
- Larang force-push dan penghapusan branch `main`.
- Wajib branch up-to-date sebelum merge; riwayat linear (squash atau rebase).

## Konsekuensi

- Pengaturan proteksi di GitHub tetap perlu diterapkan manual oleh admin org.
- Menyimpang dari alur ini butuh ADR baru.
