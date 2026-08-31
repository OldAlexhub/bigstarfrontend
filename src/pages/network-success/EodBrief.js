import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { toISODate, todayInTimezone } from "../../utils/dates";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v) => (v == null ? "—" : v);

const EodBrief = () => {
  const { selectedDivision } = useOutletContext();
  const { user } = useAuth();
  const [reportDate, setReportDate] = useState(toISODate(todayInTimezone(selectedDivision?.timezone)));
  const [preparedBy, setPreparedBy] = useState(user?.name || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const briefRef = useRef(null);

  const load = () => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(
      `/api/network-success/reports/eod?division=${selectedDivision._id}&reportDate=${reportDate}&preparedBy=${encodeURIComponent(
        preparedBy
      )}`
    )
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedDivision]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = async () => {
    setCopyStatus("");
    if (!briefRef.current) return;
    try {
      const html = briefRef.current.innerHTML;
      const blob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([briefRef.current.innerText], { type: "text/plain" });
      await navigator.clipboard.write([new window.ClipboardItem({ "text/html": blob, "text/plain": textBlob })]);
      setCopyStatus("Copied — ready to paste into Teams.");
    } catch (err) {
      setCopyStatus("Couldn't copy automatically — select the text below and copy manually.");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          Report date
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          Prepared by
          <input
            value={preparedBy}
            onChange={(e) => setPreparedBy(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Generate
        </button>
        {data && (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Copy for Teams
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {copyStatus && <p className="mb-4 text-sm text-slate-500">{copyStatus}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && data && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div ref={briefRef}>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Leadership Visibility • End-of-Day Brief
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {data.division.name} — {data.dayOfWeek}, {data.cutoffDate}
            </h2>
            {data.preparedBy && <p className="text-sm text-slate-500">Prepared by {data.preparedBy}</p>}

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Planned Routes", num(data.summary.plannedRoutes)],
                ["Operated Routes", num(data.summary.operatedRoutes)],
                ["Utilization", pct(data.summary.utilizationPct)],
                ["SHF", pct(data.summary.shfPct)],
                ["TPSH", num(data.summary.tpsh)],
                ["Avg OTP", pct(data.summary.avgOtp)],
                ["Total Trips", num(data.summary.totalTrips)],
                ["Actual Hours", num(data.summary.totalActualHrs)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-lg font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>

            {(data.summary.routeClosures > 0 || data.summary.lateToFirst > 0 || data.summary.lateDeploy > 0) && (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {data.summary.routeClosures} closure(s), {data.summary.lateToFirst} late-to-first,{" "}
                {data.summary.lateDeploy} late-deploy event(s) today.
              </p>
            )}

            <p className="mt-4 text-sm text-slate-600">
              Same weekday last week ({data.sameWeekday.date}): OTP {pct(data.sameWeekday.avgOtp)}, TPSH{" "}
              {num(data.sameWeekday.tpsh)}.
            </p>

            {data.exceptionRoutes.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Exception Routes</h3>
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr>
                      {["Route", "Provider", "Operator", "Closures", "Late 1st", "Late Dep", "OTP"].map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.exceptionRoutes.map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1 text-slate-900">{r.route}</td>
                        <td className="px-2 py-1 text-slate-600">{r.provider}</td>
                        <td className="px-2 py-1 text-slate-600">{r.operator}</td>
                        <td className="px-2 py-1 text-slate-600">{r.routeClosures}</td>
                        <td className="px-2 py-1 text-slate-600">{r.lateToFirst}</td>
                        <td className="px-2 py-1 text-slate-600">{r.lateDeploy}</td>
                        <td className="px-2 py-1 text-slate-600">{pct(r.otpPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EodBrief;
