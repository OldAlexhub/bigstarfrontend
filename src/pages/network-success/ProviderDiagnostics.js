import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import { useLatestRequest } from "../../hooks/useLatestRequest";
import TrendChart from "../../components/TrendChart";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? "—" : v);

const METRIC_LABELS = {
  avgOtp: "OTP",
  avgShf: "SHF",
  avgTpsh: "TPSH",
  avgRouteClosures: "Route Closures",
  avgLateFirst: "Late to First",
  avgLateDeploy: "Late Deploy",
};

const POSITION_STYLES = {
  Ahead: "bg-green-50 text-green-700",
  Behind: "bg-red-50 text-red-700",
  Aligned: "bg-slate-100 text-slate-600",
};

const POSITION_CARD_STYLES = {
  Ahead: "border-green-200 bg-green-50",
  Behind: "border-red-200 bg-red-50",
  Aligned: "border-slate-200 bg-white",
};

const ProviderDiagnostics = () => {
  const { selectedDivision, weekStart } = useOutletContext();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    apiGet("/api/providers").then((d) => {
      setProviders(d.providers);
      if (d.providers.length) setProvider(d.providers[0].name);
    });
  }, []);

  useEffect(() => {
    if (!selectedDivision || !provider) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(
      `/api/network-success/analytics/provider-diagnostics?division=${selectedDivision._id}&provider=${encodeURIComponent(
        provider
      )}&weekStart=${weekStart}`
    )
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
  }, [selectedDivision, weekStart, provider]);

  return (
    <div>
      <div className="mb-4">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {providers.map((p) => (
            <option key={p._id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data.comparison.map((c) => (
              <div key={c.key} className={`rounded-lg border p-3 ${POSITION_CARD_STYLES[c.position] || POSITION_CARD_STYLES.Aligned}`}>
                <p className="text-xs text-slate-500">{METRIC_LABELS[c.key]}</p>
                <p className="text-lg font-semibold text-slate-900">
                  {c.key.includes("Otp") || c.key.includes("Shf") ? pct(c.providerVal) : num(c.providerVal)}
                </p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${POSITION_STYLES[c.position]}`}>
                  {c.position} · p{c.percentile ?? "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Findings</h3>
            <p className="text-sm text-slate-700">{data.findings.overall}</p>
            {data.findings.priorityGaps.length > 0 && (
              <p className="mt-1 text-sm text-red-600">
                Priority gaps: {data.findings.priorityGaps.map((k) => METRIC_LABELS[k]).join(", ")}
              </p>
            )}
            {data.findings.strengths.length > 0 && (
              <p className="mt-1 text-sm text-green-700">
                Strengths: {data.findings.strengths.map((k) => METRIC_LABELS[k]).join(", ")}
              </p>
            )}
          </div>

          <div className="mb-6">
            <TrendChart
              title="6-Week Trend"
              points={data.weeklyTrend.map((w) => ({ bucketStart: w.weekStart, composite: w.composite }))}
              valueKey="composite"
              formatValue={pct}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Route Drivers</h3>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    {["Route", "Missed", ""].map((h) => (
                      <th key={h} className="px-2 py-1 text-left font-medium text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.routeRows.map((r) => (
                    <tr key={r.kpiKey}>
                      <td className="px-2 py-1 text-slate-900">{r.route}</td>
                      <td className="px-2 py-1 text-slate-600">{r.failedKpis.join(", ") || "—"}</td>
                      <td className="px-2 py-1">
                        <Link
                          to={`/deployment/issue-log?division=${selectedDivision._id}&routeCode=${encodeURIComponent(r.route)}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          View issues
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Operator Drivers</h3>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    {["Operator", "Route", "Missed", ""].map((h) => (
                      <th key={h} className="px-2 py-1 text-left font-medium text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.operatorRows.map((r) => (
                    <tr key={r.kpiKey + r.operator}>
                      <td className="px-2 py-1 text-slate-900">{r.operator}</td>
                      <td className="px-2 py-1 text-slate-600">{r.route}</td>
                      <td className="px-2 py-1 text-slate-600">{r.failedKpis.join(", ") || "—"}</td>
                      <td className="px-2 py-1">
                        <Link
                          to={`/deployment/issue-log?division=${selectedDivision._id}&routeCode=${encodeURIComponent(r.route)}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          View issues
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProviderDiagnostics;
