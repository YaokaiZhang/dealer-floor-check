// Deterministic seed generator. Run: node scripts/generate-seed.mjs
// Produces data/seed.json (fictional dealers, cars and mock feed states): 150 dealers, ~3,500 cars,
// matching the case fact sheet. The first 4 dealers are hand-made for the demo story.
import { writeFileSync } from "node:fs";

let s = 20261109;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// --- VIN with valid ISO 3779 check digit (North-American style, position 9) ---
const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
const TRANSLIT = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
const YEAR_CODE = { 2018:"J",2019:"K",2020:"L",2021:"M",2022:"N",2023:"P",2024:"R",2025:"S",2026:"T" };
function vin(wmi, year) {
  let v = wmi;
  for (let i = 0; i < 5; i++) v += pick(VIN_CHARS.slice(0, 23));
  v += "0"; // placeholder check digit
  v += YEAR_CODE[year];
  v += pick("ABCDEFGHJKLMNPRSTUVWXYZ");
  for (let i = 0; i < 6; i++) v += pick("0123456789");
  const sum = [...v].reduce((acc, c, i) => acc + (/\d/.test(c) ? +c : TRANSLIT[c]) * WEIGHTS[i], 0);
  const cd = sum % 11 === 10 ? "X" : String(sum % 11);
  return v.slice(0, 8) + cd + v.slice(9);
}

const MODELS = [
  ["Volkswagen", "WVW", ["Golf", "Passat Variant", "ID.4", "Tiguan"]],
  ["Toyota", "JTD", ["Corolla Touring", "RAV4 Hybrid", "Yaris", "C-HR"]],
  ["Skoda", "TMB", ["Octavia Combi", "Superb", "Enyaq", "Kodiaq"]],
  ["Volvo", "YV1", ["XC40", "XC60", "V60", "V90 Cross Country"]],
  ["Kia", "KNA", ["Ceed SW", "Niro EV", "Sportage", "EV6"]],
  ["BMW", "WBA", ["320d Touring", "X1", "i4", "530e"]],
  ["Tesla", "5YJ", ["Model 3", "Model Y"]],
];
const COLORS = ["Black", "White", "Silver", "Dark grey", "Blue", "Red", "Green"];
const plate = () => {
  const L = "ABCEFGHIJKLMNOPRSTUVXYZ";
  return `${pick(L)}${pick(L)}${pick(L)}-${int(10, 999)}`;
};

const dealers = [
  { id: "d1", name: "Laakso Autot", city: "Tampere", geofence: { lat: 61.4851, lng: 23.7615, radiusM: 450 },
    creditLine: 1_600_000, tier: "Gold", cars: 48, contact: "Mikko Laakso",
    history: [
      ["2025-11-12", "check_in", "clean", "5 of 5 cars verified"],
      ["2026-02-03", "check_in", "clean", "4 of 4 cars verified"],
      ["2026-03-20", "tier_change", "info", "Moved up to Gold tier after 6 clean check-ins"],
      ["2026-05-28", "check_in", "clean", "4 of 4 cars verified"],
      ["2026-08-19", "check_in", "clean", "5 of 5 cars verified"],
    ] },
  { id: "d2", name: "Koskinen Car Center", city: "Vantaa", geofence: { lat: 60.2934, lng: 25.0378, radiusM: 600 },
    creditLine: 1_250_000, tier: "Silver", cars: 36, contact: "Anna Koskinen",
    history: [
      ["2025-12-04", "check_in", "clean", "7 of 7 cars verified"],
      ["2026-03-11", "check_in", "clean", "6 of 6 cars verified"],
      ["2026-06-17", "tier_change", "info", "Moved up to Silver tier"],
      ["2026-09-02", "check_in", "clean", "6 of 6 cars verified"],
    ] },
  { id: "d3", name: "Revontuli Motors", city: "Oulu", geofence: { lat: 65.0121, lng: 25.4651, radiusM: 500 },
    creditLine: 780_000, tier: "Standard", cars: 26, contact: "Joonas Heikkinen",
    history: [
      ["2026-04-14", "onboarding", "info", "Onboarded, in-person onboarding visit"],
      ["2026-06-30", "check_in", "clean", "8 of 8 cars verified"],
      ["2026-09-22", "check_in", "clean", "7 of 7 cars verified"],
    ] },
  { id: "d4", name: "Saimaa Auto", city: "Lappeenranta", geofence: { lat: 61.0587, lng: 28.1887, radiusM: 400 },
    creditLine: 640_000, tier: "Standard", cars: 22, contact: "Petri Rantanen",
    history: [
      ["2025-10-08", "check_in", "failed", "1 car not found, later explained as test drive"],
      ["2026-01-21", "check_in", "skipped", "Check-in not completed, rescheduled"],
      ["2026-03-04", "alert", "resolved", "Marketplace listing removed, car paid off 9 days late"],
      ["2026-05-13", "tier_change", "info", "Moved down to Standard after late payoff"],
      ["2026-07-29", "check_in", "clean", "9 of 9 cars verified"],
    ] },
];

// --- 146 generated dealers so the portfolio matches the fact sheet: 150 dealers, ~3,500 cars.
// Tier mix with the 4 hand-made dealers: 30 Gold, 45 Silver, 60 Standard, 15 Review.
const CITIES = [
  ["Helsinki", 60.1699, 24.9384], ["Espoo", 60.2055, 24.6559], ["Vantaa", 60.2934, 25.0378], ["Tampere", 61.4978, 23.761],
  ["Turku", 60.4518, 22.2666], ["Oulu", 65.0121, 25.4651], ["Jyväskylä", 62.2426, 25.7473], ["Lahti", 60.9827, 25.6612],
  ["Kuopio", 62.8924, 27.677], ["Pori", 61.4851, 21.7974], ["Joensuu", 62.601, 29.7636], ["Lappeenranta", 61.0587, 28.1887],
  ["Hämeenlinna", 60.9929, 24.4643], ["Vaasa", 63.0951, 21.6165], ["Seinäjoki", 62.7903, 22.8403], ["Rovaniemi", 66.5039, 25.7294],
  ["Mikkeli", 61.6886, 27.2723], ["Kotka", 60.4664, 26.9458], ["Salo", 60.3831, 23.1255], ["Porvoo", 60.3932, 25.6649],
  ["Kokkola", 63.8385, 23.1307], ["Hyvinkää", 60.6303, 24.8597], ["Lohja", 60.2486, 24.0653], ["Rauma", 61.1272, 21.5112],
];
const NAME_A = ["Aalto", "Berg", "Heikkilä", "Hakala", "Järvinen", "Kallio", "Karjala", "Koivisto", "Lehto", "Lindholm", "Mäkelä", "Niemi",
  "Nurmi", "Ojala", "Paananen", "Rautio", "Salminen", "Sirola", "Tuominen", "Vainio", "Virta", "Väisänen", "Halme", "Kivi"];
const NAME_B = ["Auto", "Autotalo", "Car Center", "Motors", "Autokeskus", "Cars", "Autoliike", "Vehicles"];
const TIER_MIX = [...Array(29).fill("Gold"), ...Array(44).fill("Silver"), ...Array(58).fill("Standard"), ...Array(15).fill("Review")];
const names = new Set(dealers.map((d) => d.name));
const isoDay = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
TIER_MIX.forEach((tier, i) => {
  const [city, lat, lng] = pick(CITIES);
  let name;
  do { name = rnd() < 0.5 ? `${pick(NAME_A)} ${pick(NAME_B)}` : `${pick(NAME_B)} ${pick(NAME_A)}`; } while (names.has(name));
  names.add(name);
  const cars = int(15, 32);
  const [glat, glng] = [lat + (rnd() - 0.5) * 0.08, lng + (rnd() - 0.5) * 0.12];
  const history = [];
  const checks = tier === "Gold" ? 4 : tier === "Silver" ? 4 : tier === "Standard" ? 3 : 4;
  for (let k = 0; k < checks; k++) {
    const date = isoDay(2026, 1 + k * 2 + int(0, 1), int(1, 27));
    const bad = tier === "Review" ? rnd() < 0.45 : tier === "Standard" ? rnd() < 0.12 : 0;
    const outcome = bad ? (rnd() < 0.5 ? "skipped" : "failed") : "clean";
    const n = int(2, 4);
    history.push([date, "check_in", outcome, outcome === "clean" ? `${n} of ${n} cars verified` : outcome === "skipped" ? "Check-in window missed" : `${n - 1} of ${n} cars verified`]);
  }
  if (tier === "Review") history.push([isoDay(2026, 9, int(1, 25)), "payoff", "info", "Sold car paid off 6 days late"]);
  if (tier === "Gold") history.splice(2, 0, [isoDay(2026, 5, int(1, 27)), "tier_change", "info", "Moved up to Gold tier after 3 clean check-ins"]);
  history.sort((a, b) => a[0].localeCompare(b[0]));
  dealers.push({
    id: `d${i + 5}`, name, city, geofence: { lat: +glat.toFixed(4), lng: +glng.toFixed(4), radiusM: int(250, 550) },
    creditLine: Math.round((cars * int(30, 45) * 1000) / 50000) * 50000, tier, cars, contact: `${pick(["Mikko", "Anna", "Juha", "Laura", "Timo", "Sari", "Antti", "Heidi"])} ${name.split(" ").find((w) => NAME_A.includes(w))}`,
    history,
  });
});

const out = { generatedAt: "2026-11-05", dealers: [], cars: [], feeds: { marketplace: {}, registry: {} } };
const TODAY = Date.UTC(2026, 10, 5);
const DAY = 86400000;

for (const d of dealers) {
  const { cars, history, ...rest } = d;
  out.dealers.push({ ...rest, history: history.map(([date, kind, outcome, note], i) => ({ id: `${d.id}-h${i}`, date, kind, outcome, note })) });
  for (let i = 0; i < cars; i++) {
    const [make, wmi, models] = pick(MODELS);
    const year = int(2019, 2026);
    const v = vin(wmi, year);
    const soldPaid = rnd() < 0.08;
    const loanAmount = Math.round((year - 2016) * int(2600, 4200) / 100) * 100 + 8000;
    // Days in stock: most cars turn over in weeks, a tail sits for months.
    const age = rnd() < 0.75 ? int(3, 90) : int(91, 260);
    const opened = new Date(TODAY - age * DAY);
    const checkedAgo = rnd() < 0.7 ? int(5, Math.min(170, age)) : null;
    const car = {
      vin: v, dealerId: d.id, make, model: pick(models), year, color: pick(COLORS), plate: plate(),
      loanAmount, loanOpenedAt: opened.toISOString().slice(0, 10),
      status: soldPaid ? "sold_paid" : "in_stock",
    };
    if (checkedAgo !== null && !soldPaid) car.lastCheckedAt = new Date(TODAY - checkedAgo * DAY).toISOString().slice(0, 10);
    out.cars.push(car);
    // Feeds are sparse: only listed cars have a marketplace entry, only changed owners a registry entry.
    if (!soldPaid && rnd() < 0.35) out.feeds.marketplace[v] = { listed: true, status: "active" };
    if (soldPaid) {
      out.feeds.marketplace[v] = { listed: true, status: "sold" };
      out.feeds.registry[v] = { owner: "Private person", lastOwnerChange: "2026-10-1" + int(0, 9) };
    }
  }
}

// Demo scenario car: a Koskinen car listed for sale. When it sells, the register also shows a pending owner change.
const demo = out.cars.find((c) => c.dealerId === "d2" && c.status === "in_stock");
demo.demoScenario = "sold_out_of_trust";
demo.loanAmount = 41900;
demo.lastCheckedAt = "2026-09-02";
out.feeds.marketplace[demo.vin] = { listed: true, status: "active", listingTitle: `${demo.make} ${demo.model}, ${demo.year}, ${demo.color.toLowerCase()}`, price: 47900 };
out.demo = { soldCarVin: demo.vin };

writeFileSync(new URL("../data/seed.json", import.meta.url), JSON.stringify(out));
console.log(`dealers=${out.dealers.length} cars=${out.cars.length} demoVin=${demo.vin}`);
