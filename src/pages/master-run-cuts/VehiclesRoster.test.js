import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "../../api/client";
import VehiclesRoster from "./VehiclesRoster";

vi.mock("react-router-dom", () => {
  const division = { _id: "division-1", name: "East" };
  const context = { divisions: [division], selectedDivision: division, isAllDivisions: false };
  return { useOutletContext: () => context };
});
vi.mock("../../api/client", () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

test("adds a vehicle to the selected division roster", async () => {
  apiGet.mockResolvedValue({ vehicles: [] });
  apiPost.mockResolvedValue({
    vehicle: {
      _id: "vehicle-1",
      code: "BUS12",
      division: { _id: "division-1", name: "East" },
      active: true,
    },
  });

  render(<VehiclesRoster />);
  fireEvent.click(await screen.findByRole("button", { name: "+ Add Vehicle" }));
  fireEvent.change(screen.getByLabelText("Vehicle number"), { target: { value: "bus 12" } });
  fireEvent.click(screen.getByRole("button", { name: "Add vehicle" }));

  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/vehicles", {
    code: "bus 12",
    division: "division-1",
  }));
  expect(await screen.findByText("BUS12")).toBeInTheDocument();
});
