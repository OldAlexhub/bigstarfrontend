import { render, screen } from "@testing-library/react";
import { apiGet } from "../../api/client";
import SafetyAnalytics from "./SafetyAnalytics";

jest.mock("../../api/client", () => ({ apiGet: jest.fn() }));

test("shows monthly preventable and non-preventable rates per 100,000 miles", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") {
      return Promise.resolve({ divisions: [{ _id: "division-1", code: "D1", name: "Division One" }] });
    }
    return Promise.resolve({
      summary: {
        miles: 200000,
        preventableAccidents: 3,
        nonPreventableAccidents: 2,
        preventableRatePer100000: 1.5,
        nonPreventableRatePer100000: 1,
        reportedMonths: 1,
        zeroMileMonths: 0,
      },
      monthly: [{ id: "entry-1", month: "2026-08", miles: 200000, preventableAccidents: 3, nonPreventableAccidents: 2, preventableRatePer100000: 1.5, nonPreventableRatePer100000: 1 }],
      monthBounds: { from: "2026-08", to: "2026-08" },
    });
  });

  render(<SafetyAnalytics />);
  expect(await screen.findByText("Monthly accident rates")).toBeInTheDocument();
  expect(screen.getByText("August 2026")).toBeInTheDocument();
  expect(screen.getAllByText("200,000")).toHaveLength(2);
  expect(screen.getByLabelText("From")).toHaveValue("2026-08");
  expect(screen.getByLabelText("To")).toHaveValue("2026-08");
});
