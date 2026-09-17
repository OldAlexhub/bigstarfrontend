import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiGet, apiPost } from "../api/client";
import UserAdmin from "./UserAdmin";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "elt-1", role: "ELT", name: "ELT Admin" } }),
}));

vi.mock("../api/client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/users") return Promise.resolve({ users: [] });
    if (path === "/api/divisions") {
      return Promise.resolve({ divisions: [{ _id: "division-1", code: "D1", name: "Division One" }] });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
  apiPost.mockResolvedValue({ user: { id: "user-1" } });
});

test("Settings can grant Report Builder and export access independently", async () => {
  render(<MemoryRouter><UserAdmin /></MemoryRouter>);

  await waitFor(() => expect(apiGet).toHaveBeenCalledWith("/api/users"));
  fireEvent.click(screen.getByRole("button", { name: "+ Add User" }));

  expect(screen.getByText("Executive Reporting")).toBeInTheDocument();
  const reportBuilderPermission = screen.getByRole("checkbox", { name: /Report Builder & Exports/i });
  expect(reportBuilderPermission).not.toBeChecked();
  expect(screen.getByText("Build, preview, save, and export company-wide reports.")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "report.manager" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "temporary-password" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Report Manager" } });
  fireEvent.click(reportBuilderPermission);
  fireEvent.click(screen.getByRole("checkbox", { name: "D1" }));
  fireEvent.click(screen.getByRole("button", { name: "Create user" }));

  await waitFor(() => expect(apiPost).toHaveBeenCalledWith(
    "/api/users",
    expect.objectContaining({
      username: "report.manager",
      pageAccess: ["report_builder"],
      divisionAccess: ["division-1"],
    })
  ));
});
