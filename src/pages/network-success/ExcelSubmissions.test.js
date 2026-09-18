import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { apiDelete, apiFormPost, apiGet, apiPost } from "../../api/client";
import ExcelSubmissions, { MATCH_ROWS_PAGE_SIZE, RECENT_SUBMISSIONS_PAGE_SIZE } from "./ExcelSubmissions";

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

test("shows match rows 25 at a time", async () => {
  const rows = Array.from({ length: 27 }, (_, index) => {
    const label = `Route ${String(index + 1).padStart(2, "0")}`;
    return {
      id: `v${index + 1}`,
      severity: "clean",
      date: "2026-09-08",
      sourceRoute: label,
      completedTrips: 10,
      matchedRouteId: "route-1",
      matchedRoute: "1029-B",
      suggestions: [],
      matchReason: "Normalized exact match",
      sourceOperator: null,
      operatorName: "Operator",
      providerName: "Provider",
      operationalOutcome: "Operated",
      deployment: { provenance: {}, lateToFirst: 0, lateDeploy: 0 },
    };
  });
  apiGet.mockResolvedValue({ submissions: [] });
  apiFormPost.mockResolvedValue({ submission: pending });
  apiPost.mockResolvedValue({
    submission: { ...pending, status: "matched", counts: { ...pending.counts, automaticMatches: 27, routeBlockers: 0 } },
    routes: [{ id: "route-1", code: "1029-B", type: "standard" }],
    existingKeys: [],
    rows,
  });

  const { container } = render(<ExcelSubmissions />);
  const file = new File(["workbook"], "vision.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to matching" }));
  expect(await screen.findByText("Confirm the division, then review matches")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm & match" }));

  expect(await screen.findByText("Route 01")).toBeInTheDocument();
  expect(MATCH_ROWS_PAGE_SIZE).toBe(25);
  expect(screen.getByText("Route 25")).toBeInTheDocument();
  expect(screen.queryByText("Route 26")).not.toBeInTheDocument();
  expect(screen.getByText("Showing 1-25 of 27")).toBeInTheDocument();

  const pagination = screen.getByRole("navigation", { name: "Match rows pagination" });
  fireEvent.click(within(pagination).getByRole("button", { name: "Next" }));

  expect(screen.queryByText("Route 01")).not.toBeInTheDocument();
  expect(screen.getByText("Route 26")).toBeInTheDocument();
  expect(screen.getByText("Route 27")).toBeInTheDocument();
  expect(screen.getByText("Showing 26-27 of 27")).toBeInTheDocument();
  expect(within(pagination).getByRole("button", { name: "Next" })).toBeDisabled();
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
  const confirmButton = screen.getByRole("button", { name: "Remove submission" });
  expect(confirmButton).toBeDisabled();
  fireEvent.click(confirmButton);
  expect(apiDelete).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText(/Type/), { target: { value: "yes remove" } });
  expect(confirmButton).toBeEnabled();
  fireEvent.click(confirmButton);

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

test("Spare submissions accept a single CSV file and reject other extensions", async () => {
  apiGet.mockResolvedValue({ submissions: [] });
  apiFormPost.mockResolvedValue({ submission: { ...pending, source: "spare" } });

  const { container } = render(<ExcelSubmissions />);
  fireEvent.click(await screen.findByRole("button", { name: /Spare/ }));
  expect(await screen.findByText("Daily Duty Performance")).toBeInTheDocument();

  const input = container.querySelector('input[type="file"]');
  expect(input).toHaveAttribute("accept", ".csv");

  const wrongType = new File(["data"], "duty-performance.xlsx", { type: "application/vnd.ms-excel" });
  fireEvent.change(input, { target: { files: [wrongType] } });
  expect(await screen.findByText(/Each file must be a \.csv file/)).toBeInTheDocument();

  const csv = new File(["duty_report__duty_identifier,..."], "duty-performance.csv", { type: "text/csv" });
  fireEvent.change(input, { target: { files: [csv] } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to matching" }));

  await waitFor(() => expect(apiFormPost).toHaveBeenCalled());
  const [, form] = apiFormPost.mock.calls[0];
  expect(form.get("source")).toBe("spare");
  expect(form.get("spare").name).toBe("duty-performance.csv");
});

test("recent submissions paginate three records per view", async () => {
  const submissions = Array.from({ length: 7 }, (_, index) => ({
    id: `submission-${index + 1}`,
    source: "vision",
    status: "confirmed",
    createdAt: `2026-09-${String(10 - index).padStart(2, "0")}T12:00:00.000Z`,
    division: { code: `DIV_${index + 1}`, name: `Division ${index + 1}` },
  }));
  apiGet.mockReset();
  apiGet.mockResolvedValue({ submissions });

  render(<ExcelSubmissions />);

  expect(await screen.findByText("DIV_1 · Division 1")).toBeInTheDocument();
  expect(RECENT_SUBMISSIONS_PAGE_SIZE).toBe(3);
  expect(screen.getByText("DIV_3 · Division 3")).toBeInTheDocument();
  expect(screen.queryByText("DIV_4 · Division 4")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");

  fireEvent.click(screen.getByRole("button", { name: "Next" }));

  expect(screen.getByText("DIV_4 · Division 4")).toBeInTheDocument();
  expect(screen.getByText("DIV_6 · Division 6")).toBeInTheDocument();
  expect(screen.queryByText("DIV_1 · Division 1")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");

  fireEvent.click(screen.getByRole("button", { name: "Page 3" }));

  expect(screen.getByText("DIV_7 · Division 7")).toBeInTheDocument();
  expect(screen.queryByText("DIV_6 · Division 6")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});
