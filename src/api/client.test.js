import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiGet,
  AUTH_UNAUTHORIZED_EVENT,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "./client";

const response = ({ ok = true, status = 200, data = {} } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(data),
});

describe("API authentication", () => {
  beforeEach(() => {
    clearAuthToken();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    clearAuthToken();
    vi.restoreAllMocks();
  });

  it("sends the session token with protected requests while retaining cookies", async () => {
    setAuthToken("session-token");
    fetch.mockResolvedValue(response({ data: { ok: true } }));

    await apiGet("/api/example");

    const [, options] = fetch.mock.calls[0];
    expect(options.credentials).toBe("include");
    expect(options.headers.get("Authorization")).toBe("Bearer session-token");
  });

  it("clears a rejected session and reports it to the auth provider", async () => {
    setAuthToken("expired-token");
    fetch.mockResolvedValue(response({ ok: false, status: 401, data: { message: "Not authenticated" } }));
    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    await expect(apiGet("/api/example")).rejects.toMatchObject({
      message: "Not authenticated",
      status: 401,
    });

    expect(getAuthToken()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });
});
