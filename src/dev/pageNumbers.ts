/** Dev-only screen index — update when adding routes. */
export type DevPageRef = {
  id: string;
  label: string;
};

export const DEV_PAGES = {
  landing: { id: "P01", label: "Landing" },
  login: { id: "P02", label: "Login" },
  register: { id: "P03", label: "Register" },
  legal: { id: "P04", label: "Legal" },
  homeMap: { id: "P10", label: "Home map" },
  jobHistory: { id: "P11", label: "Job history" },
  myVehicles: { id: "P12", label: "My vehicles" },
  account: { id: "P13", label: "Account" },
  bookingFlow: { id: "P14", label: "Booking flow" },
  notifications: { id: "P15", label: "Notifications" },
  liveTracking: { id: "P16", label: "Live tracking" },
  operatorOnboarding: { id: "P20", label: "Driver onboarding" },
  operatorPending: { id: "P21", label: "Driver pending" },
  operatorRejected: { id: "P22", label: "Driver rejected" },
  operatorHome: { id: "P23", label: "Driver home" },
  operatorJobs: { id: "P24", label: "Driver jobs" },
  operatorEarnings: { id: "P25", label: "Driver earnings" },
  operatorMore: { id: "P26", label: "Driver more" },
  operatorLiveJob: { id: "P27", label: "Driver live job" },
  driverInspection: { id: "P28", label: "Driver inspection" },
} as const satisfies Record<string, DevPageRef>;
