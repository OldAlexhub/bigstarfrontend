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
const count = (value) => (Number.isFinite(value) ? value.toLocaleString() : "—");
const rate = (value) => (Number.isFinite(value) ? value.toFixed(2) : "—");

const KpiCard = ({ label, value, detail, tone = "text-slate-900" }) => (
  <div className="bg-white px-4 py-4">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
  </div>
);

const CustomerServiceAnalytics = () => {
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
      const data = await apiGet(`/api/customer-service/analytics?${queryString({ division: selectedDivision, ...filters })}`);
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
    () => Math.max(0, ...(analysis?.monthly || []).flatMap((month) => [month.complaintRatePer1000 || 0, month.complimentRatePer1000 || 0])),
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
      {loading && <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />Matching counts to Network Success trips…</div>}

      {!loading && analysis && (
        <div className="mt-5 space-y-5">
          <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Complaints" value={count(summary.complaints)} detail={`${summary.reportedMonths} ${reportedMonthLabel}`} tone="text-red-700" />
            <KpiCard label="Complaints / 1,000" value={rate(summary.complaintRatePer1000)} detail="For months with trip data" tone="text-red-700" />
            <KpiCard label="Compliments" value={count(summary.compliments)} detail={`${summary.reportedMonths} ${reportedMonthLabel}`} tone="text-emerald-700" />
            <KpiCard label="Compliments / 1,000" value={rate(summary.complimentRatePer1000)} detail="For months with trip data" tone="text-emerald-700" />
            <KpiCard label="Completed trips" value={count(summary.trips)} detail="From Network Success" />
            <KpiCard label="Matched months" value={`${summary.matchedMonths} / ${summary.reportedMonths}`} detail={summary.missingTripMonths ? `${summary.missingTripMonths} awaiting trips` : "All months matched"} />
          </div>

          {summary.missingTripMonths > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {summary.missingTripMonths} reported month{summary.missingTripMonths === 1 ? " is" : "s are"} missing completed-trip data in Network Success. Those months are shown below but excluded from the per-1,000 rates.
            </p>
          )}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Monthly customer feedback rates</h2>
              <p className="text-xs text-slate-500">Each rate is the monthly count divided by that month’s confirmed completed trips, multiplied by 1,000.</p>
            </div>
            {analysis.monthly.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">No customer service counts in this range</p>
                <p className="mt-1 text-xs text-slate-500">Enter monthly counts first, then return here to analyze them.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr><th className="px-4 py-2">Month</th><th className="px-3 py-2">Trips</th><th className="px-3 py-2">Complaints</th><th className="px-3 py-2">Complaints / 1,000</th><th className="px-3 py-2">Compliments</th><th className="px-3 py-2">Compliments / 1,000</th><th className="min-w-44 px-4 py-2">Rate comparison</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.monthly.map((month) => (
                      <tr key={month.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{monthLabel(month.month)}</td>
                        <td className={`px-3 py-3 ${month.hasTripData ? "text-slate-700" : "font-medium text-amber-700"}`}>{month.hasTripData ? count(month.trips) : "Awaiting data"}</td>
                        <td className="px-3 py-3 text-slate-700">{count(month.complaints)}</td>
                        <td className="px-3 py-3 font-medium text-red-700">{rate(month.complaintRatePer1000)}</td>
                        <td className="px-3 py-3 text-slate-700">{count(month.compliments)}</td>
                        <td className="px-3 py-3 font-medium text-emerald-700">{rate(month.complimentRatePer1000)}</td>
                        <td className="px-4 py-3">
                          {month.hasTripData ? (
                            <div className="space-y-1.5" aria-label={`Rate comparison for ${month.month}`}>
                              <div className="h-1.5 overflow-hidden rounded-full bg-red-50"><div className="h-full rounded-full bg-red-400" style={{ width: `${maxRate ? (month.complaintRatePer1000 / maxRate) * 100 : 0}%` }} /></div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-emerald-50"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${maxRate ? (month.complimentRatePer1000 / maxRate) * 100 : 0}%` }} /></div>
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

          <p className="text-xs leading-5 text-slate-500">
            Network Success is the source for completed trips. A customer service month is only included in a rate after confirmed Network Success data exists for that same division and month.
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomerServiceAnalytics;
