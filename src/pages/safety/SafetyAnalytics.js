import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../api/client";

const queryString = (values) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query.toString();
};

const monthLabel = (value) =>
  value
    ? new Date(`${value}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";
const number = (value, digits = 0) =>
  Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : "—";
const rate = (value) => (Number.isFinite(value) ? value.toFixed(2) : "—");
const statusClasses = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  critical: "bg-red-700 text-white",
  no_data: "bg-slate-100 text-slate-500",
};

const KpiCard = ({ label, value, detail, tone = "text-slate-900" }) => (
  <div className="bg-white px-4 py-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
  </div>
);

const SafetyAnalytics = () => {
  const [divisions, setDivisions] = useState([]);
  const [division, setDivision] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (selectedDivision = division, filters = { from, to }, adoptBounds = false) => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`/api/safety/analytics?${queryString({ division: selectedDivision, ...filters })}`);
      setAnalysis(data);
      if (adoptBounds) {
        setFrom(data.monthBounds.from || "");
        setTo(data.monthBounds.to || "");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/divisions")
      .then((data) => {
        if (cancelled) return;
        const available = data.divisions || [];
        setDivisions(available);
        if (available[0]) {
          setDivision(available[0]._id);
          load(available[0]._id, { from: "", to: "" }, true);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // Initial analytics load runs once; later loads are explicit filter actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxRate = useMemo(
    () => Math.max(0, ...(analysis?.monthly || []).flatMap((month) => [month.preventableRatePer100000 || 0, month.nonPreventableRatePer100000 || 0])),
    [analysis]
  );

  const changeDivision = (value) => {
    setDivision(value);
    setFrom("");
    setTo("");
    load(value, { from: "", to: "" }, true);
  };

  const submit = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setError("From month must be on or before To month.");
      return;
    }
    load();
  };

  const summary = analysis?.summary;
  const scoreSummary = analysis?.safetyScores?.summary;
  const reportedMonthLabel = summary?.reportedMonths === 1 ? "reported month" : "reported months";

  return (
    <div>
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">
          <label className="text-xs font-medium text-slate-600">
            Division
            <select value={division} onChange={(event) => changeDivision(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
              {divisions.map((item) => <option key={item._id} value={item._id}>{item.code} — {item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            From
            <input type="month" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </label>
          <label className="text-xs font-medium text-slate-600">
            To
            <input type="month" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
          </label>
          <button type="submit" disabled={!division || loading} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Analyze</button>
        </div>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading && <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />Calculating safety rates…</div>}

      {!loading && analysis && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3 xl:grid-cols-4">
            <KpiCard label="Miles" value={number(summary.miles, 2)} detail={`${summary.reportedMonths} ${reportedMonthLabel}`} />
            <KpiCard label="Preventable accidents" value={number(summary.preventableAccidents)} detail="Reported count" tone="text-red-700" />
            <KpiCard label="Preventable / 100,000 miles" value={rate(summary.preventableRatePer100000)} detail="Weighted across selected months" tone="text-red-700" />
            <KpiCard label="Non-preventable accidents" value={number(summary.nonPreventableAccidents)} detail="Reported count" tone="text-amber-700" />
            <KpiCard label="Non-preventable / 100,000 miles" value={rate(summary.nonPreventableRatePer100000)} detail="Weighted across selected months" tone="text-amber-700" />
            <KpiCard label="Reported months" value={number(summary.reportedMonths)} detail={summary.zeroMileMonths ? `${summary.zeroMileMonths} with zero miles` : "Mileage reported"} />
            <KpiCard label="Latest safety score" value={rate(scoreSummary?.latest?.score)} detail={scoreSummary?.latest ? monthLabel(scoreSummary.latest.month) : "No score reported"} tone="text-brand-700" />
            <KpiCard label="Average safety score" value={rate(scoreSummary?.average)} detail={`${scoreSummary?.reportedMonths || 0} reported month${scoreSummary?.reportedMonths === 1 ? "" : "s"}`} tone="text-brand-700" />
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Monthly accident rates</h2>
              <p className="text-xs text-slate-500">Each rate is the accident count divided by miles traveled, multiplied by 100,000.</p>
            </div>
            {analysis.monthly.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">No safety figures in this range</p>
                <p className="mt-1 text-xs text-slate-500">Enter monthly mileage and accident counts first, then return here to analyze them.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr><th className="px-4 py-2">Month</th><th className="px-3 py-2">Miles</th><th className="px-3 py-2">Preventable</th><th className="px-3 py-2">Preventable / 100k</th><th className="px-3 py-2">Non-preventable</th><th className="px-3 py-2">Non-preventable / 100k</th><th className="min-w-44 px-4 py-2">Rate comparison</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.monthly.map((month) => (
                      <tr key={month.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{monthLabel(month.month)}</td>
                        <td className="px-3 py-3 text-slate-700">{number(month.miles, 2)}</td>
                        <td className="px-3 py-3 text-slate-700">{number(month.preventableAccidents)}</td>
                        <td className="px-3 py-3 font-medium text-red-700">{rate(month.preventableRatePer100000)}</td>
                        <td className="px-3 py-3 text-slate-700">{number(month.nonPreventableAccidents)}</td>
                        <td className="px-3 py-3 font-medium text-amber-700">{rate(month.nonPreventableRatePer100000)}</td>
                        <td className="px-4 py-3">
                          {month.miles > 0 ? (
                            <div className="space-y-1.5" aria-label={`Rate comparison for ${month.month}`}>
                              <div className="h-1.5 overflow-hidden rounded-full bg-red-50"><div className="h-full rounded-full bg-red-400" style={{ width: `${maxRate ? (month.preventableRatePer100000 / maxRate) * 100 : 0}%` }} /></div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-amber-50"><div className="h-full rounded-full bg-amber-400" style={{ width: `${maxRate ? (month.nonPreventableRatePer100000 / maxRate) * 100 : 0}%` }} /></div>
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Monthly safety scores</h2>
              <p className="text-xs text-slate-500">Targets and scoring direction come from the effective-dated Operations KPI settings.</p>
            </div>
            {!analysis.safetyScores?.monthly?.length ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No safety scores in this range.</p>
            ) : (
              <div className="overflow-x-auto"><table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-2">Month</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Target</th><th className="px-3 py-2">Direction</th><th className="px-4 py-2">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{analysis.safetyScores.monthly.map((entry) => (
                  <tr key={entry.id}><td className="px-4 py-3 font-medium text-slate-900">{monthLabel(entry.month)}</td><td className="px-3 py-3">{rate(entry.score)}</td><td className="px-3 py-3">{rate(entry.target)}</td><td className="px-3 py-3 capitalize text-slate-600">{entry.direction || "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses[entry.status] || statusClasses.no_data}`}>{entry.status === "no_data" ? "No Data" : entry.status}</span></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </section>

          <p className="text-xs leading-5 text-slate-500">
            Range-level rates use total accidents divided by total miles, so months with more mileage carry the appropriate weight.
          </p>
        </div>
      )}
    </div>
  );
};

export default SafetyAnalytics;
