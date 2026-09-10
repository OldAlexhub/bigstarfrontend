import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPatch } from "../../api/client";
import NetworkPerformance from "./NetworkPerformance";

jest.mock("../../api/client", () => ({ apiGet: jest.fn(), apiPatch: jest.fn() }));

const analysis = {
  summary: { trips: 40, otpPct: 0.95, tpsh: 2.75, closed: 1, partiallyClosed: 0, lateToFirst: 1, lateDeploy: 0, routeDays: 2 },
  insights: ["Trip-weighted OTP is 95.0% across 40 completed trips."],
  daily: [{ date: "2026-09-01", trips: 40, otpPct: 0.95, tpsh: 2.75, closed: 1, partiallyClosed: 0 }],
  providers: [{ provider: "Provider A", routeDays: 2, trips: 40, otpPct: 0.95, tpsh: 2.75, closed: 1, partiallyClosed: 0, lateToFirst: 1, lateDeploy: 0 }],
  attention: [],
  records: [{ id: "entry-1", date: "2026-09-01", route: "R1", trips: 40, operator: "Master Operator", operatorId: "operator-1", provider: "Provider A", providerId: "provider-1", assignmentSource: "master_run_cuts", hasAssignmentOverride: false }],
  providerNames: ["Provider A"],
  hasProviderData: true,
  dateBounds: { from: "2026-09-01", to: "2026-09-02" },
};

test("Performance supports accessible date and provider filters and renders automated analysis", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [{ _id: "division-1", code: "D1", name: "Division One" }] });
    if (path === "/api/operators") return Promise.resolve({ operators: [{ _id: "operator-1", name: "Master Operator", provider: { _id: "provider-1", name: "Provider A" }, active: true }] });
    return Promise.resolve(analysis);
  });
  apiPatch.mockResolvedValue({ message: "saved" });
  render(<NetworkPerformance />);

  expect(await screen.findByText("Automated readout")).toBeInTheDocument();
  expect(screen.getByText("Trip-weighted OTP is 95.0% across 40 completed trips.")).toBeInTheDocument();
  expect(screen.getByLabelText("From")).toHaveValue("2026-09-01");
  expect(screen.getByLabelText("To")).toHaveValue("2026-09-02");

  fireEvent.change(screen.getByLabelText("Provider"), { target: { value: "Provider A" } });
  fireEvent.change(screen.getByLabelText("Source"), { target: { value: "vision" } });
  fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
  await waitFor(() => expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("provider=Provider+A")));
  expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("source=vision"));

  fireEvent.click(screen.getByRole("button", { name: "View all 1 route-days" }));
  expect(screen.getByText("Master Run Cuts")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Correct" }));
  fireEvent.click(screen.getByRole("button", { name: "Save and reuse" }));
  await waitFor(() => expect(apiPatch).toHaveBeenCalledWith(
    "/api/network-success/entries/entry-1/assignment",
    { operatorId: "operator-1", reuseAssignment: true }
  ));
});
