export type Tier = "Gold" | "Silver" | "Standard" | "Review";
export type CarStatus = "in_stock" | "sold_paid" | "sold_unpaid_suspect";
export type Severity = "high" | "medium" | "low";
export type AlertSource = "connected_car" | "marketplace" | "registry" | "check_in";

export interface Geofence { lat: number; lng: number; radiusM: number }

export interface HistoryEntry {
  id: string;
  date: string; // ISO date
  kind: "check_in" | "tier_change" | "alert" | "onboarding" | "verifier";
  outcome: "clean" | "failed" | "skipped" | "resolved" | "info";
  note: string;
}

export interface Dealer {
  id: string;
  name: string;
  city: string;
  contact: string;
  geofence: Geofence;
  creditLine: number;
  tier: Tier;
  /** Tier to return to when a Review caused by an alert is cleared by the bank. */
  tierBeforeReview?: Tier;
  /** Consecutive clean check-ins since the last tier change; drives gradual step-ups. */
  cleanStreak: number;
  history: HistoryEntry[];
  tierHistory: { date: string; tier: Tier; reason: string }[];
}

export interface Car {
  vin: string;
  dealerId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  loanAmount: number;
  loanOpenedAt: string;
  status: CarStatus;
  connected: boolean;
  demoScenario?: string;
}

export interface ConnectedFeed { lat: number; lng: number; odometerKm: number; lastSeen: string; outsideSince?: string; prevOdometerKm?: number }
export interface MarketplaceFeed { listed: boolean; status: "active" | "sold" | "removed"; listingTitle?: string; price?: number; changedAt?: string }
export interface RegistryFeed { owner: string; lastOwnerChange: string; pending?: boolean }

export type EscalationStep = "signal" | "targeted_check_in" | "gig_verifier" | "auditor";

export interface Alert {
  id: string;
  dealerId: string;
  vin: string;
  source: AlertSource;
  severity: Severity;
  message: string;
  createdAt: string;
  status: "open" | "investigating" | "resolved_ok" | "confirmed_fraud";
  /** Escalation ladder position. */
  step: EscalationStep;
  evidence: { label: string; value: string }[];
  verifier?: VerifierJob;
  targetedCheckInId?: string;
}

export type VerifierStatus = "offered" | "en_route" | "on_site" | "reported";

/** A paid, one-car job for a local freelance verifier. The verifier never sees why the car was picked. */
export interface VerifierJob {
  dispatchedAt: string;
  name: string;
  status: VerifierStatus;
  /** Shown to dealer staff on arrival so they can confirm the visit with Aurora. */
  visitCode: string;
  fee: number;
  acceptedAt?: string;
  arrivedAt?: string;
  arrival?: PhotoCheck["location"];
  reportedAt?: string;
  photo?: PhotoCheck;
  odometerKm?: number;
  notFoundReason?: string;
  note?: string;
  /** True when the demo auto-completed the job instead of someone using /verifier. */
  simulated?: boolean;
  report?: string;
  found?: boolean;
}

export type ShotKind = "vin" | "car" | "odometer";

/** Silent checks run on the server for each car's three photos. Visible to the bank only. */
export interface PhotoCheck {
  vin: string;
  readVin: string | null;
  confidence: number;
  vinMatch: "exact" | "ocr_tolerant" | "mismatch" | "unreadable";
  location: { lat: number; lng: number; accuracyM: number; distanceM: number; inside: boolean; simulated: boolean } | null;
  freshness: { receivedAt: string; insideWindow: boolean; exifTime?: string };
  reuse: { hash: string; nearestDistance: number; duplicate: boolean };
  /** Licence plate read from the photo of the whole car. */
  plate?: { expected: string; read: string | null; match: boolean };
  /** Odometer read from the dashboard photo, against the last known reading. */
  odometer?: { readKm: number | null; lastKnownKm: number | null; deltaKm: number | null; plausible: boolean };
  /** "camera": live in-app camera; "simulated": demo camera on a device without one. */
  capture?: "camera" | "simulated";
  verified: boolean;
  thumbnail?: string; // VIN plate, small data URL for the bank evidence view
  thumbnails?: Partial<Record<ShotKind, string>>;
}

export interface CheckInWindow { id: string; label: string; start: string; end: string }

export interface CheckIn {
  id: string;
  dealerId: string;
  createdAt: string;
  reason: "random" | "targeted";
  targetVin?: string;
  status: "requested" | "scheduled" | "in_progress" | "completed";
  window?: CheckInWindow;
  /** Filled when the dealer taps Start: drawn at random from the sampling pool. */
  sampledVins: string[];
  sampling?: SamplingExplanation;
  results: Record<string, PhotoCheck | { skipped: true }>;
  startedAt?: string;
  completedAt?: string;
  outcome?: "clean" | "failed" | "partial";
}

export interface SamplingExplanation {
  fleet: number;
  autoVerified: number;
  pool: number;
  n: number;
  p: number;
  confidence: number;
  missingToDetect: number;
  /** Random check-ins per year for the tier. */
  perYear: number;
  /** Cap on cars per check-in for the tier. */
  maxCars: number;
  /** Chance one check-in catches a missing car. */
  perCheckIn: number;
  /** Chance a year of check-ins catches it. */
  yearly: number;
  /** Mean days until a check-in catches it. */
  expectedDays: number;
}

export interface DemoState {
  version: number;
  now: string; // when state was built (reset time)
  dealers: Dealer[];
  cars: Car[];
  feeds: {
    connected: Record<string, ConnectedFeed>;
    marketplace: Record<string, MarketplaceFeed>;
    registry: Record<string, RegistryFeed>;
  };
  alerts: Alert[];
  checkIns: CheckIn[];
  /** Perceptual hashes of all earlier check-in photos across dealers (reuse detection). */
  photoHashes: { hash: string; dealerId: string; vin: string; at: string }[];
  demo: { soldCarVin: string; soldCarAwayPosition: { lat: number; lng: number } };
  /** Live event ticker for the bank/demo screens. */
  events: { id: string; at: string; text: string }[];
}
