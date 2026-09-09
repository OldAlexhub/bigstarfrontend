import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import MetricCard from "../../components/MetricCard";
import { toISODate, todayInTimezone } from "../../utils/dates";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const StandbyUtilization = () => {
  const { selectedDivision } = useOutletContext();
  const divisionToday = toISODate(todayInTimezone(selectedDivision?.timezone));
  const [date, setDate] = useState(divisionToday);
  const [standbyDays, setStandbyDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    setDate(divisionToday);
  }, [selectedDivision?._id, divisionToday]);

  useEffect(() => {
    if (!selectedDivision || !date) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/run-cut-days?division=${selectedDivision._id}&from=${date}&to=${date}&includeStandby=1`)
      .then((data) => {
        if (!isCurrent(requestId)) return;
        setStandbyDays(
          data.runCutDays
            .filter((day) => day.route?.type === "standby")
            .sort((a, b) =>
              String(a.route?.code).localeCompare(String(b.route?.code), undefined, { numeric: true })
            )
        );
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, date]);

  const metrics = useMemo(() => {
    const available = standbyDays.filter((day) => day.status === "active");
    const utilized = available.filter((day) => day.deployed);
    return {
      available: available.length,
      utilized: utilized.length,
      unused: available.length - utilized.length,
      utilizationPct: available.length ? (utilized.length / available.length) * 100 : 0,
    };
  }, [standbyDays]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Daily STBY Utilization</h2>
          <p className="text-sm text-slate-500">Calculated from standby assignments in Live Schedule.</p>
        </div>
        <label className="text-sm text-slate-600">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Standby Available" value={metrics.available} tone="info" />
        <MetricCard label="Standby Utilized" value={metrics.utilized} tone="good" />
        <MetricCard label="Standby Unused" value={metrics.unused} tone="neutral" />
        <MetricCard label="Utilization" value={`${metrics.utilizationPct.toFixed(1)}%`} tone="info" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Standby Route", "Operator", "Status", "Utilized", "Covering Route"].map((heading) => (
                <th key={heading} className="px-4 py-2 text-left font-medium text-slate-500">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td>
              </tr>
            )}
            {!loading && standbyDays.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No standby duties scheduled for this date.
                </td>
              </tr>
            )}
            {!loading && standbyDays.map((day) => (
              <tr key={day._id}>
                <td className="px-4 py-2 font-medium text-slate-900">{day.route?.code || "—"}</td>
                <td className="px-4 py-2 text-slate-600">{day.operator?.name || "—"}</td>
                <td className="px-4 py-2 capitalize text-slate-600">{day.status}</td>
                <td className="px-4 py-2 text-slate-600">{day.deployed ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-slate-600">{day.coveringRoute?.code || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StandbyUtilization;
