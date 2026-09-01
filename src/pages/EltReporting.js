import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, API_BASE } from "../api/client";
import { toISODate, addDays, todayInTimezone } from "../utils/dates";
import { useLatestRequest } from "../hooks/useLatestRequest";
import TrendChart from "../components/TrendChart";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 1000) / 10}%`);
const num = (v) => (v == null ? "—" : v);

const deltaPts = (current, prior) => {
  if (current == null || prior == null) return null;
  return Math.round((current - prior) * 1000) / 10;
};

const DeltaBadge = ({ current, prior, higherIsBetter = true }) => {
  const d = deltaPts(current, prior);
  if (d == null || d === 0) return null;
  const good = higherIsBetter ? d > 0 : d < 0;
  return (
    <span className={`ml-2 text-xs font-medium ${good ? "text-green-600" : "text-red-600"}`}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d)}pts
    </span>
  );
};

const StatCard = ({ label, value, priorValue, isPct, higherIsBetter = true }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">
      {value}
      {isPct && priorValue !== undefined && (
        <DeltaBadge current={value === "—" ? null : parseFloat(value) / 100} prior={priorValue} higherIsBetter={higherIsBetter} />
      )}
    </p>
  </div>
);

const SortableHeader = ({ label, sortKey, sort, setSort }) => (
  <th
    className="cursor-pointer px-3 py-2 text-left font-medium text-slate-500 hover:text-slate-700"
    onClick={() => setSort((s) => ({ key: sortKey, dir: s.key === sortKey && s.dir === "desc" ? "asc" : "desc" }))}
  >
    {label} {sort.key === sortKey ? (sort.dir === "desc" ? "▼" : "▲") : ""}
  </th>
);

const EltReporting = () => {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionIds, setSelectedDivisionIds] = useState([]);
  // Cross-division report — no single division's timezone applies, so the
  // default range uses the company-default timezone (the range itself is
  // user-picked; this only affects the starting values).
  const [from, setFrom] = useState(toISODate(addDays(todayInTimezone(), -29)));
  const [to, setTo] = useState(toISODate(todayInTimezone()));
  const [comparePrior, setComparePrior] = useState(true);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    apiGet("/api/divisions")
      .then((d) => setDivisions(d.divisions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!from || !to) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ from, to, comparePrior: comparePrior ? "1" : "0" });
    if (selectedDivisionIds.length) params.set("divisions", selectedDivisionIds.join(","));
    apiGet(`/api/elt-reporting?${params.toString()}`)
      .then((data) => {
        if (isCurrent(requestId)) setReport(data);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, comparePrior, selectedDivisionIds]);

  const sortedDivisions = useMemo(() => {
    if (!report) return [];
    const rows = [...report.divisions];
    rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [report, sort]);

  const toggleDivision = (id) => {
    setSelectedDivisionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDownload = async (format) => {
    setDownloading(format);
    setError("");
    try {
      const params = new URLSearchParams({ from, to, format });
      if (selectedDivisionIds.length) params.set("divisions", selectedDivisionIds.join(","));
      const res = await fetch(`${API_BASE}/api/elt-reporting/export?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `ELT-Report-${from}-to-${to}.${format}`;
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

  const ns = report?.networkSummary;
  const pns = report?.priorNetworkSummary;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">ELT Reporting</h1>
        <p className="mt-1 text-sm text-slate-500">
          Company-wide operations across Master Run Cuts and Deployment for any date range.
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
        <div className="text-sm text-slate-600">
          Divisions
          <div className="mt-1 flex max-w-md flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSelectedDivisionIds([])}
              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                selectedDivisionIds.length === 0
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              All
            </button>
            {divisions.map((d) => (
              <button
                key={d._id}
                type="button"
                onClick={() => toggleDivision(d._id)}
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  selectedDivisionIds.includes(d._id)
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {d.code}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={comparePrior} onChange={(e) => setComparePrior(e.target.checked)} />
          Compare to prior period
        </label>
        <div className="ml-auto flex gap-2">
          {["xlsx", "csv", "pdf"].map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => handleDownload(format)}
              disabled={!!downloading || loading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {downloading === format ? "Downloading…" : `Download ${format.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading report…</p>}

      {!loading && report && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Run Cut Fulfillment" value={pct(ns.runCutFulfillmentPct)} priorValue={pns?.runCutFulfillmentPct} isPct />
            <StatCard
              label="Revenue Hour Fulfillment"
              value={pct(ns.revenueHourFulfillmentPct)}
              priorValue={pns?.revenueHourFulfillmentPct}
              isPct
            />
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Revenue Hours At Risk</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600">{num(ns.revenueHoursAtRisk)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Closures</p>
              <p className={`mt-2 text-2xl font-semibold ${ns.totalClosures > 0 ? "text-red-600" : "text-slate-900"}`}>
                {num(ns.totalClosures)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Late to First</p>
              <p className={`mt-2 text-2xl font-semibold ${ns.totalLateFirst > 0 ? "text-red-600" : "text-slate-900"}`}>
                {num(ns.totalLateFirst)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Late Deploy</p>
              <p className={`mt-2 text-2xl font-semibold ${ns.totalLateDeploy > 0 ? "text-red-600" : "text-slate-900"}`}>
                {num(ns.totalLateDeploy)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Unassigned Routes</p>
              <p className={`mt-2 text-2xl font-semibold ${ns.unassignedRoutesCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
                {num(ns.unassignedRoutesCount)}
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart title="Run Cut Fulfillment Trend" points={report.trend} valueKey="runCutFulfillmentPct" formatValue={pct} />
            <TrendChart
              title="Revenue Hour Fulfillment Trend"
              points={report.trend}
              valueKey="revenueHourFulfillmentPct"
              color="#0891b2"
              formatValue={pct}
            />
          </div>

          <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <SortableHeader label="Division" sortKey="name" sort={sort} setSort={setSort} />
                  <SortableHeader label="Run Cut Fulfillment" sortKey="runCutFulfillmentPct" sort={sort} setSort={setSort} />
                  <SortableHeader label="Revenue Hour Fulfillment" sortKey="revenueHourFulfillmentPct" sort={sort} setSort={setSort} />
                  <SortableHeader label="Hrs At Risk" sortKey="revenueHoursAtRisk" sort={sort} setSort={setSort} />
                  <SortableHeader label="Closures" sortKey="totalClosures" sort={sort} setSort={setSort} />
                  <SortableHeader label="Late to First" sortKey="totalLateFirst" sort={sort} setSort={setSort} />
                  <SortableHeader label="Late Deploy" sortKey="totalLateDeploy" sort={sort} setSort={setSort} />
                  <SortableHeader label="Unassigned Routes" sortKey="unassignedRoutesCount" sort={sort} setSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDivisions.map((d) => (
                  <tr key={d.divisionId}>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      <Link to={`/master-run-cuts?division=${d.divisionId}`} className="hover:underline">
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{pct(d.runCutFulfillmentPct)}</td>
                    <td className="px-3 py-2 text-slate-600">{pct(d.revenueHourFulfillmentPct)}</td>
                    <td className={`px-3 py-2 ${d.revenueHoursAtRisk > 0 ? "text-amber-600" : "text-slate-600"}`}>
                      {num(d.revenueHoursAtRisk)}
                    </td>
                    <td className={`px-3 py-2 ${d.totalClosures > 0 ? "text-red-600" : "text-slate-600"}`}>
                      {num(d.totalClosures)}
                    </td>
                    <td className={`px-3 py-2 ${d.totalLateFirst > 0 ? "text-red-600" : "text-slate-600"}`}>
                      {num(d.totalLateFirst)}
                    </td>
                    <td className={`px-3 py-2 ${d.totalLateDeploy > 0 ? "text-red-600" : "text-slate-600"}`}>
                      {num(d.totalLateDeploy)}
                    </td>
                    <td className={`px-3 py-2 ${d.unassignedRoutesCount > 0 ? "text-amber-600" : "text-slate-600"}`}>
                      {num(d.unassignedRoutesCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Issues &amp; Route Closures</h2>
            {report.issues.length === 0 ? (
              <p className="text-sm text-slate-400">No issues logged in this range.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      {["Division", "Date", "Route", "Disruption", "Notes"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.issues.map((issue) => (
                      <tr key={issue.issueId}>
                        <td className="px-3 py-2 text-slate-600">{issue.divisionName}</td>
                        <td className="px-3 py-2 text-slate-600">{issue.date}</td>
                        <td className="px-3 py-2 text-slate-600">{issue.routeCode || "—"}</td>
                        <td className="px-3 py-2 text-slate-900">{issue.disruptionType}</td>
                        <td className="px-3 py-2 text-slate-600">{issue.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EltReporting;
