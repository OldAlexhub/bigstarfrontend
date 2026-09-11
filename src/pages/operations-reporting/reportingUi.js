export const localMonth = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
};

export const addMonths = (month, amount) => {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const monthLabel = (month, short = false) => month
  ? new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: short ? "short" : "long", year: "numeric" })
  : "—";

export const statusClasses = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  yellow: "bg-amber-100 text-amber-900 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
  critical: "bg-red-700 text-white border-red-800",
  no_data: "bg-slate-100 text-slate-500 border-slate-200",
};

export const statusLabel = (status) => status === "no_data"
  ? "No Data"
  : status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "No Data";

export const formatKpi = (value, format) => {
  if (!Number.isFinite(value)) return "—";
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const inputClasses = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
