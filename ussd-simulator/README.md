# Mphamvu USSD Simulator

Feature-phone style simulators for Airtel Money, TNM Mpamba, and a bank
USSD menu — built with React + TypeScript + Vite + Tailwind.

**Everything a completed flow does is real.** Dial in, send money, buy
airtime, pay a bill — each one checks a real PIN against CIS, checks a
real balance, and on success writes a real `SimulatedTransaction` row
into CIS's database. Get the PIN wrong or try to send more than the
balance allows, and the flow genuinely declines — nothing here is
scripted to always succeed.

This is a companion project to **Connected Institution Simulator (CIS)**
— CIS must be running first, since every completed USSD flow calls it
directly from the browser.

## Run it

```bash
# 1. Make sure CIS is running (in the cis/ project):
#      docker compose up -d --build
#      docker compose --profile tools run --rm cis-seed

# 2. Then, in this project:
cp .env.example .env      # ships with a working demo key — matches CIS's default
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

## How it works

- **Insert a SIM** by typing a phone number or picking one of the two
  seeded demo personas (Chisomo, Thoko — same two from CIS's seed data).
  This calls `POST /internal/members/lookup-or-create` on CIS, which
  auto-provisions a wallet the same way a real telecom would the first
  time a SIM dials in.
- **Dial the institution's code** (`*211#` Airtel, `*444#` Mpamba, or the
  bank's code) and navigate the menu exactly like a real handset.
- **Any flow ending in a PIN** (Send Money, Buy Airtime, Pay Bill, Cash
  Out, etc.) calls CIS for real: verifies the PIN, then attempts the
  transaction. A wrong PIN or insufficient balance produces a real
  decline screen, not a scripted success.
- **Demo PIN is `1234`** for every simulated member — this is printed
  here deliberately since it's fine for a local hackathon demo and would
  never be acceptable anywhere else.

## Project structure

```
src/
  lib/types.ts          shared node types, including the new "action"
                         node — the piece that makes a flow do a real,
                         awaited CIS call instead of showing fake text
  lib/api.ts             thin client for CIS's /internal/* endpoints
  lib/mkChain.ts          mkTxnChain: the shared builder every "collect
                          inputs → check PIN → write transaction" flow
                          is built from, across all three institutions
  institutions/airtel.ts  Airtel Money menu tree + branding
  institutions/mpamba.ts  TNM Mpamba menu tree + branding (matches the
                          real *444# "Select SIM" → "Mpamba - Main Menu"
                          flow exactly)
  institutions/bank.ts    Bank menu tree + branding — dial code is a
                          PLACEHOLDER, not a verified real short code
  UssdPhone.tsx            the phone chrome + session state machine,
                          parametrized by institution config
  App.tsx                  institution picker (tap to switch between
                          Airtel / Mpamba / Bank, each with its own
                          independent SIM/session)
```

## What's real vs. illustrative

Every category that exists in CIS's schema (`buy_airtime`, `send_money`,
`cash_out`, `pay_bill`, `merchant_payment`, `savings_transfer`,
`atm_withdrawal`) is wired to a real backend call.

A few menu items in the **Airtel** config (Loans, Wallet Savings, Bank
Linking, International Transfer, PIN Change, Registration) are kept for
menu realism but are **not** wired to CIS — they don't correspond to any
Evidence category Mphamvu Hub actually reads, so wiring them would mean
inventing schema that doesn't reflect anything real. Every one of these
screens is labeled "(Illustrative only)" so it's never mistaken for a
real write.

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_CIS_BASE_URL` | Where CIS's API is reachable from the browser |
| `VITE_INTERNAL_GATEWAY_KEY` | Must match CIS's `INTERNAL_GATEWAY_SECRET` exactly |

Both ship with working demo values in `.env.example` — no manual
coordination needed as long as CIS's own `.env` still has its default
`INTERNAL_GATEWAY_SECRET`.
