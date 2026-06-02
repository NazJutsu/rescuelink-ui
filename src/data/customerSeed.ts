import type { OperatorPin, PastJob, Vehicle } from "../types";

export const MOCK_PICKUP_LABEL = "Near Shoreditch High St, London";
export const MOCK_DROPOFF_LABEL = "Halfords Autocentre, Islington (optional)";

/** Placeholders for free-form address fields on Home */
export const ADDRESS_PICKUP_PLACEHOLDER =
  "Street, town, postcode (full address)";
export const ADDRESS_DROPOFF_PLACEHOLDER =
  "Garage, dealership, or address (optional)";

/** London-ish centroid for map + mock pins */
export const MAP_CENTER = {
  latitude: 51.5245,
  longitude: -0.0772,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export const seedVehicles: Vehicle[] = [
  {
    id: "v1",
    make: "Ford",
    model: "Focus",
    registration: "AB21 CDE",
    year: 2019,
    isEv: false,
    isDefault: true,
  },
  {
    id: "v2",
    make: "Tesla",
    model: "Model 3",
    registration: "EV72 XYZ",
    year: 2023,
    isEv: true,
    isDefault: false,
  },
];

export const nearbyOperators: OperatorPin[] = [
  {
    id: "o1",
    name: "James M.",
    rating: 4.9,
    etaMinutes: 6,
    avatarInitials: "JM",
    latitude: 51.528,
    longitude: -0.082,
    flatbed: false,
    winch: true,
  },
  {
    id: "o2",
    name: "Sarah K.",
    rating: 4.8,
    etaMinutes: 9,
    avatarInitials: "SK",
    latitude: 51.518,
    longitude: -0.072,
    flatbed: true,
    winch: true,
  },
  {
    id: "o3",
    name: "Del Recovery Ltd",
    rating: 4.7,
    etaMinutes: 12,
    avatarInitials: "DR",
    latitude: 51.532,
    longitude: -0.065,
    flatbed: true,
    winch: false,
  },
];

export const seedJobHistory: PastJob[] = [
  {
    id: "j1",
    createdAt: "2026-05-02T14:22:00Z",
    status: "completed",
    operatorName: "James M.",
    amountGbp: 98.5,
    pickupLabel: "M25 J23 service area",
    vehicleReg: "AB21 CDE",
  },
  {
    id: "j2",
    createdAt: "2026-03-18T09:05:00Z",
    status: "cancelled",
    operatorName: "—",
    amountGbp: 0,
    pickupLabel: "Camden High St",
    vehicleReg: "AB21 CDE",
  },
];

export const ISSUE_OPTIONS = [
  "Won't start",
  "Flat tyre",
  "Accident damage",
  "Out of fuel",
  "Battery",
  "Locked out",
  "Other",
] as const;
