#!/usr/bin/env bash
#
# Optional helper: run an Authplane authorization server locally in Docker and
# configure it for this example.
#
# Nothing in the example depends on this script — if you already have an
# Authplane deployment, set AUTHPLANE_ISSUER and SERVER_URL in .env and ignore
# it. It exists so `npm run dev` has something to talk to on a fresh checkout.
#
#   ./dev-authserver.sh          start the server and configure it
#   ./dev-authserver.sh stop     stop and remove the container
#
# Overridable:
#   PORT=9000 ADMIN_PORT=9001 SERVER_URL=http://localhost:3000/mcp ./dev-authserver.sh
#
# The secrets below are fixed demo values so runs are reproducible. They are
# not suitable for anything but local development.

set -euo pipefail

CONTAINER="${CONTAINER:-authplane-demo}"
IMAGE="${IMAGE:-authplane/authserver:latest}"
PORT="${PORT:-9000}"
ADMIN_PORT="${ADMIN_PORT:-9001}"
SERVER_URL="${SERVER_URL:-http://localhost:3000/mcp}"
DEMO_EMAIL="${DEMO_EMAIL:-demo@example.com}"
DEMO_PASSWORD="${DEMO_PASSWORD:-demo-password}"
RESOURCE_SLUG="${RESOURCE_SLUG:-coffee-mcp}"
SCOPE="tools/search-coffee-paris"

ISSUER="http://localhost:${PORT}"
ADMIN="http://localhost:${ADMIN_PORT}"
ADMIN_KEY="demo0000000000000000000000000000000000000000000000000000000000ab"
ENCRYPTION_KEY="bed8eb204ebfe0bc38750d871e048051129f69c3ea85389c423a54e5b01b0e7f"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

die() { echo "error: $*" >&2; exit 1; }
port_in_use() { (echo >"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

command -v docker >/dev/null 2>&1 || die "docker is required but not installed."

if [[ "${1:-}" == "stop" ]]; then
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 && echo "Removed ${CONTAINER}." \
    || echo "No container named ${CONTAINER}."
  exit 0
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  sed -n '3,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 0
fi

# ── start ────────────────────────────────────────────────────────────────────

if [ -n "$(docker ps -q -f "name=^${CONTAINER}$")" ]; then
  echo "==> ${CONTAINER} is already running; reusing it."
else
  docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
  for p in "${PORT}" "${ADMIN_PORT}"; do
    if port_in_use "${p}"; then
      die "port ${p} is already in use. Re-run with PORT=... ADMIN_PORT=... to pick others."
    fi
  done

  echo "==> Starting ${IMAGE} on ${ISSUER} (admin ${ADMIN})"
  docker run -d --name "${CONTAINER}" \
    -p "${PORT}:9000" -p "${ADMIN_PORT}:9001" \
    -e "AUTHPLANE_SERVER_ISSUER=${ISSUER}" \
    -e "AUTHPLANE_SERVER_ALLOWED_ORIGINS=*" \
    -e "AUTHPLANE_ADMIN_ENABLED=true" \
    -e "AUTHPLANE_ADMIN_API_KEY=${ADMIN_KEY}" \
    -e "AUTHPLANE_ENCRYPTION_KEY=${ENCRYPTION_KEY}" \
    -e "AUTHPLANE_DCR_MODE=open" \
    "${IMAGE}" >/dev/null
fi

printf '==> Waiting for the authorization server'
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "${ISSUER}/.well-known/oauth-authorization-server"; then
    echo " ready."
    break
  fi
  printf '.'
  sleep 1
done
curl -sf -o /dev/null "${ISSUER}/.well-known/oauth-authorization-server" \
  || die "server did not become ready. Try: docker logs ${CONTAINER}"

# ── configure ────────────────────────────────────────────────────────────────
# 201 on first run, 409 when it already exists — both are success here.

provision() {
  local what="$1" path="$2" body="$3" code
  code=$(curl -s -o /tmp/authplane-demo-provision.json -w '%{http_code}' \
    -X POST "${ADMIN}${path}" \
    -H "Authorization: Bearer ${ADMIN_KEY}" \
    -H "Content-Type: application/json" \
    -d "${body}")
  case "${code}" in
    201) echo "    created ${what}" ;;
    409) echo "    ${what} already exists" ;;
    *)   cat /tmp/authplane-demo-provision.json >&2; die "creating ${what} returned HTTP ${code}" ;;
  esac
}

echo "==> Configuring"
provision "resource ${SERVER_URL}" /admin/resources \
  "{\"slug\":\"${RESOURCE_SLUG}\",\"uri\":\"${SERVER_URL}\",\"backend_kind\":\"mint\",\"display_name\":\"Coffee MCP example\",\"scopes\":[{\"name\":\"${SCOPE}\",\"description\":\"Search coffee shops\"}]}"
provision "user ${DEMO_EMAIL}" /admin/users \
  "{\"email\":\"${DEMO_EMAIL}\",\"name\":\"Demo User\",\"password\":\"${DEMO_PASSWORD}\",\"role\":\"user\"}"

# ── .env ─────────────────────────────────────────────────────────────────────
# Never overwrite: an existing file may point at a real deployment.

if [ -f "${ENV_FILE}" ]; then
  echo "==> .env already exists, leaving it untouched"
  if ! grep -q "^AUTHPLANE_ISSUER=${ISSUER}$" "${ENV_FILE}" 2>/dev/null; then
    echo "    note: its AUTHPLANE_ISSUER does not point at ${ISSUER}"
  fi
else
  cat > "${ENV_FILE}" <<EOF
AUTHPLANE_ISSUER=${ISSUER}
SERVER_URL=${SERVER_URL}
NODE_ENV=development
EOF
  echo "==> Wrote .env"
fi

cat <<EOF

Ready.

  Authorization server  ${ISSUER}
  Resource             ${SERVER_URL}
  Sign in with         ${DEMO_EMAIL} / ${DEMO_PASSWORD}

Next:

  npm install && npm run dev

Stop the server with:

  ./dev-authserver.sh stop
EOF
