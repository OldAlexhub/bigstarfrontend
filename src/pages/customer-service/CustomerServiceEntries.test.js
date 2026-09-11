import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiDelete, apiGet, apiPut } from "../../api/client";
import CustomerServiceEntries from "./CustomerServiceEntries";

jest.mock("../../api/client", () => ({ apiDelete: jest.fn(), apiGet: jest.fn(), apiPut: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  apiGet.mockImplementation((path) => {
    if (path === "/api/divisions") {
      return Promise.resolve({ divisions: [{ _id: "division-1", code: "D1", name: "Division One" }] });
    }
    return Promise.resolve({
      entries: [{ id: "entry-1", month: "2026-08", complaints: 4, compliments: 7, updatedAt: "2026-09-01T12:00:00.000Z" }],
    });
  });
});

test("saves complaint and compliment counts for a service month", async () => {
  apiPut.mockResolvedValue({ created: true, entry: {} });
  render(<CustomerServiceEntries />);

  expect(await screen.findByText("August 2026")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Service month"), { target: { value: "2026-09" } });
  fireEvent.change(screen.getByLabelText("Complaints"), { target: { value: "6" } });
  fireEvent.change(screen.getByLabelText("Compliments"), { target: { value: "9" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/api/customer-service/entries", {
    division: "division-1",
    month: "2026-09",
    complaints: 6,
    compliments: 9,
  }));
  expect(await screen.findByRole("status")).toHaveTextContent("Monthly counts added");
});

test("loads a saved month into the edit form", async () => {
  render(<CustomerServiceEntries />);
  expect(await screen.findByText("August 2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Service month")).toHaveValue("2026-08");
  expect(screen.getByLabelText("Complaints")).toHaveValue(4);
  expect(screen.getByLabelText("Compliments")).toHaveValue(7);
  expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
});

test("uses an in-app dialog before removing a customer service record", async () => {
  apiDelete.mockResolvedValue({ message: "Customer service entry removed." });
  render(<CustomerServiceEntries />);
  expect(await screen.findByText("August 2026")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  expect(screen.getByRole("dialog", { name: "Remove this customer service record?" })).toBeInTheDocument();
  expect(apiDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Remove record" }));
  await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/api/customer-service/entries/entry-1"));
});
