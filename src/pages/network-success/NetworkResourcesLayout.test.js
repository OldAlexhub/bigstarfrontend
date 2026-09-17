import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NetworkSuccessLayout from "./NetworkSuccessLayout";
import NetworkResourcesLayout, { NetworkResourcesHome } from "./NetworkResourcesLayout";

const user = vi.hoisted(() => ({
  role: "Manager",
  pageAccessConfigured: true,
  pageAccess: ["network_success.ld_helper"],
  pageAccessLevels: { "network_success.ld_helper": "read" },
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user }) }));
vi.mock("../../api/client", () => ({ apiGet: vi.fn() }));

test("Network Success groups accessible helper tools under Resources", async () => {
  render(
    <MemoryRouter initialEntries={["/network-success/resources"]}>
      <Routes>
        <Route path="/network-success" element={<NetworkSuccessLayout />}>
          <Route path="resources" element={<NetworkResourcesLayout />}>
            <Route index element={<NetworkResourcesHome />} />
            <Route path="ld-helper" element={<div>LD resource content</div>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText("LD resource content")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute(
    "href",
    "/network-success/resources/ld-helper"
  );
  expect(screen.getByRole("link", { name: "LD Helper" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Email Templates" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "TUI Helper" })).not.toBeInTheDocument();
});
