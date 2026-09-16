// TUI (performance-based incentive) education tool logic.
//
// Purpose: help a Network Success Manager understand and explain TUI, not run payroll.
// Required Core Hours, Actual Core Hours Performed, and Payment Method are the only
// required inputs. Applying an actual division's Schedule A (base rate, TUI tiers,
// bonus rules) is optional - when it isn't entered, the tool still explains the
// mechanism and simply points to the Schedule A for the real number. Nothing here is
// fetched from a database, hardcoded as a real rate, or saved.

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
  bonusHours: "",
  bonusRate: "",
};

let nextTierId = 1;
export const createTuiTier = () => ({ id: nextTierId++, label: "", threshold: "", tuiAmount: "" });
export const DEFAULT_TUI_TIERS = [createTuiTier(), createTuiTier(), createTuiTier()];

// All copy below - other than the Network Success talking point, which is a script
// meant to be read or paraphrased to the provider - is written for the Network Success
// Manager reading this tool, not for the provider. It refers to the provider in the
// third person ("the provider", "their hours") rather than addressing them as "you".
const SIMPLE_EXPLANATION = "The more of a provider's required Core Hours they complete, the higher TUI rate they can earn.";

// Fixed teaching examples for the "how a tier changes the rate" walkthrough below the
// payment-method picker. These are illustrative only - never used in a real
// calculation - so unlike everything else here, it's fine for them to be fixed numbers.
export const PAYMENT_METHOD_CONCEPT_EXPLANATIONS = {
  per_trip: "Providers aren't paid for the hours themselves. Their hours determine their TUI tier, and that tier determines how much they earn for each completed trip.",
  per_hour: "The more of their required Core Hours a provider completes, the higher hourly rate they unlock.",
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

export const calculateTui = (inputs = {}, tiers = []) => {
  const missingDetails = [];

  const requiredEntered = isEnteredNumber(inputs.requiredCoreHours) && Number(inputs.requiredCoreHours) > 0;
  const actualEntered = isEnteredNumber(inputs.actualCoreHours);
  if (!requiredEntered) missingDetails.push("Enter the provider's required Core Hours.");
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
      simpleExplanation: SIMPLE_EXPLANATION,
      visualExplanation: null,
      paymentMethodFulfillmentExplanation: null,
      talkingPoint: null,
      validTiers,
      achievedTier: null,
      nextTier: null,
      hoursToNextTier: null,
      baseRateEntered,
      baseRate,
      tuiAmount: 0,
      bonusApplies: false,
      bonusRate: 0,
      rateReady: false,
      finalRate: null,
      tripsCompleted: null,
      totalPayReady: false,
      totalPay: null,
    };
  }

  const requiredCoreHours = nonNegativeNumber(inputs.requiredCoreHours);
  const actualCoreHours = nonNegativeNumber(inputs.actualCoreHours);
  const fulfillmentPercent = (actualCoreHours / requiredCoreHours) * 100;
  const hoursRemaining = Math.max(0, requiredCoreHours - actualCoreHours);
  const hasReached100 = actualCoreHours >= requiredCoreHours;
  const roundedPercent = fulfillmentPercent.toFixed(1);

  const visualExplanation = hasReached100
    ? `The provider completed all ${requiredCoreHours} of their required Core Hours. That's 100% fulfillment - the full TUI available under their Schedule A.`
    : `The provider completed ${actualCoreHours} of their ${requiredCoreHours} required Core Hours. That's ${roundedPercent}% fulfillment. Their division's Schedule A determines which TUI tier ${roundedPercent}% qualifies for.`;

  const paymentMethodFulfillmentExplanation = inputs.paymentMethod === "per_trip"
    ? `Their ${roundedPercent}% fulfillment determines their TUI tier. That tier determines how much they're paid for each completed trip.`
    : `Their ${roundedPercent}% fulfillment determines their TUI tier. That tier determines their hourly rate.`;

  // Optional: apply the actual division's Schedule A, only if it has been entered.
  let achievedTier = null;
  let nextTier = null;
  for (const tier of validTiers) {
    if (fulfillmentPercent >= tier.threshold) achievedTier = tier;
    else if (!nextTier) nextTier = tier;
  }
  const hoursToNextTier = nextTier ? Math.max(0, (nextTier.threshold / 100) * requiredCoreHours - actualCoreHours) : null;

  const tuiAmount = achievedTier ? achievedTier.tuiAmount : 0;

  const bonusHoursEntered = isEnteredNumber(inputs.bonusHours) && Number(inputs.bonusHours) > 0;
  const bonusRateEntered = isEnteredNumber(inputs.bonusRate) && Number(inputs.bonusRate) > 0;
  const bonusApplies = bonusHoursEntered && bonusRateEntered && actualCoreHours >= requiredCoreHours + Number(inputs.bonusHours);
  const bonusRate = bonusApplies ? nonNegativeNumber(inputs.bonusRate) : 0;

  const rateReady = baseRateEntered;
  const finalRate = rateReady ? baseRate + tuiAmount + bonusRate : null;

  // Trips Completed only applies to per-trip divisions - a per-hour division's total
  // pay is just the hourly rate, so there's nothing extra to multiply it by here.
  const tripsCompletedEntered = inputs.paymentMethod === "per_trip" && isEnteredNumber(inputs.tripsCompleted);
  const tripsCompleted = tripsCompletedEntered ? nonNegativeNumber(inputs.tripsCompleted) : null;
  const totalPayReady = rateReady && tripsCompletedEntered;
  const totalPay = totalPayReady ? finalRate * tripsCompleted : null;

  let talkingPoint = hasReached100
    ? "You completed all of your required Core Hours, so you reached 100% fulfillment and earned the full TUI available under your Schedule A."
    : `You were required to complete ${requiredCoreHours} Core Hours and completed ${actualCoreHours}. That puts you at ${roundedPercent}% fulfillment. Based on your Schedule A, ${roundedPercent}% places you in this TUI tier, which determines your applicable pay rate.`;
  if (achievedTier) {
    talkingPoint += ` You're in the "${achievedTier.label}" tier${rateReady ? `, which pays ${finalRate.toFixed(2)} ${inputs.paymentMethod === "per_hour" ? "per hour" : "per trip"}.` : "."}`;
  }
  if (totalPayReady) {
    talkingPoint += ` For ${tripsCompleted} completed trip${tripsCompleted === 1 ? "" : "s"}, that's a total of $${totalPay.toFixed(2)}.`;
  }

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
    simpleExplanation: SIMPLE_EXPLANATION,
    visualExplanation,
    paymentMethodFulfillmentExplanation,
    talkingPoint,
    validTiers,
    achievedTier,
    nextTier,
    hoursToNextTier,
    baseRateEntered,
    baseRate,
    tuiAmount,
    bonusApplies,
    bonusRate,
    rateReady,
    finalRate,
    tripsCompleted,
    totalPayReady,
    totalPay,
  };
};
