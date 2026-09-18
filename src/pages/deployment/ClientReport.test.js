import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiDownload } from "../../api/client";
import ClientReport from "./ClientReport";

vi.mock("react-router-dom", () => {
  const selectedDivision = {
      _id: "division-1",
      code: "DIV_10",
      name: "Division 10",
      timezone: "America/New_York",
  };
  return { useOutletContext: () => ({ selectedDivision }) };
});

vi.mock("../../api/client", () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDownload: vi.fn() }));

const baseReport = {
  division: { id: "division-1", code: "DIV_10", name: "Division 10" },
  date: "2026-09-16T00:00:00.000Z",
  dayOfWeek: "WED",
};

describe("Client Report updates", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockImplementation((url) => {
      if (url.includes("mode=updates")) {
        return Promise.resolve({
          ...baseReport,
          rows: [
            {
              routeId: "route-904",
              route: "904",
              operator: "Lola Hilliard",
              vehicle: "4494",
              pulloutAddress: "1390 NW Wonderview Dr.",
              startTime: "06:00",
              endTime: "13:00",
              status: "active",
              dailyChanges: "Active",
              clientNotes: "Close route early at 13:00",
            },
          ],
        });
      }
      return Promise.resolve({ ...baseReport, rows: [] });
    });
  });

  test("offers Today and Tomorrow update templates and renders only changed routes", async () => {
    render(<ClientReport />);
    fireEvent.click(screen.getByRole("tab", { name: "Updates" }));

    expect(await screen.findByText("Close route early at 13:00")).toBeInTheDocument();
    expect(screen.getByText("Daily Changes")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Today/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tomorrow/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Request wording")).toHaveValue("a live day schedule update");

    fireEvent.change(screen.getByLabelText("Request wording"), {
      target: { value: "a live day route to be suspended early" },
    });
    expect(
      screen.getByText((_, element) =>
        element.tagName === "P" && element.textContent.includes("a live day route to be suspended early")
      )
    ).toBeInTheDocument();
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith(expect.stringContaining("mode=updates")));
  });
});

describe("Client Report work order", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiDownload.mockReset();
    apiGet.mockResolvedValue({ ...baseReport, rows: [] });
    apiDownload.mockResolvedValue({ blob: new Blob(["data"]), filename: "DIV_10_WO_091326_091926.xlsx" });
  });

  test("downloads a 7-day work order for the chosen start date without fetching the daily schedule", async () => {
    const createObjectURL = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:work-order");
    const revokeObjectURL = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});

    render(<ClientReport />);
    fireEvent.click(screen.getByRole("tab", { name: "Work Order" }));

    expect(screen.queryByRole("button", { name: /Today/ })).not.toBeInTheDocument();
    apiGet.mockClear();

    fireEvent.change(screen.getByLabelText("Work order start date"), { target: { value: "2026-09-13" } });
    fireEvent.click(screen.getByRole("button", { name: "Download Work Order" }));

    await waitFor(() =>
      expect(apiDownload).toHaveBeenCalledWith(
        "/api/reports/work-order?division=division-1&from=2026-09-13"
      )
    );
    expect(apiGet).not.toHaveBeenCalled();

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
