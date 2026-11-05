# Case 2 — Floor Check (product brief, condensed from the hackathon handoff)

TiK x Netlight Mini Hackathon. Fictional lender **Kerb Finance**, fictional dealers. All external data (connected-car API, marketplace, vehicle registry) is simulated.

Brief: a bank financing car dealers' inventory relies on manual floor checks to confirm the cars (loan collateral) still exist. Slow, costly; dealers drift to competitors with digital processes. Cut floor-check cost without opening the door to fraud or losing dealers. Key fraud: **sold out of trust** (dealer sells a financed car, keeps the money).

## Design principle: high-trust Nordic market (product requirement)
1. Data first, people last. Photos rarely, physical visits last resort.
2. Trust grows over time. Clean dealers earn a higher tier: fewer check-ins, better terms.
3. Convenient, not a gotcha. Called a "check-in", never an "audit". **No countdown timers or deadlines in the dealer UI.** Dealer picks a time window. ~3 minutes. A clean one makes the dealer eligible for a fast-track credit-line review (the credit team decides).
4. Anti-fraud checks are invisible. GPS, timestamps, image hashing, VIN matching run silently; never shown to dealers as accusations.
5. Open about the rules. Dealer sees what is checked and why, current tier and benefits. **Never** the date of their next check-in.
Dealer-facing tone: friendly, short, respectful.

## Features
1. Remote self check-in (dealer, mobile web) — request arrives at an unpredictable time ("Hi Laakso Autot, we'd like to do a quick check-in of a few cars. Pick a time that suits you."), dealer picks a window (today 14–16, tomorrow morning, … within ~3 days), taps **Start check-in**, only then the n VINs are revealed (random draw). Per car: make/model/colour/plate to find it, photograph the VIN plate (`<input type="file" accept="image/*" capture="environment">`). Done: "All verified ✓. Thanks! You're eligible for a line review." + tier badge. Unverifiable car → neutral message ("We couldn't read this one, try another photo or skip for now"); the bank gets the detail.
   Silent checks per photo (bank only): VIN read (vision model, strict JSON, one-char OCR tolerance), location (browser Geolocation inside geofence), freshness (inside chosen window), reuse (dHash vs all earlier photos).
2. Signal feeds: connected car (outside geofence >48h → alert; odometer jump >500 km → alert; connected cars verified in the geofence today leave the sampling pool — show "23 of 48 cars verified automatically"), marketplace (listing sold/removed with open loan → alert), registry (owner change → high-severity alert).
3. Risk engine 0–100 + tiers Gold / Silver / Standard / Review. Tier sets check-in frequency, sampling tolerance, perks (line-review reply time, rate discount e.g. Gold −0.25 pp). Tiers move gradually; one unresolved high alert → Review. Nothing punished automatically without a human at the bank. Dealer tier page: "You're Gold tier", benefits, how to keep/reach next tier. No next-check date.
4. Sampling: smallest n so that if ≥p of N pool cars were missing, P(catch ≥1) ≥ confidence (hypergeometric). Shown on bank dealer detail: "Pool 25 cars → check 9 for 95% confidence that ≤2% are missing", plus a tooltip explainer.
5. Bank dashboard: portfolio (tier, risk, cars financed, % auto-verified today, open alerts), live alert feed (newest first, colour by severity and source, click → evidence + recommended next step), dealer detail (check-in history with silent-check results per photo, sampling explanation, tier history), cost/risk chart: x = scheduled physical checks per dealer per year (0–12); lines: check cost, expected fraud loss, total with minimum marked; overlay scenario "Kerb with signals" (far lower total). Assumptions editable in one config file and labelled "assumptions" in the UI. Headline: "−X% annual floor-check cost at equal or lower fraud exposure."
6. Escalation ladder: signal / failed check → (1) friendly targeted check-in for that VIN → (2) gig verifier physical check €30 ("Dispatch verifier" → status update) → (3) professional auditor / account manager only for confirmed problems. Show the ladder and where each case is on the alert detail.
7. Dealer transparency page: what Kerb checks (photos at check-ins, connected-car location for consenting dealers, public registry and marketplace data), why (keeps check-ins rare and terms good), how tiers work. No thresholds, no next date.
8. Demo control panel `/demo`: send random check-in to dealer X, VIN listed as sold on marketplace, registry owner change, connected car leaves geofence, reset demo.

## Demo script (~3 min)
1. Bank dashboard: 4 dealers, most cars auto-verified by connected-car data. Cost headline.
2. Dealer phone: friendly request → pick window → start → ~5 VINs revealed → photograph plates → "All verified ✓, eligible for a line review, you're Gold tier."
3. Demo panel: "car listed as sold on marketplace" (open loan). Alert fires on bank; connected car shows it ~180 km away; registry shows pending owner change. Dealer → Review, targeted check-in goes out, gig verifier dispatched (€30 instead of €400).
4. Close: sampling explainer + slider. "In a high-trust market, the best control is one honest dealers barely notice."
