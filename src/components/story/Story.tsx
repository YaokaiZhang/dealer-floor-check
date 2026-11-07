"use client";
import { Scene } from "./Scene";
import { Walk } from "./Walk";
import { Signals } from "./Signals";
import { CheckIn } from "./CheckIn";
import { Sampling } from "./Sampling";
import { OutOfTrust } from "./OutOfTrust";
import { Tiers } from "./Tiers";
import { Savings } from "./Savings";

/** The case, told in chapters: the problem, then each part of the answer. */
export function Story() {
  return (
    <div aria-label="How Curb Floor Check works">
      <Scene
        id="today"
        index={1}
        kicker="Floor checks today"
        title={<>A day on foot<br />per dealer</>}
        body="An auditor walks every aisle and ticks off every car on a clipboard. It costs about €400 a visit, the dealer loses half a day, and the cars sold last week still slip through."
        visual={(p) => <Walk p={p} />}
      />
      <Scene
        id="data"
        index={2}
        kicker="Data first"
        title={<>Most cars check<br />themselves</>}
        body="Connected cars report where they are. Any car seen inside the dealer's lot in the last day counts as verified, with nobody on site. Registry and marketplace feeds watch for sales, so an empty stall is noticed the same day."
        visual={(p) => <Signals p={p} />}
      />
      <Scene
        id="check-in"
        index={3}
        kicker="Check-in on the phone"
        title={<>Three photos<br />a car</>}
        body="Now and then the dealer gets a short check-in for a few cars. They pick a time that suits them, then photograph the VIN plate, the car and the odometer. It takes about five minutes."
        steps={["VIN plate read and matched", "Taken on the lot, inside the window", "Odometer in line with the last reading", "A new photo, not a reused one"]}
        visual={(p) => <CheckIn p={p} />}
      />
      <Scene
        id="sampling"
        index={4}
        kicker="Small samples, often"
        title={<>Nobody knows<br />which cars</>}
        body="Each check-in draws a few cars at random from the ones data couldn't verify. One check-in proves little. A year of them finds a missing car more than nine times in ten."
        visual={(p) => <Sampling p={p} />}
      />
      <Scene
        id="out-of-trust"
        index={5}
        kicker="Sold out of trust"
        tone="dark"
        length={320}
        title={<>A sale without<br />a payoff</>}
        body="When a financed car is sold, the dealer has two business days to repay the loan. If the money doesn't come, the signals are already there. People step in only now, cheapest first."
        steps={["Listed on a marketplace", "Registry owner change pending", "Car seen 180 km away", "Two business days, no payoff", "Check-in, then a €30 spot check"]}
        visual={(p) => <OutOfTrust p={p} />}
      />
      <Scene
        id="trust"
        index={6}
        kicker="Keeping dealers"
        title={<>Trust earns<br />fewer checks</>}
        body="Three clean check-ins in a row move a dealer up a tier. Gold dealers get two check-ins a year, a better rate and answers on their credit line within a day."
        visual={(p) => <Tiers p={p} />}
      />
      <Scene
        id="result"
        index={7}
        kicker="The result"
        title={<>Cheaper checks,<br />less fraud</>}
        body="Per dealer and year, against six manual floor checks. All figures are assumptions in one config file."
        visual={(p) => <Savings p={p} />}
      />
    </div>
  );
}
