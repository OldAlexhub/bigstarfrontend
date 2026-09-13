import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet } from "../../api/client";
import KpiTracker from "./KpiTracker";
import { addMonths, localMonth } from "./reportingUi";

vi.mock("../../api/client", () => ({ apiGet: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") return Promise.resolve({ divisions: [] });
    return Promise.resolve({ months: [], divisions: [] });
  });
});

test("loads the latest three months by default and keeps the month filters expandable", async () => {
  const currentMonth = localMonth();
  const defaultFrom = addMonths(currentMonth, -2);
  const expandedFrom = addMonths(currentMonth, -11);
  render(<KpiTracker />);

  expect(screen.getByLabelText("From month")).toHaveValue(defaultFrom);
  expect(screen.getByLabelText("To month")).toHaveValue(currentMonth);
  await waitFor(() => expect(apiGet).toHaveBeenCalledWith(
    `/api/operations-reporting/tracker?from=${defaultFrom}&to=${currentMonth}`,
  ));

  fireEvent.change(screen.getByLabelText("From month"), { target: { value: expandedFrom } });
  fireEvent.click(screen.getByRole("button", { name: "View tracker" }));

  await waitFor(() => expect(apiGet).toHaveBeenCalledWith(
    `/api/operations-reporting/tracker?from=${expandedFrom}&to=${currentMonth}`,
  ));
  expect(screen.getByText(/Showing the latest 3 months by default/i)).toBeInTheDocument();
});
