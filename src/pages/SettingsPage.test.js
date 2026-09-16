import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiGet, apiPatch } from "../api/client";
import SettingsPage from "./SettingsPage";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "ELT" } }),
}));

vi.mock("../api/client", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPut: vi.fn(),
}));

const activeDivision = {
  _id: "division-active",
  code: "DIV_1",
  name: "Division One",
  active: true,
  timezone: "America/New_York",
  thresholds: { breakMinutes: null, revenueRatio: null },
};
const retiredDivision = {
  _id: "division-retired",
  code: "DIV_2",
  name: "Division Two",
  active: false,
  timezone: "America/Chicago",
  thresholds: { breakMinutes: null, revenueRatio: null },
};

describe("division lifecycle settings", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPatch.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    apiGet.mockImplementation((path) => {
      if (path === "/api/settings") {
        return Promise.resolve({
          settings: {
            breakMinutes: 30,
            revenueRatio: 0.9,
            osrAdvanceDays: 7,
            operationsReportingStartMonth: "2026-01",
          },
        });
      }
      if (path === "/api/divisions?includeInactive=1") {
        return Promise.resolve({ divisions: [activeDivision, retiredDivision] });
      }
      if (path === "/api/settings/operations-kpis") {
        return Promise.resolve({ definitions: [], settings: [] });
      }
      if (path === "/api/users") return Promise.resolve({ users: [] });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
    apiPatch.mockImplementation((path, body) => {
      const source = path.includes("division-active") ? activeDivision : retiredDivision;
      return Promise.resolve({ division: { ...source, active: body.active } });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  test("ELT can retire and restore divisions while keeping retired rows in Settings", async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    expect(await screen.findByText("Division One")).toBeInTheDocument();
    expect(screen.getByText("Division Two")).toBeInTheDocument();
    expect(screen.getByText("Retired")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith("/api/divisions/division-retired", { active: true })
    );

    const activeRow = screen.getByText("Division One").closest("tr");
    fireEvent.click(within(activeRow).getByRole("button", { name: "Retire" }));
    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith("/api/divisions/division-active", { active: false })
    );
    expect(window.confirm).toHaveBeenCalled();
  });
});
