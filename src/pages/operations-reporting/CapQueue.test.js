import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api/client";
import CapQueue from "./CapQueue";

vi.mock("../../api/client", () => ({ apiGet: vi.fn(), apiPatch: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { _id: "manager-1", role: "ELT" } }) }));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ state: {} }) }));

const cap = {
  id: "cap-1",
  division: { _id: "division-1", code: "DIV7", name: "Division Seven" },
  kpiKey: "run_cut_fulfillment",
  kpiLabel: "Run Cut Fulfillment",
  triggerMonth: "2026-08",
  firstEnteredAt: "2026-09-01T12:00:00.000Z",
  valueAtCapDate: 0.95,
  targetAtCap: 0.97,
  varianceAtCap: -0.02,
  latestMonth: "2026-08",
  latestKpiStatus: "red",
  status: "open",
  assignedManager: { _id: "manager-1", name: "Division Manager" },
  rootCause: "",
  correctiveAction: "",
  ownerUser: null,
  ownerName: "",
  plannedRecoveryDate: null,
  valueAtRecovery: null,
  dateRecoveryMet: null,
  recoveryCandidate: null,
  updates: [],
  canEdit: true,
  canAddNote: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [cap.division] });
    if (path === "/api/operations-reporting/people") {
      return Promise.resolve({ users: [{ id: "manager-1", name: "Division Manager", role: "Manager", divisionAccess: ["division-1"] }] });
    }
    if (path.startsWith("/api/operations-reporting/caps/needed")) return Promise.resolve({ needed: [] });
    return Promise.resolve({ caps: [cap], activationMonth: "2026-08" });
  });
  apiPatch.mockImplementation((_path, payload) => Promise.resolve({ cap: { ...cap, ...payload } }));
  apiPost.mockResolvedValue({ cap });
  apiDelete.mockResolvedValue({});
});

test("shows the CAP as a form card with manager inputs", async () => {
  render(<CapQueue />);

  await screen.findByText("Run Cut Fulfillment");
  const card = screen.getByRole("article");
  expect(within(card).getByText("DIV7 — Division Seven")).toBeInTheDocument();
  expect(screen.getByLabelText("Root Cause DIV7 Run Cut Fulfillment")).toBeEnabled();
  expect(screen.getByLabelText("Corrective Action DIV7 Run Cut Fulfillment")).toBeEnabled();
  expect(screen.getByLabelText("Recovery Date DIV7 Run Cut Fulfillment")).toBeEnabled();
  expect(screen.getByLabelText("Owner account DIV7 Run Cut Fulfillment")).toBeEnabled();
});

test("saves manager-entered CAP information from the row", async () => {
  render(<CapQueue />);
  const rootCause = await screen.findByLabelText("Root Cause DIV7 Run Cut Fulfillment");
  fireEvent.change(rootCause, { target: { value: "Two open routes" } });
  fireEvent.change(screen.getByLabelText("Corrective Action DIV7 Run Cut Fulfillment"), { target: { value: "Complete recruiting plan" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(apiPatch).toHaveBeenCalledWith("/api/operations-reporting/caps/cap-1", expect.objectContaining({
    rootCause: "Two open routes",
    correctiveAction: "Complete recruiting plan",
  })));
});

test("shows a KPI that needs a CAP and opens it", async () => {
  const neededItem = {
    division: "division-1",
    divisionCode: "DIV7",
    divisionName: "Division Seven",
    kpiKey: "run_cut_fulfillment",
    kpiLabel: "Run Cut Fulfillment",
    kpiFormat: "percent",
    triggerMonth: "2026-08",
    value: 0.88,
    target: 0.97,
    variance: -0.09,
    status: "red",
  };
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [cap.division] });
    if (path === "/api/operations-reporting/people") {
      return Promise.resolve({ users: [{ id: "manager-1", name: "Division Manager", role: "Manager", divisionAccess: ["division-1"] }] });
    }
    if (path.startsWith("/api/operations-reporting/caps/needed")) return Promise.resolve({ needed: [neededItem] });
    return Promise.resolve({ caps: [], activationMonth: "2026-08" });
  });
  apiPost.mockResolvedValue({ cap });

  render(<CapQueue />);

  await screen.findByText("Needs to be opened (1)");
  expect(screen.getByText("Run Cut Fulfillment")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open CAP" }));

  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/operations-reporting/caps", {
    division: "division-1",
    kpiKey: "run_cut_fulfillment",
    triggerMonth: "2026-08",
  }));
  await waitFor(() => expect(screen.queryByText("Needs to be opened (1)")).not.toBeInTheDocument());
});

test("cancels a mistakenly opened CAP after confirming", async () => {
  render(<CapQueue />);
  await screen.findByText("Run Cut Fulfillment");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Remove record" }));

  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/api/operations-reporting/caps/cap-1"));
  await waitFor(() => expect(screen.queryByText("Run Cut Fulfillment")).not.toBeInTheDocument());
});
