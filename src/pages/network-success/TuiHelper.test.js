import { fireEvent, render, screen } from "@testing-library/react";
import TuiHelper from "./TuiHelper";
import { calculateTui, DEFAULT_TUI_INPUTS } from "./tuiIncentiveRules";

describe("calculateTui", () => {
  test("requires Core Hours and payment method before producing an outcome", () => {
    const result = calculateTui(DEFAULT_TUI_INPUTS, []);
    expect(result.ready).toBe(false);
    expect(result.missingDetails).toEqual([
      "Enter the provider's Core Hour Target.",
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

  test("flags 100% Core Hour fulfillment", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "50", paymentMethod: "per_hour" }, []);
    expect(result.hasReached100).toBe(true);
    expect(result.hoursRemaining).toBe(0);
    expect(result.visualExplanation).toContain("reached their full 50-hour Core Hour Target");
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
  });

  test("computes total pay for a per-trip division once trips completed and a base rate are entered", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip", baseRate: "15", tripsCompleted: "20" }, []);
    expect(result.totalPayReady).toBe(true);
    expect(result.totalPay).toBe(300);
  });

  test("does not compute total pay for a per-hour division, even if trips completed is set", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_hour", baseRate: "20", tripsCompleted: "20" }, []);
    expect(result.totalPayReady).toBe(false);
    expect(result.totalPay).toBeNull();
  });

  test("explains compensation differently for per-trip vs per-hour divisions", () => {
    const perTrip = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip" }, []);
    const perHour = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_hour" }, []);
    expect(perTrip.paymentMethodFulfillmentExplanation).toMatch(/paid for each completed trip/);
    expect(perHour.paymentMethodFulfillmentExplanation).toMatch(/hourly rate/);
  });

  test("builds a visual explanation with the actual numbers", () => {
    const result = calculateTui({ requiredCoreHours: "50", actualCoreHours: "45", paymentMethod: "per_trip" }, []);
    expect(result.visualExplanation).toContain("completed 45 of their 50-hour Core Hour Target");
    expect(result.visualExplanation).toContain("90.0% fulfillment");
    expect(result.visualExplanation).toContain("Schedule A");
  });
});

describe("TuiHelper", () => {
  test("explains Core Hour fulfillment from the three required inputs, with no save action", () => {
    render(<TuiHelper />);

    fireEvent.change(screen.getByLabelText("Core Hour Target"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Actual Core Hours Performed"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("radio", { name: "Per Trip" }));

    expect(screen.getAllByText("90.0%").length).toBeGreaterThan(0);
    expect(screen.getByText(/paid for each completed trip/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByText("Not saved")).toBeInTheDocument();
  });

  test("explains TUI in plain English, with the golden rule and the Revenue vs. Scheduled Hours distinction up front", () => {
    render(<TuiHelper />);
    expect(screen.getByText(/TUI \(Top Up Incentive\) is a bonus/)).toBeInTheDocument();
    expect(screen.getByText("The golden rule")).toBeInTheDocument();
    expect(screen.getByText(/Log in right when your scheduled hours start/)).toBeInTheDocument();
    expect(screen.getByText("Scheduled Service Hours")).toBeInTheDocument();
    expect(screen.getByText(/actually spent transporting a client or clients/)).toBeInTheDocument();
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

  test("seeds the optional Schedule A with the standard Core Incentive bands, with blank TUI amounts", () => {
    render(<TuiHelper />);
    expect(screen.getByLabelText("Tier 1 name")).toHaveValue("<79.9%");
    expect(screen.getByLabelText("Tier 1 minimum Core Hour fulfillment percent")).toHaveValue(0);
    expect(screen.getByLabelText("Tier 5 name")).toHaveValue("98 - 100%");
    expect(screen.getByLabelText("Tier 5 minimum Core Hour fulfillment percent")).toHaveValue(98);
    expect(screen.getByLabelText("Tier 6 name")).toHaveValue(">101%");
    expect(screen.getByLabelText("Tier 1 TUI amount")).toHaveValue(null);
  });

  test("the teaching example switches to the Schedule A rates entered below, instead of the generic illustration", () => {
    render(<TuiHelper />);
    fireEvent.click(screen.getByRole("radio", { name: "Per Trip" }));
    expect(screen.getByText("$10.00 / trip")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Base Rate"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Tier 5 TUI amount"), { target: { value: "2" } });

    expect(screen.getByText("$17.00 / trip")).toBeInTheDocument();
    expect(screen.queryByText("$10.00 / trip")).not.toBeInTheDocument();
    expect(screen.getByText(/From the Schedule A entered below/)).toBeInTheDocument();
  });

  test("only shows the Trips Completed field for a per-trip division", () => {
    render(<TuiHelper />);
    fireEvent.click(screen.getByRole("radio", { name: "Per Hour" }));
    expect(screen.queryByLabelText("Trips Completed")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Per Trip" }));
    expect(screen.getByLabelText("Trips Completed")).toBeInTheDocument();
  });

  test("shows total pay once trips completed and a base rate are entered for a per-trip division", () => {
    render(<TuiHelper />);
    fireEvent.change(screen.getByLabelText("Core Hour Target"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Actual Core Hours Performed"), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("radio", { name: "Per Trip" }));
    fireEvent.change(screen.getByLabelText("Trips Completed"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Base Rate"), { target: { value: "15" } });

    expect(screen.getByText("$300.00")).toBeInTheDocument();
  });
});
