// Set via client/.env.production (REACT_APP_API_URL) so the built app calls
// the deployed backend instead of a relative path. Empty in dev, where CRA's
// "proxy" field in package.json forwards relative /api/* calls to localhost.
const API_BASE = process.env.REACT_APP_API_URL || "";

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
};

export const apiGet = (path) => request(path);

export const apiPost = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });

export const apiPatch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiPut = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });

export const apiDelete = (path) => request(path, { method: "DELETE" });
