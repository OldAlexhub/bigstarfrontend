import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "../../api/client";
import ReceivingRequests from "./ReceivingRequests";

const { selectedDivision } = vi.hoisted(() => ({
  selectedDivision: { _id: "division-1", name: "East" },
}));
vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ selectedDivision }),
}));
vi.mock("../../api/client", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

const pending = {
  _id: "request-1",
  status: "pending",
  routeCode: "101",
  destinationRouteCode: "202",
  originalOperatorName: "Alex Driver",
  originalVehicleCode: "V-12",
  originalPulloutAddress: "100 Main St",
  requestedOperatorName: "",
  requestedVehicleCode: "V-12",
  requestedPulloutAddress: "200 Main St",
  effectiveDate: "2026-09-14T00:00:00.000Z",
  createdAt: "2026-09-14T12:00:00.000Z",
  requestedByName: "Network User",
  requestedByUsername: "network.user",
};

describe("Deployment receiving requests", () => {
  beforeEach(() => {
    apiGet.mockResolvedValue({ requests: [pending] });
    apiPost.mockResolvedValue({
      request: {
        ...pending,
        status: "applied",
        reviewedByName: "Deployment User",
        reviewedByUsername: "deployment.user",
        reviewedAt: "2026-09-14T12:10:00.000Z",
        appliedAt: "2026-09-14T12:10:00.000Z",
      },
      message: "Reallocation accepted and applied to the Master Run Cut.",
    });
    vi.spyOn(window, "confirm").mockImplementation(() => {
      throw new Error("Native browser confirmation must not be used.");
    });
  });

  afterEach(() => vi.restoreAllMocks());

  test("accepts a notified request and keeps the submitter/approver audit trail", async () => {
    const { container } = render(<ReceivingRequests />);
    expect(await screen.findByText("101 → 202")).toBeInTheDocument();
    expect(screen.getByText("Network User (network.user)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(screen.getByRole("dialog", { name: "Accept reallocation request?" })).toBeInTheDocument();
    expect(screen.getByText(/Route 101.*202.*Effective 2026-09-14/)).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Accept request" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/reallocation-requests/request-1/accept", {}));
    await screen.findByText("Applied");
    const auditText = container.querySelector(".space-y-2")?.textContent || "";
    expect(auditText).toMatch(/accepted by Deployment User \(deployment\.user\)/i);
    expect(auditText).toMatch(/applied 9\/14\/2026/i);
  });
});
