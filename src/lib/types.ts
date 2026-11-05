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
  verifier?: { dispatchedAt: string; name: string; status: "en_route" | "reported"; report?: string; found?: boolean };
  targetedCheckInId?: string;
}

/** Silent checks run per photo. Visible to the bank only. */
export interface PhotoCheck {
  vin: string;
  readVin: string | null;
  confidence: number;
  vinMatch: "exact" | "ocr_tolerant" | "mismatch" | "unreadable";
  location: { lat: number; lng: number; accuracyM: number; distanceM: number; inside: boolean; simulated: boolean } | null;
  freshness: { receivedAt: string; insideWindow: boolean; exifTime?: string };
  reuse: { hash: string; nearestDistance: number; duplicate: boolean };
  verified: boolean;
  thumbnail?: string; // small data URL for the bank evidence view
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
