// OSR ("Out of Service Request") also suspends the route for tomorrow only
// when picked — a day-specific override that auto-reverts the day after,
// same as every other Deployment-side exception.
export const OSR_DISRUPTION_TYPE = "OSR (Out of Service Request)";

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
