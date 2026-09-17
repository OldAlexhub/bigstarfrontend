import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet } from "../../api/client";
import IssueLog from "./IssueLog";

vi.mock("react-router-dom", () => {
  const selectedDivision = {
    _id: "division-1",
    name: "Test Division",
    timezone: "America/New_York",
  };
  const searchParams = new URLSearchParams();
  return {
    useOutletContext: () => ({ selectedDivision }),
    useSearchParams: () => [searchParams, vi.fn()],
  };
});

vi.mock("../../api/client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

test("read-only Issue Log reloads records without requesting editing reference data", async () => {
  apiGet.mockImplementation((url) => {
    if (url.startsWith("/api/daily-issues")) {
      const isSelectedRange = url.includes("from=2026-08-01&to=2026-08-15");
      return Promise.resolve({
        issues: isSelectedRange
          ? [
              {
                _id: "issue-1",
                date: "2026-08-15T14:30:00.000Z",
                route: { _id: "route-1", code: "R1" },
                operator: null,
                disruptionType: "Late Deploy",
                notes: "Inside selected range",
              },
            ]
          : [],
      });
    }
    if (url.startsWith("/api/routes")) return Promise.resolve({ routes: [] });
    if (url.startsWith("/api/operators")) return Promise.resolve({ operators: [] });
    if (url.startsWith("/api/run-cuts")) return Promise.resolve({ runCuts: [] });
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });

  render(<IssueLog />);
  const fromInput = screen.getByLabelText("From");
  const toInput = screen.getByLabelText("To");

  fireEvent.change(fromInput, { target: { value: "2026-08-01" } });
  fireEvent.change(toInput, { target: { value: "2026-08-15" } });

  await waitFor(() =>
    expect(apiGet).toHaveBeenCalledWith(
      "/api/daily-issues?division=division-1&from=2026-08-01&to=2026-08-15"
    )
  );
  expect(await screen.findByText("Inside selected range")).toBeInTheDocument();
  expect(screen.queryByText("Log an issue")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  expect(apiGet.mock.calls.every(([url]) => url.startsWith("/api/daily-issues"))).toBe(true);
});
