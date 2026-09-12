import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiDelete, apiGet, apiPut } from "../../api/client";
import SafetyEntries from "./SafetyEntries";

vi.mock("../../api/client", () => ({ apiDelete: vi.fn(), apiGet: vi.fn(), apiPut: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") {
      return Promise.resolve({ divisions: [{ _id: "division-1", code: "D1", name: "Division One" }] });
    }
    return Promise.resolve({
      entries: [{ id: "entry-1", month: "2026-08", miles: 125000, preventableAccidents: 2, nonPreventableAccidents: 1, updatedAt: "2026-09-01T12:00:00.000Z" }],
    });
  });
});

test("saves monthly mileage and accident counts", async () => {
  apiPut.mockResolvedValue({ created: true, entry: {} });
  render(<SafetyEntries />);
  expect(await screen.findByText("August 2026")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Service month"), { target: { value: "2026-09" } });
  fireEvent.change(screen.getByLabelText("Miles traveled"), { target: { value: "150000" } });
  fireEvent.change(screen.getByLabelText("Preventable accidents"), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText("Non-preventable accidents"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/api/safety/entries", {
    division: "division-1",
    month: "2026-09",
    miles: 150000,
    preventableAccidents: 3,
    nonPreventableAccidents: 2,
  }));
  expect(await screen.findByRole("status")).toHaveTextContent("Monthly safety figures added");
});

test("uses an in-app dialog before removing a safety record", async () => {
  apiDelete.mockResolvedValue({ message: "Safety entry removed." });
  render(<SafetyEntries />);
  expect(await screen.findByText("August 2026")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(screen.getByRole("dialog", { name: "Remove this safety record?" })).toBeInTheDocument();
  expect(apiDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Remove record" }));
  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/api/safety/entries/entry-1"));
});
