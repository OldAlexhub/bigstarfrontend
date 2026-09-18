import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { apiGet, apiPatch, apiDownload } from "../../api/client";
import PermanentOsr from "./PermanentOsr";

const permission = vi.hoisted(() => ({ canWrite: true }));
const outletContext = vi.hoisted(() => ({
  selectedDivision: { _id: "division-1", code: "D1", name: "Division One" },
}));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => outletContext,
}));
vi.mock("../../api/client", () => ({ apiGet: vi.fn(), apiPatch: vi.fn(), apiDownload: vi.fn() }));
vi.mock("../../components/PageAccessRoute", () => ({ usePagePermission: () => permission }));

const runCut = {
  _id: "run-cut-1",
  route: { _id: "route-1", code: "1029-B", type: "standard" },
  operator: { _id: "operator-1", name: "Joseph Mayer", pulloutAddress: "100 Main St" },
  vehicle: { _id: "vehicle-1", code: "4484-WV" },
  pulloutAddress: "100 Main St",
  startTime: "06:00",
  endTime: "18:00",
  status: "active",
  daysOfWeek: ["MON", "TUE"],
  clientNotes: "",
  disruptionNotes: "",
};

let changeHistoryEntries = [];

beforeEach(() => {
  permission.canWrite = true;
  changeHistoryEntries = [];
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path.startsWith("/api/run-cuts")) return Promise.resolve({ runCuts: [runCut] });
    if (path.startsWith("/api/operators")) {
      return Promise.resolve({
        operators: [
          { _id: "operator-1", name: "Joseph Mayer", pulloutAddress: "100 Main St", active: true },
          { _id: "operator-2", name: "Andre Smith Jr.", pulloutAddress: "500 Second Ave", active: true },
        ],
      });
    }
    if (path.startsWith("/api/vehicles")) {
      return Promise.resolve({ vehicles: [{ _id: "vehicle-1", code: "4484-WV", active: true }] });
    }
    if (path.startsWith("/api/permanent-osr-changes")) {
      return Promise.resolve({ entries: changeHistoryEntries });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
  apiPatch.mockResolvedValue({
    runCut: { ...runCut, operator: { _id: "operator-2", name: "Andre Smith Jr." } },
    vehicleConflicts: {},
  });
});

test("a permanent OSR requires a route and a reason before it can be processed", async () => {
  render(<PermanentOsr />);
  expect(await screen.findByText("1029-B")).toBeInTheDocument();

  const submit = screen.getByRole("button", { name: "Process permanent OSR" });
  expect(submit).toBeDisabled();

  fireEvent.change(screen.getByLabelText("Route"), { target: { value: "run-cut-1" } });
  expect(submit).toBeDisabled();

  fireEvent.change(screen.getByLabelText("Permanent OSR reason"), { target: { value: "Client requested a change" } });
  expect(submit).not.toBeDisabled();
});

test("processing a permanent OSR patches the RunCut with the new assignment and reason", async () => {
  render(<PermanentOsr />);
  await screen.findByText("1029-B");

  fireEvent.change(screen.getByDisplayValue("Select a route"), { target: { value: "run-cut-1" } });
  expect(await screen.findByDisplayValue("100 Main St")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Permanent OSR driver"), { target: { value: "operator-2" } });
  expect(screen.getByLabelText("Permanent OSR pullout address")).toHaveValue("500 Second Ave");

  fireEvent.change(screen.getByLabelText("Permanent OSR reason"), {
    target: { value: "Client requested a permanent driver change" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Process permanent OSR" }));

  await waitFor(() =>
    expect(apiPatch).toHaveBeenCalledWith(
      "/api/run-cuts/run-cut-1/permanent-osr",
      expect.objectContaining({
        operatorId: "operator-2",
        pulloutAddress: "500 Second Ave",
        disruptionNotes: "Client requested a permanent driver change",
      })
    )
  );
  expect(await screen.findByText(/Permanent OSR applied to 1029-B/)).toBeInTheDocument();
});

test("read-only access hides the submit button", async () => {
  permission.canWrite = false;
  render(<PermanentOsr />);
  await screen.findByText("1029-B");
  expect(screen.queryByRole("button", { name: "Process permanent OSR" })).not.toBeInTheDocument();
});

test("processing a permanent OSR refreshes the change history below it", async () => {
  changeHistoryEntries = [];
  render(<PermanentOsr />);
  await screen.findByText("1029-B");
  await screen.findByText("No permanent OSR changes in this range.");

  changeHistoryEntries = [
    {
      createdAt: "2026-09-18T12:00:00.000Z",
      route: "1029-B",
      field: "operator",
      from: "Joseph Mayer",
      to: "Andre Smith Jr.",
      reason: "Client requested a permanent driver change",
      name: "Dispatch User",
    },
  ];

  fireEvent.change(screen.getByDisplayValue("Select a route"), { target: { value: "run-cut-1" } });
  fireEvent.change(screen.getByLabelText("Permanent OSR reason"), {
    target: { value: "Client requested a permanent driver change" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Process permanent OSR" }));

  const historyRow = await screen.findByText("Client requested a permanent driver change");
  expect(within(historyRow.closest("tr")).getByText("Andre Smith Jr.")).toBeInTheDocument();
});

test("the change history paginates at 15 rows and can be downloaded", async () => {
  changeHistoryEntries = Array.from({ length: 16 }, (_, index) => ({
    createdAt: `2026-09-${String((index % 9) + 1).padStart(2, "0")}T12:00:00.000Z`,
    route: `20${index}`,
    field: "status",
    from: "Active",
    to: "Suspended",
    reason: "Route restructured",
    name: "Dispatch User",
  }));
  apiDownload.mockResolvedValue({ blob: new Blob(["data"]), filename: "D1-permanent-osr-changes.xlsx" });
  const createObjectURL = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:changes");
  const revokeObjectURL = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});

  render(<PermanentOsr />);
  await screen.findByText("1029-B");
  await screen.findByText("Page 1 of 2");

  fireEvent.click(screen.getByRole("button", { name: "Download Excel" }));
  await waitFor(() =>
    expect(apiDownload).toHaveBeenCalledWith(expect.stringContaining("/api/permanent-osr-changes/export"))
  );

  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

  createObjectURL.mockRestore();
  revokeObjectURL.mockRestore();
});
