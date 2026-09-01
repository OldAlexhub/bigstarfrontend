import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import MetricCard from "../../components/MetricCard";
import RankCard from "../../components/RankCard";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? "—" : v);

const NetworkDashboard = () => {
  const { selectedDivision, weekStart } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(`/api/network-success/dashboard?division=${selectedDivision._id}&weekStart=${weekStart}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, weekStart]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return null;

  const { summary, rankings, streaks, kpiSettings } = data;
  const toneVs = (value, thresh) => (value == null || thresh == null ? "neutral" : value >= thresh ? "good" : "bad");

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link
          to={`/master-run-cuts/tracker?division=${selectedDivision._id}`}
          className="text-sm text-brand-600 hover:underline"
        >
          View Run Cut Tracker in Master Run Cuts →
        </Link>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Routes Ranked" value={num(summary.totalRoutes)} />
        <MetricCard label="Avg OTP" value={pct(summary.avgOtp)} tone={toneVs(summary.avgOtp, kpiSettings?.otpThresh)} />
        <MetricCard label="Avg SHF" value={pct(summary.avgShf)} tone={toneVs(summary.avgShf, kpiSettings?.shfThresh)} />
        <MetricCard label="Avg TPSH" value={num(summary.avgTpsh)} tone={toneVs(summary.avgTpsh, kpiSettings?.tpshBench)} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Top 5</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {streaks.top.map((entry) => (
              <RankCard key={entry.kpiKey} entry={entry} />
            ))}
            {streaks.top.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Bottom 5</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {streaks.bottom.map((entry) => (
              <RankCard key={entry.kpiKey} entry={entry} />
            ))}
            {streaks.bottom.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Rank", "Route", "Provider", "OTP", "SHF", "TPSH", "Closures", "Late 1st", "Late Dep", "Score"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.map((r) => (
              <tr key={r.kpiKey}>
                <td className="px-3 py-2 font-medium text-slate-900">{r.rank}</td>
                <td className="px-3 py-2 text-slate-600">{r.route}</td>
                <td className="px-3 py-2 text-slate-600">{r.provider}</td>
                <td className={`px-3 py-2 ${r.meetsOtp ? "text-slate-600" : "text-red-600"}`}>{pct(r.avgOtp)}</td>
                <td className={`px-3 py-2 ${r.meetsShf ? "text-slate-600" : "text-red-600"}`}>{pct(r.avgShf)}</td>
                <td className={`px-3 py-2 ${r.meetsTpsh ? "text-slate-600" : "text-red-600"}`}>{num(r.avgTpsh)}</td>
                <td className="px-3 py-2 text-slate-600">{num(r.avgRouteClosures)}</td>
                <td className="px-3 py-2 text-slate-600">{num(r.avgLateFirst)}</td>
                <td className="px-3 py-2 text-slate-600">{num(r.avgLateDeploy)}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{pct(r.composite)}</td>
              </tr>
            ))}
            {rankings.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                  No KPI data uploaded for this week yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NetworkDashboard;
