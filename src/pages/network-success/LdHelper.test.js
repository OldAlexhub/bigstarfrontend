import { fireEvent, render, screen } from "@testing-library/react";
import LdHelper from "./LdHelper";
import { calculateLdQuestionnaire, DEFAULT_LD_ANSWERS } from "./liquidatedDamagesRules";

const allNo = {
  ...DEFAULT_LD_ANSWERS,
  openWork: "no",
  openRoute: "no",
  lateFirstPickup: "no",
  accidentReporting: "no",
  vehicleCleanliness: "no",
  driverAppearance: "no",
  preventableAccidents: "no",
  noLeaveBehind: "no",
};

describe("calculateLdQuestionnaire", () => {
  test("requires every yes/no question before producing a final assessment", () => {
    const result = calculateLdQuestionnaire(DEFAULT_LD_ANSWERS);
    expect(result.ready).toBe(false);
    expect(result.answeredCount).toBe(0);
    expect(result.totalQuestions).toBe(8);
  });

  test("combines every applicable monetary LD", () => {
    const result = calculateLdQuestionnaire({
      ...allNo,
      openWork: "yes",
      openWorkCount: "2",
      openRoute: "yes",
      openRouteCount: "1",
      lateFirstPickup: "yes",
      lateFirstPickupCount: "3",
      accidentReporting: "yes",
      accidentReportingCount: "2",
      vehicleCleanliness: "yes",
      vehicleCleanlinessCount: "3",
      driverAppearance: "yes",
      driverAppearanceCount: "2",
    });

    expect(result.ready).toBe(true);
    expect(result.amount).toBe(1675);
    expect(result.lineItems).toHaveLength(6);
  });

  test("evaluates the preventable-accident rate and termination outcome", () => {
    const withinLimit = calculateLdQuestionnaire({ ...allNo, preventableAccidents: "yes", preventableAccidentCount: "1", milesDriven: "60000" });
    const aboveLimit = calculateLdQuestionnaire({ ...allNo, preventableAccidents: "yes", preventableAccidentCount: "2", milesDriven: "60000" });
    expect(withinLimit.terminationReasons).toHaveLength(0);
    expect(aboveLimit.terminationReasons).toContain("Preventable accident rate exceeds 1.0 per 60,000 miles.");
  });

  test("adds Authority damages and termination for No Leave Behind", () => {
    const result = calculateLdQuestionnaire({ ...allNo, noLeaveBehind: "yes", authorityDamages: "1250" });
    expect(result.ready).toBe(true);
    expect(result.amount).toBe(1250);
    expect(result.terminationReasons).toHaveLength(1);
  });

  test("all No answers produce a completed zero-dollar assessment", () => {
    const result = calculateLdQuestionnaire(allNo);
    expect(result.ready).toBe(true);
    expect(result.amount).toBe(0);
    expect(result.lineItems).toHaveLength(0);
    expect(result.terminationReasons).toHaveLength(0);
  });
});

describe("LdHelper", () => {
  test("combines multiple Yes answers and has no save action", () => {
    render(<LdHelper />);

    const yesButtons = screen.getAllByRole("radio", { name: /^yes$/i });
    const noButtons = screen.getAllByRole("radio", { name: /^no$/i });
    fireEvent.click(yesButtons[0]);
    fireEvent.change(screen.getByLabelText("Number of uncovered route-days"), { target: { value: "2" } });
    fireEvent.click(yesButtons[1]);
    fireEvent.change(screen.getByLabelText("Number of after-7 PM occurrences"), { target: { value: "1" } });
    noButtons.slice(2).forEach((button) => fireEvent.click(button));

    expect(screen.getByText("$400.00")).toBeInTheDocument();
    expect(screen.getByText("Open Work - uncovered route/day")).toBeInTheDocument();
    expect(screen.getByText("Open Route - open after 7 PM")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });
});
