import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { apiGet, apiPost } from "../../api/client";
import ReallocationRequests from "./ReallocationRequests";

vi.mock("../../api/client", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

const runCuts = [
  {
    _id: "run-cut-1",
    status: "active",
    route: { _id: "route-1", code: "101" },
    operator: { _id: "operator-1", name: "Alex Driver" },
    vehicle: { _id: "vehicle-1", code: "V-12" },
    pulloutAddress: "100 Main St",
  },
  {
    _id: "run-cut-2",
    status: "unassigned",
    route: { _id: "route-2", code: "202" },
    operator: null,
    vehicle: null,
    pulloutAddress: "200 Main St",
  },
  {
    _id: "run-cut-3",
    status: "active",
    route: { _id: "route-3", code: "303" },
    operator: { _id: "operator-3", name: "Assigned Driver" },
    vehicle: null,
    pulloutAddress: "300 Main St",
  },
  {
    _id: "run-cut-4",
    status: "active",
    route: { _id: "route-4", code: "404" },
    operator: null,
    vehicle: null,
    pulloutAddress: "400 Main St",
  },
];

describe("Network Success reallocation requests", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiGet.mockImplementation((path) => {
      if (path === "/api/divisions") return Promise.resolve({ divisions: [{ _id: "division-1", name: "East", timezone: "America/New_York" }] });
      if (path === "/api/operators") return Promise.resolve({ operators: [] });
      if (path.startsWith("/api/run-cuts")) return Promise.resolve({ runCuts });
      if (path.startsWith("/api/vehicles")) return Promise.resolve({ vehicles: [] });
      if (path.startsWith("/api/reallocation-requests")) return Promise.resolve({ requests: [] });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
    apiPost.mockResolvedValue({ request: { _id: "request-1", status: "pending", routeCode: "101", createdAt: new Date().toISOString() } });
  });

  test("submits an optional destination route and explains the atomic move", async () => {
    render(<ReallocationRequests />);

    await screen.findByRole("option", { name: "101" });
    fireEvent.change(screen.getByLabelText("Current route number"), { target: { value: "run-cut-1" } });
    const destinationSelect = screen.getByLabelText(/Assign to different route/);
    expect(within(destinationSelect).queryByRole("option", { name: "303" })).not.toBeInTheDocument();
    expect(within(destinationSelect).queryByRole("option", { name: "404" })).not.toBeInTheDocument();
    fireEvent.change(destinationSelect, { target: { value: "run-cut-2" } });
    expect(screen.getByText((_, element) => element.tagName === "P" && /route 101 will be cleared and marked Unassigned, and its assignment will move to 202/i.test(element.textContent))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith(
      "/api/reallocation-requests",
      expect.objectContaining({
        division: "division-1",
        runCut: "run-cut-1",
        destinationRunCut: "run-cut-2",
        operatorName: "",
        vehicleCode: "V-12",
        pulloutAddress: "100 Main St",
      })
    ));
  });

  test("a blank replacement clears assignment details but preserves the route schedule", async () => {
    render(<ReallocationRequests />);

    await screen.findByRole("option", { name: "101" });
    fireEvent.change(screen.getByLabelText("Current route number"), { target: { value: "run-cut-1" } });

    expect(screen.getByLabelText("Vehicle associated")).toBeDisabled();
    expect(screen.getByLabelText("Vehicle associated")).toHaveValue("");
    expect(screen.getByLabelText("Pullout address")).toBeDisabled();
    expect(screen.getByLabelText("Pullout address")).toHaveValue("");
    expect(screen.getByText(/start and end times will remain/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith(
      "/api/reallocation-requests",
      expect.objectContaining({
        runCut: "run-cut-1",
        operatorName: "",
        vehicleCode: "",
        pulloutAddress: "",
      })
    ));
  });

  test("entering a replacement operator enables vehicle and pullout assignment", async () => {
    render(<ReallocationRequests />);

    await screen.findByRole("option", { name: "101" });
    fireEvent.change(screen.getByLabelText("Current route number"), { target: { value: "run-cut-1" } });
    fireEvent.change(screen.getByLabelText(/New operator/), { target: { value: "Taylor Driver" } });

    expect(screen.getByLabelText("Vehicle associated")).toBeEnabled();
    expect(screen.getByLabelText("Vehicle associated")).toHaveValue("V-12");
    expect(screen.getByLabelText("Pullout address")).toBeEnabled();
    expect(screen.getByLabelText("Pullout address")).toHaveValue("100 Main St");
  });
});
