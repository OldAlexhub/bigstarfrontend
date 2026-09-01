import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import { toISODate, todayInTimezone } from "../../utils/dates";
import MetricCard from "../../components/MetricCard";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? "—" : v);

const MonthlyAnalytics = () => {
  const { selectedDivision } = useOutletContext();
  const [month, setMonth] = useState(toISODate(todayInTimezone(selectedDivision?.timezone)).slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(`/api/network-success/analytics/monthly?division=${selectedDivision._id}&month=${month}-01`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, month]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const maxTrips = Math.max(1, ...data.dailySeries.map((d) => d.trips));

  return (
    <div>
      <div className="mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Trips MTD" value={num(data.summary.totalTrips)} />
        <MetricCard label="Avg OTP" value={pct(data.summary.avgOtp)} tone={data.kpiSettings && data.summary.avgOtp != null ? (data.summary.avgOtp >= data.kpiSettings.otpThresh ? "good" : "bad") : "neutral"} />
        <MetricCard label="Avg SHF" value={pct(data.summary.avgShf)} tone={data.kpiSettings && data.summary.avgShf != null ? (data.summary.avgShf >= data.kpiSettings.shfThresh ? "good" : "bad") : "neutral"} />
        <MetricCard label="Avg TPSH" value={num(data.summary.avgTpsh)} tone={data.kpiSettings && data.summary.avgTpsh != null ? (data.summary.avgTpsh >= data.kpiSettings.tpshBench ? "good" : "bad") : "neutral"} />
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Trips + OTP by Day</h3>
        <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 140 }}>
          {data.dailySeries.map((d) => (
            <div key={d.date} className="flex w-6 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${Math.max(2, (d.trips / maxTrips) * 100)}px` }}
                title={`${d.date}: ${d.trips} trips, OTP ${d.avgOtp}%`}
              />
              <span className="text-[9px] text-slate-400">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Monthly Summary by Route</h3>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr>
              {["Route", "Provider", "OTP", "SHF", "TPSH", "Score"].map((h) => (
                <th key={h} className="px-2 py-1 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rankings.map((r) => (
              <tr key={r.kpiKey}>
                <td className="px-2 py-1 text-slate-900">{r.route}</td>
                <td className="px-2 py-1 text-slate-600">{r.provider}</td>
                <td className="px-2 py-1 text-slate-600">{pct(r.avgOtp)}</td>
                <td className="px-2 py-1 text-slate-600">{pct(r.avgShf)}</td>
                <td className="px-2 py-1 text-slate-600">{num(r.avgTpsh)}</td>
                <td className="px-2 py-1 font-semibold text-slate-900">{pct(r.composite)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyAnalytics;
