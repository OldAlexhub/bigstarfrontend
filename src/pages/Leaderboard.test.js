import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiGet } from "../api/client";
import Leaderboard from "./Leaderboard";

vi.mock("../api/client", () => ({
  apiGet: vi.fn(),
  API_BASE: "",
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      role: "Manager",
      pageAccessConfigured: true,
      pageAccess: ["leaderboard"],
      divisionAccess: ["division-6"],
    },
  }),
}));

test("a division-limited user sees the division's company-wide rank", async () => {
  apiGet.mockResolvedValue({
    divisions: [{
      divisionId: "division-6",
      name: "Division 6 - LYNX",
      rank: 4,
      runCutFulfillmentPct: 0.906,
      revenueHourFulfillmentPct: 0.909,
      avgFulfillmentPct: 0.908,
      issueCount: 5,
      revenueHoursAtRisk: 265.05,
    }],
    totalDivisions: 8,
    isCompanyWide: false,
  });

  render(<MemoryRouter><Leaderboard /></MemoryRouter>);

  expect(await screen.findByText("Company rank #4 of 8 · 90.8%")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();
  expect(screen.getByText("Issues Logged in Accessible Divisions")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Division 6 - LYNX" })).not.toBeInTheDocument();
});
