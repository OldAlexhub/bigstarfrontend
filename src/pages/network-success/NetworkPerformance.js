import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../../api/client";

const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—");
const number = (value, digits = 2) => (Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : "—");
const dateLabel = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
const queryString = (values) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value && value !== "all") query.set(key, value); });
  return query.toString();
};
const assignmentSourceLabel = {
  master_run_cuts: "Master Run Cuts",
  manual_override: "NS override",
  deployment_snapshot: "Deployment snapshot",
  unavailable: "Not assigned",
};

const KpiStrip = ({ summary }) => {
  const cells = [
    ["Completed trips", number(summary.trips, 0)],
    ["Trip-weighted OTP", pct(summary.otpPct)],
    ["Trip-weighted TPSH", number(summary.tpsh)],
    ["Closed / partial", `${summary.closed} / ${summary.partiallyClosed}`],
    ["Late events", number(summary.lateToFirst + summary.lateDeploy, 0)],
    ["Route-days", number(summary.routeDays, 0)],
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3 xl:grid-cols-6">
      {cells.map(([label, value]) => (
        <div key={label} className="bg-white px-4 py-3">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
        </div>
      ))}
    </div>
  );
};

const NetworkPerformance = () => {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [source, setSource] = useState("all");
  const [provider, setProvider] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [operators, setOperators] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ operatorId: "" });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (selectedDivision = division, filters = { from, to, source, provider }, adoptBounds = false) => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`/api/network-success/performance?${queryString({ division: selectedDivision, ...filters })}`);
      setAnalysis(data);
      if (adoptBounds) {
        setFrom(data.dateBounds.from || "");
        setTo(data.dateBounds.to || "");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiGet("/api/divisions"), apiGet("/api/operators")])
      .then(([data, operatorData]) => {
        if (cancelled) return;
        setOperators(operatorData.operators || []);
        const available = data.divisions || [];
        setDivisions(available);
        if (available[0]) {
          setDivision(available[0]._id);
          load(available[0]._id, { from: "", to: "", source: "all", provider: "" }, true);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
    // The first load intentionally runs once; later loads are explicit filter actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeDivision = (value) => {
    setDivision(value);
    setFrom("");
    setTo("");
    setProvider("");
    load(value, { from: "", to: "", source, provider: "" }, true);
  };

  const submit = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setError("From date must be on or before To date.");
      return;
    }
    load();
  };

  const startAssignmentEdit = (record) => {
    setEditingId(record.id);
    setAssignmentForm({ operatorId: record.operatorId || "" });
  };

  const changeOperator = (operatorId) => {
    setAssignmentForm({ operatorId });
  };

  const saveAssignment = async (record) => {
    setSavingAssignment(true);
    setError("");
    try {
      await apiPatch(`/api/network-success/entries/${record.id}/assignment`, { ...assignmentForm, reuseAssignment: true });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAssignment(false);
    }
  };

  const returnToMasterRunCut = async (record) => {
    setSavingAssignment(true);
    setError("");
    try {
      await apiPatch(`/api/network-success/entries/${record.id}/assignment`, { useMasterRunCut: true });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAssignment(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className={`grid gap-3 sm:grid-cols-2 lg:items-end ${analysis?.hasProviderData ? "lg:grid-cols-[1.25fr_1fr_1fr_.8fr_1.25fr_auto]" : "lg:grid-cols-[1.25fr_1fr_1fr_.8fr_auto]"}`}>
          <label className="text-xs font-medium text-slate-600">
            Division
            <select value={division} onChange={(event) => changeDivision(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
              {divisions.map((item) => <option key={item._id} value={item._id}>{item.code} — {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            From
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </label>
          <label className="text-xs font-medium text-slate-600">
            To
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Source
            <select value={source} onChange={(event) => setSource(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option value="all">All sources</option>
              <option value="vision">Vision</option>
              <option value="ecolane">Ecolane</option>
            </select>
          </label>
          {analysis?.hasProviderData && (
            <label className="text-xs font-medium text-slate-600">
              Provider
              <input list="network-provider-options" type="search" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Search provider" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <datalist id="network-provider-options">
                {(analysis.providerNames || []).map((name) => <option key={name} value={name} />)}
              </datalist>
            </label>
          )}
          <button type="submit" disabled={!division || loading} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Analyze</button>
        </div>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading && <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />Analyzing confirmed records…</div>}

      {!loading && analysis && (
        <div className="mt-5 space-y-5">
          <KpiStrip summary={analysis.summary} />

          <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">Automated readout</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                {analysis.insights.map((insight, index) => <li key={index} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" /><span>{insight}</span></li>)}
              </ul>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="font-semibold text-slate-900">Daily performance</h2>
                <p className="text-xs text-slate-500">Weighted by completed trips; zero-trip components do not dilute OTP or TPSH.</p>
              </div>
              {analysis.daily.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">No daily results for these filters.</p> : (
                <div className="max-h-80 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium text-slate-500"><tr><th className="px-4 py-2">Date</th><th className="px-3 py-2">Trips</th><th className="px-3 py-2">OTP</th><th className="px-3 py-2">TPSH</th><th className="px-3 py-2">Closed</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{analysis.daily.map((day) => <tr key={day.date}><td className="px-4 py-2 font-medium text-slate-800">{dateLabel(day.date)}</td><td className="px-3 py-2 text-slate-600">{number(day.trips, 0)}</td><td className="px-3 py-2 text-slate-600">{pct(day.otpPct)}</td><td className="px-3 py-2 text-slate-600">{number(day.tpsh)}</td><td className="px-3 py-2 text-slate-600">{day.closed + day.partiallyClosed}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {analysis.hasProviderData && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Provider comparison</h2>
              <p className="text-xs text-slate-500">Use the provider search above to isolate one organization.</p>
            </div>
            {analysis.providers.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">No provider results for these filters.</p> : (
              <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-medium text-slate-500"><tr><th className="px-4 py-2">Provider</th><th className="px-3 py-2">Route-days</th><th className="px-3 py-2">Trips</th><th className="px-3 py-2">OTP</th><th className="px-3 py-2">TPSH</th><th className="px-3 py-2">Closed / partial</th><th className="px-3 py-2">Late events</th></tr></thead><tbody className="divide-y divide-slate-100">{analysis.providers.map((item) => <tr key={item.provider}><td className="px-4 py-2 font-medium text-slate-800">{item.provider}</td><td className="px-3 py-2 text-slate-600">{item.routeDays}</td><td className="px-3 py-2 text-slate-600">{number(item.trips, 0)}</td><td className="px-3 py-2 text-slate-600">{pct(item.otpPct)}</td><td className="px-3 py-2 text-slate-600">{number(item.tpsh)}</td><td className="px-3 py-2 text-slate-600">{item.closed} / {item.partiallyClosed}</td><td className="px-3 py-2 text-slate-600">{item.lateToFirst + item.lateDeploy}</td></tr>)}</tbody></table></div>
            )}
          </section>}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="font-semibold text-slate-900">Assignment setup</h2>
                <p className="text-xs text-slate-500">Master Run Cut operators match automatically. Missing provider data is ignored; correct only routes without the right operator.</p>
              </div>
              <button type="button" onClick={() => setShowAllAssignments((current) => !current)} className="text-xs font-medium text-brand-600 hover:underline">
                {showAllAssignments ? "Show setup only" : `View all ${analysis.records?.length || 0} route-days`}
              </button>
            </div>
            {!showAllAssignments && (analysis.assignmentGaps || []).length === 0 && (
              <p className="px-4 py-6 text-sm text-emerald-700">Every route has an operator assignment.</p>
            )}
            {(showAllAssignments ? (analysis.records || []) : (analysis.assignmentGaps || [])).length > 0 && (
              <div className="divide-y divide-slate-100">
                {(showAllAssignments ? (analysis.records || []) : (analysis.assignmentGaps || [])).map((record) => (
                  <div key={record.id}>
                    <div className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[90px_120px_minmax(180px,1fr)_130px_90px_auto] md:items-center">
                      <span className="font-medium text-slate-900" title={record.routes?.join(", ")}>{record.routes?.length > 1 ? `${record.routes.length} routes` : record.route}</span>
                      <span className="text-slate-500">{record.affectedRouteDays ? `${record.affectedRouteDays} route-day${record.affectedRouteDays === 1 ? "" : "s"}` : dateLabel(record.date)}</span>
                      <span className="min-w-0 text-slate-700">
                        <span className="block truncate">{record.operator || "Operator unassigned"}</span>
                        {record.provider && <span className="block truncate text-xs text-slate-500">{record.provider}</span>}
                      </span>
                      <span className={`w-fit rounded-full px-2 py-1 text-[11px] font-medium ${record.hasAssignmentOverride ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>
                        {assignmentSourceLabel[record.assignmentSource] || record.assignmentSource}
                      </span>
                      <span className="text-slate-600">{Number.isFinite(record.trips) ? `${record.trips} trips` : `Needs ${record.missing}`}</span>
                      <button type="button" onClick={() => editingId === record.id ? setEditingId(null) : startAssignmentEdit(record)} className="justify-self-start text-xs font-medium text-brand-600 hover:underline">
                        {editingId === record.id ? "Cancel" : "Correct"}
                      </button>
                    </div>
                    {editingId === record.id && (
                      <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
                        <label className="text-xs font-medium text-slate-600">
                          Operator
                          <select value={assignmentForm.operatorId} onChange={(event) => changeOperator(event.target.value)} className="mt-1 block min-w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                            <option value="">Unassigned</option>
                            {operators.filter((item) => item.active !== false).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                          </select>
                        </label>
                        <button type="button" disabled={savingAssignment} onClick={() => saveAssignment(record)} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Save and reuse</button>
                        {record.hasAssignmentOverride && <button type="button" disabled={savingAssignment} onClick={() => returnToMasterRunCut(record)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">Use Master Run Cut</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div><h2 className="font-semibold text-slate-900">Needs attention</h2><p className="text-xs text-slate-500">Automatically ordered by operational severity.</p></div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{analysis.attention.length}</span>
            </div>
            {analysis.attention.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">No exceptions were detected.</p> : (
              <div className="divide-y divide-slate-100">{analysis.attention.map((item) => <div key={item.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[110px_100px_1fr_90px_90px] md:items-center"><span className={`w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${item.severity === "blocker" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{item.severity === "blocker" ? "Priority" : "Review"}</span><span className="font-medium text-slate-800">{item.route}</span><span className="text-slate-600">{dateLabel(item.date)} · {item.operator}{item.provider !== "Unassigned" ? ` · ${item.provider}` : ""}<span className="block text-xs text-slate-500">{item.reasons.join(" · ")}</span></span><span className="text-slate-600">{item.trips} trips</span><span className="text-slate-600">{pct(item.otpPct)} OTP</span></div>)}</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default NetworkPerformance;
