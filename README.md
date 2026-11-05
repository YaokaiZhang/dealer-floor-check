# Aurora Floor Check

Hackathon prototype for **TiK x Netlight Mini Hackathon, Case 2 (Floor Check)**.
Aurora Dealer Finance is a fictional lender and the dealers are fictional too. All external data (connected-car API, marketplace, vehicle registry) is simulated.

> Verify the floor without walking it: data first, people last. Dealers get a friendly ~5-minute check-in now and then, a local verifier drops by at random, and an auditor is the last resort.

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
| `/verifier` | Freelance verifier mobile app: accept a random spot check (a few cars, ~€40), check in on site, photograph each car or report why it isn't there |
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
| `src/components/verifier/` | Freelance verifier app (spot checks near you, on-site check-in, per-car report) |

### Risk score (0–100)

Base 20 · open alerts high +35 / medium +15 / low +5 · last 6 check-ins failed +12 / skipped +6 / clean −3 · past alerts +6 each · unconnected share of the portfolio up to +15. One unresolved high-severity alert moves a dealer to Review; only a bank officer clears alerts, confirms fraud or changes terms. Three clean check-ins in a row step a dealer up one tier.

### Three layers of checks

| Layer | Who | When | Cars |
|---|---|---|---|
| Self check-in | Dealer, on their phone | Random, 2–12×/yr by tier | 2–4 random from the pool |
| Spot check | Local freelance verifier | Random and unannounced, 1–6×/yr by tier | 3–4 random from all in-stock cars, connected ones included |
| Auditor | Professional | Rare: yearly review or after a failed spot check | Full count |

Spot checks are routine, not an escalation. A high-severity alert (or the officer, for medium and low) **brings the next random spot check forward** to today and adds the flagged car, shuffled in with the random ones. The visit looks the same to the dealer and the verifier whatever its reason; only the bank sees why. Anything the verifier can't confirm raises a new alert.

### Sampling

Small samples, repeated. If p of the N pool cars were missing, one check-in of n random cars misses all of them with q = C(N−M, n) / C(N, n). Each of the tier's k check-ins a year draws afresh, and the tier's v spot checks miss with q_visit each, so a year misses with q^k · q_visit^v. We pick the smallest n where 1 − q^k · q_visit^v reaches the tier's confidence, capped per tier (Gold 25% / 80% … Review 5% / 99%). That gives 2–4 cars per check-in. Connected cars seen inside the geofence in the last 24 h are auto-verified and leave the pool. The bank also sees the mean days until a check-in catches it.

## Demo script (~3 min)

Run **Reset demo** in `/demo` first. Keep `/bank`, `/demo`, `/dealer` and `/verifier` open in separate tabs.

1. **Bank dashboard**: 4 dealers, most connected cars verified automatically. "Most verification already happened with zero people." Point at the cost headline.
2. **Dealer phone**: in `/demo` send a check-in to Laakso Autot. In `/dealer`: friendly request → pick a window → Start check-in → cars revealed → photograph each car's VIN plate (from `/demo/plates`), the car and the odometer → "All verified ✓, €40,000 top-up available, you're Gold tier."
3. **Demo panel**: fire **Sold out of trust**. On `/bank` a high alert appears: listing sold, connected car ~180 km away, registry owner change pending. Koskinen Car Center moves to Review, a targeted check-in goes out, and **the next random spot check is brought forward to today** with that car added.
   - **Freelancer phone** (`/verifier`): a spot check appears ("Koskinen Car Center · 4 cars · €45"). It looks like any random visit; the freelancer never sees why it came today. Accept → **I'm at the lot** (location checked once against the dealer geofence) → the dealer app shows "Sanna M. from Aurora visits today" with the same visit code → for each car: **Car is here** (VIN plate, car and odometer photos) or **Car isn't here** ("Staff say it's out on a test drive") → **Send report**. On `/bank` the spot-check card fills in step by step and recommends escalating or confirming.
   - Routine visits: **Spot check** on a dealer card in `/demo` (or **Post spot check** in the bank's dealer panel) posts an ordinary random visit.
   - No second person? Use **Simulate report** on the bank card, or turn on **Auto-complete spot checks** in `/demo`.
4. **Close**: dealer detail sampling explainer. "In a high-trust market, the best control is one honest dealers barely notice."
