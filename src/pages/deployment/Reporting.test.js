import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { apiGet } from "../../api/client";
import Reporting from "./Reporting";

vi.mock("react-router-dom", () => {
  const selectedDivision = {
    _id: "division-1",
    name: "Test Division",
    timezone: "America/New_York",
  };
  return { useOutletContext: () => ({ selectedDivision }) };
});

vi.mock("../../api/client", () => ({ apiGet: vi.fn(), API_BASE: "" }));

vi.mock("../../components/MetricCard", () => ({
  default: function MockMetricCard({ label, value, tone }) {
    return (
      <div data-testid={`metric-${label}`} data-tone={tone}>
        {value}
      </div>
    );
  },
}));

test("Reporting gives Closed/Suspended its own disposition summary card", async () => {
  apiGet.mockImplementation((url) => {
    if (url.startsWith("/api/daily-issues/report")) return Promise.resolve({ issues: [] });
    if (url.startsWith("/api/run-cut-days")) {
      return Promise.resolve({
        runCutDays: [
          {
            _id: "day-1",
            date: "2026-09-09T00:00:00.000Z",
            route: { _id: "route-1", code: "R1" },
            operator: { _id: "operator-1", name: "Operator" },
            status: "suspended",
            disposition: "closed_suspended",
            disruptionType: "Unperformed Duty",
            clientNotes: "Closed",
          },
        ],
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });

  render(<Reporting />);

  const card = await screen.findByTestId("metric-Closed/Suspended");
  await waitFor(() => expect(card).toHaveTextContent("1"));
  expect(card).toHaveAttribute("data-tone", "bad");
});
