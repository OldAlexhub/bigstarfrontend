import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../api/client";
import CapNeededAction from "./CapNeededAction";
import { formatKpi, inputClasses, localMonth, monthLabel, statusClasses, statusLabel } from "./reportingUi";

const MonthlyDashboard = () => {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [month, setMonth] = useState(localMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (selectedDivision = division, selectedMonth = month) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ month: selectedMonth });
      if (selectedDivision) query.set("division", selectedDivision);
      setReport(await apiGet(`/api/operations-reporting/dashboard?${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiGet("/api/divisions").then((data) => setDivisions(data.divisions || [])).catch((err) => setError(err.message));
    load("", month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const values = (report?.divisions || []).flatMap((item) => item.kpis.map((kpi) => kpi.monthly[0]?.status || "no_data"));
    return ["green", "yellow", "red", "critical", "no_data"].reduce((result, status) => ({ ...result, [status]: values.filter((value) => value === status).length }), {});
  }, [report]);

  return (
    <div className="space-y-5">
      <form onSubmit={(event) => { event.preventDefault(); load(); }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-slate-600">Division<select value={division} onChange={(event) => setDivision(event.target.value)} className={inputClasses}><option value="">All accessible divisions</option>{divisions.map((item) => <option key={item._id} value={item._id}>{item.code} — {item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">Reporting month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={inputClasses} required /></label>
          <button disabled={loading} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">View month</button>
        </div>
      </form>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!loading && report && <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{["green", "yellow", "red", "critical", "no_data"].map((status) => <div key={status} className={`rounded-xl border p-4 ${statusClasses[status]}`}><p className="text-xs font-medium">{statusLabel(status)}</p><p className="mt-1 text-2xl font-semibold">{counts[status] || 0}</p></div>)}</div>}
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Calculating {monthLabel(month)}…</p> : report?.divisions?.map((divisionReport) => (
        <section key={divisionReport.division.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3"><h2 className="font-semibold text-slate-900">{divisionReport.division.code} — {divisionReport.division.name}</h2></div>
          <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="px-4 py-2">KPI</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Status</th><th className="px-4 py-2">Corrective action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{divisionReport.kpis.map((kpi) => { const result = kpi.monthly[0] || {}; return <tr key={kpi.key}><td className="px-4 py-3 font-medium text-slate-900">{kpi.label}</td><td className="px-3 py-3 font-semibold">{formatKpi(result.value, kpi.format)}</td><td className="px-3 py-3">{formatKpi(result.setting?.target, kpi.format)}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[result.status] || statusClasses.no_data}`}>{statusLabel(result.status)}</span></td><td className="px-4 py-3">{kpi.cap ? <Link to="/operations-reporting/cap" className="text-xs font-medium text-red-600">Open CAP</Link> : kpi.capNeeded ? <CapNeededAction capNeeded={kpi.capNeeded} format={kpi.format} /> : <span className="text-xs text-slate-400">—</span>}</td></tr>; })}</tbody>
          </table></div>
        </section>
      ))}
    </div>
  );
};

export default MonthlyDashboard;
