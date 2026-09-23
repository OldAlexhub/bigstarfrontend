import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiGet,
  AUTH_UNAUTHORIZED_EVENT,
} from "./client";

const response = ({ ok = true, status = 200, data = {} } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(data),
});

describe("API authentication", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses cookie authentication without storing or sending a browser-readable JWT", async () => {
    window.sessionStorage.setItem("bigstar.authToken", "legacy-session-token");
    window.localStorage.setItem("bigstar.authToken", "legacy-local-token");
    fetch.mockResolvedValue(response({ data: { ok: true } }));

    await apiGet("/api/example");

    const [, options] = fetch.mock.calls[0];
    expect(options.credentials).toBe("include");
    expect(options.headers.get("Authorization")).toBeNull();
    expect(window.sessionStorage.getItem("bigstar.authToken")).toBeNull();
    expect(window.localStorage.getItem("bigstar.authToken")).toBeNull();
  });

  it("clears a rejected session and reports it to the auth provider", async () => {
    window.sessionStorage.setItem("bigstar.authToken", "expired-token");
    fetch.mockResolvedValue(response({ ok: false, status: 401, data: { message: "Not authenticated" } }));
    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    await expect(apiGet("/api/example")).rejects.toMatchObject({
      message: "Not authenticated",
      status: 401,
    });

    expect(window.sessionStorage.getItem("bigstar.authToken")).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });
});
