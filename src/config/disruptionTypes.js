// An OSR suspends its selected service date only. Deployment can plan it
// ahead within the company-configured policy window without changing the
// persistent Master Run Cut.
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
