import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? "—" : v);

const ProviderCheckIn = () => {
  const { selectedDivision, weekStart } = useOutletContext();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/providers").then((d) => {
      setProviders(d.providers);
      if (d.providers.length) setProvider(d.providers[0].name);
    });
  }, []);

  useEffect(() => {
    if (!selectedDivision || !provider) return;
    setLoading(true);
    setError("");
    apiGet(
      `/api/network-success/reports/provider-checkin?division=${selectedDivision._id}&provider=${encodeURIComponent(
        provider
      )}&weekStart=${weekStart}`
    )
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, weekStart, provider]);

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
      {providers.length === 0 && !loading && (
        <p className="text-sm text-slate-400">No providers set up yet — add one in Master Run Cuts → Master Data.</p>
      )}

      {!loading && data && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-slate-400">Weekly SMART Provider Check-In</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {data.provider} — {data.division.name}
          </h2>
          <p className="text-sm text-slate-500">
            Week of {data.weekStart} through {data.weekEnd}
          </p>

          {data.repeatBottom5.length > 0 && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {data.repeatBottom5.length} route(s) in the Bottom 5 for {data.repeatBottom5[0].streak}+ consecutive
              week(s).
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Total Trips", num(data.weeklySummary.totalTrips)],
              ["Utilization", pct(data.weeklySummary.utilizationPct)],
              ["Avg Trips/Day", num(data.weeklySummary.avgTripsPerDay)],
              ["TPSH", num(data.weeklySummary.tpsh)],
              ["Avg OTP", pct(data.weeklySummary.avgOtp)],
              ["Late to First", num(data.weeklySummary.lateToFirst)],
              ["Late Deploy", num(data.weeklySummary.lateDeploy)],
              ["Routes Below OTP", num(data.weeklySummary.routesBelowOtp)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-lg font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Route Detail</h3>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr>
                  {["Route", "OTP", "SHF", "TPSH", "Late 1st", "Late Dep", "Status", ""].map((h) => (
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
                    <td className="px-2 py-1 text-slate-600">{pct(r.avgOtp)}</td>
                    <td className="px-2 py-1 text-slate-600">{pct(r.avgShf)}</td>
                    <td className="px-2 py-1 text-slate-600">{num(r.avgTpsh)}</td>
                    <td className="px-2 py-1 text-slate-600">{num(r.avgLateFirst)}</td>
                    <td className="px-2 py-1 text-slate-600">{num(r.avgLateDeploy)}</td>
                    <td className="px-2 py-1 text-slate-600">
                      {r.failedKpis.length ? r.failedKpis.join(", ") : "Meeting targets"}
                    </td>
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

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">SMART Coaching Plan</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {data.coachingPlan.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderCheckIn;
