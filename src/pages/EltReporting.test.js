import { render, screen } from "@testing-library/react";
import { apiGet } from "../api/client";
import EltReporting from "./EltReporting";

jest.mock("../api/client", () => ({ apiGet: jest.fn(), API_BASE: "" }));
jest.mock("../components/TrendChart", () => () => null);
jest.mock("react-router-dom", () => ({ Link: ({ children }) => <span>{children}</span> }));

test("ELT Reporting separates planned and actual revenue-hour fulfillment", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [] });
    return Promise.resolve({
      networkSummary: {
        runCutFulfillmentPct: 0.95,
        plannedRevenueHourFulfillmentPct: 0.9,
        actualRevenueHourFulfillmentPct: 0.875,
        actualRevenueComparableRouteDays: 2,
        revenueHoursAtRisk: 4,
        totalClosures: 0,
        totalLateFirst: 0,
        totalLateDeploy: 0,
        unassignedRoutesCount: 0,
      },
      priorNetworkSummary: null,
      trend: [],
      issues: [],
      divisions: [{
        divisionId: "division-1",
        name: "Division One",
        runCutFulfillmentPct: 0.95,
        plannedRevenueHourFulfillmentPct: 0.9,
        actualRevenueHourFulfillmentPct: 0.875,
        actualRevenueComparableRouteDays: 2,
        revenueHoursAtRisk: 4,
        totalClosures: 0,
        totalLateFirst: 0,
        totalLateDeploy: 0,
        unassignedRoutesCount: 0,
      }],
    });
  });

  render(<EltReporting />);

  expect(await screen.findByText("Division One")).toBeInTheDocument();
  expect(screen.getAllByText("Planned Revenue Hour Fulfillment").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Actual Revenue Hour Fulfillment").length).toBeGreaterThan(0);
  expect(screen.getAllByText("87.5%").length).toBeGreaterThan(0);
  expect(screen.getByText("2 uploaded route-days")).toBeInTheDocument();
});
