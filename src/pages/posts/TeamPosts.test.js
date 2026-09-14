import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { apiGet, apiPost } from "../../api/client";
import TeamPosts from "./TeamPosts";

vi.mock("../../api/client", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

const division = { _id: "division-1", name: "East" };

describe("cross-team posts", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
  });

  test("creates a response-requested post with a 120-character body limit", async () => {
    apiGet.mockResolvedValue({ posts: [] });
    apiPost.mockResolvedValue({
      post: {
        _id: "post-1",
        division,
        fromSection: "deployment",
        toSection: "network_success",
        purpose: "Coverage",
        title: "Late pullout",
        body: "Route 101 will pull out late.",
        responseRequested: true,
        status: "sent",
        direction: "sent",
        sentByName: "Taylor",
        createdAt: "2026-09-14T12:00:00.000Z",
      },
    });

    render(<TeamPosts section="deployment" fixedDivision={division} />);
    await screen.findByText("No posts received for this division.");

    fireEvent.change(screen.getByPlaceholderText("Reason for this post"), { target: { value: "Coverage" } });
    fireEvent.change(screen.getByPlaceholderText("Short post title"), { target: { value: "Late pullout" } });
    const body = screen.getByPlaceholderText("Write the update in 120 characters or fewer");
    expect(body).toHaveAttribute("maxlength", "120");
    fireEvent.change(body, { target: { value: "Route 101 will pull out late." } });
    fireEvent.click(screen.getByLabelText("Request a response"));
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/team-posts", {
      division: "division-1",
      fromSection: "deployment",
      purpose: "Coverage",
      title: "Late pullout",
      body: "Route 101 will pull out late.",
      responseRequested: true,
    }));
  });

  test("the receiving team can answer when a response was requested", async () => {
    apiGet.mockResolvedValue({
      posts: [{
        _id: "post-2",
        division,
        fromSection: "deployment",
        toSection: "network_success",
        purpose: "Confirmation",
        title: "Vehicle swap",
        body: "Please confirm vehicle V-12.",
        responseRequested: true,
        status: "sent",
        direction: "received",
        unread: false,
        sentByName: "Morgan",
        createdAt: "2026-09-14T12:00:00.000Z",
      }],
    });
    apiPost.mockResolvedValue({
      message: "Response sent.",
      post: {
        _id: "post-2",
        division,
        fromSection: "deployment",
        toSection: "network_success",
        purpose: "Confirmation",
        title: "Vehicle swap",
        body: "Please confirm vehicle V-12.",
        responseRequested: true,
        status: "responded",
        direction: "received",
        responseBody: "Confirmed for tonight.",
        respondedByName: "Alex",
        respondedAt: "2026-09-14T13:00:00.000Z",
        sentByName: "Morgan",
        createdAt: "2026-09-14T12:00:00.000Z",
      },
    });

    render(<TeamPosts section="network_success" fixedDivision={division} />);
    const response = await screen.findByPlaceholderText("Write a response…");
    expect(response).toHaveAttribute("maxlength", "120");
    fireEvent.change(response, { target: { value: "Confirmed for tonight." } });
    fireEvent.click(screen.getByRole("button", { name: "Send response" }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith(
      "/api/team-posts/post-2/respond",
      { section: "network_success", responseBody: "Confirmed for tonight." }
    ));
    expect(await screen.findByText("Confirmed for tonight.")).toBeInTheDocument();
  });
});
