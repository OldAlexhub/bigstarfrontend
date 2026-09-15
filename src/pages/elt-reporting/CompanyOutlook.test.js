import { render, screen } from "@testing-library/react";
import { apiGet } from "../../api/client";
import CompanyOutlook from "./CompanyOutlook";

vi.mock("../../api/client", () => ({ apiGet: vi.fn() }));

test("Company Outlook shows live scorecards, deterministic signals, and honest forecast readiness", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [{ _id: "d1", name: "Division One" }] });
    return Promise.resolve({
      currentWindow: { from: "2026-06-17", to: "2026-09-14" },
      modelVersion: "elt-outlook-v1",
      framing: "Operational productivity and execution indicators only.",
      snapshot: { available: false, stale: false, reason: "No official weekly forecast snapshot is available yet." },
      signals: [{ key: "efficient_but_fragile", severity: "watch", label: "Efficient but fragile", explanation: "Limited operating cushion." }],
      metrics: [{
        key: "runCutFulfillment",
        label: "Run Cut Fulfillment",
        group: "Fulfillment",
        format: "percent",
        value: 0.92,
        target: 0.97,
        direction: { direction: "steady", coverage: 0.92, confidence: "high" },
        methodology: "Deployed duties divided by scheduled duties.",
        drivers: ["Division One is the largest current watch-point."],
        forecast: {
          ready: false,
          reasons: [{ code: "missing_snapshot", message: "No official weekly forecast snapshot is available yet." }],
          points: [],
        },
      }],
    });
  });

  render(<CompanyOutlook />);

  expect(await screen.findByText("Run Cut Fulfillment")).toBeInTheDocument();
  expect(screen.getByText("92.0%")).toBeInTheDocument();
  expect(screen.getByText("Efficient but fragile")).toBeInTheDocument();
  expect(screen.getByText("Forecast not ready")).toBeInTheDocument();
  expect(screen.getAllByText("No official weekly forecast snapshot is available yet.").length).toBeGreaterThan(0);
  expect(screen.getByRole("option", { name: "Company — all divisions" })).toBeInTheDocument();
});
