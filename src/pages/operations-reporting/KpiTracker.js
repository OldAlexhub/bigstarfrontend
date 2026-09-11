import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../../api/client";
import CapNeededAction from "./CapNeededAction";
import { addMonths, formatKpi, inputClasses, localMonth, monthLabel, statusClasses, statusLabel } from "./reportingUi";

const KpiTracker = () => {
  const initialTo = localMonth();
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [from, setFrom] = useState(addMonths(initialTo, -11));
  const [to, setTo] = useState(initialTo);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (filters = { division, from, to }) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ from: filters.from, to: filters.to });
      if (filters.division) query.set("division", filters.division);
      setReport(await apiGet(`/api/operations-reporting/tracker?${query}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiGet("/api/divisions")
      .then((data) => setDivisions(data.divisions || []))
      .catch((err) => setError(err.message));
    load({ division: "", from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event) => {
    event.preventDefault();
    load();
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">
          <label className="text-xs font-medium text-slate-600">Division
            <select value={division} onChange={(event) => setDivision(event.target.value)} className={inputClasses}><option value="">All accessible divisions</option>{divisions.map((item) => <option key={item._id} value={item._id}>{item.code} — {item.name}</option>)}</select>
          </label>
          <label className="text-xs font-medium text-slate-600">From month<input type="month" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClasses} required /></label>
          <label className="text-xs font-medium text-slate-600">To month<input type="month" value={to} onChange={(event) => setTo(event.target.value)} className={inputClasses} required /></label>
          <button disabled={loading} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{loading ? "Loading…" : "View tracker"}</button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Select up to 12 months. Current-month values are previews and do not create CAPs.</p>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="py-8 text-center text-sm text-slate-500">Calculating monthly KPIs…</p>}
      {!loading && report?.divisions?.length === 0 && <p className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500">No accessible divisions were found.</p>}

      {!loading && report?.divisions?.map((divisionReport) => (
        <section key={divisionReport.division.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><h2 className="font-semibold text-slate-900">{divisionReport.division.code} — {divisionReport.division.name}</h2></div>
          <div className="overflow-x-auto"><table className="min-w-full text-sm">
            <thead className="bg-white text-left text-xs font-medium text-slate-500"><tr><th className="sticky left-0 z-10 min-w-56 bg-white px-4 py-3">KPI</th><th className="px-3 py-3">Target</th>{report.months.map((month) => <th key={month} className="min-w-28 px-3 py-3">{monthLabel(month, true)}</th>)}<th className="min-w-28 px-4 py-3">Range result</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{divisionReport.kpis.map((kpi) => (
              <tr key={kpi.key}>
                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                  <div className="font-medium text-slate-900">{kpi.label}</div>
                  {kpi.cap ? (
                    <Link to="/operations-reporting/cap" className="mt-1 inline-block text-xs font-medium text-red-600">CAP {kpi.cap.status.replace("_", " ")}</Link>
                  ) : kpi.capNeeded ? (
                    <div className="mt-1"><CapNeededAction capNeeded={kpi.capNeeded} format={kpi.format} /></div>
                  ) : null}
                </td>
                <td className="px-3 py-3 font-medium text-slate-700">{formatKpi(kpi.setting?.target, kpi.format)}</td>
                {kpi.monthly.map((result) => <td key={result.month} className="px-3 py-3"><div title={statusLabel(result.status)} className={`rounded-md border px-2 py-2 text-center font-medium ${statusClasses[result.status] || statusClasses.no_data}`}>{formatKpi(result.value, kpi.format)}<span className="mt-0.5 block text-[10px] font-normal">{statusLabel(result.status)}</span></div></td>)}
                <td className="px-4 py-3"><div className={`rounded-md border px-2 py-2 text-center font-semibold ${statusClasses[kpi.range.status] || statusClasses.no_data}`}>{formatKpi(kpi.range.value, kpi.format)}<span className="mt-0.5 block text-[10px] font-normal">{statusLabel(kpi.range.status)}</span></div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      ))}
    </div>
  );
};

export default KpiTracker;
