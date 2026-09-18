import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPatch } from "../../api/client";
import ScheduleHistory from "./ScheduleHistory";

vi.mock("react-router-dom", () => {
  const selectedDivision = { _id: "division-1", timezone: "America/New_York" };
  return { useOutletContext: () => ({ selectedDivision }) };
});
vi.mock("../../api/client", () => ({ apiGet: vi.fn(), apiPatch: vi.fn() }));

const toISODate = (date) => date.toISOString().slice(0, 10);

const historicalRow = {
  _id: "day-1",
  route: { _id: "route-1", code: "R1", type: "standard" },
  operator: { name: "Operator One" },
  vehicle: { code: "V1" },
  pulloutAddress: "Garage",
  startTime: "08:00",
  endTime: "16:00",
  status: "active",
  serviceHours: 8,
  revenueHours: 7,
  disposition: null,
  dispositionSource: null,
};

test("Schedule History loads one past day and allows disposition-only corrections", async () => {
  apiGet.mockResolvedValue({ runCutDays: [historicalRow] });
  apiPatch.mockResolvedValue({ runCutDay: { ...historicalRow, disposition: "deployed_late", dispositionSource: "manual" } });
  render(<ScheduleHistory />);

  expect(await screen.findByText("R1")).toBeInTheDocument();
  const date = screen.getByLabelText("Schedule date");
  expect(date.value).toBe(date.max);
  expect(screen.queryByRole("combobox", { name: /Status/i })).not.toBeInTheDocument();

  await act(async () => {
    fireEvent.change(screen.getByTitle("Final outcome for this route"), { target: { value: "deployed_late" } });
  });
  await waitFor(() => expect(apiPatch).toHaveBeenCalledWith("/api/run-cut-days/day-1", { disposition: "deployed_late" }));
  await waitFor(() => expect(screen.getByRole("tab", { name: "Dispositioned (1)" })).toBeInTheDocument());
});

test("the date picker's earliest selectable day follows the configured lookback setting", async () => {
  apiGet.mockImplementation((path) => {
    if (path.startsWith("/api/settings")) return Promise.resolve({ settings: { scheduleHistoryLookbackWeeks: 5 } });
    return Promise.resolve({ runCutDays: [] });
  });

  render(<ScheduleHistory />);
  await screen.findByText(/Up to 5 weeks back/);

  const date = screen.getByLabelText("Schedule date");
  const expectedMin = toISODate(new Date(new Date(date.max).getTime() - (5 * 7 - 1) * 86_400_000));
  expect(date.min).toBe(expectedMin);
});

test("falls back to a six-week lookback when Settings is unavailable", async () => {
  apiGet.mockImplementation((path) => {
    if (path.startsWith("/api/settings")) return Promise.reject(new Error("No access"));
    return Promise.resolve({ runCutDays: [] });
  });

  render(<ScheduleHistory />);
  expect(await screen.findByText(/Up to 6 weeks back/)).toBeInTheDocument();
});
