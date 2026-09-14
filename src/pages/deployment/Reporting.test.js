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

const osrIssues = [
  {
    _id: "osr-issue-1",
    date: "2026-09-15T00:00:00.000Z",
    route: { _id: "route-1", code: "R1" },
    operator: { _id: "operator-1", name: "Operator One" },
    disruptionType: "OSR (Out of Service Request)",
    notes: "Approved maintenance request",
  },
  {
    _id: "osr-issue-2",
    date: "2026-09-16T00:00:00.000Z",
    route: { _id: "route-1", code: "R1" },
    disruptionType: "OSR (Out of Service Request)",
    notes: "Second request",
  },
];

test("Reporting gives Closed/Suspended its own disposition summary card", async () => {
  apiGet.mockReset();
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

test("Reporting summarizes processed OSRs and shows their daily schedule details", async () => {
  apiGet.mockReset();
  apiGet.mockImplementation((url) => {
    if (url.startsWith("/api/daily-issues/report")) return Promise.resolve({ issues: osrIssues });
    if (url.startsWith("/api/run-cut-days")) {
      return Promise.resolve({
        runCutDays: [
          {
            _id: "osr-day-1",
            date: "2026-09-15T00:00:00.000Z",
            route: { _id: "route-1", code: "R1" },
            operator: { _id: "operator-1", name: "Operator One" },
            vehicle: { _id: "vehicle-1", code: "BUS-10" },
            startTime: "08:00",
            endTime: "16:00",
            status: "suspended",
            disruptionType: "OSR (Out of Service Request)",
            disruptionNotes: "Approved maintenance request",
          },
          {
            _id: "osr-day-2",
            date: "2026-09-16T00:00:00.000Z",
            route: { _id: "route-1", code: "R1" },
            status: "suspended",
            disruptionType: "OSR (Out of Service Request)",
          },
        ],
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });

  render(<Reporting />);

  await waitFor(() => expect(screen.getByTestId("metric-OSRs Processed")).toHaveTextContent("2"));
  expect(screen.getByTestId("metric-Routes with OSRs")).toHaveTextContent("1");
  expect(screen.getByTestId("metric-OSR Service Days")).toHaveTextContent("2");
  expect(screen.getAllByText("Approved maintenance request").length).toBeGreaterThan(0);
  expect(screen.getByText("BUS-10")).toBeInTheDocument();
});
