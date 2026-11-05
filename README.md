# Aurora Floor Check

Hackathon prototype for **TiK x Netlight Mini Hackathon, Case 2 (Floor Check)**.
Aurora Dealer Finance is a fictional lender and the dealers are fictional too. All external data (connected-car API, marketplace, vehicle registry) is simulated.

> Verify the floor without walking it: data first, people last. Dealers get a friendly ~5-minute check-in now and then, and a physical visit is the last resort.

## Status: frontend with fake data

- State is seeded from `data/seed.json` and lives **in the browser** (localStorage). Tabs on the same machine sync live, so `/demo` → `/bank` updates instantly.
- Photos come from the **in-app camera only** (no gallery uploads): VIN plate, whole car with licence plate, odometer.
- Photo checks run **on the server** in `/api/check-photo` (`src/server/photoChecks.ts`): VIN, plate and odometer reads, location, server-side time, photo reuse (dHash). The VIN, plate and odometer reads are **simulated** (`readShots`); the rest is real. The reuse index is in server memory.
- Because there is no database yet, the browser sends the check-in context (geofence, window, expected plate, last odometer) with the photos. In production the server loads it itself.
- Next step: move state to the server (so a real phone and the laptop share it) and swap `readShots` for a Claude vision call.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Routes:

| Route | What |
|---|---|
| `/dealer` | Dealer mobile app: check-in inbox, capture flow, tier page, "What we check" |
| `/verifier` | Freelance verifier mobile app: accept a €30 one-car job, check in on site, photograph the VIN plate or report why the car isn't there |
| `/bank` | Bank dashboard: portfolio, live alerts, dealer detail, sampling |
| `/demo` | Demo control panel: fire simulated events, reset demo |
| `/demo/plates` | Rendered VIN plates to photograph on stage |

### Phone on the same network

```bash
npm run dev -- -H 0.0.0.0
```

Then open `http://<your-laptop-ip>:3000/dealer` on the phone (`ipconfig getifaddr en0` on macOS). The camera and Geolocation both need HTTPS or localhost. On a plain LAN IP keep **Simulate on-site location** and **Demo camera fallback** switched on in `/demo` (the bank sees those photos labelled "simulated"). For the real camera and GPS use an HTTPS tunnel, e.g. `npx localtunnel --port 3000`.

> In this frontend phase state is per browser, so phone and laptop don't share it yet. For the stage demo until the API lands, drive the dealer flow in a phone-sized browser window on the laptop.

## Where things are

| File | Purpose |
|---|---|
| `data/seed.json` | 4 dealers, 132 financed cars, mock feed states (regenerate with `node scripts/generate-seed.mjs`) |
| `src/lib/store.ts` | All state + actions (check-ins, feed events, escalation ladder, bank decisions) |
| `src/lib/sampling.ts` | `sampleSize()` hypergeometric sampling over a year of check-ins |
| `src/lib/risk.ts` | Risk score formula (documented), auto-verification, sampling pool |
| `src/config/tiers.ts` | Tier rules: check-in rate, sampling target, cars per check-in cap, perks |
| `src/config/assumptions.ts` | **All business-case assumptions** behind the cost headline |
| `src/lib/costModel.ts` | Cost / risk model and headline |
| `src/components/capture/ShotSequence.tsx` | In-app camera, three shots per car |
| `src/lib/verify.ts` | Client side: position, last odometer, send shots to the server |
| `src/server/photoChecks.ts` | Server-side silent checks (VIN, plate, odometer, location, freshness, reuse) |
| `src/components/verifier/` | Freelance verifier app (job board, on-site check-in, report) |

### Risk score (0–100)

Base 20 · open alerts high +35 / medium +15 / low +5 · last 6 check-ins failed +12 / skipped +6 / clean −3 · past alerts +6 each · unconnected share of the portfolio up to +15. One unresolved high-severity alert moves a dealer to Review; only a bank officer clears alerts, confirms fraud or changes terms. Three clean check-ins in a row step a dealer up one tier.

### Sampling

Small samples, repeated. If p of the N pool cars were missing, one check-in of n random cars misses all of them with q = C(N−M, n) / C(N, n). Each of the tier's k check-ins a year draws afresh, so a year of them catches it with 1 − q^k. We pick the smallest n where that reaches the tier's confidence, capped per tier (Gold 25% / 80% / 2×yr / max 4 … Review 5% / 99% / 12×yr / max 10). That gives 3–7 cars per check-in. Connected cars seen inside the geofence in the last 24 h are auto-verified and leave the pool. The bank also sees the mean days until a check-in catches it.

## Demo script (~3 min)

Run **Reset demo** in `/demo` first. Keep `/bank`, `/demo`, `/dealer` and `/verifier` open in separate tabs.

1. **Bank dashboard**: 4 dealers, most connected cars verified automatically. "Most verification already happened with zero people." Point at the cost headline.
2. **Dealer phone**: in `/demo` send a check-in to Laakso Autot. In `/dealer`: friendly request → pick a window → Start check-in → cars revealed → photograph each car's VIN plate (from `/demo/plates`), the car and the odometer → "All verified ✓, €40,000 top-up available, you're Gold tier."
3. **Demo panel**: fire **Sold out of trust**. On `/bank` a high alert appears: listing sold, connected car ~180 km away, registry owner change pending. Koskinen Car Center moves to Review and a targeted check-in goes out. Click **Dispatch verifier (€30)**: a job is posted to local freelancers.
   - **Freelancer phone** (`/verifier`): the job appears ("Confirm one car is on the lot", €30). The freelancer never sees why the car was picked, so visits stay neutral. Accept → **I'm at the lot** (location checked once against the dealer geofence) → the dealer app shows "Sanna M. is visiting on behalf of Aurora" with the same visit code → **Car isn't here** → "Staff say it's out on a test drive" → **Send report**. On `/bank` the verifier card fills in step by step (posted → accepted → on site → report) and recommends escalating or confirming.
   - Alternative: **Car is here** → photograph the VIN plate, car and odometer (same server checks as the dealer flow) → the bank sees the photos, VIN and plate match, arrival distance and odometer.
   - No second person? Use **Simulate report** on the bank card, or turn on **Auto-complete verifier jobs** in `/demo`.
4. **Close**: dealer detail sampling explainer. "In a high-trust market, the best control is one honest dealers barely notice."
