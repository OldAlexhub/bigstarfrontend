import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const WeeklyAnalytics = () => {
  const { selectedDivision, weekStart } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(`/api/network-success/analytics/weekly?division=${selectedDivision._id}&weekStart=${weekStart}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, weekStart]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const maxWeekTrips = Math.max(1, ...data.weeks.map((w) => w.summary.totalTrips));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">6-Week OTP Trend + Forecast</h3>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {data.weeks.map((w) => (
            <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${Math.max(4, (w.summary.avgOtp || 0) * 100)}px` }}
              />
              <span className="text-[10px] text-slate-400">{w.weekStart.slice(5)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Next 4 weeks forecast: {data.otpForecast.forecast.map((f) => pct(f)).join(", ") || "—"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">6-Week Trip Volume Trend</h3>
        <div className="flex items-end gap-2" style={{ height: 120 }}>
          {data.weeks.map((w) => (
            <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-slate-400"
                style={{ height: `${Math.max(4, (w.summary.totalTrips / maxWeekTrips) * 100)}px` }}
              />
              <span className="text-[10px] text-slate-400">{w.weekStart.slice(5)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Next 4 weeks forecast: {data.tripForecast.forecast.join(", ") || "—"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Segments</h3>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr>
              {["Route", "Provider", "Score", "Segment"].map((h) => (
                <th key={h} className="px-2 py-1 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.segments.map((s, i) => (
              <tr key={i}>
                <td className="px-2 py-1 text-slate-900">{s.route}</td>
                <td className="px-2 py-1 text-slate-600">{s.provider}</td>
                <td className="px-2 py-1 text-slate-600">{pct(s.composite)}</td>
                <td className="px-2 py-1 text-slate-600">{s.segment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Outliers (below network median)</h3>
        {data.outliers.length === 0 && <p className="text-sm text-slate-400">No outliers detected this week.</p>}
        <ul className="space-y-1 text-sm">
          {data.outliers.map((o, i) => (
            <li key={i} className="text-slate-700">
              {o.route} ({o.provider}) — MAD score {o.madScore}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Targets Met (of 6)</h3>
        <div className="flex items-end gap-3" style={{ height: 100 }}>
          {data.targetsMetDistribution.map((d) => (
            <div key={d.targetsMet} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${Math.max(4, d.count * 12)}px` }}
              />
              <span className="text-xs text-slate-500">
                {d.targetsMet} ({d.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyAnalytics;
