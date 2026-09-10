import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiFormPost, apiGet, apiPost } from "../../api/client";
import ExcelSubmissions from "./ExcelSubmissions";

jest.mock("../../api/client", () => ({ apiFormPost: jest.fn(), apiGet: jest.fn(), apiPost: jest.fn() }));

const pending = {
  id: "submission-1",
  status: "pending",
  reportDates: ["2026-09-08"],
  blockedDates: [],
  divisionCandidates: [{ division: "division-1", code: "DIV_6", name: "LYNX", matchedRoutes: 2, totalRoutes: 2 }],
  counts: { sourceRows: 2, automaticMatches: 0, routeBlockers: 0, zeroTripRows: 0 },
};

test("guided workflow blocks final review until an unresolved route is mapped or excluded", async () => {
  apiGet.mockResolvedValue({ submissions: [] });
  apiFormPost.mockResolvedValue({ submission: pending });
  apiPost.mockResolvedValue({
    submission: { ...pending, status: "matched", counts: { ...pending.counts, automaticMatches: 1, routeBlockers: 1 } },
    routes: [{ id: "route-1", code: "1029-B", type: "standard" }, { id: "route-2", code: "1037", type: "standard" }],
    existingKeys: [],
    rows: [
      { id: "v2", severity: "blocker", date: "2026-09-08", sourceRoute: "1038A", completedTrips: 5, matchedRouteId: null, suggestions: [], matchReason: "No safe route match", sourceOperator: null, operatorName: null, providerName: null, operationalOutcome: "Awaiting route match", deployment: null },
      { id: "v1", severity: "clean", date: "2026-09-08", sourceRoute: "1029B", completedTrips: 10, matchedRouteId: "route-1", matchedRoute: "1029-B", suggestions: [], matchReason: "Normalized exact match", sourceOperator: null, operatorName: "Operator", providerName: "Provider", operationalOutcome: "Operated", deployment: { provenance: {}, lateToFirst: 0, lateDeploy: 0 } },
    ],
  });

  const { container } = render(<ExcelSubmissions />);
  const file = new File(["workbook"], "vision.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to matching" }));
  expect(await screen.findByText("Confirm the division, then review matches")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Confirm & match" }));
  expect(await screen.findByText("1038A")).toBeInTheDocument();
  const details = screen.getByRole("button", { name: "Show details for 1029B on 2026-09-08" });
  expect(details).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(details);
  expect(screen.getByRole("button", { name: "Hide details for 1029B on 2026-09-08" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText("Deployment snapshot")).toBeInTheDocument();
  const next = screen.getByRole("button", { name: "Review final changes" });
  expect(next).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Matched route for 1038A on 2026-09-08"), { target: { value: "route-2" } });
  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);
  expect(screen.getByText("Review what will be saved")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirm and save" })).toBeEnabled();
});
