import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiDownload, apiGet } from "../api/client";
import EltReporting from "./EltReporting";

vi.mock("../api/client", () => ({ apiDownload: vi.fn(), apiGet: vi.fn() }));
vi.mock("../components/TrendChart", () => ({ default: () => null }));
vi.mock("react-router-dom", () => ({ Link: ({ children }) => <span>{children}</span> }));

test("ELT Reporting separates planned and actual revenue-hour fulfillment", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [] });
    return Promise.resolve({
      networkSummary: {
        runCutFulfillmentPct: 0.95,
        plannedRevenueHourFulfillmentPct: 0.9,
        actualRevenueHourFulfillmentPct: 0.875,
        actualRevenueComparableRouteDays: 2,
        revenueHoursAtRisk: 4,
        totalClosures: 0,
        totalLateFirst: 0,
        totalLateDeploy: 0,
        unassignedRoutesCount: 0,
      },
      priorNetworkSummary: null,
      trend: [],
      issues: [],
      divisions: [{
        divisionId: "division-1",
        name: "Division One",
        runCutFulfillmentPct: 0.95,
        plannedRevenueHourFulfillmentPct: 0.9,
        actualRevenueHourFulfillmentPct: 0.875,
        actualRevenueComparableRouteDays: 2,
        revenueHoursAtRisk: 4,
        totalClosures: 0,
        totalLateFirst: 0,
        totalLateDeploy: 0,
        unassignedRoutesCount: 0,
      }],
    });
  });

  render(<EltReporting />);

  expect(await screen.findByText("Division One")).toBeInTheDocument();
  expect(screen.getAllByText("Planned Revenue Hour Fulfillment").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Actual Revenue Hour Fulfillment").length).toBeGreaterThan(0);
  expect(screen.getAllByText("87.5%").length).toBeGreaterThan(0);
  expect(screen.getByText("2 uploaded route-days")).toBeInTheDocument();
});

test("ELT exports use the authenticated download client", async () => {
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [] });
    return Promise.resolve({
      networkSummary: {},
      priorNetworkSummary: null,
      trend: [],
      issues: [],
      divisions: [],
    });
  });
  apiDownload.mockResolvedValue({ blob: new Blob(["pdf"]), filename: "ELT-Report.pdf" });
  const createObjectURL = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:elt-report");
  const revokeObjectURL = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<EltReporting />);

  const downloadButton = screen.getByRole("button", { name: "Download PDF" });
  await waitFor(() => expect(downloadButton).toBeEnabled());
  fireEvent.click(downloadButton);

  expect(apiDownload).toHaveBeenCalledWith(expect.stringMatching(
    /^\/api\/elt-reporting\/export\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}&format=pdf$/
  ));
  await waitFor(() => expect(downloadButton).toBeEnabled());

  createObjectURL.mockRestore();
  revokeObjectURL.mockRestore();
  click.mockRestore();
});
