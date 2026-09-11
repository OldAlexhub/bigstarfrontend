import { fireEvent, render, screen, within } from "@testing-library/react";
import Navbar from "./Navbar";

let mockPathname = "/dashboard";
let mockUser = { name: "Division Manager", role: "ELT" };

jest.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: mockUser, logout: jest.fn() }) }));
jest.mock("react-router-dom", () => ({
  NavLink: ({ to, children, className, onClick }) => (
    <a href={to} onClick={onClick} className={typeof className === "function" ? className({ isActive: false }) : className}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: mockPathname }),
}));

beforeEach(() => {
  mockPathname = "/dashboard";
  mockUser = { name: "Division Manager", role: "ELT" };
});

test("shows Dashboard, the flat scheduling links, the two grouped dropdowns, and Settings for an ELT user", () => {
  render(<Navbar />);

  expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Master Run Cuts" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Deployment" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Network Success" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Performance" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reporting" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
});

test("clicking a group reveals its items and closes after picking one", () => {
  render(<Navbar />);

  expect(screen.queryByRole("link", { name: "Safety" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Performance" }));

  const safety = screen.getByRole("link", { name: "Safety" });
  expect(screen.getByRole("link", { name: "Customer Service" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Operations Reporting" })).toBeInTheDocument();

  fireEvent.click(safety);
  expect(screen.queryByRole("link", { name: "Safety" })).not.toBeInTheDocument();
});

test("a user with only safety access sees a single Performance group and no scheduling links", () => {
  mockUser = { name: "Safety Coordinator", role: "manager", sections: ["safety"] };
  render(<Navbar />);

  expect(screen.queryByRole("link", { name: "Master Run Cuts" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Reporting" })).not.toBeInTheDocument();

  const performance = screen.getByRole("button", { name: "Performance" });
  fireEvent.click(performance);
  const panel = performance.closest("div").querySelector("div.absolute");
  expect(within(panel).getByRole("link", { name: "Safety" })).toBeInTheDocument();
  expect(within(panel).queryByRole("link", { name: "Customer Service" })).not.toBeInTheDocument();
});
