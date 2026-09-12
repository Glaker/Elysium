#!/usr/bin/env bash
# Ejecuta SQL contra la base de Elysium por la Management API.
#
# El token sale de .env (SUPABASE_ACCESS_TOKEN_GG2), que está ignorado por git:
# acá no hay ningún secreto, solo el plomería para usarlo.
#
#   ./scripts/sql.sh "select count(*) from insumos;"
#   ./scripts/sql.sh -f supabase/migrations/20260912_algo.sql
#
# Devuelve JSON. Para leerlo cómodo:  ./scripts/sql.sh "..." | python3 -m json.tool
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="$(cat "$RAIZ/supabase/.temp/project-ref")"
TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN_GG2=' "$RAIZ/.env" | cut -d= -f2-)"

if [[ -z "${TOKEN:-}" ]]; then
  echo "Falta SUPABASE_ACCESS_TOKEN_GG2 en .env" >&2
  exit 1
fi

if [[ "${1:-}" == "-f" ]]; then
  [[ -n "${2:-}" ]] || { echo "Uso: $0 -f archivo.sql" >&2; exit 1; }
  CONSULTA="$(cat "$2")"
else
  CONSULTA="${1:-}"
  [[ -n "$CONSULTA" ]] || { echo "Uso: $0 \"select …\"  |  $0 -f archivo.sql" >&2; exit 1; }
fi

# jq no está garantizado; python arma el JSON y escapa bien el SQL.
CUERPO="$(CONSULTA="$CONSULTA" python3 -c 'import json,os; print(json.dumps({"query": os.environ["CONSULTA"]}))')"

curl -sS --max-time 120 \
  -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CUERPO"
