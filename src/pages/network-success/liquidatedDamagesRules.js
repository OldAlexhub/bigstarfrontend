export const LD_QUESTIONS = [
  {
    id: "openWork",
    label: "Open Work",
    question: "Were any contracted route-days left uncovered?",
    requirement: "A contracted route must be operated on every documented service day.",
    consequence: "$150 per uncovered route/day",
  },
  {
    id: "openRoute",
    label: "Open Route",
    question: "Was any route left open after 7:00 PM local time the day before service?",
    requirement: "This charge is additional when a route remains open after the contractual cutoff.",
    consequence: "$100 additional per occurrence",
  },
  {
    id: "lateFirstPickup",
    label: "On time to first pickup",
    question: "Was a driver late to the first pre-scheduled pickup outside the ready-time window?",
    requirement: "Only pre-scheduled first trips are considered.",
    consequence: "$50 per occurrence",
  },
  {
    id: "accidentReporting",
    label: "Accident reporting",
    question: "Did any accident miss its reporting deadline: 24 hours, or 1 hour for a major accident?",
    requirement: "All accidents must be reported within 24 hours; major accidents within 1 hour.",
    consequence: "$500 per occurrence",
  },
  {
    id: "vehicleCleanliness",
    label: "Vehicle cleanliness",
    question: "Was a vehicle found out of compliance with the cleanliness standard?",
    requirement: "Interiors are cleaned daily and exteriors weekly or as needed.",
    consequence: "$25 per occurrence",
  },
  {
    id: "driverAppearance",
    label: "Driver appearance",
    question: "Was a driver found out of compliance with appearance requirements while in service?",
    requirement: "Drivers must meet the minimum requirements in the Statement of Work.",
    consequence: "$25 per occurrence",
  },
  {
    id: "preventableAccidents",
    label: "Preventable accidents",
    question: "Were any preventable accidents recorded in the review period?",
    requirement: "The maximum is 1.0 preventable accident per 60,000 miles driven.",
    consequence: "Contract termination if the maximum is exceeded",
  },
  {
    id: "noLeaveBehind",
    label: "No Leave Behind",
    question: "On paratransit door-to-door service, did a driver leave before confirming the passenger safely entered?",
    requirement: "The driver must confirm entry into the facility, home, or business before leaving.",
    consequence: "Authority damages plus contract termination",
  },
];

export const DEFAULT_LD_ANSWERS = {
  openWork: "",
  openWorkCount: "1",
  openRoute: "",
  openRouteCount: "1",
  lateFirstPickup: "",
  lateFirstPickupCount: "1",
  accidentReporting: "",
  accidentReportingCount: "1",
  vehicleCleanliness: "",
  vehicleCleanlinessCount: "1",
  driverAppearance: "",
  driverAppearanceCount: "1",
  preventableAccidents: "",
  preventableAccidentCount: "1",
  milesDriven: "60000",
  noLeaveBehind: "",
  authorityDamages: "",
};

const QUESTION_KEYS = LD_QUESTIONS.map((question) => question.id);
const wholeNumber = (value) => Math.max(0, Math.floor(Number(value) || 0));
const nonNegativeNumber = (value) => Math.max(0, Number(value) || 0);

export const calculateLdQuestionnaire = (answers = {}) => {
  const answeredCount = QUESTION_KEYS.filter((key) => answers[key] === "yes" || answers[key] === "no").length;
  const lineItems = [];
  const terminationReasons = [];
  const missingDetails = [];

  const addFixedCharge = ({ answerKey, countKey, label, rate, detailName = "occurrences" }) => {
    if (answers[answerKey] !== "yes") return;
    const quantity = wholeNumber(answers[countKey]);
    if (!quantity) {
      missingDetails.push(`Enter the number of ${detailName} for ${label}.`);
      return;
    }
    lineItems.push({ label, quantity, rate, amount: quantity * rate });
  };

  addFixedCharge({ answerKey: "openWork", countKey: "openWorkCount", label: "Open Work - uncovered route/day", rate: 150, detailName: "uncovered route-days" });
  addFixedCharge({ answerKey: "openRoute", countKey: "openRouteCount", label: "Open Route - open after 7 PM", rate: 100 });
  addFixedCharge({ answerKey: "lateFirstPickup", countKey: "lateFirstPickupCount", label: "Late to first pre-scheduled pickup", rate: 50 });
  addFixedCharge({ answerKey: "accidentReporting", countKey: "accidentReportingCount", label: "Accident reporting deadline missed", rate: 500 });
  addFixedCharge({ answerKey: "vehicleCleanliness", countKey: "vehicleCleanlinessCount", label: "Vehicle cleanliness non-compliance", rate: 25 });
  addFixedCharge({ answerKey: "driverAppearance", countKey: "driverAppearanceCount", label: "Driver appearance non-compliance", rate: 25 });

  let preventableRate = null;
  if (answers.preventableAccidents === "yes") {
    const accidents = wholeNumber(answers.preventableAccidentCount);
    const miles = nonNegativeNumber(answers.milesDriven);
    if (!accidents) missingDetails.push("Enter the number of preventable accidents.");
    if (!miles) missingDetails.push("Enter miles driven for the preventable-accident review period.");
    if (accidents && miles) {
      preventableRate = (accidents / miles) * 60000;
      if (preventableRate > 1) terminationReasons.push("Preventable accident rate exceeds 1.0 per 60,000 miles.");
    }
  }

  if (answers.noLeaveBehind === "yes") {
    terminationReasons.push("No Leave Behind violation on paratransit door-to-door service.");
    const hasAuthorityAmount = answers.authorityDamages !== "" && Number.isFinite(Number(answers.authorityDamages)) && Number(answers.authorityDamages) >= 0;
    if (!hasAuthorityAmount) {
      missingDetails.push("Enter the damages levied against Big Star by the Authority.");
    } else {
      const amount = nonNegativeNumber(answers.authorityDamages);
      lineItems.push({ label: "No Leave Behind - Authority damages", quantity: 1, rate: amount, amount });
    }
  }

  return {
    totalQuestions: QUESTION_KEYS.length,
    answeredCount,
    remainingCount: QUESTION_KEYS.length - answeredCount,
    lineItems,
    terminationReasons,
    preventableRate,
    missingDetails,
    amount: lineItems.reduce((sum, item) => sum + item.amount, 0),
    ready: answeredCount === QUESTION_KEYS.length && missingDetails.length === 0,
  };
};
