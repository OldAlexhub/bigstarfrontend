import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import { DAYS_OF_WEEK } from "../../utils/dates";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const METRIC_ROWS = [
  { key: "revenueHoursScheduled", label: "RC REV Hours" },
  { key: "revenueHoursCovered", label: "Core Hours" },
  { key: "dutiesDeployed", label: "Duties Deployed" },
  { key: "dutiesScheduled", label: "Duties Scheduled" },
  { key: "dutiesSuspended", label: "Duties Suspended" },
  { key: "dutiesUnassigned", label: "Duties Unassigned" },
  { key: "volunteerDuties", label: "Volunteer Duties" },
  { key: "standbyAvailable", label: "Standby Available" },
  { key: "standbyDeployed", label: "Standby Deployed" },
];

const formatValue = (key, value) => {
  if (value === undefined || value === null) return "—";
  if (key.startsWith("revenueHours")) return value.toFixed(2);
  return value;
};

const AllDivisionsTracker = ({ setSelectedDivisionId }) => {
  const [divisions, setDivisions] = useState(null);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    const requestId = begin();
    apiGet("/api/tracker/all")
      .then((data) => {
        if (isCurrent(requestId)) setDivisions(data.divisions);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!divisions) return <p className="text-sm text-slate-500">Loading tracker…</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {divisions.map((d) => (
        <button
          key={d.divisionId}
          type="button"
          onClick={() => setSelectedDivisionId(d.divisionId)}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-500 hover:shadow-md"
        >
          <p className="text-sm font-semibold text-slate-900">{d.name}</p>
          <div className="mt-3 flex gap-4">
            <div>
              <p className="text-xs text-slate-500">Run Cut Fulfillment</p>
              <p className="text-lg font-semibold text-slate-900">{(d.runCutFulfillmentPct * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Revenue Hour Fulfillment</p>
              <p className="text-lg font-semibold text-slate-900">
                {(d.revenueHourFulfillmentPct * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

const TrackerDashboard = () => {
  const { selectedDivision, isAllDivisions, setSelectedDivisionId } = useOutletContext();
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    if (!selectedDivision) return;
    if (isAllDivisions) {
      setLoading(false);
      return;
    }
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/tracker?division=${selectedDivision._id}`)
      .then((data) => {
        if (isCurrent(requestId)) setTracker(data);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, isAllDivisions]);

  const isLive = tracker?.source === "live";
  const dayColumns = useMemo(() => {
    if (!isLive || !tracker?.days) return [];
    return DAYS_OF_WEEK.map((label) => ({ label, metrics: tracker.days[label] }));
  }, [tracker, isLive]);

  if (isAllDivisions) {
    return <AllDivisionsTracker setSelectedDivisionId={setSelectedDivisionId} />;
  }
  if (loading) return <p className="text-sm text-slate-500">Loading tracker…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!tracker) return null;

  const totals = isLive ? tracker.total : tracker.summary;
  const revenueHourFulfillmentPct = isLive ? tracker.coveragePct : tracker.summary?.coveragePct;
  const runCutFulfillmentPct = isLive
    ? tracker.runCutFulfillmentPct
    : totals?.dutiesScheduled
    ? totals.dutiesDeployed / totals.dutiesScheduled
    : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Run Cut Fulfillment</p>
          <p className="text-xl font-semibold text-slate-900">
            {runCutFulfillmentPct !== undefined ? `${(runCutFulfillmentPct * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Revenue Hour Fulfillment</p>
          <p className="text-xl font-semibold text-slate-900">
            {revenueHourFulfillmentPct !== undefined ? `${(revenueHourFulfillmentPct * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        {!isLive && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            Finalized weekly summary
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Metric</th>
              {isLive &&
                dayColumns.map((col) => (
                  <th key={col.label} className="px-4 py-2 text-right font-medium text-slate-500">
                    {col.label}
                  </th>
                ))}
              <th className="px-4 py-2 text-right font-medium text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {METRIC_ROWS.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-2 font-medium text-slate-900">{row.label}</td>
                {isLive &&
                  dayColumns.map((col) => (
                    <td key={col.label} className="px-4 py-2 text-right text-slate-600">
                      {formatValue(row.key, col.metrics?.[row.key])}
                    </td>
                  ))}
                <td className="px-4 py-2 text-right font-semibold text-slate-900">
                  {formatValue(row.key, totals?.[row.key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrackerDashboard;
