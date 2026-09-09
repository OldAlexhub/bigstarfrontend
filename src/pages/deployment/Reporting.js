import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, API_BASE } from "../../api/client";
import MetricCard from "../../components/MetricCard";
import { DISPOSITION_OPTIONS } from "../../config/dispositions";
import { toISODate, todayInTimezone, addDays } from "../../utils/dates";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const REPEAT_EXCEPTION_DISPOSITIONS = ["deployed_late", "deployed_stby"];

const repeatedOutcomes = (rows, identityFor, labelFor) => {
  const grouped = new Map();
  rows.forEach((day) => {
    const identity = identityFor(day);
    const label = labelFor(day);
    if (!identity || !label) return;
    if (!grouped.has(identity)) {
      grouped.set(identity, { identity, label, total: 0, deployedLate: 0, deployedStby: 0 });
    }
    const entry = grouped.get(identity);
    entry.total += 1;
    if (day.disposition === "deployed_late") entry.deployedLate += 1;
    if (day.disposition === "deployed_stby") entry.deployedStby += 1;
  });

  return [...grouped.values()]
    .filter((entry) => entry.total > 1)
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, undefined, { numeric: true }))
    .slice(0, 5);
};

const Reporting = () => {
  const { selectedDivision } = useOutletContext();
  const [from, setFrom] = useState(toISODate(addDays(todayInTimezone(selectedDivision?.timezone), -6)));
  const [to, setTo] = useState(toISODate(todayInTimezone(selectedDivision?.timezone)));
  const [issues, setIssues] = useState([]);
  const [runCutDays, setRunCutDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    if (!selectedDivision || !from || !to) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    Promise.all([
      apiGet(`/api/daily-issues/report?division=${selectedDivision._id}&from=${from}&to=${to}`),
      apiGet(`/api/run-cut-days?division=${selectedDivision._id}&from=${from}&to=${to}`),
    ])
      .then(([issuesData, runCutDaysData]) => {
        if (!isCurrent(requestId)) return;
        setIssues(issuesData.issues);
        setRunCutDays(runCutDaysData.runCutDays);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, from, to]);

  const dispositionRows = runCutDays
    .filter((day) => day.disposition)
    .sort((a, b) => {
      const dateComparison = toISODate(b.date).localeCompare(toISODate(a.date));
      if (dateComparison) return dateComparison;
      return String(a.route?.code).localeCompare(String(b.route?.code), undefined, { numeric: true });
    });

  const dispositionCounts = Object.fromEntries(
    DISPOSITION_OPTIONS.map((option) => [
      option.value,
      dispositionRows.filter((day) => day.disposition === option.value).length,
    ])
  );

  const dispositionLabel = (value) =>
    DISPOSITION_OPTIONS.find((option) => option.value === value)?.label || value || "—";

  const exceptionRows = dispositionRows.filter((day) =>
    REPEAT_EXCEPTION_DISPOSITIONS.includes(day.disposition)
  );
  const repeatedRoutes = repeatedOutcomes(
    exceptionRows,
    (day) => day.route?._id,
    (day) => day.route?.code
  );
  const repeatedOperators = repeatedOutcomes(
    exceptionRows,
    (day) => day.operator?._id,
    (day) => day.operator?.name
  );

  const RepeatList = ({ title, entries, emptyMessage }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.identity} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{entry.label}</p>
                <p className="text-xs text-slate-400">{entry.total} exception outcomes</p>
              </div>
              <div className="flex gap-1.5 text-xs">
                {entry.deployedLate > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                    Late: {entry.deployedLate}
                  </span>
                )}
                {entry.deployedStby > 0 && (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                    STBY: {entry.deployedStby}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
      <div className="mb-4 flex flex-wrap items-end gap-4">
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
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Disposition Summary</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {DISPOSITION_OPTIONS.map((option) => (
            <MetricCard
              key={option.value}
              label={option.label}
              value={dispositionCounts[option.value] || 0}
              tone={
                option.value === "closed_suspended"
                  ? "bad"
                  : option.value === "deployed_late"
                  ? "warning"
                  : "info"
              }
            />
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Route", "Operator", "Status", "Disposition", "Disruption", "Client Notes"].map(
                  (heading) => (
                    <th key={heading} className="px-3 py-2 text-left font-medium text-slate-500">
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">Loading…</td>
                </tr>
              )}
              {!loading && dispositionRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                    No routes dispositioned in this date range.
                  </td>
                </tr>
              )}
              {!loading && dispositionRows.map((day) => (
                <tr key={day._id}>
                  <td className="px-3 py-2 text-slate-600">{toISODate(day.date)}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{day.route?.code || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{day.operator?.name || "—"}</td>
                  <td className="px-3 py-2 capitalize text-slate-600">{day.status}</td>
                  <td className="px-3 py-2 text-slate-900">{dispositionLabel(day.disposition)}</td>
                  <td className="px-3 py-2 text-slate-600">{day.disruptionType || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{day.clientNotes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Repeat Exception Track Record</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RepeatList
              title="Repeated Routes"
              entries={repeatedRoutes}
              emptyMessage="No route has more than one Late or STBY outcome in this range."
            />
            <RepeatList
              title="Repeated Operators"
              entries={repeatedOperators}
              emptyMessage="No operator has more than one Late or STBY outcome in this range."
            />
          </div>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Issues and Route Closures</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleDownload("csv")}
            disabled={!!downloading || issues.length === 0}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {downloading === "csv" ? "Downloading…" : "Download Issues CSV"}
          </button>
          <button
            type="button"
            onClick={() => handleDownload("xlsx")}
            disabled={!!downloading || issues.length === 0}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {downloading === "xlsx" ? "Downloading…" : "Download Issues Excel"}
          </button>
        </div>
      </div>

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
