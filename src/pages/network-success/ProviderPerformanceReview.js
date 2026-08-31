import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? "—" : v);

const TREND_STYLES = {
  Improving: "text-green-700",
  Deteriorating: "text-red-700",
  Stable: "text-slate-600",
  "Insufficient Data": "text-slate-400",
};

const STATUS_STYLES = {
  IMPROVING: "bg-green-50 text-green-700",
  DETERIORATING: "bg-red-50 text-red-700",
  "MIXED-STABLE": "bg-amber-50 text-amber-800",
  "NOT DEMONSTRATING SUSTAINED IMPROVEMENT": "bg-red-50 text-red-700",
};

const ProviderPerformanceReview = () => {
  const { selectedDivision } = useOutletContext();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/providers").then((d) => {
      setProviders(d.providers);
      if (d.providers.length) setProvider(d.providers[0].name);
    });
  }, []);

  const load = () => {
    if (!selectedDivision || !provider) return;
    setLoading(true);
    setError("");
    apiGet(
      `/api/network-success/reports/provider-performance?division=${selectedDivision._id}&provider=${encodeURIComponent(
        provider
      )}&weeks=${weeks}`
    )
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedDivision, provider, weeks]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        <div className="flex gap-1">
          {[2, 4, 8].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setWeeks(n)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                weeks === n ? "bg-brand-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {n} wks
            </button>
          ))}
        </div>
        {data && (
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 print:hidden"
          >
            Print
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && data && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Provider Performance Intelligence</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{data.provider}</h2>
          <p className="text-sm text-slate-500">{data.note}</p>
          <p className="text-xs text-slate-400">
            Recent: {data.recentPeriod.from} – {data.recentPeriod.to}
            {data.priorPeriod && ` · Prior: ${data.priorPeriod.from} – ${data.priorPeriod.to}`}
          </p>

          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[data.status]}`}>
            {data.status}
          </span>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.metrics.map((m) => (
              <div key={m.key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className="text-lg font-semibold text-slate-900">
                  {m.key === "avgLateFirst" || m.key === "avgRouteClosures" ? num(m.recentVal) : pct(m.recentVal)}
                </p>
                <p className="text-xs text-slate-400">
                  was {m.key === "avgLateFirst" || m.key === "avgRouteClosures" ? num(m.priorVal) : pct(m.priorVal)}
                </p>
                <p className={`text-xs font-medium ${TREND_STYLES[m.trend]}`}>{m.trend}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Operator Contribution</h3>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr>
                  {["Operator", "Route", "OTP", "TPSH", "Hours", "Status"].map((h) => (
                    <th key={h} className="px-2 py-1 text-left font-medium text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.operatorRows.map((r) => (
                  <tr key={r.kpiKey}>
                    <td className="px-2 py-1 text-slate-900">{r.operator}</td>
                    <td className="px-2 py-1 text-slate-600">{r.route}</td>
                    <td className="px-2 py-1 text-slate-600">{pct(r.avgOtp)}</td>
                    <td className="px-2 py-1 text-slate-600">{num(r.avgTpsh)}</td>
                    <td className="px-2 py-1 text-slate-600">{num(r.totalActualHrs)}</td>
                    <td className="px-2 py-1 text-slate-600">
                      {r.failedKpis.length === 0
                        ? "Meeting Expectations"
                        : r.failedKpis.length <= 2
                        ? "Watch"
                        : "Needs Attention"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderPerformanceReview;
