import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiDownload, apiGet } from "../api/client";
import Leaderboard from "./Leaderboard";

vi.mock("../api/client", () => ({
  apiDownload: vi.fn(),
  apiGet: vi.fn(),
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

test("downloads the leaderboard PDF through the authenticated API client", async () => {
  apiGet.mockResolvedValue({ divisions: [], totalDivisions: 0, isCompanyWide: true });
  apiDownload.mockResolvedValue({ blob: new Blob(["pdf"]), filename: "Leaderboard.pdf" });
  const createObjectURL = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:leaderboard");
  const revokeObjectURL = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<MemoryRouter><Leaderboard /></MemoryRouter>);

  const downloadButton = await screen.findByRole("button", { name: "Download PDF" });
  fireEvent.click(downloadButton);

  expect(apiDownload).toHaveBeenCalledWith(expect.stringMatching(
    /^\/api\/leaderboard\/export\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/
  ));
  expect(await screen.findByRole("button", { name: "Download PDF" })).toBeEnabled();

  createObjectURL.mockRestore();
  revokeObjectURL.mockRestore();
  click.mockRestore();
});
