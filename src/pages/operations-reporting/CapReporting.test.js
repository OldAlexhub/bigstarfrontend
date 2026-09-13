import { fireEvent, render, screen } from "@testing-library/react";
import { apiGet } from "../../api/client";
import CapReporting from "./CapReporting";

vi.mock("../../api/client", () => ({ apiGet: vi.fn() }));

const cap = {
  id: "cap-1",
  division: { _id: "division-1", code: "DIV7", name: "Division Seven" },
  kpiLabel: "Run Cut Fulfillment",
  kpiFormat: "percent",
  triggerMonth: "2026-08",
  status: "open",
  assignedManager: { name: "Network Manager" },
  rootCause: "Two uncovered routes caused missed trips.",
  correctiveAction: "Provider will add two qualified backup drivers.",
  ownerUser: { name: "Action Owner" },
  plannedRecoveryDate: "2026-10-15T12:00:00.000Z",
  firstEnteredAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-05T16:30:00.000Z",
  valueAtCapDate: 0.88,
  targetAtCap: 0.97,
  varianceAtCap: -0.09,
  latestValue: 0.92,
  latestKpiStatus: "yellow",
  dateRecoveryMet: null,
  updates: [{ _id: "update-1", text: "First backup driver completed onboarding.", author: { name: "Network Manager" }, createdAt: "2026-09-05T16:30:00.000Z" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [cap.division] });
    return Promise.resolve({
      caps: [cap],
      summary: { total: 1, open: 1, recoveryReady: 0, recovered: 0, avgDaysToRecover: null },
      filters: { from: "2026-08", to: "2026-08" },
    });
  });
});

test("expands a CAP history row to show the user's saved details", async () => {
  render(<CapReporting />);

  const detailsButton = await screen.findByRole("button", { name: "View details" });
  expect(screen.queryByText(cap.rootCause)).not.toBeInTheDocument();

  fireEvent.click(detailsButton);

  expect(screen.getByText(cap.rootCause)).toBeInTheDocument();
  expect(screen.getByText(cap.correctiveAction)).toBeInTheDocument();
  expect(screen.getAllByText("Action Owner")).toHaveLength(2);
  expect(screen.getByText("88.0%")).toBeInTheDocument();
  expect(screen.getByText("First backup driver completed onboarding.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");
});
