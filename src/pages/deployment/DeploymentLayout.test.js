import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiGet } from "../../api/client";
import DeploymentLayout from "./DeploymentLayout";

vi.mock("../../api/client", () => ({ apiGet: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      role: "Manager",
      pageAccessConfigured: true,
      pageAccess: ["deployment.issue_log"],
      pageAccessLevels: { "deployment.issue_log": "read" },
      divisionAccess: ["division-6"],
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") {
      return Promise.resolve({
        divisions: [{ _id: "division-6", code: "D6", name: "Division 6" }],
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
});

test("an Issue Log-only user can load their assigned division", async () => {
  render(
    <MemoryRouter initialEntries={["/deployment/issue-log"]}>
      <Routes>
        <Route path="/deployment" element={<DeploymentLayout />}>
          <Route path="issue-log" element={<div>Issue Log content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole("option", { name: "Division 6" })).toBeInTheDocument();
  expect(screen.getByText("Issue Log content")).toBeInTheDocument();
  expect(screen.queryByText(/Loading divisions/i)).not.toBeInTheDocument();
  await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));
  expect(apiGet).toHaveBeenCalledWith("/api/divisions");
});
