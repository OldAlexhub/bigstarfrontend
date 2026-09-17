import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiDownload, apiGet } from "../api/client";
import ReportBuilder from "./ReportBuilder";

vi.mock("../api/client", () => ({ apiGet: vi.fn(), apiDownload: vi.fn() }));

const operationsPreview = {
  source: { key: "operations", label: "Division performance" },
  columns: [
    { key: "name", label: "Division" },
    { key: "runCutFulfillmentPct", label: "Run Cut Fulfillment" },
  ],
  rows: [{ name: "Division One", runCutFulfillmentPct: "97.5%" }],
  total: 1,
  divisionCount: 1,
};

const issuePreview = {
  source: { key: "issues", label: "Issues and disruptions" },
  columns: [
    { key: "divisionName", label: "Division" },
    { key: "disruptionType", label: "Issue Type" },
  ],
  rows: [{ divisionName: "Division One", disruptionType: "Route Closed" }],
  total: 1,
  divisionCount: 1,
};

const rawPreview = {
  source: { key: "network_raw", label: "Network Success raw performance" },
  columns: [
    { key: "sourceRoute", label: "Source Route" },
    { key: "matchedOperator", label: "Matched Operator" },
    { key: "completedTrips", label: "Completed Trips" },
  ],
  rows: [{ sourceRoute: "BST-10A", matchedOperator: "Matched Driver", completedTrips: "20" }],
  total: 1,
  divisionCount: 1,
};

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") {
      return Promise.resolve({ divisions: [{ _id: "division-1", code: "D1", name: "Division One" }] });
    }
    if (path.startsWith("/api/report-builder?")) {
      if (path.includes("source=issues")) return Promise.resolve(issuePreview);
      if (path.includes("source=network_raw")) return Promise.resolve(rawPreview);
      return Promise.resolve(operationsPreview);
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
});

test("starts with a useful scorecard preview and can apply the closure template", async () => {
  render(<ReportBuilder />);

  expect(await screen.findByText("Division One")).toBeInTheDocument();
  expect(screen.getByText("97.5%")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Closure register/i }));

  await waitFor(() => expect(apiGet).toHaveBeenCalledWith(expect.stringMatching(
    /\/api\/report-builder\?.*source=issues.*issueType=closures/
  )));
  expect((await screen.findAllByText("Route Closed")).length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Route Closure Register" })).toBeInTheDocument();
});

test("keeps exports disabled until edited report settings are applied", async () => {
  render(<ReportBuilder />);
  await screen.findByText("97.5%");

  const excel = screen.getByRole("button", { name: "Export Excel" });
  expect(excel).toBeEnabled();

  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-08-01" } });
  expect(excel).toBeDisabled();
  expect(screen.getByText(/changed the report settings/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Apply and preview" }));
  await waitFor(() => expect(excel).toBeEnabled());
  expect(apiDownload).not.toHaveBeenCalled();
});

test("offers confirmed Network Success upload rows as a raw, non-analyzed source", async () => {
  render(<ReportBuilder />);
  await screen.findByText("97.5%");

  fireEvent.click(screen.getByRole("button", { name: /NS upload rows/i }));

  await waitFor(() => expect(apiGet).toHaveBeenCalledWith(expect.stringMatching(
    /\/api\/report-builder\?.*source=network_raw.*networkSource=all/
  )));
  const rawRequest = apiGet.mock.calls.map(([path]) => path).find((path) => path.includes("source=network_raw"));
  const rawFields = new URL(rawRequest, "https://bigstar.test").searchParams.get("fields").split(",");
  expect(rawFields).toContain("matchedOperator");
  expect(rawFields).not.toContain("sourceOperator");
  expect(await screen.findByText("BST-10A")).toBeInTheDocument();
  expect(screen.getByText("Matched Driver")).toBeInTheDocument();
  expect(screen.getByText(/without rollups, scoring, or analysis/i)).toBeInTheDocument();
  expect(screen.getByLabelText("Upload source")).toHaveValue("all");
});
