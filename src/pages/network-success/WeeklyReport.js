import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? "—" : v);

const WeeklyReport = () => {
  const { selectedDivision, weekStart } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(`/api/network-success/reports/weekly?division=${selectedDivision._id}&weekStart=${weekStart}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, weekStart]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 print:hidden"
        >
          Print
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-wide text-slate-400">Network Performance • Weekly Report</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {data.division.name} — Week of {data.weekStart}
        </h2>

        <table className="mt-4 min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr>
              {["Rank", "Route", "Provider", "OTP", "SHF", "TPSH", "Closures", "Late 1st", "Late Dep", "Score"].map(
                (h) => (
                  <th key={h} className="px-2 py-1 text-left font-medium text-slate-500">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rankings.map((r) => (
              <tr key={r.kpiKey}>
                <td className="px-2 py-1 font-medium text-slate-900">{r.rank}</td>
                <td className="px-2 py-1 text-slate-600">{r.route}</td>
                <td className="px-2 py-1 text-slate-600">{r.provider}</td>
                <td className="px-2 py-1 text-slate-600">{pct(r.avgOtp)}</td>
                <td className="px-2 py-1 text-slate-600">{pct(r.avgShf)}</td>
                <td className="px-2 py-1 text-slate-600">{num(r.avgTpsh)}</td>
                <td className="px-2 py-1 text-slate-600">{num(r.avgRouteClosures)}</td>
                <td className="px-2 py-1 text-slate-600">{num(r.avgLateFirst)}</td>
                <td className="px-2 py-1 text-slate-600">{num(r.avgLateDeploy)}</td>
                <td className="px-2 py-1 font-semibold text-slate-900">{pct(r.composite)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Metric Definitions</h3>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.definitions.map(([label, def]) => (
                <tr key={label}>
                  <td className="w-40 px-2 py-1 font-medium text-slate-900">{label}</td>
                  <td className="px-2 py-1 text-slate-600">{def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
