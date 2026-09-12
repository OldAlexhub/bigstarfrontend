// Production calls the deployed API configured by REACT_APP_API_URL. In
// development, always use Vite's local /api proxy so new client and server
// changes are tested together instead of silently hitting an older deploy.
export const API_BASE = import.meta.env.DEV ? "" : import.meta.env.REACT_APP_API_URL || "";

const request = async (path, options = {}) => {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
};

export const apiGet = (path) => request(path);

export const apiPost = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });

export const apiFormPost = (path, body) => request(path, { method: "POST", body });

export const apiPatch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiPut = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) });

export const apiDelete = (path) => request(path, { method: "DELETE" });
