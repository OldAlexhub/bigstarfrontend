import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "../../api/client";
import DriversRoster from "./DriversRoster";

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

test("adds a division-owned driver with a reusable pullout address", async () => {
  apiGet.mockResolvedValue({ operators: [] });
  apiPost.mockResolvedValue({
    operator: {
      _id: "operator-1",
      name: "Jane Doe",
      pulloutAddress: "100 Depot Way",
      division: { _id: "division-1", name: "East" },
      active: true,
    },
  });

  render(<DriversRoster />);
  fireEvent.click(await screen.findByRole("button", { name: "+ Add Driver" }));
  fireEvent.change(screen.getByLabelText("Driver name"), { target: { value: "jANE dOE" } });
  fireEvent.change(screen.getByLabelText("Pullout address"), { target: { value: "100 Depot Way" } });
  fireEvent.click(screen.getByRole("button", { name: "Add driver" }));

  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/operators", expect.objectContaining({
    division: "division-1",
    name: "jANE dOE",
    pulloutAddress: "100 Depot Way",
    active: true,
  })));
  expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
});
