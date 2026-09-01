import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import { toISODate, todayInTimezone, addDays } from "../../utils/dates";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const ActivityLog = () => {
  const { selectedDivision } = useOutletContext();
  const [from, setFrom] = useState(toISODate(addDays(todayInTimezone(selectedDivision?.timezone), -6)));
  const [to, setTo] = useState(toISODate(todayInTimezone(selectedDivision?.timezone)));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    if (!selectedDivision || !from || !to) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/deployment-activity?division=${selectedDivision._id}&from=${from}&to=${to}`)
      .then((data) => {
        if (isCurrent(requestId)) setEntries(data.entries);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, from, to]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
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
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Timestamp", "User", "Action"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                  No activity logged in this range.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry._id}>
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                  {entry.name ? `${entry.name} (${entry.username})` : entry.username || "—"}
                </td>
                <td className="px-3 py-2 text-slate-600">{entry.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityLog;
