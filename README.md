# Curb Floor Check

Hackathon prototype for **TiK x Netlight Mini Hackathon, Case 2 (Floor Check)**.
Curb Finance is a fictional lender and the dealers are fictional too. All external data (marketplace, vehicle register, email, IP lookup) is simulated. The full idea is in [MERGED-IDEA.md](MERGED-IDEA.md).

> Verify the floor without walking it: data first, people last. Marketplace and register data watch for sales, the bank sets a two-hour window for a short phone self-check now and then, a local verifier drops by at random, and a full count is the last resort. AI models read the photos and rank the risk; a person makes every decision.

## Status: working prototype, simulated feeds

- **One shared state on the server** (`src/server/db.ts`). Every browser mirrors it live over Server-Sent Events (`/api/stream`) and sends actions to `/api/actions`, so a real phone running `/dealer` or `/verifier` and the laptop running `/bank` and `/demo` see the same thing. State is saved to `.data/state.json` and survives restarts. **Reset demo** wipes it.
- **All rules run on the server** (`src/lib/engine.ts`): sampling, tiers, the escalation ladder, spot checks. Browsers can only send the actions in `CLIENT_OPS`. Each action is validated and either applies in full or not at all.
- **Photo checks use only the server's own records.** The phone sends just the three photos, its GPS fixes and which check-in or spot check they belong to. The server looks up the expected VIN, plate, geofence, window, last odometer and all earlier photo hashes, runs the checks and records the result. Photos are stored in `.data/photos/` and served from `/api/photos/[id]`.
- **VIN, plate and odometer reads:** Claude vision (`src/server/vision.ts`) when `ANTHROPIC_API_KEY` is set and the shots come from a real camera. The model reads blind and is never told the expected values. Otherwise, or if the call fails, a simulated read with the same shape is used. The bank sees which one was used.
- **Schedule:** in production the risk engine sends random check-ins and spot checks. Here the **Run the schedule** toggle in `/demo` does it at each tier's yearly rate on a compressed clock (1 year ≈ 10 min). **Auto-complete spot checks** files simulated verifier reports.
- **Data:** `data/seed.json` holds 150 dealers and ~3,500 cars (the case fact sheet), loaded into memory as JSON. The first four dealers carry the demo story.
- **Check-in windows:** the bank sets a two-hour window (in the demo it opens now, so it can run on stage). The dealer can ask for another time once; the bank sets a new window on a working day within two weeks. A window that passes without a start counts as skipped. **Open window now** in `/demo` moves a rescheduled window to now.
- **One-time code:** shown when the dealer taps Start, written on paper and photographed next to the VIN plate. The photo model reads it.
- **AI models:** the photo model (VIN, plate, odometer, code, make and colour, fake-photo flag; unsure reads become "needs a look"), the data model (matches listings to VINs, simulated) and the risk model (`src/lib/risk.ts`: a transparent weighted score that ranks dealers and gives each car a risk weight for the draw).
- **Mock mailbox:** every check-in request appears as an email with a link and QR code on `/bank`.
- Simulated: marketplace and register feeds (fired from `/demo`), email, IP lookup. There is no login: switch roles from the top bar.

### Environment

| Variable | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | unset | Turns on Claude vision reads |
| `CURB_VISION_MODEL` | `claude-haiku-5-5` | Vision model |
| `CURB_DATA_DIR` | `./.data` | Where state and photos are saved |

Runs as one Node process (`npm run dev` or `npm run build && npm start`). The state lives in that process, so serverless hosting with several instances would need a real database behind `src/server/db.ts`.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Routes:

| Route | What |
|---|---|
| `/dealer` | Dealer mobile app: check-in window, "ask for another time", capture flow with the one-time code, payoffs, tier page, "What we check" |
| `/verifier` | Freelance verifier mobile app: accept a random spot check (a few cars, ~€40), check in on site, photograph each car or report why it isn't there |
| `/bank` | Bank dashboard: collateral confirmed, risk-ranked dealers, alerts, lot map, mailbox, business case (CSV) |
| `/demo` | Demo control panel: fire simulated events, reset demo |
| `/demo/plates` | Rendered VIN plates to photograph on stage |

### Phone on the same network

```bash
npm run dev -- -H 0.0.0.0
```

Then open `http://<your-laptop-ip>:3000/dealer` on the phone (`ipconfig getifaddr en0` on macOS). The camera and Geolocation both need HTTPS or localhost. On a plain LAN IP keep **Simulate on-site location** and **Demo camera fallback** switched on in `/demo` (the bank sees those photos labelled "simulated"). For the real camera and GPS use an HTTPS tunnel, e.g. `npx localtunnel --port 3000`.

State is shared through the server, so the phone and the laptop update each other live.

## Where things are

| File | Purpose |
|---|---|
| `data/seed.json` | 150 dealers, ~3,500 financed cars, mock feed states (regenerate with `node scripts/generate-seed.mjs`) |
| `src/lib/engine.ts` | All rules and actions (check-ins, spot checks, feed events, escalation ladder, bank decisions, schedule) |
| `src/server/db.ts` | Server state: apply actions, persist, notify the live stream |
| `src/app/api/*` | `state`, `actions`, `stream` (SSE), `check-photo`, `photos/[id]` |
| `src/lib/store.ts` | Browser mirror of the server state (`useDemo`, `actions`) |
| `src/lib/sampling.ts` | `sampleSize()` hypergeometric sampling over a year of check-ins |
| `src/lib/risk.ts` | Risk model: dealer score with reasons, car risk weights, weighted draw, collateral confirmed |
| `src/lib/businessCase.ts` | Today vs Floor Check for the portfolio, and the CSV export |
| `src/config/tiers.ts` | Tier rules: check-in rate, sampling target, cars per check-in cap, perks |
| `src/config/assumptions.ts` | **All business-case assumptions** behind the cost headline |
| `src/lib/costModel.ts` | Cost / risk model and headline |
| `src/components/capture/ShotSequence.tsx` | In-app camera, three shots per car |
| `src/lib/verify.ts` | Client side: position, send shots to the server |
| `src/server/photoChecks.ts` | Server-side silent checks (VIN, plate, odometer, location, freshness, reuse) |
| `src/server/vision.ts` | AI photo model: Claude vision read of the three shots (VIN, plate, odometer, code, make, colour, fake flag) |
| `src/components/verifier/` | Freelance verifier app (spot checks near you, on-site check-in, per-car report) |

### Risk model (0–100)

A transparent weighted score in the demo; a trained model would keep the same inputs and the "top reasons" view after a pilot. Base 15 · open alerts high +35 / medium +15 / low +5 · last 6 check-ins failed +12 / skipped +8 / clean −3 · reschedules +4 · late payoffs and past alerts +6 each · photos that needed a look +3 (up to +9) · stock over 90 days up to +15. An open high alert always puts the dealer at 60 or more ("act now"). Each car also gets a risk weight (old stock, high loan, not checked for long, listed for sale, flagged) that makes it more likely, never certain, to be drawn.

One unresolved high-severity alert moves a dealer to Review (more checks while the bank looks, not a penalty). Only a bank officer clears alerts, confirms fraud, pauses credit or changes terms. Three clean check-ins in a row step a dealer up one tier.

### Four layers of checks

| Layer | Who | When | Cars |
|---|---|---|---|
| Data | Nobody | Always: marketplace and register | All financed cars, watched for sales |
| Self-check | Dealer, on their phone | Bank-set window, 2–12×/yr by tier | 2–4 drawn by risk weight |
| Spot check | Local freelance verifier (€30 a car) | Random and unannounced, 1–6×/yr by tier | 3–4 drawn by risk weight, plus a random re-check of a car that recently passed a self-check |
| Full count | Inspector (€170 a car) | Only after a confirmed problem | Every car |

**A sale is not suspicious.** It starts a two-business-day payoff clock and a "Payoff due" card in the dealer app. A missed payoff raises an alert: medium when one source shows the sale, high when the marketplace and the register agree. A high alert **brings the next random spot check forward** to today with the car added, moves the dealer to Review and asks the officer to **pause credit** (one click; the system never pauses on its own). A car a self-check can't confirm gets a targeted self-check for that one car; an unclear photo gets "needs a look".

### Sampling

Small samples, repeated. If p of the N in-stock cars were missing, one check-in of n cars misses all of them with q = C(N−M, n) / C(N, n). Each of the tier's k check-ins a year draws afresh, and the tier's v spot checks miss with q_visit each, so a year misses with q^k · q_visit^v. We pick the smallest n where 1 − q^k · q_visit^v reaches the tier's confidence, capped per tier (Gold 25% / 80% … Review 5% / 99%). That gives 2–4 cars per check-in. The draw itself is weighted by car risk, which only makes a missing risky car easier to catch.

### Business case

`/bank` shows today (3,000 in-person car checks × €170 = €510k a year) against Floor Check for the current tier mix: self-checks, spot checks, full counts, data feeds, AI processing, the risk model and app maintenance. About −28% with bank staff on spot checks, about −63% with local verifiers at €30 a car. **Download CSV** exports it with every assumption. All numbers live in `src/config/assumptions.ts`.

## Demo script (~3 min)

Run **Reset demo** in `/demo` first. Keep `/bank`, `/demo`, `/dealer` and `/verifier` open in separate tabs.

1. **Bank dashboard**: 150 dealers, ~3,500 cars. Collateral confirmed, dealers ranked by the risk model with their top reasons, the lot map. Point at the cost headline (−28% vs today, −63% with local verifiers).
2. **Dealer phone**: in `/demo` send a check-in to Laakso Autot (the email and QR code appear in the bank's mailbox). In `/dealer`: the window the bank set → Start check-in → cars and a one-time code appear → photograph each car's VIN plate with the code on paper (from `/demo/plates`), the car and the odometer → "All verified ✓". Show **Ask for another time** on a second dealer: the bank sets a new window within two weeks.
3. **Demo panel**: fire **Listed as sold**. The dealer app shows a friendly payoff reminder; nothing is suspicious yet. Then **2 business days pass, no payoff**: on `/bank` a high alert appears (marketplace and register agree). Koskinen Car Center moves to Review, **the next random spot check is brought forward to today** with that car added, and the alert recommends **Pause credit** for the officer to click.
   - **Freelancer phone** (`/verifier`): a spot check appears ("Koskinen Car Center · 4 cars · €120"). It looks like any random visit; the freelancer never sees why it came today. Accept → **I'm at the lot** → the dealer app shows "Sanna M. from Curb visits today" with the same visit code → for each car: **Car is here** (three photos) or **Car isn't here** → **Send report**.
   - No second person? Use **Simulate report** on the bank card, or turn on **Auto-complete spot checks** in `/demo`.
4. **Close**: the business case and the CSV. "In a high-trust market, the best control is one honest dealers barely notice."
