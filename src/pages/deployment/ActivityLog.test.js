import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { apiDownload, apiGet } from "../../api/client";
import ActivityLog, { TRACKER_LOG_PAGE_SIZE } from "./ActivityLog";

vi.mock("react-router-dom", () => {
  const selectedDivision = {
    _id: "division-1",
    name: "Test Division",
    timezone: "America/New_York",
  };
  return {
    useOutletContext: () => ({ selectedDivision }),
  };
});

vi.mock("../../api/client", () => ({ apiDownload: vi.fn(), apiGet: vi.fn() }));

const entries = Array.from({ length: 32 }, (_, index) => ({
  _id: `entry-${index + 1}`,
  createdAt: new Date(Date.UTC(2026, 8, 9, 12, 0, index)).toISOString(),
  username: "dispatcher",
  name: "Dispatcher",
  action: "issue.updated",
  summary: `Tracker action ${index + 1}`,
}));

test("Tracker Log shows 15 records per numbered page and resets pagination for search", async () => {
  apiGet.mockResolvedValue({ entries });
  render(<ActivityLog />);

  expect(await screen.findByText("Tracker action 1")).toBeInTheDocument();
  expect(TRACKER_LOG_PAGE_SIZE).toBe(15);
  expect(screen.getByText("Tracker action 15")).toBeInTheDocument();
  expect(screen.queryByText("Tracker action 16")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "2" }));
  expect(screen.getByText("Tracker action 16")).toBeInTheDocument();
  expect(screen.getByText("Tracker action 30")).toBeInTheDocument();
  expect(screen.queryByText("Tracker action 1")).not.toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText(/Search by user or action/), {
    target: { value: "Tracker action 32" },
  });
  expect(screen.getByText("Tracker action 32")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Tracker Log pages" })).not.toBeInTheDocument();
});

test("Tracker Log downloads all data for the selected dates as CSV", async () => {
  apiGet.mockResolvedValue({ entries: [] });
  apiDownload.mockResolvedValue({ blob: new Blob(["data"]), filename: "tracker.csv" });
  const createObjectURL = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:tracker");
  const revokeObjectURL = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<ActivityLog />);
  fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
  fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-15" } });
  fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));

  expect(apiDownload).toHaveBeenCalledWith(
    "/api/deployment-activity/export?division=division-1&from=2026-09-01&to=2026-09-15&format=csv"
  );
  expect(await screen.findByRole("button", { name: "Download CSV" })).toBeEnabled();

  createObjectURL.mockRestore();
  revokeObjectURL.mockRestore();
  click.mockRestore();
});
