import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api/client";
import RunCutsTable from "./RunCutsTable";

jest.mock("react-router-dom", () => ({
  useOutletContext: () => ({ selectedDivision: { _id: "division-1", code: "D1", name: "Division One" }, isAllDivisions: false }),
}));
jest.mock("../../api/client", () => ({ apiDelete: jest.fn(), apiGet: jest.fn(), apiPatch: jest.fn(), apiPost: jest.fn() }));

const runCut = {
  _id: "run-cut-1",
  route: { _id: "route-1", code: "R1", type: "standard" },
  operator: null,
  vehicle: null,
  pulloutAddress: "",
  startTime: null,
  endTime: null,
  status: "active",
  serviceHours: 0,
  revenueHours: 0,
  daysOfWeek: [],
};

beforeEach(() => {
  apiGet.mockImplementation((path) => {
    if (path.startsWith("/api/run-cuts")) return Promise.resolve({ runCuts: [runCut] });
    if (path === "/api/operators") return Promise.resolve({ operators: [] });
    return Promise.resolve({ vehicles: [] });
  });
  apiPost.mockImplementation((path) => path === "/api/routes"
    ? Promise.resolve({ route: { _id: "route-new" } })
    : Promise.resolve({ runCut: {} }));
  apiDelete.mockResolvedValue({ message: "Route removed" });
  apiPatch.mockResolvedValue({ route: { ...runCut.route, type: "standby" } });
});

test("new STBY-labeled routes become standby and existing routes can be removed", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<RunCutsTable />);
  expect(await screen.findByText("R1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "+ Add Route" }));
  fireEvent.change(screen.getByLabelText("Route code"), { target: { value: "111(STBY)" } });
  expect(screen.getByLabelText("Route type")).toHaveValue("standby");
  fireEvent.click(screen.getByRole("button", { name: "Add route" }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/routes", expect.objectContaining({ code: "111(STBY)", type: "standby" })));

  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/api/routes/route-1"));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining("past history will be kept"));
  confirm.mockRestore();
});
