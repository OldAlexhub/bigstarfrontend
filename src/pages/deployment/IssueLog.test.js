import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet } from "../../api/client";
import IssueLog from "./IssueLog";

jest.mock("react-router-dom", () => {
  const selectedDivision = {
    _id: "division-1",
    name: "Test Division",
    timezone: "America/New_York",
  };
  const searchParams = new URLSearchParams();
  return {
    useOutletContext: () => ({ selectedDivision }),
    useSearchParams: () => [searchParams, jest.fn()],
  };
});

jest.mock("../../api/client", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}));

test("Issue Log reloads records for the selected From and To dates", async () => {
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
});
