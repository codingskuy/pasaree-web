#!/usr/bin/env bash
# Menjalankan alur Maestro web: mock API + Vite dev + proksi sesi, lalu `maestro test`.
# Prasyarat: bun, Maestro CLI (>=2), Google Chrome. Pemakaian: .maestro/jalankan.sh [alur.yaml ...]
set -euo pipefail
cd "$(dirname "$0")/.."
export MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true E2E_TELEMETRY_DISABLED=1
MOCK_PORT="${MOCK_PORT:-18931}" VITE_PORT="${VITE_PORT:-18932}" PROXY_PORT="${PROXY_PORT:-18930}"
export MOCK_PORT VITE_PORT PROXY_PORT
command -v maestro >/dev/null || { echo "maestro tidak terpasang (https://maestro.dev); lihat docs/pengujian/MAESTRO.md" >&2; exit 127; }

pids=()
trap 'kill "${pids[@]}" 2>/dev/null || true' EXIT
bun .maestro/harness/mock-api.ts & pids+=($!)
PASAREE_API_URL="http://127.0.0.1:${MOCK_PORT}" bun run dev -- --port "$VITE_PORT" --host 127.0.0.1 --strictPort & pids+=($!)
bun .maestro/harness/proksi-sesi.ts & pids+=($!)
for _ in $(seq 1 60); do curl -fs "http://127.0.0.1:${PROXY_PORT}/" >/dev/null 2>&1 && break; sleep 1; done

# pemanasan: muat halaman agar Vite selesai optimasi dependensi (reload di tengah alur membuat elemen basi)
for h in / /lapak/produk/baru; do curl -fs "http://127.0.0.1:${PROXY_PORT}${h}" >/dev/null || true; done; sleep 8

alur=("$@"); [[ ${#alur[@]} -gt 0 ]] || alur=(.maestro/smoke.yaml .maestro/draf-ajukan-kurasi.yaml)
maestro test -e "WEB_URL=http://127.0.0.1:${PROXY_PORT}" "${alur[@]}"
