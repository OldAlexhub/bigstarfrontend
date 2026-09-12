import React from "react";
import { render, screen } from "@testing-library/react";
import RunCutDayTable from "./RunCutDayTable";

const row = {
  _id: "run-cut-day-1",
  route: { code: "500A" },
  status: "suspended",
  disposition: "closed_suspended",
  dispositionSource: "status",
  serviceHours: 8,
  revenueHours: 7,
};

test("a status-owned Closed/Suspended disposition is shown and locked", () => {
  render(
    <RunCutDayTable
      rows={[row]}
      onPatch={vi.fn()}
      showDisposition
      showDisruptionAndNotes={false}
    />
  );

  const disposition = screen.getByTitle("Automatically set by Suspended status");
  expect(disposition).toBeDisabled();
  expect(disposition).toHaveValue("closed_suspended");
  expect(disposition).toHaveClass("bg-red-50");
});

test("a manual disposition remains editable when the status does not own it", () => {
  render(
    <RunCutDayTable
      rows={[{
        ...row,
        status: "active",
        disposition: "deployed_on_time",
        dispositionSource: "manual",
      }]}
      onPatch={vi.fn()}
      showDisposition
      showDisruptionAndNotes={false}
    />
  );

  expect(screen.getByTitle("Final outcome for this route")).toBeEnabled();
});
