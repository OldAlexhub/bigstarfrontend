import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPatch } from "../../api/client";
import LiveSchedule, { splitRowsByDisposition } from "./LiveSchedule";

jest.mock("react-router-dom", () => {
  const selectedDivision = {
    _id: "division-1",
    name: "Test Division",
    timezone: "America/New_York",
  };
  return {
    useOutletContext: () => ({ selectedDivision }),
  };
});

jest.mock("../../api/client", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}));

jest.mock("../../components/RunCutDayTable", () => function MockRunCutDayTable({
  rows,
  onPatch,
  showDisposition,
  emptyMessage,
}) {
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
});

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
    const coverageSelect = await screen.findByDisplayValue("CLOSED-1");
    fireEvent.change(coverageSelect, { target: { value: "" } });

    await waitFor(() => expect(screen.getByRole("tab", { name: "Open (2)" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Toggle CLOSED-1" })).toBeInTheDocument();
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
