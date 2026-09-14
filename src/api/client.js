// Production calls the deployed API configured by REACT_APP_API_URL. In
// development, always use Vite's local /api proxy so new client and server
// changes are tested together instead of silently hitting an older deploy.
export const API_BASE = import.meta.env.DEV ? "" : import.meta.env.REACT_APP_API_URL || "";

export const AUTH_UNAUTHORIZED_EVENT = "bigstar:unauthorized";
export const AUTH_TOKEN_STORAGE_KEY = "bigstar.authToken";

let memoryAuthToken = null;

const sessionStorageOrNull = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const getAuthToken = () => {
  try {
    return sessionStorageOrNull()?.getItem(AUTH_TOKEN_STORAGE_KEY) || memoryAuthToken;
  } catch {
    return memoryAuthToken;
  }
};

export const setAuthToken = (token) => {
  memoryAuthToken = token || null;
  try {
    const storage = sessionStorageOrNull();
    if (token) storage?.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    else storage?.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // The in-memory copy still supports browsers where storage is unavailable.
  }
};

export const clearAuthToken = () => setAuthToken(null);

const reportUnauthorized = () => {
  clearAuthToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }
};

const request = async (path, options = {}) => {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

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

export const apiDelete = (path) => request(path, { method: "DELETE" });
