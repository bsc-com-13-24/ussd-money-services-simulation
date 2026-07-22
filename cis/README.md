# Connected Institution Simulator (CIS)

Simulated telecom mobile-money and bank transaction service for Mphamvu Hub's
Tier-4 Evidence pipeline. Full design rationale, consent-flow explanation,
and API contract: see `connected-institution-simulator.md` in the main docs.

Runs entirely in Docker for the hackathon — one database container, one API
container, no local Node/Postgres install required.

## Quick start

```bash
cp .env.example .env               # ships with working demo secrets — no editing required
docker compose up -d --build       # builds the API image, starts db + api
docker compose --profile tools run --rm cis-seed   # seeds the two demo personas
```

`.env.example`'s `CIS_CONSENT_SECRET` and `TRUSTED_CLIENTS` are fixed demo
values, not something you need to generate — Mphamvu Hub doesn't exist as a
running service yet, so there's nothing to coordinate a real secret with. The
plaintext Client-Secret Mphamvu Hub will eventually authenticate with is
`mphamvu-hub-demo-secret-2026` (the hash in `.env` is that value, pre-hashed).

**Once the Mphamvu Hub repo exists:** copy the exact `CIS_CONSENT_SECRET`
value from this `.env` into Mphamvu Hub's own `.env` — that's what turns it
from "a placeholder" into "an actual shared secret between two services."
Rotate both to something random once you're past local hackathon dev. To add
a *different* Client-Secret later instead of reusing the demo one, generate
its hash with:

```bash
docker compose run --rm cis-api node dist/utils/hash-secret.js "your-new-secret"
```
and paste the result into `TRUSTED_CLIENTS` as `mphamvu-hub:<hash>`, then
`docker compose up -d --build` to pick it up.

API is now live at `http://localhost:4000`. Postgres is reachable on the host
at `localhost:5433` if you want to inspect it with a GUI client — the API
itself talks to it over the internal Docker network, not this port.

Check it started cleanly:
```bash
curl http://localhost:4000/health
```

## Try it

You still need a Consent Token to call the endpoint — CIS enforces this even
in Docker, no shortcuts. Mint one manually for a quick check by adding a
scratch script or running node directly against the running container:

```bash
docker compose exec cis-api node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign(
  { sub: '+265991000001', scope: 'read:transactions', institutionType: 'any', consentRecordId: 'test-1' },
  process.env.CIS_CONSENT_SECRET,
  { expiresIn: '5m' }
));
"
```

```bash
curl "http://localhost:4000/v1/transactions?phone=%2B265991000001" \
  -H "Client-Id: mphamvu-hub" \
  -H "Client-Secret: mphamvu-hub-demo-secret-2026" \
  -H "Authorization: Bearer <token from above>"
```

## USSD simulators (Airtel / TNM / Bank)

CIS also exposes an `/internal/*` route group, gated by a **different**
credential (`Internal-Gateway-Key`) from the `Client-Id`/`Client-Secret`
+ Consent Token pair `/v1/transactions` uses. This is deliberate: those
credentials answer "is Mphamvu Hub, an external party, allowed to read
this with consent?" — `/internal/*` answers a different question
entirely: "is this the telecom's own system operating on its own
ledger?" A telecom doesn't need its own customer's consent to run its
own core banking — it only needs consent to hand data to someone else.

The companion `ussd-simulator` project (separate repo/folder) is what
calls these routes — feature-phone style simulators for Airtel Money,
TNM Mpamba, and a bank, where every completed flow (Send Money, Buy
Airtime, Pay Bill, Cash Out...) does a real PIN check and writes a real
`SimulatedTransaction` row here. See that project's own README for how
to run it alongside this one.

Set `INTERNAL_GATEWAY_SECRET` in `.env` (ships with a working demo value
already) and make sure it matches `VITE_INTERNAL_GATEWAY_KEY` in the
simulator's own `.env` exactly.

## Everyday commands

| Task | Command |
|---|---|
| Start everything | `docker compose up -d` |
| Rebuild after code changes | `docker compose up -d --build` |
| View API logs | `docker compose logs -f cis-api` |
| Re-run seed (idempotent) | `docker compose --profile tools run --rm cis-seed` |
| Stop everything | `docker compose down` |
| Stop and wipe the database | `docker compose down -v` |

## Demo personas

| Phone | Name | Story |
|---|---|---|
| +265991000001 | Chisomo Banda | Consistent saver — steady weekly pattern |
| +265991000002 | Thoko Mvula | Irregular income, recovers well — the "recovery" narrative |

## What NOT to do

- Do not point CIS at Mphamvu Hub's own Postgres — `cis-db` must stay a
  separate container with a separate volume.
- Do not add a bypass for missing/expired Consent Tokens, even for local testing.
- Do not commit `.env` or any real value of `CIS_CONSENT_SECRET`.
