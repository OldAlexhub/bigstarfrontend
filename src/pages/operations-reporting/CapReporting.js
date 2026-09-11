import { useEffect, useState } from "react";
import { apiGet } from "../../api/client";
import { inputClasses, monthLabel, statusClasses } from "./reportingUi";

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
  : "—";

const KpiCard = ({ label, value, detail, tone = "text-slate-900" }) => (
  <div className="bg-white px-4 py-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
  </div>
);

const CapReporting = () => {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (filters = { division, status, from, to }, adoptBounds = false) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (filters.division) query.set("division", filters.division);
      if (filters.status) query.set("status", filters.status);
      if (filters.from) query.set("from", filters.from);
      if (filters.to) query.set("to", filters.to);
      const data = await apiGet(`/api/operations-reporting/caps/report?${query}`);
      setReport(data);
      if (adoptBounds && data.filters) {
        setFrom(data.filters.from || "");
        setTo(data.filters.to || "");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiGet("/api/divisions").then((data) => setDivisions(data.divisions || [])).catch((err) => setError(err.message));
    load({ division: "", status: "", from: "", to: "" }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setError("From month must be on or before To month.");
      return;
    }
    load({ division, status, from, to });
  };

  const summary = report?.summary;
  const rows = report?.caps || [];

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_auto] lg:items-end">
          <label className="text-xs font-medium text-slate-600">Division<select value={division} onChange={(event) => setDivision(event.target.value)} className={inputClasses}><option value="">All accessible divisions</option>{divisions.map((item) => <option key={item._id} value={item._id}>{item.code} — {item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">CAP status<select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClasses}><option value="">All</option><option value="open">Open</option><option value="recovery_ready">Recovery ready</option><option value="recovered">Recovered</option></select></label>
          <label className="text-xs font-medium text-slate-600">From<input type="month" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClasses} /></label>
          <label className="text-xs font-medium text-slate-600">To<input type="month" value={to} onChange={(event) => setTo(event.target.value)} className={inputClasses} /></label>
          <button disabled={loading} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Apply filters</button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading && <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />Loading CAP history…</div>}

      {!loading && report && (
        <div className="space-y-5">
          <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Total CAPs" value={summary.total} detail="Matching current filters" />
            <KpiCard label="Open" value={summary.open} detail="Awaiting root cause / action" tone="text-red-700" />
            <KpiCard label="Recovery ready" value={summary.recoveryReady} detail="Target met, awaiting confirmation" tone="text-amber-700" />
            <KpiCard label="Recovered" value={summary.recovered} detail="Closed out" tone="text-emerald-700" />
            <KpiCard label="Avg. days to recover" value={summary.avgDaysToRecover ?? "—"} detail="From opened to recovered" tone="text-brand-700" />
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">CAP history</h2>
              <p className="text-xs text-slate-500">Read-only view of every CAP in range. Use the CAP tab to open or work one.</p>
            </div>
            {!rows.length ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No CAPs match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Division</th>
                      <th className="px-3 py-2">KPI</th>
                      <th className="px-3 py-2">Trigger</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2">Planned recovery</th>
                      <th className="px-4 py-2">Recovered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((cap) => (
                      <tr key={cap.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{cap.division?.code}</td>
                        <td className="px-3 py-3 text-slate-700">{cap.kpiLabel}</td>
                        <td className="px-3 py-3 text-slate-700">{monthLabel(cap.triggerMonth)}</td>
                        <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${cap.status === "recovered" ? statusClasses.green : cap.status === "recovery_ready" ? statusClasses.yellow : statusClasses.red}`}>{cap.status.replace("_", " ")}</span></td>
                        <td className="px-3 py-3 text-slate-700">{cap.ownerUser?.name || cap.ownerName || "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{dateLabel(cap.plannedRecoveryDate)}</td>
                        <td className="px-4 py-3 text-slate-700">{dateLabel(cap.dateRecoveryMet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default CapReporting;
