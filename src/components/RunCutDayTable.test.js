import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

test("daily assignment mode edits assignment fields without exposing master route controls", () => {
  const onPatch = vi.fn();
  render(
    <RunCutDayTable
      rows={[{
        ...row,
        operator: { _id: "operator-1", name: "Original Operator" },
        vehicle: { _id: "vehicle-1", code: "BUS-1" },
        pulloutAddress: "100 Main St",
        startTime: "08:00",
        endTime: "16:00",
      }]}
      onPatch={onPatch}
      editableDailyAssignment
      showDisruptionAndNotes={false}
      operators={[
        { _id: "operator-1", name: "Original Operator", active: true },
        { _id: "operator-2", name: "New Operator", active: true },
      ]}
      vehicles={[{ _id: "vehicle-1", code: "BUS-1", active: true }]}
    />
  );

  fireEvent.change(screen.getByLabelText("Driver for 500A"), { target: { value: "operator-2" } });
  expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ _id: row._id }), {
    operatorId: "operator-2",
  });
  expect(screen.getByText("100 Main St")).toBeInTheDocument();
  expect(screen.queryByLabelText(/Route type/)).not.toBeInTheDocument();
  expect(screen.queryByTitle("MON")).not.toBeInTheDocument();
});
