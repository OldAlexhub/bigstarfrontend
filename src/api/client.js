// Production calls the deployed API configured by REACT_APP_API_URL. In
// development, always use Vite's local /api proxy so new client and server
// changes are tested together instead of silently hitting an older deploy.
export const API_BASE = import.meta.env.DEV ? "" : import.meta.env.REACT_APP_API_URL || "";

export const AUTH_UNAUTHORIZED_EVENT = "bigstar:unauthorized";
const LEGACY_AUTH_TOKEN_STORAGE_KEY = "bigstar.authToken";

// Authentication is cookie-only. Remove tokens left by older client builds
// without ever reading or forwarding them to application JavaScript.
const clearLegacyAuthStorage = () => {
  if (typeof window === "undefined") return;
  try { window.sessionStorage?.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY); } catch {}
  try { window.localStorage?.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY); } catch {}
};

const reportUnauthorized = () => {
  clearLegacyAuthStorage();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }
};

const request = async (path, options = {}) => {
  clearLegacyAuthStorage();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) reportUnauthorized();
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
};

export const apiGet = (path) => request(path);

export const apiPost = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });

export const apiFormPost = (path, body) => request(path, { method: "POST", body });

export const apiPatch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiPut = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });

export const apiDelete = (path, body) => request(path, {
  method: "DELETE",
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const apiDownload = async (path) => {
  clearLegacyAuthStorage();
  const headers = new Headers();

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    if (res.status === 401) reportUnauthorized();
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Download failed (${res.status})`);
  }

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  return {
    blob: await res.blob(),
    filename: match?.[1] || "download",
  };
};
