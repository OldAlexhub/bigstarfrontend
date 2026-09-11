import { render, screen } from "@testing-library/react";
import { apiGet } from "../../api/client";
import CustomerServiceAnalytics from "./CustomerServiceAnalytics";

jest.mock("../../api/client", () => ({ apiGet: jest.fn() }));

test("shows monthly rates calculated with Network Success trips", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") {
      return Promise.resolve({ divisions: [{ _id: "division-1", code: "D1", name: "Division One" }] });
    }
    return Promise.resolve({
      summary: {
        complaints: 5,
        compliments: 10,
        trips: 1000,
        complaintRatePer1000: 5,
        complimentRatePer1000: 10,
        reportedMonths: 1,
        matchedMonths: 1,
        missingTripMonths: 0,
      },
      monthly: [{ id: "entry-1", month: "2026-08", complaints: 5, compliments: 10, trips: 1000, complaintRatePer1000: 5, complimentRatePer1000: 10, hasTripData: true }],
      monthBounds: { from: "2026-08", to: "2026-08" },
    });
  });

  render(<CustomerServiceAnalytics />);
  expect(await screen.findByText("Monthly customer feedback rates")).toBeInTheDocument();
  expect(screen.getByText("August 2026")).toBeInTheDocument();
  expect(screen.getAllByText("1,000")).toHaveLength(2);
  expect(screen.getByLabelText("From")).toHaveValue("2026-08");
  expect(screen.getByLabelText("To")).toHaveValue("2026-08");
});
