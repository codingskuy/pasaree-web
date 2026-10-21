#!/usr/bin/env bash
# Uji properti (Schemathesis) terhadap docs/api/openapi.yaml milik pasaree-backend-service.
# Pemakaian:
#   BASE_URL=http://localhost:8101 TOKEN=<jwt> ./contract/schemathesis.sh
# Variabel (semua opsional):
#   BASE_URL       alamat backend yang diuji              (bawaan http://localhost:8101)
#   SPEC           berkas/URL openapi.yaml                 (bawaan ../pasaree-backend-service/docs/api/openapi.yaml)
#   TOKEN          JWT akses (aud=pasaree) untuk /web/*    (tanpa token: hanya cek 401 dan rute publik)
#   PATH_REGEX     cakupan operasi (regex path)            (bawaan ^/web/)
#   MAX_EXAMPLES   jumlah contoh per operasi               (bawaan 25)
#   SEED           biji acak untuk mengulang temuan        (bawaan 20261022)
#   PHASES         examples,coverage,fuzzing               (bawaan examples,coverage,fuzzing)
#   REPORT_DIR     folder laporan JUnit                    (bawaan contract/laporan)
# Kode keluar bukan nol bila ada temuan; temuan = ketidaksesuaian backend vs kontrak, bukan galat skrip.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:8101}"
SPEC="${SPEC:-../pasaree-backend-service/docs/api/openapi.yaml}"
PATH_REGEX="${PATH_REGEX:-^/web/}"
MAX_EXAMPLES="${MAX_EXAMPLES:-25}"
SEED="${SEED:-20261022}"
PHASES="${PHASES:-examples,coverage,fuzzing}"
REPORT_DIR="${REPORT_DIR:-contract/laporan}"

if command -v schemathesis >/dev/null 2>&1; then
  ST=(schemathesis)
elif command -v uvx >/dev/null 2>&1; then
  ST=(uvx schemathesis@4)
else
  echo "schemathesis belum terpasang. Pasang: pip install 'schemathesis>=4,<5' (atau pipx/uv)." >&2
  exit 127
fi

if [[ "$SPEC" != http* && ! -f "$SPEC" ]]; then
  echo "SPEC tidak ditemukan: $SPEC (atur SPEC=berkas atau URL openapi.yaml)" >&2
  exit 2
fi

args=(run "$SPEC" --url "$BASE_URL"
  --include-path-regex "$PATH_REGEX"
  --phases "$PHASES"
  --max-examples "$MAX_EXAMPLES"
  --seed "$SEED"
  --checks all
  --continue-on-failure
  --no-color
  --report junit --report-dir "$REPORT_DIR")
if [[ -n "${TOKEN:-}" ]]; then
  args+=(-H "Authorization: Bearer ${TOKEN}")
fi

echo ">> ${ST[*]} ${args[*]//Bearer ${TOKEN:-}/Bearer ***}"
exec "${ST[@]}" "${args[@]}"
