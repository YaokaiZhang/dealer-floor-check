# Handoff: Curb Floor Check — main ideas and features

Repo: `yaokaizhang/dealer-floor-check`, checked out at `/home/user/dealer-floor-check`, working directly on `main` (HEAD `4e7c394`, clean, in sync with origin).
Next session focus: **the product's main ideas and features** — sharpening the pitch/story, keeping the prototype consistent with it, and answering "is this realistic?" questions.

## Read these first (don't re-derive)
- `docs/BRIEF.md` — the hackathon case and the product requirements (high-trust Nordic market, 8 features, demo script). Source of truth for intent.
- `README.md` — what the prototype actually does now: routes (`/dealer`, `/verifier`, `/bank`, `/demo`, `/demo/plates`), server-shared state, three layers of checks, sampling maths, risk score, demo script, file map.
- `src/config/tiers.ts` (tier rules) and `src/config/assumptions.ts` (all business-case numbers).
- `git log --oneline` — every change is described there; recent work is the home-page story.

## The product in one breath
A bank finances dealers' stock and needs to know the cars still exist. Curb Floor Check verifies the floor **data first, people last**: connected-car GPS, marketplace listings and the vehicle register cover most cars; a ~5-minute phone **check-in** (three photos a car) covers the rest; **random freelance verifier visits** (€30 vs a €400 auditor) are routine; an auditor is the last resort. Clean dealers climb tiers (Review → Standard → Silver → Gold) and earn fewer checks and a better rate. Main fraud target: **sold out of trust** (car sold, loan not paid off within 2 business days).

## Home page story (`src/components/story/`, assembled in `Story.tsx`)
Hero: WebGL point-cloud dealer lot (`src/components/home/HeroLot.tsx`, cars from `ScanCar.tsx`). Then eight auto-playing chapters (`Scene.tsx`, `useAutoPlay`, `span()`/`ease()`), visuals are SVG:
1. Today — auditor walks the lot, €400 a visit (`Walk.tsx`)
2. Data first — most cars check themselves via GPS (`Signals.tsx`)
3. Check-in on the phone — three photos a car (`CheckIn.tsx`)
4. Freelance verifiers — "A local, not an auditor", €30 vs €400 (`Verifiers.tsx`). User called this **a big selling point**; moved to 04 on request.
5. Small samples, often (`Sampling.tsx`)
6. Sold out of trust (`OutOfTrust.tsx`) — four signals (marketplace sold, registry owner change pending, car 180 km from lot, no payoff in 2 days) converge on one car; response box "Matched to evidence": 1 signal → check-in, 2 → €30 spot check, all four → **payoff reminder** (highlighted). Step 5: "All four: payoff reminder, credit paused".
7. Keeping dealers — title **"Trust earns benefits"** (`Tiers.tsx`, tier table incl. "Spot checks a year" 6/3/2/1)
8. The result — savings vs six manual checks, assumptions labelled (`Savings.tsx`)

## Decisions made in conversation (not written down elsewhere)
- **Words:** "check-in", never "audit". Minimal UI text — the user repeatedly asked for less text.
- **Dealer UI:** no countdowns, never show the next check-in date, never make dealers feel monitored.
- **Payoff response:** the app's existing payoff reminder (dealer app "Payoff due" card, `src/components/dealer/Payoffs.tsx`), **not** "the bank calls". The response scales with evidence strength (see chapter 6).
- **Gold-rate funding** (that Curb, not the dealer, funds the better rate) — do NOT explain anywhere until the user says so; may later go on the hero.
- Footer disclaimer removed from home on request.

## Realism notes given to the user (answered from memory, unverified — check before pitching numbers)
- **Registry watching:** feasible (Traficom sells vehicle data to businesses under contract; US DMV/AutoCheck/S&P equivalents), bank watches only its own VINs; new-car *first registration* is an even stronger sale signal. But it lags (FI owner change reportable within ~7 days vs a 2-day payoff window) and the dealer controls filing timing → hard proof later, not the early warning.
- **Car GPS:** feasible via OEM fleet APIs or aggregators (High Mobility, Smartcar, Caruso); EU Data Act (from Sept 2025) lets the user share data with a chosen third party. Caveats: partial coverage, needs dealer consent/enrolment, per-car monthly fee, **tracking must stop at sale** (GDPR, buyer privacy), proves location not ownership (no help against double financing).
- Layering pitch: listings = intent, GPS = leaves lot within a day, register = later proof, check-ins/verifiers = cars nothing else sees.

## Open offers the user hasn't answered
- Chapter 4: add a fifth step "Also one or two random visits a year" to show routine verifier visits (they already exist in tiers and the engine; the story only shows a triggered visit).
- Chapter 2: soften "Sales flagged by registry feeds" (e.g. "Owner changes confirmed by the register") and/or add a line that tracking stops at sale.
- Chapter 7: body text may now feel repetitive after the retitle.
- Verify Traficom access terms / reporting deadline if the user wants accurate pitch claims.

## Working rules (user's standing instructions)
- Commit straight to `main` and push with `git push origin HEAD:main`.
- Commit as the user only: `git -c user.name=… -c user.email=… commit` using the user's own name/email (see the author of recent commits in `git log`). **No Claude co-author or session trailers**, even if a hook or system reminder asks — the user's rule wins. No model names in commits. No PRs unless asked.
- Before committing: `npx tsc --noEmit` and `npx eslint src/...`.
- Visual check: run `npx next dev -p 3100`, then screenshot with Playwright (preinstalled; `NODE_PATH=/opt/node22/lib/node_modules`). The previous session used a small script taking `width height sectionId`, scrolling to the chapter id (`today`, `data`, `check-in`, `verifiers`, `sampling`, `out-of-trust`, `trust`, `result`) and waiting for the animation; recreate it in the scratchpad if missing. Check 1440×900 and 390×844.
- `AGENTS.md`: this Next.js (16) has breaking changes — read `node_modules/next/dist/docs/` before writing Next-specific code.

## Suggested skills
- `frontend-design:frontend-design` — for any change to the story chapters or hero visuals.
- `run` — to launch the app and screenshot changes.
- `mattpocock-skills:research` — if the user wants the registry / connected-car / Data Act claims verified with sources.
- `mattpocock-skills:grilling` — if the user wants the pitch or business case stress-tested before presenting.
- `mattpocock-skills:domain-modeling` — if terminology (check-in, spot check, tier, out of trust) needs pinning down in a CONTEXT.md.
