#!/usr/bin/env sh
# Post-deploy audit. Run it on the server after `up -d`, and read the output
# rather than assuming. A deploy that has not been audited is not finished.
set -u
CF=${1:-deploy/docker-compose.yml}
fallos=0
di() { printf '  %-6s %s\n' "$1" "$2"; }

echo "== ports the internet can reach =="
publicos=$(docker compose -f "$CF" ps --format '{{.Service}} {{.Ports}}' 2>/dev/null | grep '0\.0\.0\.0' || true)
echo "${publicos:-  (none)}"
inesperados=$(printf '%s\n' "$publicos" | grep -v ':80->\|:443->' | grep '0\.0\.0\.0' || true)
if [ -n "$inesperados" ]; then di FAIL "something other than 80/443 is on 0.0.0.0"; fallos=$((fallos+1))
else di ok "only the reverse proxy is exposed"; fi

echo
echo "== resource ceilings =="
for c in $(docker compose -f "$CF" ps -q 2>/dev/null); do
  nombre=$(docker inspect -f '{{.Name}}' "$c" | tr -d /)
  mem=$(docker inspect -f '{{.HostConfig.Memory}}' "$c")
  cpu=$(docker inspect -f '{{.HostConfig.NanoCpus}}' "$c")
  if [ "$mem" = "0" ] || [ "$cpu" = "0" ]; then
    di FAIL "$nombre has no memory or cpu ceiling"; fallos=$((fallos+1))
  else
    di ok "$nombre  mem=$((mem/1024/1024))m  cpus=$(awk "BEGIN{print $cpu/1000000000}")"
  fi
done

echo
echo "== secrets =="
if docker compose -f "$CF" config 2>/dev/null | grep -Eiq '(api_key|secret|password|token)[[:space:]]*:[[:space:]]*[^$]'; then
  di FAIL "a literal credential is in the compose file"; fallos=$((fallos+1))
else
  di ok "no literal credentials (the demo needs no model key at all)"
fi

echo
echo "== rounds really are off =="
codigo=$(docker compose -f "$CF" exec -T app python -c "
import urllib.request, urllib.error, json
req = urllib.request.Request('http://127.0.0.1:8080/api/round/exchange', method='POST',
                             data=b'{}', headers={'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(req, timeout=5); print(200)
except urllib.error.HTTPError as e:
    print(e.code)
" 2>/dev/null | tr -d '\r')
if [ "$codigo" = "503" ]; then di ok "starting a round returns 503, as the demo intends"
else di FAIL "starting a round returned $codigo, not 503"; fallos=$((fallos+1)); fi

echo
echo "== host firewall =="
if command -v ufw >/dev/null 2>&1; then ufw status | sed 's/^/  /'
else di note "ufw not installed; check your provider's firewall by hand: 22, 80, 443 only"; fi

echo
if [ "$fallos" -eq 0 ]; then echo "audit clean."; else echo "$fallos problem(s). Fix before leaving this running."; fi
exit "$fallos"
