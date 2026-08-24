# The public demo

A deployment of Barnraise that a stranger can be handed a link to, that cannot be
exhausted, and that puts itself back every quarter of an hour.

## What is live and what is not

**Live, and real.** The map with its OSRM driving routes. The ledger, with nine
rows on it. The funding call, scanned against the neighborhood's combined
capabilities in plain Python. The deterministic guards. And the thing worth
showing: **entry #9 is genuinely waiting for a second signature.** A visitor lands
on Rosa Diaz's console, signs it, and watches the funding call's collaboration
requirement go from eight to nine. Signing calls no model and costs nothing.

**Off.** Starting a round. It is the only path that calls a model, and the app
holds one round at a time, so a single visitor could both exhaust the quota and
block everyone else. `BARNRAISE_DEMO=1` makes both round endpoints return 503 with
an explanation, the buttons say why, and a notice in the panel points at the
repository for anyone who wants to watch the agents negotiate.

The six A2A servers are not started either. With no round to run they would be six
idle processes holding memory and widening the surface for nothing.

## Deploying it

You need a host with Docker and Docker Compose, ports 80 and 443 reachable, and a
hostname. Caddy issues the certificate itself, so the name has to resolve to the
box — if you do not own a domain, `sslip.io` maps any name containing an IP to
that IP and Let's Encrypt issues for it.

```sh
git clone https://github.com/kasbsquall/barnraise && cd barnraise
cp deploy/.env.example deploy/.env
# set DOMAIN in deploy/.env
docker compose -f deploy/docker-compose.yml up -d --build
sh deploy/audit.sh
```

The first request after the certificate is issued can take a few seconds. The
`reset` service seeds the ledger on startup, so there is nothing else to run.

## What the compose file guarantees

| | |
|---|---|
| **Nothing but the proxy is exposed** | `app` and `reset` publish no ports at all. Caddy reaches the app by service name on an internal bridge network. Adding a `"8080:8080"` to `app` would undo this. |
| **Every container has a ceiling** | 640m/0.75 cpu for the app, 192m/0.25 for the reset loop, 192m/0.5 for Caddy. Without limits one container can take the host. |
| **No credentials anywhere** | The demo runs no model, so there is no key to leak. There is no database server, so there are no database credentials to get wrong. |
| **Least privilege** | Non-root user, read-only root filesystem, all capabilities dropped, `no-new-privileges`. The ledger is the only writable path and it is a volume. |
| **Security headers** | HSTS, nosniff, DENY framing, a strict referrer policy, and camera/microphone/geolocation switched off. |

The host firewall is yours to set and the audit script cannot do it for you. Open
22, 80 and 443. Close everything else.

## Verifying it rather than assuming it

`deploy/audit.sh` checks what the compose file promises: that nothing but 80 and
443 is on `0.0.0.0`, that every container has a memory and CPU ceiling, that no
literal credential is in the configuration, and that starting a round really does
return 503. It exits non-zero if any of that is false.

Run it after every deploy, and again after any change to the compose file.

## Known limits, stated rather than discovered

- **The reset is not atomic.** `seed/demo_state.py` deletes the SQLite file and
  rebuilds it, which takes well under a second. A request landing inside that
  window errors and a reload fixes it. With a 900-second cycle it is a rounding
  error, but it is a real edge and worth knowing before someone reports it.
- **There is no rate limiting.** Caddy's `rate_limit` is a plugin, not part of the
  standard image, and naming it in the Caddyfile stops the container from
  starting. With rounds off there is no expensive path left, and what remains is
  bandwidth on static assets. If this ever serves something expensive again, build
  Caddy with `caddy-ratelimit` rather than adding the directive and hoping.
- **Signatures are not authenticated,** here or anywhere else in this prototype.
  The signing organization is a field in the request. On a public demo that means
  any visitor can sign as any director, which is exactly what a demo wants and
  exactly what a deployment would not. The README says so, the architecture
  diagram says so, and this says so.
- **This compose has been validated but not run end to end.** `docker compose
  config` confirms the interpolation, the service graph, that only Caddy publishes
  ports, and the ceilings on all three containers. The image build and a live
  request were not exercised, because the machine it was written on had no Docker
  daemon running. Run `deploy/audit.sh` on the server and read its output.
