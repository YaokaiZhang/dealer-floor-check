# Floor Check: the merged idea

> *Verify the floor without walking it. Data first, people last. Honest dealers barely notice it, and faking it is hard.*

Everything in the demo is a mock. Marketplace and register feeds, email and the IP lookup are simulated. All data is JSON held in memory on the server. The photo model can run for real when an API key is set. Otherwise its reads are simulated.

## 1. At a glance

| | |
|---|---|
| **Problem** | A bank lends dealers money for the cars on their lots, and the cars secure the loan. To confirm they still exist, it runs about 3,000 in-person car checks a year, and dealers have to request and return registration documents. It is slow and costly, and competitors with digital processes are courting the dealers. |
| **Idea** | Marketplace and register data watch for sales. The bank sends the dealer a self-check in a set time window, and the dealer photographs a few random cars on a phone, on the lot. **AI models** read the photos and the data, and a **risk model ranks** dealers and cars so checks go where risk is highest. Random spot checks keep everyone honest, and a full count is the last resort. Clean dealers earn fewer checks and better terms. |
| **Main fraud target** | **Sold out of trust:** the dealer sells a financed car and does not pay off the loan within 2 business days. |
| **Business case** | **€510k a year today → about €366k, 28% less**, including AI and app maintenance. In-person car checks drop from 3,000 to about 1,600. With local freelance verifiers doing the spot checks: **about €190k, 63% less** (section 12). |
| **Key message** | The cheap checks do most of the work. Expensive visits go only where the evidence points. |

## 2. The problem

**The facts given** (anything else is labelled as an assumption):

| | |
|---|---|
| Dealers | 150 |
| Financed cars | About 3,500 (about 23 per dealer) |
| In-person car checks today | About 3,000 a year |
| In-person check | €170 per car |
| Self-check | €5 per car |

The goal is to cut the cost of floor checks without letting fraud slip through or driving dealers away. It is a three-way trade-off:

| Who | What they want |
|---|---|
| The bank | Lower cost per check, and no fraud |
| The honest dealer | Less hassle than a visit and no paperwork, plus better terms for good behaviour |
| The fraudster | A way to fake a car that is not there, or hide one that was sold (we make both hard) |

## 3. Design principles (high-trust Nordic market)

1. **Data first, people last.** Photos rarely, physical visits only when needed.
2. **Trust earns benefits.** Clean dealers move up a tier and get fewer checks and a better rate.
3. **Convenient, not a gotcha.** We call it a "check-in", never an "audit". The bank sets the time window within working hours, and the dealer can ask for another one once if it doesn't suit them. The app shows the window ("Today 13:00–15:00") but no ticking countdown, and never the date of the next check-in.
4. **Fraud checks run silently.** The AI reads, location, timestamps, the one-time code and reused-photo detection are visible only to the bank. A dealer never sees them as accusations.
5. **Open about the rules.** The dealer can see what is checked, why, their tier and its benefits. Never the thresholds, the risk ranking or the next date.
6. **AI recommends, a person decides.** The models read, flag and rank. Only a bank officer clears alerts, confirms fraud, pauses credit or changes terms. Every model output shows its reasons.
7. **No paper.** Registration data comes from the vehicle register, so dealers no longer request and return registration documents.

## 4. Four layers of checks

Each layer is cheaper and less intrusive than the one after it. The AI models work across all of them (section 7).

| # | Layer | Who | Cost | What it does |
|---|---|---|---|---|
| 1 | **Data signals** | Nobody | About €120 per dealer a year *(assumption)* | Marketplace listings and the vehicle register show when a financed car is sold. A sale starts the payoff clock. |
| 2 | **Self-check** | The dealer, about 2 minutes a car | €5 per car | In a time window the bank sets, the dealer photographs 2–4 cars chosen by the risk model. The phone's location is read while the form is filled in. |
| 3 | **Spot check** | A person on site | €170 per car, or about €30 per car with a local freelance verifier *(assumption)* | Random, unannounced visits to 3–4 cars. The visit looks the same whatever its reason. |
| 4 | **Full count** | An auditor | €170 per car | Only after a confirmed problem. |

## 5. The flow

There are four flows. They all feed the risk model and the bank's alert list.

```
 DATA (always on)          SELF-CHECK (random)          SPOT CHECK (random)        FULL COUNT
 marketplace ·        ──►  bank sets the window,   ──►  a person, 3–4 cars    ──►  only after a
 register (sales)          dealer photographs           on the lot                 confirmed problem
                           2–4 cars on the lot
        │                          │                           │
        │                  AI photo model reads                │
        │                          │                           │
        └──────────────►  AI risk model ranks dealers  ◄───────┘
                          and cars, sets tiers, picks
                          who and what to check next
                                   │
                        bank officer decides
```

### Flow A: routine self-check

| # | Step | Dealer sees | Bank sees |
|---|---|---|---|
| 1 | **Request** | A friendly message in the app, and by email with a link and QR code: "We'd like to do a quick check-in of a few cars, today 13:00–15:00." | The scheduler picked a random working day and a 2-hour window between 09:00 and 17:00 *(window length: assumption)*. How often depends on the tier |
| 2 | **Doesn't suit?** | One button: *Ask for another time*. The bank gives a new window within the next 2 weeks (Flow D) | Reschedule requested |
| 3 | **Start** | Inside the window, taps *Start check-in*. Only now does the app reveal the 2–4 cars and a **one-time code** | Which cars the risk model drew, and why |
| 4 | **Fill in the form** | For each car: the VIN plate (with the code on paper in view), the whole car, and the odometer. The phone's location is read while the form is filled in, with the dealer's consent | Photos and location arrive |
| 5 | **AI and silent checks** | Nothing | The photo model reads the VIN, plate, odometer and code, checks the car matches the loan record, and looks for signs of a reused or fake photo. Plus location on the lot, IP location (info only) and the time window |
| 6 | **Result** | "All verified ✓. You're eligible for a credit-line review." An unclear car gets a neutral "try another photo or skip for now" | Pass, fail or "needs a look" for each car, with evidence. Uncertain AI reads go to a person |
| 7 | **Risk and tier** | Their tier and benefits | The risk model updates the dealer's score and ranking. Three clean check-ins in a row move the dealer up one tier |

### Flow B: random spot check

| # | Step | What happens |
|---|---|---|
| 1 | **Posted** | At the tier's yearly rate, a spot check of 3–4 cars is posted to a verifier nearby. The risk model picks the cars, and some recently passed a self-check (a **random re-check**). |
| 2 | **Visit** | The verifier accepts, checks in at the lot (location checked once) and shows a visit code. The dealer app shows "Sanna M. from Curb visits today". |
| 3 | **Report** | For each car, *Car is here* (three photos, read by the same AI model) or *Car isn't here* (with a reason). |
| 4 | **Result** | Every car confirmed: a clean history entry. A missing car, or one whose self-check result disagrees with the visit: an alert, and the dealer goes to Review while the bank looks into it. |

### Flow C: a car is sold (sold out of trust)

Selling a car is normal business. A sale on its own never raises suspicion.

| # | Step | Dealer sees | Bank sees |
|---|---|---|---|
| 1 | **Sale seen** (marketplace or register) | A friendly "Payoff due" card for that car | The AI matches the listing to the financed VIN, and the payoff clock starts: 2 business days |
| 2a | **Payoff received** | The card clears | The car leaves the loan. Nothing else happens |
| 2b | **Payoff missed** | The card stays | **Alert.** Medium if only one source shows the sale, high if both agree (marketplace sold **and** an owner change in the register) |
| 3 | **High alert** | Nothing changes visibly | The next spot check moves to today, with the car added. The dealer goes to Review. **The officer is asked to pause credit and confirms it with one click** |
| 4 | **Spot check confirms it** | – | The officer decides: confirm fraud and order a full count, or clear the alert |

### Flow D: the dealer can't do the check-in

| # | Step | What happens |
|---|---|---|
| 1 | **Ask for another time** | Before or during the window, the dealer taps *Ask for another time*. No reason needed |
| 2 | **New window** | The bank gives one new window, again in working hours, within the next 2 weeks. The cars are still not revealed, so the delay gives nothing away |
| 3 | **Done in the second window** | It counts like any other check-in |
| 4 | **Second window missed, or the first one missed without asking** | The check-in counts as **skipped**. The risk model raises the dealer's score, and the bank may follow up with a spot check |

A reschedule now and then is normal. Frequent reschedules raise the risk score.

### How the response scales

| Evidence | Response |
|---|---|
| A sale is seen | Payoff reminder in the dealer app. No suspicion |
| Check-in skipped | Risk score goes up. The officer may post a spot check |
| The AI can't read a car clearly | "Needs a look": a bank officer reviews the photos |
| A self-check car can't be confirmed | Medium alert. A targeted self-check for that car |
| Payoff missed, one source | Medium alert. The officer decides whether to check |
| Payoff missed, both sources agree | High alert: spot check today, dealer to Review, officer asked to pause credit |
| A spot check confirms the car is gone | The officer confirms fraud and orders a full count |

## 6. The self-check in detail

- **The bank sets the time, with one way out.** The window is random within working hours, so there is no time to prepare. The dealer can ask for one new window within 2 weeks. The cars and the one-time code are revealed only at *Start*, so a reschedule gives nothing away.
- **The one-time code.** One sheet of paper per check-in, visible only in the **VIN plate photo**. A photo from before the check-in cannot show a code that did not exist yet.
- **The in-app camera only.** No uploads from the photo gallery.
- **The dealer's location.** The phone's location is read while the form is filled in, with consent, and checked against the dealer's lot. It is never tracked outside a check-in.

## 7. The AI models

Three models do the reading and ranking. None of them decides anything on its own.

### 7.1 Photo model (every self-check and spot check)

| What it reads or checks | How it is used |
|---|---|
| VIN on the VIN plate | Matched to the loan record, with a one-character tolerance. It reads blind and is never told the expected value |
| Licence plate | Matched to the loan record |
| Odometer | Compared with the last reading. A big jump is flagged |
| One-time code | Must be visible in the VIN plate photo |
| Make, model and colour | Must match the financed car, which catches "the wrong car with a copied VIN plate" |
| Signs of a fake photo | A photo of a screen or a printout, or an edited image, is flagged |
| Reused photos | An image hash is compared with every earlier photo from every dealer (a plain algorithm, not AI) |

Each read comes with a confidence level. A **low-confidence read is never a fail**. It is marked "needs a look", and a bank officer reviews it.

### 7.2 Data model (marketplace and register)

- **Matches marketplace listings to financed cars,** using the VIN when the listing shows it, or otherwise the make, model, year, mileage and photos.
- **Reads register changes** for the financed VINs (owner changes, first registrations).
- **Turns these into signals:** a sale is seen, the listing is removed, an owner change is pending.

### 7.3 Risk model (ranks dealers and cars)

**Dealer ranking.** Each dealer gets a risk score from 0 to 100, and dealers are ranked. The score sets the tier and how often each check happens.

| Inputs (examples) |
|---|
| Check-in results: clean, failed, skipped |
| Reschedules, and how often the dealer answers late |
| Payoff behaviour: how fast loans are repaid after a sale, and any missed payoffs |
| Open and past alerts |
| Photo-model flags: low-confidence reads, odometer jumps, signs of a fake photo |
| Stock patterns: share of old stock, a sudden rise in loan value, many marketplace listings |

**Car ranking.** Within a dealer, every car gets a risk weight, which decides which cars the self-checks and spot checks draw. Cars weigh more when they:
- have been in stock a long time (for example over 90 days)
- have a high loan value
- haven't been checked for a long time
- are listed on a marketplace
- were recently flagged by any check

The draw stays partly random, so no car is ever safe from being picked.

**Explainable.** Every score shows its top reasons, for example "2 skipped check-ins, +18" or "3 cars over 120 days in stock, +9". The bank officer sees them, and the dealer only sees their tier.

**Starting point and learning.**
- **At launch** there is no fraud history to learn from. The model starts as a transparent weighted score with rules like the ones above. The demo shows this version.
- **After the pilot,** a trained model learns from real outcomes (confirmed fraud, clean dealers, false alarms). It keeps the same inputs and the same "top reasons" view.
- **Monitored:** the bank reviews how many false alarms the model raises, and checks that it doesn't keep targeting the same dealers without evidence.

### 7.4 Sampling and tiers

| Tier | Self-checks a year | Spot checks a year | Benefits |
|---|---|---|---|
| **Gold** | 2 | 1 | Fastest credit-line review, best rate |
| **Silver** | 4 | 2 | Fast review, small rate discount |
| **Standard** | 6 | 3 | Where every dealer starts |
| **Review** | 12 | 6 | More checks while the bank takes a closer look. Credit-line reviews wait |

- **Small samples, often.** The sample size is the smallest one that, over a year of self-checks and spot checks, catches a given share of missing cars with the tier's confidence level. In practice that is 2–4 cars per check-in, and up to 10 for dealers in Review.
- **Tier moves.**
  - New dealers start at Standard, with one in-person onboarding visit.
  - Three clean check-ins in a row move a dealer up one tier.
  - One unresolved high alert moves a dealer to Review. This means more checks while the bank looks, not a penalty. The rate and the credit line change only when the officer decides.

## 8. Fraud resistance

| Attack | What stops it |
|---|---|
| Reusing an old photo | The in-app camera only, the one-time code, the timestamp, and image hashes compared across all dealers |
| Photographing a screen or a printout | The photo model's fake-photo check |
| Photographing a car somewhere else | The dealer's location while filling in the form, with IP location as extra information |
| Showing a different car | The VIN and plate match, the make, model and colour check, and random re-checks at spot checks |
| Moving cars between lots for the check | A random window set by the bank, risk-ranked draws revealed only at *Start*, and a shared photo history across dealers |
| Rescheduling to buy time | Only one reschedule. The cars stay hidden until *Start*, and frequent reschedules raise the risk score |
| Selling a car and keeping the money | Marketplace and register signals matched by the data model, and the payoff window (Flow C) |

## 9. Incentives for a clean record

- A higher tier means fewer checks: 2 self-checks and 1 spot check a year at Gold, against 12 and 6 in Review.
- Faster credit-line reviews, and a rate discount of up to 0.25 percentage points *(assumption)*.
- A clean self-check makes the dealer eligible for a credit-line review.
- No more requesting and returning registration documents.
- The dealer can always see their tier and how to reach the next one.

## 10. System design

**Who uses it:**

| Role | What they do |
|---|---|
| **Dealer** (phone) | Gets check-in windows, asks for another time if needed, photographs cars, sees their tier and benefits, gets payoff reminders |
| **Verifier** (phone) | Accepts a nearby spot check, checks in at the lot, photographs each car or reports why it isn't there |
| **Bank officer** (desktop) | Watches the portfolio, alerts and risk ranking, reviews "needs a look" photos, and makes every decision that affects terms |

**Components (all mocked, with data held in memory as JSON):**

| Component | What it does |
|---|---|
| Seed data | 150 dealers, about 3,500 cars, loans, feed states and history |
| Signal feeds | Simulated marketplace and register events, fired from the demo panel |
| **AI photo model** | Reads the VIN, plate, odometer, code, and make, model and colour, and flags fake photos (a real vision model with an API key, otherwise simulated) |
| **AI data model** | Matches listings and register changes to financed cars (simulated) |
| **AI risk model** | Scores and ranks dealers and cars, with top reasons (a transparent weighted score in the demo) |
| Scheduler | Picks random working-day windows by tier, and handles reschedules within 2 weeks |
| Rules engine | Payoff clock, alerts, escalation, tier moves |
| Mock mailbox | The request emails with their link and QR code |
| Bank dashboard | Portfolio, risk ranking, lot map, collateral confirmed, alerts, dealer detail, business case |

**The bank dashboard:**
- **Portfolio and risk ranking:** every dealer with tier, risk score, top reasons, cars financed and open alerts, riskiest first.
- **Lot map:** every car as a parking bay, coloured by status, with the riskiest cars marked.
- **Collateral confirmed:** the share of financed value verified recently.
- **Alerts and "needs a look":** the evidence, the AI reads with their confidence, the recommended next step, and the officer's buttons.
- **Dealer detail:** check history (including reschedules and skips) with the photos and AI reads, the sampling explanation and the tier history.
- **Business case:** today against Floor Check, with a CSV export.

## 11. Running costs beyond the checks

| Item | Cost a year | Notes |
|---|---|---|
| AI photo and data processing | About €360 | About €0.10 per car checked × about 3,600 cars *(assumption)* |
| AI risk model | About €3,000 | Hosting, monitoring, periodic retraining *(assumption)* |
| Application maintenance | About €60,000 | Hosting, support, security updates and fixes, about half a developer *(assumption)* |

The one-off cost of building the application is not included in the yearly figures.

## 12. Business case

The fact sheet's prices are per car: €170 in person and €5 for a self-check. Everything else is labelled as an assumption.

**Today:** 3,000 in-person car checks × €170 = **€510,000 a year**, plus the paperwork for registration documents.

**Floor Check.** We assume this tier mix: 30 Gold, 45 Silver, 60 Standard and 15 Review dealers.

| Item | Volume a year | Cost |
|---|---|---|
| Self-checks (about 3 cars each, €5 per car) | 780 check-ins, 2,340 cars | €11,700 |
| Spot checks in person (3–4 cars, €170 per car) | 390 visits, 1,260 cars | €214,200 |
| Full counts after confirmed problems (about 23 cars each) | About 15 *(assumption)*, 345 cars | €58,650 |
| Data feeds (marketplace and register) | 150 dealers × €120 *(assumption)* | €18,000 |
| AI processing and risk model | Section 11 | €3,360 |
| Application maintenance | Section 11 | €60,000 |
| **Total** | About 1,600 in-person car checks | **€365,910, 28% less** |

- **With local freelance verifiers** doing the spot checks at about €30 per car *(assumption)*, spot checks cost €37,800 and the total is about **€189,500, 63% less**.
- **Spot checks and maintenance are the big costs.** Fewer cars per visit, or fewer visits for Gold and Silver dealers, lowers the total. The risk model makes this safer, because the visits it keeps go to the riskiest dealers and cars.
- **Fraud exposure:** a sale is caught when the payoff is missed, 2 business days after the marketplace or register shows it, not at the next inspection. The demo's cost-versus-fraud chart shows this, and a simulation should test it.

## 13. Rollout plan

| Phase | What happens |
|---|---|
| **1. Pilot** | 10–15 dealers who volunteer. Self-checks run alongside today's inspections, so the AI reads can be compared with what inspectors find. |
| **2. Data feeds** | Connect the register and marketplace data, and stop the paper registration documents. |
| **3. Tiers go live** | The rule-based risk model sets tiers. Fewer inspections for Gold and Silver dealers. Random spot checks and re-checks begin. |
| **4. Full portfolio** | All 150 dealers. In-person visits only by risk ranking and by random draw. |
| **5. Learn and tune** | Train the risk model on real outcomes. Adjust tiers, window length and sample sizes using real fraud, skip and false-alarm rates. |

## 14. Stakeholders

| Stakeholder | What they gain | What they worry about | How we handle it |
|---|---|---|---|
| **Dealers** | No visits or paperwork, better terms | Being monitored, a window at a bad time, an unfair AI | A few minutes a car, one free reschedule within 2 weeks, clear rules, and a person behind every decision |
| **Credit and risk team** | Faster alerts, a lower cost, a ranked worklist | Missing fraud, trusting a black box | Layered signals, random re-checks, risk scores with their top reasons |
| **Inspectors today** | Work aimed at real risk | Fewer visits | They move to spot checks, full counts and reviewing "needs a look" photos |
| **IT and operations** | A modern platform | Running and maintaining it | A maintenance budget in the business case |
| **Compliance and data protection** | A full record of every check | Location data, automated decisions, AI rules | Location is read only during a check-in. No decision is automatic. Model reasons are logged. Check the AI rules before launch |

## 15. Being honest: limits

**What fraud can still get through:**
- **A staged car.** The dealer shows a car that is not the financed one. The random draw, the code, the VIN match and the make, model and colour check make this hard.
- **A dealer who works with a fraudster.** Photos alone can't catch this, which is why random spot checks and full counts stay.
- **Faked location.** A fake-location app can spoof the phone's location. It is one layer among several.
- **A car sold privately, with no listing.** Only the register shows it, and later. Spot checks and random re-checks are the backstop.

**AI limits:**
- **The photo model can misread** dirty plates, glare or odd dashboards. Low-confidence reads go to a person and never fail a check on their own.
- **The risk model starts without fraud data.** It is rule-based until the pilot gives real outcomes to learn from.
- **The risk model can be unfair.** It is watched for false alarms and for dealers being targeted without evidence, and part of every draw stays random.

**Real-world caveats:**
- The register lags. An owner change may be reported days after the sale, which is after the 2-day payoff deadline. It is proof that arrives later, not an early warning.
- Register access terms and reporting deadlines must be checked before we quote them.
- The 2-hour window and the reschedule rule should be tested with dealers in the pilot.

## 16. Likely questions

| Question | Answer |
|---|---|
| Why will dealers accept this? | A few minutes a car on a phone, a free reschedule when the time is bad, no paperwork, and clean dealers get checked less and earn a better rate. |
| Why does the bank set the time? | So there is no time to prepare. The dealer can still ask for one other window within 2 weeks. |
| Can't a dealer reschedule to hide a sold car? | They don't know which cars will be drawn until they start, they get only one reschedule, and frequent reschedules raise the risk score. |
| What if the AI is wrong? | It never decides alone. Uncertain reads go to a person, and every risk score shows its reasons. |
| How does the risk model work without fraud data? | It starts as a transparent weighted score, and learns from real outcomes after the pilot. |
| Doesn't a sale make you suspicious? | No. A sale only starts the payoff clock and a friendly reminder. Only a missed payoff raises an alert. |
| Who pauses credit? | A bank officer, never the system on its own. |
| Are you tracking dealers? | No. The phone's location is read only while a check-in form is filled in. |
| Does this replace physical checks? | Partly. In-person car checks drop from 3,000 to about 1,600 a year, chosen by risk ranking and by random draw. |

## 17. What we deliver

The case is judged on competence, creativity and business sense, and on how much of the case a team covers.

| Deliverable | What it is |
|---|---|
| **Working app (mock)** | Dealer app, verifier app, bank dashboard with risk ranking, mock mailbox, and a demo panel that fires simulated signals |
| **Spreadsheet** | The business case in section 12, exported as a CSV |
| **System design** | Sections 7 and 10 |
| **Simulation** | Sampling maths, the cost-versus-fraud chart, and a compressed demo year |
| **Rollout plan** | Section 13 |
| **Stakeholder analysis** | Section 14 |

| Lens | Where it shows |
|---|---|
| **Competence** | A working app, real AI photo reads, sampling maths, an explainable risk model |
| **Creativity** | The one-time code, AI that ranks which cars to check, the payoff clock, local verifiers, tiers that reward trust |
| **Business sense** | 28–63% lower cost including maintenance, dealer retention, a phased rollout, honest limits |

## 18. Decisions

| # | Decision |
|---|---|
| 1 | **No video checks.** The layers are data → self-check → spot check → full count. |
| 2 | **No car GPS.** Location comes from the dealer's phone, read while the check-in form is filled in. Data signals are the marketplace and the register only. |
| 3 | **The bank sets the time.** A random 2-hour window on a working day, 09:00–17:00 *(window length: assumption)*. |
| 4 | **One reschedule.** The dealer can ask for one new window, which the bank sets within 2 weeks. Missing it counts as a skipped check-in. |
| 5 | **A sale is not suspicious.** It starts the payoff clock and a reminder. Only a missed payoff raises an alert. |
| 6 | **AI recommends, and the officer decides.** Pausing credit, confirming fraud and changing terms always need a person. A low-confidence AI read is "needs a look", never a fail. |
| 7 | **Three AI models:** a photo model, a data model (marketplace and register), and a risk model that ranks dealers and cars. |
| 8 | **The risk model is explainable,** starts rule-based, and learns after the pilot. Part of every draw stays random. |
| 9 | **Review means more checks, not a penalty.** The rate and credit line change only by the officer's decision. |
| 10 | **Prices are per car:** €170 for an in-person check, €5 for a self-check. Self-checks take about 2 minutes a car. |
| 11 | **Running costs are in the business case:** AI processing, the risk model and application maintenance *(assumptions)*. The one-off build cost is not. |
| 12 | **"Today" is the real 3,000 in-person car checks at €170.** The headline is 28% less with bank staff on spot checks, and 63% less with local verifiers at €30 per car *(assumption)*. |
| 13 | **2–4 cars per check-in**, and up to 10 for dealers in Review. |
| 14 | **The one-time code goes on one sheet per check-in, shown only in the VIN plate photo.** |
| 15 | **Everything is a mock:** feeds, email, register, IP lookup, the data model and the risk model are simulated. All data is JSON held in memory. |
