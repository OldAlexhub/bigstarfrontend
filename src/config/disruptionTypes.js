// New requests use the correct Orion wording. The legacy value is retained
// only for recognizing and reporting historical records.
export const OSR_DISRUPTION_TYPE = "OSR (Orion Service Request)";
export const LEGACY_OSR_DISRUPTION_TYPE = "OSR (Out of Service Request)";
export const isOsrDisruptionType = (value) =>
  value === OSR_DISRUPTION_TYPE || value === LEGACY_OSR_DISRUPTION_TYPE;

export const DISRUPTION_TYPES = [
  "Adverse Operational Behavior",
  "Hotline Misuse",
  "Unperformed Duty",
  "Route Closed",
  OSR_DISRUPTION_TYPE,
  "Late to First",
  "Late to Zone",
  "Incorrect Service Request",
  "Late Service Request Submission",
  "Non-Deployment Issue",
  "Unreported Swap-Operator",
  "Unreported Swap-Vehicle",
  "Vehicle Breakdown",
  "Technical Malfunction",
  "Phone Login",
  "Late Deploy",
];
