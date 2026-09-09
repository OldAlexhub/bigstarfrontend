// Production calls the deployed API configured by REACT_APP_API_URL. In
// development, always use CRA's local /api proxy so new client and server
// changes are tested together instead of silently hitting an older deploy.
export const API_BASE = process.env.NODE_ENV === "development" ? "" : process.env.REACT_APP_API_URL || "";

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
