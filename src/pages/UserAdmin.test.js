import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiDelete, apiGet, apiPost } from "../api/client";
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
  apiDelete.mockResolvedValue({ message: "User deleted" });
});

test("user deletion uses an in-app confirmation modal", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/users") {
      return Promise.resolve({
        users: [{
          id: "user-1",
          username: "networksuccess",
          name: "Division 6",
          role: "Manager",
          active: true,
          pageAccessConfigured: true,
          pageAccess: ["network_success.performance"],
          pageAccessLevels: { "network_success.performance": "read" },
          divisionAccess: [{ _id: "division-1", code: "D1" }],
        }],
      });
    }
    if (path === "/api/divisions") return Promise.resolve({ divisions: [] });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(<MemoryRouter><UserAdmin /></MemoryRouter>);

  fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("dialog", { name: "Delete this user?" });
  expect(dialog).toBeInTheDocument();
  expect(within(dialog).getByText(/Division 6/)).toBeInTheDocument();
  expect(apiDelete).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Permanently delete" }));
  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/api/users/user-1"));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("new active divisions refresh into user permission choices", async () => {
  let divisionRequests = 0;
  apiGet.mockImplementation((path) => {
    if (path === "/api/users") return Promise.resolve({ users: [] });
    if (path === "/api/divisions") {
      divisionRequests += 1;
      return Promise.resolve({
        divisions: divisionRequests === 1
          ? [{ _id: "division-1", code: "D1", name: "Division One" }]
          : [
              { _id: "division-1", code: "D1", name: "Division One" },
              { _id: "division-2", code: "D2", name: "Division Two" },
            ],
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(<MemoryRouter><UserAdmin /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "+ Add User" }));
  expect(screen.getByRole("checkbox", { name: "D1" })).toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "D2" })).not.toBeInTheDocument();

  fireEvent.focus(window);
  expect(await screen.findByRole("checkbox", { name: "D2" })).toBeInTheDocument();
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
  expect(screen.getByLabelText("Report Builder & Exports access level")).toHaveValue("read");
  fireEvent.change(screen.getByLabelText("Report Builder & Exports access level"), { target: { value: "write" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "D1" }));
  fireEvent.click(screen.getByRole("button", { name: "Create user" }));

  await waitFor(() => expect(apiPost).toHaveBeenCalledWith(
    "/api/users",
    expect.objectContaining({
      username: "report.manager",
      pageAccess: ["report_builder"],
      pageAccessLevels: { report_builder: "write" },
      divisionAccess: ["division-1"],
    })
  ));
});
