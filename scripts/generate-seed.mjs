// Deterministic seed generator. Run: node scripts/generate-seed.mjs
// Produces data/seed.json (fictional dealers, cars and mock feed states).
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
    creditLine: 1_600_000, tier: "Gold", cars: 48, connectedShare: 0.5, contact: "Mikko Laakso",
    history: [
      ["2025-11-12", "check_in", "clean", "5 of 5 cars verified"],
      ["2026-02-03", "check_in", "clean", "4 of 4 cars verified"],
      ["2026-03-20", "tier_change", "info", "Moved up to Gold tier after 6 clean check-ins"],
      ["2026-05-28", "check_in", "clean", "4 of 4 cars verified"],
      ["2026-08-19", "check_in", "clean", "5 of 5 cars verified"],
    ] },
  { id: "d2", name: "Koskinen Car Center", city: "Vantaa", geofence: { lat: 60.2934, lng: 25.0378, radiusM: 600 },
    creditLine: 1_250_000, tier: "Silver", cars: 36, connectedShare: 0.45, contact: "Anna Koskinen",
    history: [
      ["2025-12-04", "check_in", "clean", "7 of 7 cars verified"],
      ["2026-03-11", "check_in", "clean", "6 of 6 cars verified"],
      ["2026-06-17", "tier_change", "info", "Moved up to Silver tier"],
      ["2026-09-02", "check_in", "clean", "6 of 6 cars verified"],
    ] },
  { id: "d3", name: "Revontuli Motors", city: "Oulu", geofence: { lat: 65.0121, lng: 25.4651, radiusM: 500 },
    creditLine: 780_000, tier: "Standard", cars: 26, connectedShare: 0.35, contact: "Joonas Heikkinen",
    history: [
      ["2026-04-14", "onboarding", "info", "Onboarded, connected-car consent given"],
      ["2026-06-30", "check_in", "clean", "8 of 8 cars verified"],
      ["2026-09-22", "check_in", "clean", "7 of 7 cars verified"],
    ] },
  { id: "d4", name: "Saimaa Auto", city: "Lappeenranta", geofence: { lat: 61.0587, lng: 28.1887, radiusM: 400 },
    creditLine: 640_000, tier: "Standard", cars: 22, connectedShare: 0.25, contact: "Petri Rantanen",
    history: [
      ["2025-10-08", "check_in", "failed", "1 car not found, later explained as test drive"],
      ["2026-01-21", "check_in", "skipped", "Check-in not completed, rescheduled"],
      ["2026-03-04", "alert", "resolved", "Marketplace listing removed, car paid off 9 days late"],
      ["2026-05-13", "tier_change", "info", "Moved down to Standard after late payoff"],
      ["2026-07-29", "check_in", "clean", "9 of 9 cars verified"],
    ] },
];

const out = { generatedAt: "2026-11-05", dealers: [], cars: [], feeds: { connected: {}, marketplace: {}, registry: {} } };

const offset = (lat, lng, meters, bearingDeg) => {
  const R = 6371000, b = (bearingDeg * Math.PI) / 180, d = meters / R;
  const la1 = (lat * Math.PI) / 180, lo1 = (lng * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [+(la2 * 180 / Math.PI).toFixed(5), +(lo2 * 180 / Math.PI).toFixed(5)];
};

for (const d of dealers) {
  const { cars, connectedShare, history, ...rest } = d;
  out.dealers.push({ ...rest, history: history.map(([date, kind, outcome, note], i) => ({ id: `${d.id}-h${i}`, date, kind, outcome, note })) });
  for (let i = 0; i < cars; i++) {
    const [make, wmi, models] = pick(MODELS);
    const year = int(2019, 2026);
    const v = vin(wmi, year);
    const connected = rnd() < connectedShare;
    const soldPaid = rnd() < 0.08;
    const loanAmount = Math.round((year - 2016) * int(2600, 4200) / 100) * 100 + 8000;
    const opened = new Date(Date.UTC(2026, int(0, 9), int(1, 28)));
    out.cars.push({
      vin: v, dealerId: d.id, make, model: pick(models), year, color: pick(COLORS), plate: plate(),
      loanAmount, loanOpenedAt: opened.toISOString().slice(0, 10),
      status: soldPaid ? "sold_paid" : "in_stock", connected,
    });
    if (connected) {
      const [lat, lng] = offset(d.geofence.lat, d.geofence.lng, int(10, d.geofence.radiusM * 0.7), int(0, 359));
      out.feeds.connected[v] = { lat, lng, odometerKm: int(800, 95000), lastSeenHoursAgo: +(rnd() * 6).toFixed(1) };
    }
    out.feeds.marketplace[v] = { listed: !soldPaid && rnd() < 0.6, status: soldPaid ? "sold" : "active" };
    out.feeds.registry[v] = { owner: soldPaid ? "Private person" : d.name, lastOwnerChange: soldPaid ? "2026-10-1" + int(0, 9) : opened.toISOString().slice(0, 10) };
  }
}

// Demo scenario car: connected Koskinen car that will "turn up" ~180 km away (Jämsä area) when sold.
const demo = out.cars.find((c) => c.dealerId === "d2" && c.connected && c.status === "in_stock");
demo.demoScenario = "sold_out_of_trust";
demo.loanAmount = 41900;
out.feeds.marketplace[demo.vin] = { listed: true, status: "active", listingTitle: `${demo.make} ${demo.model}, ${demo.year}, ${demo.color.toLowerCase()}`, price: 47900 };
out.demo = { soldCarVin: demo.vin, soldCarAwayPosition: { lat: 61.8701, lng: 25.1902 } };

writeFileSync(new URL("../data/seed.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`dealers=${out.dealers.length} cars=${out.cars.length} connected=${Object.keys(out.feeds.connected).length} demoVin=${demo.vin}`);
