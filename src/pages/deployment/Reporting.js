import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, API_BASE } from "../../api/client";
import { toISODate, todayInTimezone, addDays } from "../../utils/dates";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const Reporting = () => {
  const { selectedDivision } = useOutletContext();
  const [from, setFrom] = useState(toISODate(addDays(todayInTimezone(selectedDivision?.timezone), -6)));
  const [to, setTo] = useState(toISODate(todayInTimezone(selectedDivision?.timezone)));
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    if (!selectedDivision || !from || !to) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/daily-issues/report?division=${selectedDivision._id}&from=${from}&to=${to}`)
      .then((data) => {
        if (isCurrent(requestId)) setIssues(data.issues);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, from, to]);

  // A plain <a href> download doesn't get proxied by the dev server for
  // top-level navigations, so fetch the file and save it via a Blob.
  const handleDownload = async (format) => {
    if (!selectedDivision) return;
    setDownloading(format);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/daily-issues/export?division=${selectedDivision._id}&from=${from}&to=${to}&format=${format}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `issues-${from}-to-${to}.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleDownload("csv")}
            disabled={!!downloading || issues.length === 0}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {downloading === "csv" ? "Downloading…" : "Download CSV"}
          </button>
          <button
            type="button"
            onClick={() => handleDownload("xlsx")}
            disabled={!!downloading || issues.length === 0}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {downloading === "xlsx" ? "Downloading…" : "Download Excel"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Date", "Route", "Operator", "Disruption", "Notes"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && issues.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  No issues or route closures in this range.
                </td>
              </tr>
            )}
            {issues.map((issue) => (
              <tr key={issue._id}>
                <td className="px-3 py-2 text-slate-600">{toISODate(issue.date)}</td>
                <td className="px-3 py-2 text-slate-600">{issue.route?.code || "—"}</td>
                <td className="px-3 py-2 text-slate-600">{issue.operator?.name || "—"}</td>
                <td className="px-3 py-2 text-slate-900">{issue.disruptionType}</td>
                <td className="px-3 py-2 text-slate-600">{issue.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reporting;
