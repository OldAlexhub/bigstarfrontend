// TUI (performance-based incentive) education tool logic.
//
// Purpose: help a Network Success Manager understand and explain TUI, not run payroll.
// A provider's Core Hour Target, Actual Core Hours Performed, and Payment Method are
// the only mandatory inputs. Applying an actual division's Schedule A (base rate + TUI
// tiers) is optional - when it isn't entered, the tool still explains the mechanism and
// simply points to the Schedule A for the real number. There's no separate bonus rule:
// the >101% tier is where a division's above-target bonus, if any, belongs. Nothing
// here is fetched from a database, hardcoded as a real rate, or saved.
//
// Providers are independent contractors, not employees, so copy here avoids words like
// "required" that read as the company mandating their hours - it's a Core Hour Target
// under their Schedule A, not a requirement imposed on them.

export const PAYMENT_METHODS = [
  { id: "per_trip", label: "Per Trip" },
  { id: "per_hour", label: "Per Hour" },
];

export const DEFAULT_TUI_INPUTS = {
  requiredCoreHours: "",
  actualCoreHours: "",
  paymentMethod: "",
  tripsCompleted: "",
  baseRate: "",
};

let nextTierId = 1;
export const createTuiTier = (overrides = {}) => ({ id: nextTierId++, label: "", threshold: "", tuiAmount: "", ...overrides });

// The standard "% of Hours Performed within the Core Incentive" bands used across
// divisions' Schedule As. The bands themselves are fixed company-wide; only the TUI
// dollar amount for each band differs by division, so those start blank - the Network
// Success Manager only has to plug in that division's numbers, not rebuild the ladder.
//
// The "98 - 100%" and ">101%" labels are printed as closed/open ranges, but the engine
// only stores each tier's minimum (see the achieved-tier lookup below) - so a value like
// 100.50% is engine-correct as "98 - 100%" even though the label says otherwise, and
// there is no explicit owner for 100.01-100.99%. That's a business-rule precision gap in
// how these bands are defined, not a bug in the calculation.
export const DEFAULT_TUI_TIERS = [
  createTuiTier({ label: "<79.9%", threshold: "0" }),
  createTuiTier({ label: "80 - 84.99%", threshold: "80" }),
  createTuiTier({ label: "85 - 89.99%", threshold: "85" }),
  createTuiTier({ label: "90 - 97.99%", threshold: "90" }),
  createTuiTier({ label: "98 - 100%", threshold: "98" }),
  createTuiTier({ label: ">101%", threshold: "101" }),
];

// All copy below is written for the Network Success Manager reading this tool, not for
// the provider. It refers to the provider in the third person ("the provider", "their
// hours") rather than addressing them as "you".

// Fixed teaching examples for the "how a tier changes the rate" walkthrough below the
// payment-method picker. These are illustrative only - never used in a real
// calculation - so unlike everything else here, it's fine for them to be fixed numbers.
export const PAYMENT_METHOD_CONCEPT_EXPLANATIONS = {
  per_trip: "Providers aren't paid for the hours themselves. Their hours determine their TUI tier, and that tier determines how much they earn for each completed trip.",
  per_hour: "The closer a provider gets to their Core Hour Target, the higher hourly rate they unlock.",
};

export const PAYMENT_METHOD_TEACHING_EXAMPLES = {
  per_trip: {
    unit: "/ trip",
    rows: [
      { tier: "Base rate", rate: 10.0 },
      { tier: "Lower TUI tier", rate: 10.5 },
      { tier: "Higher TUI tier", rate: 10.8 },
      { tier: "100% fulfillment", rate: 11.0 },
    ],
  },
  per_hour: {
    unit: "/ hour",
    rows: [
      { tier: "Base rate", rate: 20.0 },
      { tier: "Lower TUI tier", rate: 21.0 },
      { tier: "Higher TUI tier", rate: 21.5 },
      { tier: "100% fulfillment", rate: 22.0 },
    ],
  },
};

const isEnteredNumber = (value) => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));
const nonNegativeNumber = (value) => Math.max(0, Number(value) || 0);

// Rounds to hundredths (the finest precision used in the Core Incentive bands, e.g.
// "84.99%") before it's ever compared against a tier threshold or shown on screen, so
// the displayed percentage and the tier it lands in always agree. The Number.EPSILON
// nudge avoids the classic floating-point case where a value that should land exactly
// on a boundary (e.g. 49 / 50 * 100) comes out a hair under it and rounds the wrong way.
const roundToHundredth = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const calculateTui = (inputs = {}, tiers = []) => {
  const missingDetails = [];

  const requiredEntered = isEnteredNumber(inputs.requiredCoreHours) && Number(inputs.requiredCoreHours) > 0;
  const actualEntered = isEnteredNumber(inputs.actualCoreHours);
  if (!requiredEntered) missingDetails.push("Enter the provider's Core Hour Target.");
  if (!actualEntered) missingDetails.push("Enter the Core Hours actually performed.");
  if (!inputs.paymentMethod) missingDetails.push("Select whether this division pays per trip or per hour.");

  const paymentMethodLabel = PAYMENT_METHODS.find((method) => method.id === inputs.paymentMethod)?.label || null;

  // Schedule A entry (base rate + tiers) is read independently of whether Core Hours
  // are filled in yet, so the teaching example can reflect it as soon as it's typed in.
  const validTiers = tiers
    .filter((tier) => isEnteredNumber(tier.threshold))
    .map((tier) => ({
      id: tier.id,
      label: tier.label?.trim() || `Tier at ${Number(tier.threshold)}%`,
      threshold: Number(tier.threshold),
      tuiAmount: nonNegativeNumber(tier.tuiAmount),
    }))
    .sort((a, b) => a.threshold - b.threshold);
  const baseRateEntered = isEnteredNumber(inputs.baseRate);
  const baseRate = baseRateEntered ? nonNegativeNumber(inputs.baseRate) : 0;

  if (missingDetails.length > 0) {
    return {
      ready: false,
      missingDetails,
      requiredCoreHours: null,
      actualCoreHours: null,
      fulfillmentPercent: null,
      hoursRemaining: null,
      hasReached100: false,
      paymentMethod: inputs.paymentMethod || null,
      paymentMethodLabel,
      visualExplanation: null,
      paymentMethodFulfillmentExplanation: null,
      validTiers,
      achievedTier: null,
      nextTier: null,
      hoursToNextTier: null,
      baseRateEntered,
      baseRate,
      tuiAmount: 0,
      rateReady: false,
      finalRate: null,
      tripsCompleted: null,
      totalPayReady: false,
      totalPay: null,
    };
  }

  const requiredCoreHours = nonNegativeNumber(inputs.requiredCoreHours);
  const actualCoreHours = nonNegativeNumber(inputs.actualCoreHours);
  // Rounded once, here, and reused for every tier comparison and every display below -
  // never re-derived from the raw division, so nothing downstream can drift from it.
  const fulfillmentPercent = roundToHundredth((actualCoreHours / requiredCoreHours) * 100);
  const hoursRemaining = roundToHundredth(Math.max(0, requiredCoreHours - actualCoreHours));
  const hasReached100 = actualCoreHours >= requiredCoreHours;
  // Two decimals throughout - matching the finest precision the Core Incentive bands
  // themselves are defined to (e.g. "97.99%") - so a displayed percentage can never
  // look like it crossed into a tier it didn't actually reach.
  const roundedPercent = fulfillmentPercent.toFixed(2);

  const visualExplanation = hasReached100
    ? `The provider reached their full ${requiredCoreHours}-hour Core Hour Target. That's 100% fulfillment - the full TUI available under their Schedule A.`
    : `The provider completed ${actualCoreHours} of their ${requiredCoreHours}-hour Core Hour Target. That's ${roundedPercent}% fulfillment. Their division's Schedule A determines which TUI tier ${roundedPercent}% qualifies for.`;

  const paymentMethodFulfillmentExplanation = inputs.paymentMethod === "per_trip"
    ? `Their ${roundedPercent}% fulfillment determines their TUI tier. That tier determines how much they're paid for each completed trip.`
    : `Their ${roundedPercent}% fulfillment determines their TUI tier. That tier determines their hourly rate.`;

  // Optional: apply the actual division's Schedule A, only if it has been entered.
  //
  // Known limitation: each tier stores only a minimum threshold, so the achieved tier
  // is "the highest tier whose minimum the fulfillment percentage has reached" - there
  // is no separate upper bound. That's a deliberate, correct model for an open-ended top
  // tier (">101%" has no ceiling), but it means a tier's own label can print a closed
  // range - e.g. "98 - 100%" - that this engine doesn't enforce as a ceiling: 100.50%
  // still lands in "98 - 100%" because 101 hasn't been reached yet, and exactly 101.00%
  // lands in ">101%" even though that label reads as strictly greater than 101. Where
  // Schedule A bands are meant to tile the number line without gaps or overlaps, this is
  // a business-rule precision question - what should own 100.01-100.99%? - not something
  // this engine can resolve on its own; it would need each tier's own upper bound, which
  // the Network Success Manager would have to supply per division.
  let achievedTier = null;
  let nextTier = null;
  for (const tier of validTiers) {
    if (fulfillmentPercent >= tier.threshold) achievedTier = tier;
    else if (!nextTier) nextTier = tier;
  }
  const hoursToNextTier = nextTier ? roundToHundredth(Math.max(0, (nextTier.threshold / 100) * requiredCoreHours - actualCoreHours)) : null;

  const tuiAmount = achievedTier ? achievedTier.tuiAmount : 0;

  const rateReady = baseRateEntered;
  const finalRate = rateReady ? baseRate + tuiAmount : null;

  // Trips Completed only applies to per-trip divisions - a per-hour division's total
  // pay is just the hourly rate, so there's nothing extra to multiply it by here.
  const tripsCompletedEntered = inputs.paymentMethod === "per_trip" && isEnteredNumber(inputs.tripsCompleted);
  const tripsCompleted = tripsCompletedEntered ? nonNegativeNumber(inputs.tripsCompleted) : null;
  const totalPayReady = rateReady && tripsCompletedEntered;
  const totalPay = totalPayReady ? finalRate * tripsCompleted : null;

  return {
    ready: true,
    missingDetails: [],
    requiredCoreHours,
    actualCoreHours,
    fulfillmentPercent,
    hoursRemaining,
    hasReached100,
    paymentMethod: inputs.paymentMethod,
    paymentMethodLabel,
    visualExplanation,
    paymentMethodFulfillmentExplanation,
    validTiers,
    achievedTier,
    nextTier,
    hoursToNextTier,
    baseRateEntered,
    baseRate,
    tuiAmount,
    rateReady,
    finalRate,
    tripsCompleted,
    totalPayReady,
    totalPay,
  };
};
