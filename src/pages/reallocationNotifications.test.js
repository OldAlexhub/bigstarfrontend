import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiGet } from "../api/client";
import DeploymentLayout from "./deployment/DeploymentLayout";
import NetworkSuccessLayout from "./network-success/NetworkSuccessLayout";

vi.mock("../api/client", () => ({ apiGet: vi.fn() }));

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
