import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiDelete, apiFormPost, apiGet, apiPost } from "../../api/client";
import ExcelSubmissions from "./ExcelSubmissions";

vi.mock("../../api/client", () => ({ apiDelete: vi.fn(), apiFormPost: vi.fn(), apiGet: vi.fn(), apiPost: vi.fn() }));

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

test("recent submissions can be removed and re-uploaded", async () => {
  const confirmed = {
    id: "submission-1",
    source: "vision",
    status: "confirmed",
    createdAt: "2026-09-10T12:00:00.000Z",
    division: { code: "DIV_6", name: "Division 6 - LYNX" },
  };
  apiGet.mockResolvedValueOnce({ submissions: [confirmed] }).mockResolvedValue({ submissions: [] });
  apiDelete.mockResolvedValue({ message: "Submission removed. You can upload the corrected files again now." });

  render(<ExcelSubmissions />);
  expect(await screen.findByText("Division 6 - LYNX", { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(screen.getByRole("dialog", { name: "Remove this submission?" })).toBeInTheDocument();
  expect(apiDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Remove submission" }));

  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/api/network-success/submissions/submission-1"));
  expect(await screen.findByRole("status")).toHaveTextContent("Submission removed");
});

test("a confirmed submission opens as an editable revision with fresh matching", async () => {
  const confirmed = {
    id: "submission-1",
    source: "vision",
    status: "confirmed",
    createdAt: "2026-09-10T12:00:00.000Z",
    division: { _id: "division-1", code: "DIV_6", name: "Division 6 - LYNX" },
  };
  const revision = {
    ...pending,
    id: "revision-1",
    source: "vision",
    division: "division-1",
    reopenedFrom: "submission-1",
  };
  const matchedRevision = { ...revision, status: "matched" };
  apiGet.mockResolvedValue({ submissions: [confirmed] });
  apiPost.mockImplementation((url) => {
    if (url === "/api/network-success/submissions/submission-1/reopen") {
      return Promise.resolve({ submission: revision, reopened: true });
    }
    if (url === "/api/network-success/submissions/revision-1/preview") {
      return Promise.resolve({
        submission: matchedRevision,
        routes: [{ id: "route-1", code: "1037", type: "standard" }],
        existingKeys: ["2026-09-08|route-1"],
        rows: [{
          id: "v1",
          severity: "clean",
          date: "2026-09-08",
          sourceRoute: "1037A",
          completedTrips: 8,
          matchedRouteId: "route-1",
          matchedRoute: "1037",
          suggestions: [],
          matchReason: "Unique safe letter insertion/deletion match",
          sourceOperator: null,
          operatorName: "Operator One",
          providerName: null,
          operationalOutcome: "Operated",
          deployment: { provenance: {}, lateToFirst: 0, lateDeploy: 0 },
        }],
      });
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });

  render(<ExcelSubmissions />);
  expect(await screen.findByText("Division 6 - LYNX", { exact: false })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open" }));

  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/network-success/submissions/submission-1/reopen", {}));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/network-success/submissions/revision-1/preview", { division: "division-1" }));
  expect(await screen.findByText("Confirm the division, then review matches")).toBeInTheDocument();
  expect(screen.getByText("1037A")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review final changes" })).toBeEnabled();
});
