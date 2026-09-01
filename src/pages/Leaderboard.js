import { useEffect, useState } from "react";
import { apiGet, API_BASE } from "../api/client";
import { toISODate, addDays, todayInTimezone } from "../utils/dates";
import { useLatestRequest } from "../hooks/useLatestRequest";

const pct = (v) => (v == null ? "—" : `${Math.round(v * 1000) / 10}%`);
const num = (v) => (v == null ? "—" : v);

const Leaderboard = () => {
  // Company-wide report — no single division's timezone applies, so the
  // default range uses the company-default timezone (the range itself is
  // user-picked; this only affects the starting values), same convention
  // as ELT Reporting.
  const [from, setFrom] = useState(toISODate(addDays(todayInTimezone(), -29)));
  const [to, setTo] = useState(toISODate(todayInTimezone()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    if (!from || !to) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/leaderboard?from=${from}&to=${to}`)
      .then((d) => {
        if (isCurrent(requestId)) setData(d);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard/export?from=${from}&to=${to}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Download failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `Leaderboard-${from}-to-${to}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Top 20 operators company-wide, ranked on one uniform scoring standard across every division, for any date
          range.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-600">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading || loading}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {downloading ? "Downloading…" : "Download PDF"}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && data && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Rank", "Operator", "Division(s)", "Provider", "OTP", "SHF", "TPSH", "Closures", "Late 1st", "Late Dep", "Score"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.operators.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-slate-400">
                    No operators had any scheduled or reported activity in this range.
                  </td>
                </tr>
              )}
              {data.operators.map((r) => (
                <tr key={r.kpiKey}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{r.rank}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{r.operator}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.divisions}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.provider}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${r.meetsOtp ? "text-slate-600" : "text-red-600"}`}>{pct(r.avgOtp)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${r.meetsShf ? "text-slate-600" : "text-red-600"}`}>{pct(r.avgShf)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 ${r.meetsTpsh ? "text-slate-600" : "text-red-600"}`}>{num(r.avgTpsh)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{num(r.avgRouteClosures)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{num(r.avgLateFirst)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{num(r.avgLateDeploy)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{pct(r.composite)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
