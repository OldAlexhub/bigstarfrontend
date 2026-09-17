import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api/client";
import RunCutsTable from "./RunCutsTable";

const permission = vi.hoisted(() => ({ canWrite: true }));
const outletContext = vi.hoisted(() => ({
  selectedDivision: { _id: "division-1", code: "D1", name: "Division One" },
  isAllDivisions: false,
}));

vi.mock("react-router-dom", () => ({
  useOutletContext: () => outletContext,
}));
vi.mock("../../api/client", () => ({ apiDelete: vi.fn(), apiGet: vi.fn(), apiPatch: vi.fn(), apiPost: vi.fn() }));
vi.mock("../../components/PageAccessRoute", () => ({ usePagePermission: () => permission }));

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
  permission.canWrite = true;
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path.startsWith("/api/run-cuts")) return Promise.resolve({ runCuts: [runCut] });
    if (path.startsWith("/api/operators")) return Promise.resolve({ operators: [] });
    return Promise.resolve({ vehicles: [] });
  });
  apiPost.mockImplementation((path) => path === "/api/routes"
    ? Promise.resolve({ route: { _id: "route-new" } })
    : Promise.resolve({ runCut: {} }));
  apiDelete.mockResolvedValue({ message: "Route removed" });
  apiPatch.mockResolvedValue({ route: { ...runCut.route, type: "standby" } });
});

test("new STBY-labeled routes become standby and existing routes can be removed", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
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

test("read-only Run Cuts renders values without editing controls", async () => {
  permission.canWrite = false;
  render(<RunCutsTable />);

  expect(await screen.findByText("R1")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "+ Add Route" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Driver for R1")).not.toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(apiGet).toHaveBeenCalledTimes(1);
  expect(apiPatch).not.toHaveBeenCalled();
  expect(apiPost).not.toHaveBeenCalled();
  expect(apiDelete).not.toHaveBeenCalled();
});
