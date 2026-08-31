import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const Bar = ({ value, max, label }) => (
  <div className="flex items-center gap-2">
    <span className="w-10 shrink-0 text-xs text-slate-500">{label}</span>
    <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
      <div
        className="h-full rounded bg-brand-500"
        style={{ width: max ? `${Math.min(100, (value / max) * 100)}%` : "0%" }}
      />
    </div>
    <span className="w-10 shrink-0 text-right text-xs text-slate-600">{value}</span>
  </div>
);

const OperationalAnalysis = () => {
  const { selectedDivision, weekStart } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(`/api/network-success/operational?division=${selectedDivision._id}&weekStart=${weekStart}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, weekStart]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const maxTripsByDay = Math.max(1, ...DAYS_OF_WEEK.map((d) => data.byDay[d]?.trips || 0));
  const maxTripsByRoute = Math.max(1, ...data.tripsByRoute.map((r) => r.trips));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Trips by day</h3>
        <div className="space-y-2">
          {DAYS_OF_WEEK.map((day) => (
            <Bar key={day} label={day} value={data.byDay[day]?.trips || 0} max={maxTripsByDay} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Trips by route</h3>
        <div className="space-y-2">
          {data.tripsByRoute.slice(0, 12).map((r) => (
            <Bar key={r.route} label={r.route} value={r.trips} max={maxTripsByRoute} />
          ))}
          {data.tripsByRoute.length === 0 && <p className="text-sm text-slate-400">No trips reported yet.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Work blocks</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr>
                {["Block", "Trips", "Actual Hours", "Avg OTP"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">Weekday (Mon–Fri)</td>
                <td className="px-3 py-2 text-slate-600">{data.workBlocks.weekday.trips}</td>
                <td className="px-3 py-2 text-slate-600">{data.workBlocks.weekday.actualHrs}</td>
                <td className="px-3 py-2 text-slate-600">
                  {data.workBlocks.weekday.avgOtp != null ? `${data.workBlocks.weekday.avgOtp}%` : "—"}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-slate-900">Weekend (Sat–Sun)</td>
                <td className="px-3 py-2 text-slate-600">{data.workBlocks.weekend.trips}</td>
                <td className="px-3 py-2 text-slate-600">{data.workBlocks.weekend.actualHrs}</td>
                <td className="px-3 py-2 text-slate-600">
                  {data.workBlocks.weekend.avgOtp != null ? `${data.workBlocks.weekend.avgOtp}%` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OperationalAnalysis;
