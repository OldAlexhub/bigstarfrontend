import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, API_BASE } from "../api/client";
import { toISODate, addDays, todayInTimezone } from "../utils/dates";
import { useLatestRequest } from "../hooks/useLatestRequest";
import MetricCard from "../components/MetricCard";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 1000) / 10}%`);
const num = (v) => (v == null ? "—" : v);

const RANK_MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

const Leaderboard = () => {
  // Company-wide report — no single division's timezone applies, so the
  // default range uses the company-default timezone (the range itself is
  // user-picked; this only affects the starting values), same convention
  // as ELT Reporting.
  const [from, setFrom] = useState(toISODate(addDays(todayInTimezone(), -29)));
  const [to, setTo] = useState(toISODate(todayInTimezone()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    if (!from || !to) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/leaderboard?from=${from}&to=${to}`)
      .then((d) => {
        if (isCurrent(requestId)) setData(d);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard/export?from=${from}&to=${to}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `Leaderboard-${from}-to-${to}.pdf`;
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
      setDownloading(false);
    }
  };

  const summary = useMemo(() => {
    if (!data?.divisions?.length) return null;
    const top = data.divisions[0];
    const totalIssues = data.divisions.reduce((s, d) => s + d.issueCount, 0);
    const totalHoursAtRisk = data.divisions.reduce((s, d) => s + (d.revenueHoursAtRisk || 0), 0);
    return { top, totalIssues, totalHoursAtRisk: Math.round(totalHoursAtRisk * 100) / 100 };
  }, [data]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every division ranked by fulfillment — run cut and revenue hour coverage, plus issues logged by Deployment —
          for any date range.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
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
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loading}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {downloading ? "Downloading…" : "Download PDF"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Top Division" value={summary.top.name} tone="good" sub={pct(summary.top.avgFulfillmentPct)} />
          <MetricCard label="Issues Logged Company-Wide" value={num(summary.totalIssues)} tone="info" />
          <MetricCard
            label="Revenue Hours At Risk Company-Wide"
            value={num(summary.totalHoursAtRisk)}
            tone={summary.totalHoursAtRisk > 0 ? "warning" : "neutral"}
          />
        </div>
      )}

      {!loading && data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Rank",
                  "Division",
                  "Run Cut Fulfillment",
                  "Revenue Hour Fulfillment",
                  "Avg Fulfillment",
                  "Issues Logged",
                  "Revenue Hours At Risk",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.divisions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No divisions accessible in this range.
                  </td>
                </tr>
              )}
              {data.divisions.map((d) => (
                <tr key={d.divisionId}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                    {RANK_MEDALS[d.rank] || d.rank}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                    <Link to={`/master-run-cuts?division=${d.divisionId}`} className="hover:underline">
                      {d.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{pct(d.runCutFulfillmentPct)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{pct(d.revenueHourFulfillmentPct)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{pct(d.avgFulfillmentPct)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{num(d.issueCount)}</td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 ${d.revenueHoursAtRisk > 0 ? "text-amber-600" : "text-slate-600"}`}
                  >
                    {num(d.revenueHoursAtRisk)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
