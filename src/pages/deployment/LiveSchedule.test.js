import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPost, apiPatch } from "../../api/client";
import LiveSchedule, { splitRowsByDisposition } from "./LiveSchedule";

vi.mock("react-router-dom", () => {
  const selectedDivision = {
    _id: "division-1",
    code: "DIV_3_GL",
    name: "Test Division",
    timezone: "America/New_York",
  };
  return {
    useOutletContext: () => ({ selectedDivision }),
  };
});

vi.mock("../../api/client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock("../../components/RunCutDayTable", () => ({
  default: function MockRunCutDayTable({ rows, onPatch, showDisposition, emptyMessage }) {
    return (
      <div>
        <span data-testid="show-disposition">{String(showDisposition)}</span>
        {rows.length === 0 && <span>{emptyMessage}</span>}
        {rows.map((row) => (
          <div key={row._id}>
            <span>{row.route.code}</span>
            {showDisposition && (
              <button
                type="button"
                onClick={() => onPatch(row, { disposition: row.disposition ? null : "deployed_on_time" })}
              >
                Toggle {row.route.code}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

const originalRows = [
  { _id: "open-1", route: { _id: "route-1", code: "OPEN-1" }, disposition: null },
  { _id: "closed-1", route: { _id: "route-2", code: "CLOSED-1" }, disposition: "deployed_late" },
];

describe("Live Schedule today route tabs", () => {
  let storedRows;
  let standbyRows;

  beforeEach(() => {
    storedRows = originalRows.map((row) => ({ ...row, route: { ...row.route } }));
    standbyRows = [];
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    apiGet.mockImplementation((url) => {
      if (url.startsWith("/api/run-cut-days")) {
        return Promise.resolve({ runCutDays: url.includes("includeStandby=1") ? standbyRows : storedRows });
      }
      if (url.startsWith("/api/routes")) return Promise.resolve({ routes: [] });
      if (url.startsWith("/api/operators")) return Promise.resolve({ operators: [] });
      if (url.startsWith("/api/vehicles")) return Promise.resolve({ vehicles: [] });
      if (url.startsWith("/api/run-cuts")) return Promise.resolve({ runCuts: [] });
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    apiPatch.mockImplementation((url, patch) => {
      if (url.endsWith("/deployed")) {
        const standby = standbyRows.find((row) => url.includes(row._id));
        storedRows = storedRows.map((row) =>
          row.route._id === standby.coveringRoute._id ? { ...row, disposition: null } : row
        );
        const updatedStandby = { ...standby, deployed: false, coveringRoute: null };
        standbyRows = standbyRows.map((row) => (row._id === standby._id ? updatedStandby : row));
        return Promise.resolve({ runCutDay: updatedStandby });
      }
      const id = url.split("/").pop();
      const current = storedRows.find((row) => row._id === id);
      const updated = { ...current, ...patch };
      storedRows = storedRows.map((row) => (row._id === id ? updated : row));
      return Promise.resolve({ runCutDay: updated });
    });
    apiPost.mockResolvedValue({ runCutDay: {} });
  });

  test("defaults to Open and clearing a disposition moves a route back from Closed", async () => {
    render(<LiveSchedule />);

    expect(await screen.findByText("OPEN-1")).toBeInTheDocument();
    expect(screen.queryByText("CLOSED-1")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open (1)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Closed (1)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Closed (1)" }));
    expect(screen.getByText("CLOSED-1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Toggle CLOSED-1" }));

    await waitFor(() => expect(screen.queryByText("CLOSED-1")).not.toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Closed (0)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Open (2)" }));
    expect(screen.getByText("CLOSED-1")).toBeInTheDocument();
  });

  test("tomorrow remains one ungrouped table without disposition controls", async () => {
    render(<LiveSchedule />);
    await screen.findByRole("tab", { name: "Open (1)" });

    fireEvent.click(screen.getByRole("button", { name: /Tomorrow/ }));

    await waitFor(() => expect(screen.queryByRole("tab", { name: /Open/ })).not.toBeInTheDocument());
    expect(screen.getByText("OPEN-1")).toBeInTheDocument();
    expect(screen.getByText("CLOSED-1")).toBeInTheDocument();
    expect(screen.getByTestId("show-disposition")).toHaveTextContent("false");
  });

  test("removing standby coverage returns its covered route to Open", async () => {
    standbyRows = [
      {
        _id: "standby-day-1",
        route: { _id: "standby-route-1", code: "STBY-1", type: "standby" },
        status: "active",
        deployed: true,
        coveringRoute: { _id: "route-2", code: "CLOSED-1" },
      },
    ];

    render(<LiveSchedule />);
    expect(await screen.findByText("Division 3 Shared Standbys — Today")).toBeInTheDocument();
    expect(screen.getByText("The same standby duties can be deployed on ADA or GoLink revenue routes.")).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("sharedStandby=1"));
    const coverageSelect = await screen.findByDisplayValue("CLOSED-1");
    fireEvent.change(coverageSelect, { target: { value: "" } });

    await waitFor(() => expect(screen.getByRole("tab", { name: "Open (2)" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Toggle CLOSED-1" })).toBeInTheDocument();
  });

  test("processes an OSR for a selected future daily schedule without editing Master Run Cuts", async () => {
    render(<LiveSchedule />);
    fireEvent.click(await screen.findByRole("button", { name: /Out of Service Request/ }));

    const processButton = await screen.findByRole("button", { name: "Process OSR" });
    fireEvent.change(screen.getByLabelText("OSR notes"), { target: { value: "Approved service request" } });
    fireEvent.click(processButton);

    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith(
        "/api/run-cut-days/open-1",
        expect.objectContaining({
          disruptionType: "OSR (Out of Service Request)",
          disruptionNotes: "Approved service request",
        })
      )
    );
    expect(await screen.findByText(/OSR processed for OPEN-1/)).toBeInTheDocument();
  });

  test("adds revenue only from an unscheduled route in the selected division pool", async () => {
    apiGet.mockImplementation((url) => {
      if (url.startsWith("/api/run-cut-days")) return Promise.resolve({ runCutDays: storedRows });
      if (url.startsWith("/api/routes")) {
        return Promise.resolve({
          routes: [
            { _id: "route-1", code: "OPEN-1" },
            { _id: "route-3", code: "EXTRA-3" },
          ],
        });
      }
      if (url.startsWith("/api/run-cuts")) return Promise.resolve({ runCuts: [] });
      if (url.startsWith("/api/operators")) return Promise.resolve({ operators: [] });
      if (url.startsWith("/api/vehicles")) return Promise.resolve({ vehicles: [] });
      if (url.startsWith("/api/settings")) return Promise.resolve({ settings: { osrAdvanceDays: 7 } });
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<LiveSchedule />);
    fireEvent.click(await screen.findByRole("button", { name: "+ Add Revenue Route" }));

    const routeSelect = screen.getByLabelText("Revenue route");
    expect(routeSelect).not.toHaveTextContent("OPEN-1");
    expect(routeSelect).toHaveTextContent("EXTRA-3");
    fireEvent.change(routeSelect, { target: { value: "route-3" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Added demand" } });
    fireEvent.click(screen.getByRole("button", { name: "Add revenue route" }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        "/api/run-cut-days",
        expect.objectContaining({ routeId: "route-3", notes: "Added demand" })
      )
    );
  });
});

test("every nonblank disposition is closed", () => {
  const rows = [
    { disposition: null },
    { disposition: "deployed_on_time" },
    { disposition: "deployed_late" },
    { disposition: "deployed_stby" },
    { disposition: "reallocated" },
    { disposition: "closed_suspended" },
  ];

  const split = splitRowsByDisposition(rows);
  expect(split.open).toHaveLength(1);
  expect(split.closed).toHaveLength(5);
});
