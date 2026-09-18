import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiPatch, apiDownload } from "../../api/client";
import { useLatestRequest } from "../../hooks/useLatestRequest";
import { usePagePermission } from "../../components/PageAccessRoute";
import { DAYS_OF_WEEK, toISODate, todayInTimezone, addDays } from "../../utils/dates";

const CHANGES_PAGE_SIZE = 15;

// A read-only, paginated "from -> to" history of every Permanent OSR
// submitted for this division — one row per changed field, since a single
// submission can change several fields at once. Shares the same
// DeploymentActivityLog Tracker Log entries write to, filtered to just the
// runcut.permanent_osr_updated action (server/controllers/permanentOsrChangesController.js).
const PermanentOsrChangeHistory = ({ selectedDivision, refreshToken }) => {
  const today = todayInTimezone(selectedDivision?.timezone);
  const [from, setFrom] = useState(toISODate(addDays(today, -6)));
  const [to, setTo] = useState(toISODate(today));
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const request = useLatestRequest();

  useEffect(() => {
    if (!selectedDivision || !from || !to) return;
    const requestId = request.begin();
    setLoading(true);
    setError("");
    apiGet(`/api/permanent-osr-changes?division=${selectedDivision._id}&from=${from}&to=${to}`)
      .then((data) => {
        if (request.isCurrent(requestId)) setEntries(data.entries || []);
      })
      .catch((err) => {
        if (request.isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (request.isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, from, to, refreshToken]);

  useEffect(() => {
    setPage(1);
  }, [selectedDivision, from, to]);

  const totalPages = Math.max(1, Math.ceil(entries.length / CHANGES_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * CHANGES_PAGE_SIZE;
  const pageEntries = entries.slice(pageStart, pageStart + CHANGES_PAGE_SIZE);

  const download = async (format) => {
    if (!selectedDivision || !from || !to) return;
    setDownloading(format);
    setError("");
    try {
      const { blob, filename } = await apiDownload(
        `/api/permanent-osr-changes/export?division=${encodeURIComponent(selectedDivision._id)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=${format}`
      );
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
      setDownloading("");
    }
  };

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Permanent OSR change history</h2>
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => download("xlsx")}
              disabled={Boolean(downloading) || !from || !to}
              className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {downloading === "xlsx" ? "Downloading…" : "Download Excel"}
            </button>
            <button
              type="button"
              onClick={() => download("csv")}
              disabled={Boolean(downloading) || !from || !to}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading === "csv" ? "Downloading…" : "Download CSV"}
            </button>
          </div>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Route", "Field", "From", "To", "Reason", "Changed By"].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left font-medium text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                    No permanent OSR changes in this range.
                  </td>
                </tr>
              )}
              {pageEntries.map((entry, index) => (
                <tr key={`${entry.createdAt}-${entry.field}-${index}`}>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">{entry.route}</td>
                  <td className="px-3 py-2 text-slate-600">{entry.field}</td>
                  <td className="px-3 py-2 text-slate-600">{entry.from}</td>
                  <td className="px-3 py-2 text-slate-600">{entry.to}</td>
                  <td className="px-3 py-2 text-slate-600">{entry.reason}</td>
                  <td className="px-3 py-2 text-slate-600">{entry.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "unassigned", label: "Unassigned" },
  { value: "suspended", label: "Suspended" },
  { value: "off", label: "Off" },
  { value: "add_rte", label: "Add Rte" },
];

const formForRunCut = (runCut) => ({
  operatorId: runCut?.operator?._id || "",
  vehicleId: runCut?.vehicle?._id || "",
  pulloutAddress: runCut?.pulloutAddress || "",
  startTime: runCut?.startTime || "",
  endTime: runCut?.endTime || "",
  daysOfWeek: runCut?.daysOfWeek || [],
  status: runCut?.status || "active",
  clientNotes: runCut?.clientNotes || "",
  disruptionNotes: runCut?.disruptionNotes || "",
});

// Unlike the OSR Planner in Live Schedule (which patches one date's
// RunCutDay and never touches the standing plan), this tab patches the
// RunCut itself — the change becomes the new Master Run Cuts assignment
// going forward, the same as an edit made directly in Master Run Cuts,
// just reachable from Deployment and recorded in its Tracker Log.
const PermanentOsr = () => {
  const { selectedDivision } = useOutletContext();
  const { canWrite } = usePagePermission();
  const [runCuts, setRunCuts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [runCutId, setRunCutId] = useState("");
  const [form, setForm] = useState(formForRunCut(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const runCutsRequest = useLatestRequest();
  const operatorsRequest = useLatestRequest();
  const vehiclesRequest = useLatestRequest();

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = runCutsRequest.begin();
    setLoading(true);
    setError("");
    apiGet(`/api/run-cuts?division=${selectedDivision._id}`)
      .then((data) => {
        if (!runCutsRequest.isCurrent(requestId)) return;
        setRunCuts(data.runCuts);
        setRunCutId("");
        setForm(formForRunCut(null));
        setMessage("");
      })
      .catch((err) => {
        if (runCutsRequest.isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (runCutsRequest.isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision]);

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = operatorsRequest.begin();
    apiGet(`/api/operators?division=${selectedDivision._id}`)
      .then((data) => {
        if (operatorsRequest.isCurrent(requestId)) setOperators(data.operators || []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision]);

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = vehiclesRequest.begin();
    apiGet(`/api/vehicles?division=${selectedDivision._id}`)
      .then((data) => {
        if (vehiclesRequest.isCurrent(requestId)) setVehicles(data.vehicles || []);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision]);

  const selectedRunCut = runCuts.find((rc) => rc._id === runCutId) || null;

  const selectRunCut = (id) => {
    setRunCutId(id);
    setForm(formForRunCut(runCuts.find((rc) => rc._id === id)));
    setMessage("");
  };

  const toggleDay = (day) => {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((d) => d !== day)
        : DAYS_OF_WEEK.filter((d) => [...current.daysOfWeek, day].includes(d)),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedRunCut || !form.disruptionNotes.trim()) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await apiPatch(`/api/run-cuts/${selectedRunCut._id}/permanent-osr`, {
        operatorId: form.operatorId,
        vehicleId: form.vehicleId,
        pulloutAddress: form.pulloutAddress,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        daysOfWeek: form.daysOfWeek,
        status: form.status,
        clientNotes: form.clientNotes,
        disruptionNotes: form.disruptionNotes,
      });
      setRunCuts((current) => current.map((rc) => (rc._id === data.runCut._id ? data.runCut : rc)));
      setForm(formForRunCut(data.runCut));
      setMessage(
        `Permanent OSR applied to ${data.runCut.route?.code}. Master Run Cuts and the upcoming schedule now reflect this change.`
      );
      setHistoryRefreshToken((token) => token + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
        A Permanent OSR changes the ongoing Master Run Cut itself — the driver, vehicle, schedule, or status set here
        becomes the new standing assignment, not just a one-day exception. For a change that applies to today or
        tomorrow only, use the OSR Planner in Live Schedule instead.
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-slate-600 xl:col-span-2">
              Route
              <select
                value={runCutId}
                onChange={(event) => selectRunCut(event.target.value)}
                disabled={!canWrite || runCuts.length === 0}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              >
                <option value="">{runCuts.length === 0 ? "No routes in this division" : "Select a route"}</option>
                {runCuts.map((rc) => (
                  <option key={rc._id} value={rc._id}>{rc.route?.code}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Driver
              <select
                aria-label="Permanent OSR driver"
                value={form.operatorId}
                onChange={(event) => {
                  const operatorId = event.target.value;
                  const operatorDoc = operators.find((operator) => operator._id === operatorId);
                  setForm((current) => ({
                    ...current,
                    operatorId,
                    pulloutAddress: operatorDoc?.pulloutAddress || "",
                  }));
                }}
                disabled={!canWrite || !selectedRunCut}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              >
                <option value="">— Unassigned —</option>
                {operators.filter((operator) => operator.active !== false).map((operator) => (
                  <option key={operator._id} value={operator._id}>{operator.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Vehicle
              <select
                aria-label="Permanent OSR vehicle"
                value={form.vehicleId}
                onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}
                disabled={!canWrite || !selectedRunCut}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              >
                <option value="">— Unassigned —</option>
                {vehicles.filter((vehicle) => vehicle.active !== false).map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>{vehicle.code}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Pullout address
              <input
                aria-label="Permanent OSR pullout address"
                value={form.pulloutAddress}
                onChange={(event) => setForm((current) => ({ ...current, pulloutAddress: event.target.value }))}
                disabled={!canWrite || !selectedRunCut}
                placeholder="Auto-filled from driver; edit if needed"
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm text-slate-600">
              Start time
              <input
                type="time"
                aria-label="Permanent OSR start time"
                value={form.startTime}
                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                disabled={!canWrite || !selectedRunCut}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm text-slate-600">
              End time
              <input
                type="time"
                aria-label="Permanent OSR end time"
                value={form.endTime}
                onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                disabled={!canWrite || !selectedRunCut}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm text-slate-600">
              Route status
              <select
                aria-label="Permanent OSR route status"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                disabled={!canWrite || !selectedRunCut}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="text-sm text-slate-600">
              Days of operation
              <div className="mt-1 flex gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    disabled={!canWrite || !selectedRunCut}
                    onClick={() => toggleDay(day)}
                    title={day}
                    className={`h-7 w-7 rounded text-[10px] font-medium transition-colors ${
                      form.daysOfWeek.includes(day)
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-sm text-slate-600 md:col-span-2">
              Client notes
              <input
                aria-label="Permanent OSR client notes"
                value={form.clientNotes}
                onChange={(event) => setForm((current) => ({ ...current, clientNotes: event.target.value }))}
                disabled={!canWrite || !selectedRunCut}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2 xl:col-span-4">
              Reason for this permanent OSR
              <input
                aria-label="Permanent OSR reason"
                value={form.disruptionNotes}
                onChange={(event) => setForm((current) => ({ ...current, disruptionNotes: event.target.value }))}
                required
                disabled={!canWrite || !selectedRunCut}
                placeholder="Why this becomes the new standing assignment"
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              />
            </label>
            {canWrite && (
              <button
                type="submit"
                disabled={saving || !selectedRunCut || !form.disruptionNotes.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Processing…" : "Process permanent OSR"}
              </button>
            )}
          </div>
        </form>
      )}

      <PermanentOsrChangeHistory selectedDivision={selectedDivision} refreshToken={historyRefreshToken} />
    </div>
  );
};

export default PermanentOsr;
