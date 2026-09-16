import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiGet } from "../api/client";
import DeploymentLayout from "./deployment/DeploymentLayout";
import NetworkSuccessLayout from "./network-success/NetworkSuccessLayout";
import { REALLOCATION_UPDATED_EVENT } from "./reallocationUi";

vi.mock("../api/client", () => ({ apiGet: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { role: "ELT" } }) }));

describe("reallocation notification badges", () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  test("Deployment shows the number of requests waiting for approval", async () => {
    apiGet.mockImplementation((path) => {
      if (path === "/api/divisions") return Promise.resolve({ divisions: [{ _id: "division-1", name: "East" }] });
      if (path === "/api/reallocation-requests/pending-notifications") return Promise.resolve({ count: 3, byDivision: { "division-1": 3 } });
      if (path === "/api/team-posts/notifications?section=deployment") return Promise.resolve({ count: 0, byDivision: {} });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(
      <MemoryRouter initialEntries={["/deployment"]}>
        <Routes>
          <Route path="/deployment" element={<DeploymentLayout />}><Route index element={<div />} /></Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByLabelText("3 pending requests")).toBeInTheDocument();
  });

  test("Network Success shows accepted requests that have not been viewed", async () => {
    apiGet.mockImplementation((path) => {
      if (path === "/api/reallocation-requests/notifications") return Promise.resolve({ count: 2, byDivision: { "division-1": 2 } });
      if (path === "/api/team-posts/notifications?section=network_success") return Promise.resolve({ count: 0, byDivision: {} });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(
      <MemoryRouter initialEntries={["/network-success"]}>
        <Routes>
          <Route path="/network-success" element={<NetworkSuccessLayout />}><Route index element={<div />} /></Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByLabelText("2 accepted requests")).toBeInTheDocument();
  });

  test("an older notification response cannot restore a badge after acknowledgement", async () => {
    const pendingNotificationRequests = [];
    apiGet.mockImplementation((path) => {
      if (path === "/api/reallocation-requests/notifications") {
        return new Promise((resolve) => pendingNotificationRequests.push(resolve));
      }
      if (path === "/api/team-posts/notifications?section=network_success") {
        return Promise.resolve({ count: 0, byDivision: {} });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(
      <MemoryRouter initialEntries={["/network-success"]}>
        <Routes>
          <Route path="/network-success" element={<NetworkSuccessLayout />}><Route index element={<div />} /></Route>
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(pendingNotificationRequests).toHaveLength(1));
    fireEvent(window, new Event(REALLOCATION_UPDATED_EVENT));
    await waitFor(() => expect(pendingNotificationRequests).toHaveLength(2));

    await act(async () => pendingNotificationRequests[1]({ count: 0, byDivision: {} }));
    await act(async () => pendingNotificationRequests[0]({ count: 2, byDivision: { "division-1": 2 } }));

    expect(screen.queryByLabelText("2 accepted requests")).not.toBeInTheDocument();
  });

  test("Deployment shows unread post and response notifications", async () => {
    apiGet.mockImplementation((path) => {
      if (path === "/api/divisions") return Promise.resolve({ divisions: [{ _id: "division-1", name: "East" }] });
      if (path.includes("reallocation-requests")) return Promise.resolve({ count: 0, byDivision: {} });
      if (path === "/api/team-posts/notifications?section=deployment") return Promise.resolve({ count: 4, byDivision: { "division-1": 4 } });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(
      <MemoryRouter initialEntries={["/deployment"]}>
        <Routes>
          <Route path="/deployment" element={<DeploymentLayout />}><Route index element={<div />} /></Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByLabelText("4 unread posts or responses")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "East (4 posts)" })).toBeInTheDocument();
  });

  test("Network Success shows unread post and response notifications", async () => {
    apiGet.mockImplementation((path) => {
      if (path === "/api/reallocation-requests/notifications") return Promise.resolve({ count: 0, byDivision: {} });
      if (path === "/api/team-posts/notifications?section=network_success") return Promise.resolve({ count: 2, byDivision: { "division-1": 2 } });
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(
      <MemoryRouter initialEntries={["/network-success"]}>
        <Routes>
          <Route path="/network-success" element={<NetworkSuccessLayout />}><Route index element={<div />} /></Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByLabelText("2 unread posts or responses")).toBeInTheDocument();
  });
});
