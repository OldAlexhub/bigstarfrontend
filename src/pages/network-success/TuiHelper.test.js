import { fireEvent, render, screen } from "@testing-library/react";
import TuiHelper from "./TuiHelper";
import { calculateTui, DEFAULT_TUI_INPUTS } from "./tuiIncentiveRules";

describe("calculateTui", () => {
  test("requires Core Hours and payment method before producing an outcome", () => {
    const result = calculateTui(DEFAULT_TUI_INPUTS, []);
    expect(result.ready).toBe(false);
    expect(result.missingDetails).toEqual([
      "Enter the provider's required Core Hours.",
      "Enter the Core Hours actually performed.",
      "Select whether this division pays per trip or per hour.",
    ]);
  });

  test("calculates Core Hour Fulfillment % and hours remaining", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip" }, []);
    expect(result.ready).toBe(true);
    expect(result.fulfillmentPercent).toBeCloseTo(90);
    expect(result.hoursRemaining).toBe(5);
    expect(result.hasReached100).toBe(false);
  });

  test("flags 100% Core Hour fulfillment and uses the full-TUI talking point", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "50", paymentMethod: "per_hour" }, []);
    expect(result.hasReached100).toBe(true);
    expect(result.hoursRemaining).toBe(0);
    expect(result.talkingPoint).toBe("You completed all of your required Core Hours, so you reached 100% fulfillment and earned the full TUI available under your Schedule A.");
  });

  test("does not require Schedule A tiers or a base rate to explain fulfillment", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip" }, []);
    expect(result.ready).toBe(true);
    expect(result.achievedTier).toBeNull();
    expect(result.rateReady).toBe(false);
  });

  test("applies an optionally entered Schedule A to find the tier and final rate", () => {
    const tiers = [
      { id: 1, label: "Tier 1", threshold: "80", tuiAmount: "2" },
      { id: 2, label: "Tier 2", threshold: "90", tuiAmount: "4" },
      { id: 3, label: "Tier 3", threshold: "100", tuiAmount: "6" },
    ];
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip", baseRate: "15" }, tiers);
    expect(result.achievedTier.label).toBe("Tier 2");
    expect(result.rateReady).toBe(true);
    expect(result.finalRate).toBe(19);
    expect(result.nextTier.label).toBe("Tier 3");
    expect(result.hoursToNextTier).toBe(5);
    expect(result.talkingPoint).toContain('You\'re in the "Tier 2" tier, which pays 19.00 per trip.');
  });

  test("explains compensation differently for per-trip vs per-hour divisions", () => {
    const perTrip = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip" }, []);
    const perHour = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_hour" }, []);
    expect(perTrip.paymentMethodFulfillmentExplanation).toMatch(/paid for each completed trip/);
    expect(perHour.paymentMethodFulfillmentExplanation).toMatch(/hourly rate/);
  });

  test("builds a Network Success talking point with the actual numbers", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip" }, []);
    expect(result.talkingPoint).toContain("required to complete 50 Core Hours and completed 45");
    expect(result.talkingPoint).toContain("90.0% fulfillment");
    expect(result.talkingPoint).toContain("Schedule A");
  });
});

describe("TuiHelper", () => {
  test("explains Core Hour fulfillment from the three required inputs, with no save action", () => {
    render(<TuiHelper />);

    fireEvent.change(screen.getByLabelText("Required Core Hours"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Actual Core Hours Performed"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("radio", { name: "Per Trip" }));

    expect(screen.getAllByText("90.0%").length).toBeGreaterThan(0);
    expect(screen.getByText(/paid for each completed trip/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByText("Not saved")).toBeInTheDocument();
  });

  test("shows a teaching example once a payment method is chosen, without requiring Schedule A entry", () => {
    render(<TuiHelper />);
    expect(screen.getByText(/Pick Per Trip or Per Hour/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Per Hour" }));
    expect(screen.getByText("$20.00 / hour")).toBeInTheDocument();
    expect(screen.getByText("$22.00 / hour")).toBeInTheDocument();
    expect(screen.getByText(/Example only/)).toBeInTheDocument();
  });

  test("the optional Schedule A section is collapsed by default", () => {
    render(<TuiHelper />);
    const details = screen.getByText(/Optional: apply this division's Schedule A/).closest("details");
    expect(details.open).toBe(false);
  });
});
