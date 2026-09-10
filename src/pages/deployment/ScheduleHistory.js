import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiPatch } from "../../api/client";
import RunCutDayTable from "../../components/RunCutDayTable";
import { addDays, toISODate, todayInTimezone } from "../../utils/dates";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const ScheduleHistory = () => {
  const { selectedDivision } = useOutletContext();
  const yesterday = toISODate(addDays(todayInTimezone(selectedDivision?.timezone), -1));
  const [date, setDate] = useState(yesterday);
  const [view, setView] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();

  useEffect(() => {
    setDate(toISODate(addDays(todayInTimezone(selectedDivision?.timezone), -1)));
  }, [selectedDivision]);

  useEffect(() => {
    if (!selectedDivision || !date) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/run-cut-days?division=${selectedDivision._id}&from=${date}&to=${date}&includeStandby=1`)
      .then((data) => {
        if (isCurrent(requestId)) setRows(data.runCutDays || []);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, date]);

  const grouped = useMemo(() => {
    const sorted = [...rows].sort((a, b) => String(a.route?.code).localeCompare(String(b.route?.code), undefined, { numeric: true }));
    return {
      all: sorted,
      open: sorted.filter((row) => !row.disposition),
      closed: sorted.filter((row) => Boolean(row.disposition)),
    };
  }, [rows]);

  const updateDisposition = async (runCutDay, patch) => {
    if (!Object.prototype.hasOwnProperty.call(patch, "disposition")) return;
    setSavingId(runCutDay._id);
    setError("");
    try {
      const data = await apiPatch(`/api/run-cut-days/${runCutDay._id}`, { disposition: patch.disposition });
      setRows((current) => current.map((row) => row._id === runCutDay._id ? data.runCutDay : row));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Schedule History</h2>
          <p className="mt-1 text-sm text-slate-500">Open one past operating day and correct its final disposition when needed.</p>
        </div>
        <label className="text-sm text-slate-600">
          Schedule date
          <input
            type="date"
            value={date}
            max={yesterday}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
      </div>

      {!loading && (
        <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Historical route disposition">
          {[
            { key: "all", label: "All", count: grouped.all.length },
            { key: "open", label: "Open", count: grouped.open.length },
            { key: "closed", label: "Dispositioned", count: grouped.closed.length },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={view === option.key}
              onClick={() => setView(option.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === option.key ? "bg-slate-800 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Loading schedule…</p>
      ) : (
        <RunCutDayTable
          rows={grouped[view]}
          savingId={savingId}
          onPatch={updateDisposition}
          showDisruptionAndNotes={false}
          showDisposition
          editableStatus={false}
          emptyMessage={`No ${view === "all" ? "" : `${view} `}routes were recorded on ${date}.`}
        />
      )}
      <p className="mt-3 text-xs text-slate-400">Historical schedule fields are read-only here. Disposition corrections are audit-logged in the Deployment Tracker Log.</p>
    </div>
  );
};

export default ScheduleHistory;
