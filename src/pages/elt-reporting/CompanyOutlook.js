import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../api/client";

const formatValue = (value, format) => {
  if (!Number.isFinite(value)) return "No data";
  if (format === "percent") return `${(value * 100).toFixed(1)}%`;
  if (format === "hours") return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs`;
  if (format === "ratio") return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const directionStyle = {
  improving: "bg-emerald-50 text-emerald-700",
  declining: "bg-red-50 text-red-700",
  steady: "bg-slate-100 text-slate-600",
  not_enough_data: "bg-amber-50 text-amber-700",
};

const directionLabel = {
  improving: "Improving",
  declining: "Declining",
  steady: "Steady",
  not_enough_data: "Not enough data",
};

const signalStyle = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  watch: "border-amber-200 bg-amber-50 text-amber-800",
  risk: "border-red-200 bg-red-50 text-red-800",
};

const MetricCard = ({ metric, horizon }) => {
  const forecast = metric.forecast;
  const range = forecast?.ready && forecast.points?.length
    ? {
        low: Math.min(...forecast.points.map((point) => point.lower80)),
        high: Math.max(...forecast.points.map((point) => point.upper80)),
        final: forecast.points.at(-1),
      }
    : null;
  const reasons = [...new Map((forecast?.reasons || []).map((reason) => [reason.code, reason.message])).values()];

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{metric.label}</h3>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatValue(metric.value, metric.format)}</p>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${directionStyle[metric.direction.direction]}`}>
          {directionLabel[metric.direction.direction]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>Target: {formatValue(metric.target, metric.format)}</span>
        {metric.status !== "not_applicable" && (
          <span className={metric.status === "on_target" ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
            {metric.status === "on_target" ? "On target" : "Needs attention"}
          </span>
        )}
        <span>Trend coverage: {Math.round((metric.direction.coverage || 0) * 100)}%</span>
        <span>Confidence: {metric.direction.confidence}</span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {range ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Official {horizon} forecast</p>
              <p className="text-xs text-slate-500">{forecast.model.replaceAll("_", " ")} · {forecast.errorType} {forecast.error}</p>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-800">
              End point {formatValue(range.final.value, metric.format)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              80% band across horizon: {formatValue(range.low, metric.format)}–{formatValue(range.high, metric.format)}
            </p>
            <details className="mt-3 text-xs text-slate-600">
              <summary className="cursor-pointer font-medium text-brand-700">View forecast points</summary>
              <div className="mt-2 max-h-48 overflow-auto rounded-md border border-slate-100">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr><th className="px-2 py-1.5">Period</th><th className="px-2 py-1.5">Estimate</th><th className="px-2 py-1.5">80% interval</th></tr>
                  </thead>
                  <tbody>
                    {forecast.points.map((point) => (
                      <tr key={point.period} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">{point.period}</td>
                        <td className="px-2 py-1.5">{formatValue(point.value, metric.format)}</td>
                        <td className="px-2 py-1.5">{formatValue(point.lower80, metric.format)}–{formatValue(point.upper80, metric.format)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Forecast not ready</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
            </ul>
          </>
        )}
      </div>

      {metric.drivers?.length > 0 && (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Driver:</span> {metric.drivers[0]}
        </p>
      )}
      <p className="mt-auto pt-4 text-xs leading-5 text-slate-400">{metric.methodology}</p>
    </article>
  );
};

const CompanyOutlook = () => {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [horizon, setHorizon] = useState("90d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/divisions")
      .then((result) => { if (!cancelled) setDivisions(result.divisions || []); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ horizon });
    if (division) query.set("division", division);
    apiGet(`/api/elt-reporting/outlook?${query}`)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [division, horizon]);

  const groups = useMemo(() => {
    const result = new Map();
    for (const metric of data?.metrics || []) {
      if (!result.has(metric.group)) result.set(metric.group, []);
      result.get(metric.group).push(metric);
    }
    return [...result.entries()];
  }, [data]);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">ELT decision support</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Company Outlook</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">A deterministic view of operating fulfillment, productivity, reliability, safety, and customer-service risk.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <label className="text-xs font-medium text-slate-600">
            Scope
            <select
              aria-label="Outlook scope"
              value={division}
              onChange={(event) => setDivision(event.target.value)}
              className="mt-1 block min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Company — all divisions</option>
              {divisions.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Horizon
            <select
              aria-label="Forecast horizon"
              value={horizon}
              onChange={(event) => setHorizon(event.target.value)}
              className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="90d">Next 90 days</option>
              <option value="12m">Next 12 months</option>
            </select>
          </label>
        </div>
      </div>

      {loading && <p className="mt-8 text-sm text-slate-500">Calculating company outlook…</p>}
      {error && <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!loading && data && (
        <>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-900 px-5 py-4 text-sm text-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">90-day current window: {data.currentWindow.from} through {data.currentWindow.to}</p>
              <p className="text-xs text-slate-300">Model {data.modelVersion}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">{data.framing}</p>
            {data.snapshot.reason && <p className="mt-2 text-xs font-medium text-amber-300">{data.snapshot.reason}</p>}
            {!data.snapshot.reason && <p className="mt-2 text-xs text-emerald-300">Official snapshot week {data.snapshot.snapshotWeek}; data cutoff {data.snapshot.dataCutoff}.</p>}
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Deterministic signals</h2>
            {data.signals.length ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.signals.map((signal) => (
                  <article key={signal.key} className={`rounded-xl border p-4 ${signalStyle[signal.severity]}`}>
                    <h3 className="font-semibold">{signal.label}</h3>
                    <p className="mt-1 text-xs leading-5 opacity-90">{signal.explanation}</p>
                  </article>
                ))}
              </div>
            ) : <p className="mt-2 text-sm text-slate-500">No deterministic signal crossed its materiality threshold.</p>}
          </div>

          {groups.map(([group, metrics]) => (
            <div key={group} className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">{group}</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {metrics.map((metric) => <MetricCard key={metric.key} metric={metric} horizon={horizon} />)}
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
};

export default CompanyOutlook;
