import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../api/client";
import SettingsPage from "./SettingsPage";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "ELT" } }),
}));

vi.mock("../api/client", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const activeDivision = {
  _id: "division-active",
  code: "DIV_1",
  name: "Division One",
  active: true,
  timezone: "America/New_York",
  thresholds: { breakMinutes: 30, revenueRatio: 0.9 },
};
const retiredDivision = {
  _id: "division-retired",
  code: "DIV_2",
  name: "Division Two",
  active: false,
  timezone: "America/Chicago",
  thresholds: { breakMinutes: 30, revenueRatio: 0.9 },
};

describe("division lifecycle settings", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPatch.mockReset();
    apiPost.mockReset();
    apiPut.mockReset();
    apiDelete.mockReset();
    apiDelete.mockResolvedValue({ deletedDivisionId: "division-active" });
    apiGet.mockImplementation((path) => {
      if (path === "/api/settings") {
        return Promise.resolve({
          settings: {
            osrAdvanceDays: 7,
            operationsReportingStartMonth: "2026-01",
            dataRetention: {
              enabled: false,
              operationalHistory: { value: 7, unit: "years" },
              auditLogs: { value: 7, unit: "years" },
              teamPosts: { value: 3, unit: "years" },
              networkSubmissionStaging: { value: 1, unit: "years" },
            },
          },
        });
      }
      if (path === "/api/divisions?includeInactive=1") {
        return Promise.resolve({ divisions: [activeDivision, retiredDivision] });
      }
      if (path === "/api/divisions/thresholds") {
        return Promise.resolve({
          thresholds: [
            {
              _id: "threshold-active-original",
              division: "division-active",
              effectiveDate: "2026-01-01T00:00:00.000Z",
              breakMinutes: 30,
              revenueRatio: 0.9,
            },
          ],
        });
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
    apiPost.mockResolvedValue({
      division: activeDivision,
      changed: true,
      thresholds: [],
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

  test("a division can add another dated break and revenue setting without replacing its history", async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    const nameInput = await screen.findByLabelText("Division name for DIV_1");
    expect(screen.queryByLabelText("Break minutes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Revenue ratio")).not.toBeInTheDocument();

    const activeRow = nameInput.closest("tr");
    expect(within(activeRow).getByText("30")).toBeInTheDocument();
    expect(within(activeRow).getByText("0.9")).toBeInTheDocument();

    fireEvent.click(within(activeRow).getByRole("button", { name: /View schedule/ }));
    expect(screen.getByText("2026-01-01")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add change" }));
    const breakMinutesInput = screen.getByLabelText("New break minutes for DIV_1");
    const revenueRatioInput = screen.getByLabelText("New revenue ratio for DIV_1");
    expect(breakMinutesInput).toHaveValue(30);
    expect(revenueRatioInput).toHaveValue(0.9);
    fireEvent.change(breakMinutesInput, { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "Save change" }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        "/api/divisions/division-active/thresholds",
        { breakMinutes: 45, revenueRatio: 0.9, effectiveDate: expect.any(String) }
      )
    );
  });

  test("a break minutes / revenue ratio change can be scheduled for a future start date", async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    const nameInput = await screen.findByLabelText("Division name for DIV_1");
    const activeRow = nameInput.closest("tr");
    fireEvent.click(within(activeRow).getByRole("button", { name: /View schedule/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add change" }));
    const dateInput = screen.getByLabelText("New settings start date for DIV_1");
    fireEvent.change(dateInput, { target: { value: "2099-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save change" }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(
        "/api/divisions/division-active/thresholds",
        { breakMinutes: 30, revenueRatio: 0.9, effectiveDate: "2099-01-01" }
      )
    );
  });

  test("clearing a division's break minutes or revenue ratio blocks saving instead of falling back to a default", async () => {
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    const nameInput = await screen.findByLabelText("Division name for DIV_1");
    const activeRow = nameInput.closest("tr");
    fireEvent.click(within(activeRow).getByRole("button", { name: /View schedule/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add change" }));
    const breakMinutesInput = screen.getByLabelText("New break minutes for DIV_1");

    fireEvent.change(breakMinutesInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save change" }));

    expect(
      await screen.findByText("Break minutes and revenue ratio are required for every division.")
    ).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
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

  test("ELT can save the Schedule History lookback weeks along with the other company defaults", async () => {
    apiPut.mockResolvedValue({
      settings: {
        osrAdvanceDays: 7,
        scheduleHistoryLookbackWeeks: 5,
        operationsReportingStartMonth: "2026-01",
      },
    });
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    await screen.findByDisplayValue("Division One");
    const weeksLabel = screen.getByText("Schedule History lookback weeks");
    const weeksInput = weeksLabel.closest("label").querySelector("input");
    expect(weeksInput).toHaveValue(6);

    fireEvent.change(weeksInput, { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save defaults" }));

    await waitFor(() =>
      expect(apiPut).toHaveBeenCalledWith(
        "/api/settings",
        expect.objectContaining({ scheduleHistoryLookbackWeeks: 5 })
      )
    );
  });

  test("ELT can enable and save the four retention policies", async () => {
    apiPut.mockResolvedValue({
      settings: {
        osrAdvanceDays: 7,
        scheduleHistoryLookbackWeeks: 6,
        operationsReportingStartMonth: "2026-01",
        dataRetention: {
          enabled: true,
          operationalHistory: { value: 7, unit: "years" },
          auditLogs: { value: 7, unit: "years" },
          teamPosts: { value: 6, unit: "months" },
          networkSubmissionStaging: { value: 1, unit: "indefinite" },
        },
      },
    });
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    await screen.findByDisplayValue("Division One");
    fireEvent.click(screen.getByLabelText("Enable automatic retention"));
    fireEvent.change(screen.getByLabelText("Team Posts retention value"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Team Posts retention unit"), { target: { value: "months" } });
    fireEvent.change(screen.getByLabelText("Network Submission Staging retention unit"), { target: { value: "indefinite" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/api/settings", {
      dataRetention: expect.objectContaining({
        enabled: true,
        teamPosts: { value: 6, unit: "months" },
        networkSubmissionStaging: { value: 1, unit: "indefinite" },
      }),
    }));
  });

  test("a division's standby coverage and pullout address rules can be turned on and saved", async () => {
    apiPatch.mockImplementation((path, body) => {
      const source = path.includes("division-active") ? activeDivision : retiredDivision;
      return Promise.resolve({ division: { ...source, ...body } });
    });
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    await screen.findByDisplayValue("Division One");
    fireEvent.click(screen.getByText("Advanced: standby coverage & pullout address rules"));

    const standbyToggle = screen.getByLabelText("Standby keeps the route's own pullout address for DIV_1");
    const editableToggle = screen.getByLabelText("Pullout address editable in Live Schedule for DIV_1");
    expect(standbyToggle).not.toBeChecked();
    expect(editableToggle).not.toBeChecked();

    fireEvent.click(standbyToggle);
    fireEvent.click(editableToggle);
    expect(standbyToggle).toBeChecked();
    expect(editableToggle).toBeChecked();

    const row = standbyToggle.closest("tr");
    fireEvent.click(within(row).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith(
        "/api/divisions/division-active",
        expect.objectContaining({
          pulloutAddressRules: { standbyKeepsRouteAddress: true, editableInLiveSchedule: true },
        })
      )
    );
  });
});
