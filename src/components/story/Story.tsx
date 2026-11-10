"use client";
import { Scene } from "./Scene";
import { Walk } from "./Walk";
import { Signals } from "./Signals";
import { CheckIn } from "./CheckIn";
import { Sampling } from "./Sampling";
import { OutOfTrust } from "./OutOfTrust";
import { Verifiers } from "./Verifiers";
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
        title={<>Car by car,<br />on foot</>}
        body="An inspector ticks off every car by hand. €170 a car, 3,000 cars a year, and last week's sales still slip through."
        visual={(p) => <Walk p={p} />}
      />
      <Scene
        id="data"
        index={2}
        kicker="Data first"
        title={<>Most cars check<br />themselves</>}
        body="Recent cars have GPS built in. If a car is on the lot, its own position says so."
        steps={["GPS in the car", "Position shared by the carmaker", "On the lot today: verified", "Sales flagged by registry feeds"]}
        visual={(p) => <Signals p={p} />}
      />
      <Scene
        id="check-in"
        index={3}
        kicker="Check-in on the phone"
        title={<>Three photos<br />a car</>}
        body="Now and then the bank sets a two-hour window and the dealer photographs a few cars. About two minutes a car. Wrong time? Ask for another, once."
        steps={["VIN matches", "One-time code in view", "Taken on the lot", "Read by AI, checked by people"]}
        visual={(p) => <CheckIn p={p} />}
      />
      <Scene
        id="verifiers"
        index={4}
        kicker="Freelance verifiers"
        title={<>A local, not<br />an auditor</>}
        body={`Random spot checks keep everyone honest. A vetted local nearby takes the visit as a paid gig: €30 a car instead of €170.`}
        steps={["Posted to verifiers nearby", "One accepts and drives over", "Finds the cars on the list", "Photos sent, €30 a car paid"]}
        visual={(p) => <Verifiers p={p} />}
      />
      <Scene
        id="sampling"
        index={5}
        kicker="Small samples, often"
        title={<>Nobody knows<br />which cars</>}
        body="A few cars each time, picked by an AI risk model but never predictable. Over a year, a missing car is found more than nine times in ten."
        visual={(p) => <Sampling p={p} />}
      />
      <Scene
        id="out-of-trust"
        index={6}
        kicker="Sold out of trust"
        duration={9500}
        title={<>A sale without<br />a payoff</>}
        body="A sale is normal. It starts a two-day payoff clock and a friendly reminder. Only a missed payoff raises an alert."
        steps={["Sold online: payoff reminder", "No payoff in two days: alert", "Register agrees: spot check today", "Officer decides: pause credit"]}
        visual={(p) => <OutOfTrust p={p} />}
      />
      <Scene
        id="trust"
        index={7}
        kicker="Keeping dealers"
        title={<>Trust earns<br />benefits</>}
        body="Clean check-ins move a dealer up a tier. Gold dealers get two a year and a better rate."
        visual={(p) => <Tiers p={p} />}
      />
      <Scene
        id="result"
        index={8}
        kicker="The result"
        title={<>Cheaper checks,<br />less fraud</>}
        body="Per dealer and year, with AI and app maintenance included. All figures are assumptions."
        visual={(p) => <Savings p={p} />}
      />
    </div>
  );
}
