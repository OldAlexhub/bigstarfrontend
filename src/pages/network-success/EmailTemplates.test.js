import { fireEvent, render, screen } from "@testing-library/react";
import EmailTemplates from "./EmailTemplates";

describe("EmailTemplates", () => {
  test("lists every Outlook template with a use case and download action", () => {
    render(<EmailTemplates />);

    expect(screen.getByRole("heading", { name: "Email Template Library" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Download template" })).toHaveLength(9);
    expect(screen.getByText("Notice of Concern")).toBeInTheDocument();
    expect(screen.getByText(/Document an initial performance or compliance concern/)).toBeInTheDocument();
  });

  test("filters templates by category and search text", () => {
    render(<EmailTemplates />);

    fireEvent.click(screen.getByRole("button", { name: "Reliability & Profitability" }));
    expect(screen.getAllByRole("link", { name: "Download template" })).toHaveLength(4);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search email templates" }), {
      target: { value: "habitual" },
    });
    expect(screen.getAllByRole("link", { name: "Download template" })).toHaveLength(1);
    expect(screen.getByText("Notice of Habitual Route Suspensions")).toBeInTheDocument();
  });
});
