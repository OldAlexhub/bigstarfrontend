import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiDelete, apiGet, apiPatch } from "../api/client";
import SettingsPage from "./SettingsPage";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "ELT" } }),
}));

vi.mock("../api/client", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
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
    apiDelete.mockReset();
    apiDelete.mockResolvedValue({ deletedDivisionId: "division-active" });
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

    expect(await screen.findByDisplayValue("Division One")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Division Two")).toBeInTheDocument();
    expect(screen.getByText("Retired")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith("/api/divisions/division-retired", { active: true })
    );

    const activeRow = screen.getByDisplayValue("Division One").closest("tr");
    fireEvent.click(within(activeRow).getByRole("button", { name: "Retire" }));
    expect(screen.getByRole("dialog", { name: "Retire this division?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retire division" }));
    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith("/api/divisions/division-active", { active: false })
    );
  });

  test("ELT can rename an active division from Settings", async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    const nameInput = await screen.findByLabelText("Division name for DIV_1");
    fireEvent.change(nameInput, { target: { value: "Central Operations" } });
    const activeRow = nameInput.closest("tr");
    fireEvent.click(within(activeRow).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(apiPatch).toHaveBeenCalledWith(
      "/api/divisions/division-active",
      expect.objectContaining({
        name: "Central Operations",
        timezone: "America/New_York",
      })
    ));
  });

  test("ELT deletion requires the division code and removes the division", async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    const activeRow = (await screen.findByDisplayValue("Division One")).closest("tr");
    fireEvent.click(within(activeRow).getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog", { name: "Permanently delete division?" });
    const deleteButton = within(dialog).getByRole("button", { name: "Permanently delete" });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/Type DIV_1 to confirm/), {
      target: { value: "DIV_1" },
    });
    expect(deleteButton).toBeEnabled();
    fireEvent.click(deleteButton);

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith(
      "/api/divisions/division-active",
      { confirmationCode: "DIV_1" }
    ));
    await waitFor(() => expect(screen.queryByDisplayValue("Division One")).not.toBeInTheDocument());
  });
});
