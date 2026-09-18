import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../api/client";
import { toISODate, todayInTimezone, addDays } from "../../utils/dates";
import RunCutDayTable from "../../components/RunCutDayTable";
import { useLatestRequest } from "../../hooks/useLatestRequest";
import { OSR_DISRUPTION_TYPE, isOsrDisruptionType } from "../../config/disruptionTypes";
import { DISPOSITION_OPTIONS } from "../../config/dispositions";

const StandbyPanel = ({ selectedDivision, targetDate, which, coverableRoutes, onCoverageChanged }) => {
  const [standbyDays, setStandbyDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();
  const dateStr = toISODate(targetDate);
  const isDivision3 = ["DIV_3", "DIV_3_GL", "DIV_3_SB"].includes(selectedDivision?.code);

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(
      `/api/run-cut-days?division=${selectedDivision._id}&from=${dateStr}&to=${dateStr}&includeStandby=1&sharedStandby=1`
    )
      .then((data) => {
        if (isCurrent(requestId)) setStandbyDays(data.runCutDays.filter((rcd) => rcd.route?.type === "standby"));
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, dateStr]);

  // Choosing a route deploys the standby onto it in one step; clearing the
  // selection un-deploys it — deploying without saying what it's covering
  // isn't a useful state, so the two always change together.
  const setCoveringRoute = async (rcd, routeId) => {
    setError("");
    try {
      const data = await apiPatch(`/api/run-cut-days/${rcd._id}/deployed`, {
        deployed: Boolean(routeId),
        coveringRoute: routeId || undefined,
      });
      setStandbyDays((prev) => prev.map((r) => (r._id === rcd._id ? data.runCutDay : r)));
      onCoverageChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {isDivision3 ? "Division 3 Shared Standbys" : "Standbys"} — {which === "today" ? "Today" : "Tomorrow"}
        </h3>
        {isDivision3 && (
          <p className="mt-1 text-xs text-slate-500">
            The same standby duties can be deployed on ADA or GoLink revenue routes.
          </p>
        )}
      </div>
      {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead>
          <tr>
            {["Route", "Operator", "Status", "Deployed", "Covering Route"].map((h) => (
              <th key={h} className="px-4 py-2 text-left font-medium text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                Loading standby duties…
              </td>
            </tr>
          )}
          {!loading && standbyDays.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                No standby duties are scheduled for this day.
              </td>
            </tr>
          )}
          {!loading && standbyDays.map((rcd) => (
            <tr key={rcd._id}>
              <td className="px-4 py-2 font-medium text-slate-900">{rcd.route?.code}</td>
              <td className="px-4 py-2 text-slate-600">{rcd.operator?.name || "—"}</td>
              <td className="px-4 py-2 text-slate-600">{rcd.status}</td>
              <td className="px-4 py-2">{rcd.deployed ? "Yes" : "No"}</td>
              <td className="px-4 py-2">
                <select
                  value={rcd.coveringRoute?._id || ""}
                  onChange={(e) => setCoveringRoute(rcd, e.target.value)}
                  disabled={
                    rcd.deployed &&
                    rcd.coveringRoute?.division &&
                    String(rcd.coveringRoute.division) !== String(selectedDivision._id)
                  }
                  title={
                    rcd.deployed &&
                    rcd.coveringRoute?.division &&
                    String(rcd.coveringRoute.division) !== String(selectedDivision._id)
                      ? "This standby is deployed in another branch. Switch to that branch to change it."
                      : "Select the route this standby is covering"
                  }
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                >
                  <option value="">— Not deployed —</option>
                  {rcd.coveringRoute &&
                    !coverableRoutes.some((routeDay) => routeDay.route?._id === rcd.coveringRoute?._id) && (
                      <option value={rcd.coveringRoute._id}>
                        {rcd.coveringRoute.code} (another branch)
                      </option>
                    )}
                  {coverableRoutes
                    .filter((r) => r.route)
                    .map((r) => (
                      <option key={r.route._id} value={r.route._id}>
                        {r.route.code}
                      </option>
                    ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const osrFormForDay = (day) => ({
  operatorId: day?.operator?._id || "",
  vehicleId: day?.vehicle?._id || "",
  pulloutAddress: day?.pulloutAddress || "",
  startTime: day?.startTime || "",
  endTime: day?.endTime || "",
  status: day?.status || "active",
  clientNotes: day?.clientNotes || "",
  disruptionNotes: day?.disruptionNotes || "",
  disposition: day?.disposition || "",
});

const OsrPlanner = ({ selectedDivision, advanceDays, operators, vehicles, onProcessed }) => {
  const today = todayInTimezone(selectedDivision?.timezone);
  const minDate = toISODate(today);
  const maxDate = toISODate(addDays(today, advanceDays));
  const defaultDate = toISODate(addDays(today, Math.min(1, advanceDays)));
  const [expanded, setExpanded] = useState(false);
  const [serviceDate, setServiceDate] = useState(defaultDate);
  const [routeDays, setRouteDays] = useState([]);
  const [runCutDayId, setRunCutDayId] = useState("");
  const [form, setForm] = useState(osrFormForDay(null));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useLatestRequest();

  useEffect(() => {
    setServiceDate(defaultDate);
    setRunCutDayId("");
    setForm(osrFormForDay(null));
    setMessage("");
  }, [defaultDate, selectedDivision?._id]);

  useEffect(() => {
    if (!expanded || !selectedDivision || !serviceDate) return;
    const requestId = request.begin();
    setLoading(true);
    setError("");
    apiGet(`/api/run-cut-days?division=${selectedDivision._id}&from=${serviceDate}&to=${serviceDate}`)
      .then((data) => {
        if (!request.isCurrent(requestId)) return;
        const available = data.runCutDays.filter((day) => day.route?.type !== "standby");
        setRouteDays(available);
        const initialDay = available[0] || null;
        setRunCutDayId(initialDay?._id || "");
        setForm(osrFormForDay(initialDay));
      })
      .catch((err) => {
        if (request.isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (request.isCurrent(requestId)) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, selectedDivision, serviceDate]);

  const selectedRouteDay = routeDays.find((day) => day._id === runCutDayId);

  const processOsr = async (event) => {
    event.preventDefault();
    if (!selectedRouteDay) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const patch = {
        disruptionType: OSR_DISRUPTION_TYPE,
        disruptionNotes: form.disruptionNotes,
        operatorId: form.operatorId,
        vehicleId: form.vehicleId,
        pulloutAddress: form.pulloutAddress,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        status: form.status,
        clientNotes: form.clientNotes,
      };
      if (form.status !== "suspended" || form.disposition === "closed_suspended") {
        patch.disposition = form.disposition || null;
      }
      const data = await apiPatch(`/api/run-cut-days/${selectedRouteDay._id}`, patch);
      setRouteDays((current) =>
        current.map((day) => (day._id === data.runCutDay._id ? data.runCutDay : day))
      );
      setMessage(
        `OSR processed for ${data.runCutDay.route?.code || selectedRouteDay.route?.code} on ${serviceDate}.`
      );
      onProcessed?.(serviceDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/40">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-900"
      >
        <span>Orion Service Request (OSR) Planner</span>
        <span className="text-xs font-normal text-slate-500">
          {expanded ? "Close" : `Up to ${advanceDays} day${advanceDays === 1 ? "" : "s"} ahead`}
        </span>
      </button>
      {expanded && (
        <form onSubmit={processOsr} className="border-t border-blue-100 p-4">
          <p className="mb-3 text-xs text-slate-500">
            Apply the requested day-specific service changes. The route remains operating unless you explicitly select a non-operating status.
          </p>
          {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {message && (
            <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-slate-600">
              Service date
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={serviceDate}
                onChange={(event) => {
                  setServiceDate(event.target.value);
                  setMessage("");
                }}
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Scheduled route
              <select
                value={runCutDayId}
                onChange={(event) => {
                  setRunCutDayId(event.target.value);
                  setForm(osrFormForDay(routeDays.find((day) => day._id === event.target.value)));
                  setMessage("");
                }}
                disabled={loading || routeDays.length === 0}
                required
                className="mt-1 block min-w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
              >
                {routeDays.length === 0 && <option value="">No routes scheduled</option>}
                {routeDays.map((day) => (
                  <option key={day._id} value={day._id}>
                    {day.route?.code}
                    {isOsrDisruptionType(day.disruptionType) ? " (OSR processed)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Driver
              <select
                aria-label="OSR driver"
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
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
                aria-label="OSR vehicle"
                value={form.vehicleId}
                onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
                aria-label="OSR pullout address"
                value={form.pulloutAddress}
                onChange={(event) => setForm((current) => ({ ...current, pulloutAddress: event.target.value }))}
                placeholder="Auto-filled from driver; edit if this trip needs a different pickup"
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Start time
              <input type="time" aria-label="OSR start time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              End time
              <input type="time" aria-label="OSR end time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-sm text-slate-600">
              Route status
              <select
                aria-label="OSR route status"
                value={form.status}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  status: event.target.value,
                  disposition: event.target.value === "suspended"
                    ? "closed_suspended"
                    : current.disposition === "closed_suspended" ? "" : current.disposition,
                }))}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="unassigned">Unassigned</option>
                <option value="suspended">Suspended</option>
                <option value="off">Off</option>
                <option value="add_rte">Additional revenue route</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Disposition
              <select
                aria-label="OSR disposition"
                value={form.disposition}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  disposition: event.target.value,
                  status: event.target.value === "closed_suspended" ? "suspended" : current.status,
                }))}
                className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">— Not dispositioned —</option>
                {DISPOSITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              Client notes
              <input aria-label="OSR client notes" value={form.clientNotes} onChange={(event) => setForm((current) => ({ ...current, clientNotes: event.target.value }))} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-sm text-slate-600 md:col-span-2">
              OSR notes
              <input aria-label="OSR notes" value={form.disruptionNotes} onChange={(event) => setForm((current) => ({ ...current, disruptionNotes: event.target.value }))} placeholder="Request details" className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <button
              type="submit"
              disabled={saving || loading || !runCutDayId}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Processing…" : isOsrDisruptionType(selectedRouteDay?.disruptionType) ? "Update OSR" : "Process OSR"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const emptyExtra = {
  routeId: "",
  routeCode: "",
  operatorId: "",
  vehicleId: "",
  startTime: "",
  endTime: "",
  notes: "",
};

export const splitRowsByDisposition = (runCutDays) => ({
  open: runCutDays.filter((runCutDay) => !runCutDay.disposition),
  closed: runCutDays.filter((runCutDay) => Boolean(runCutDay.disposition)),
});

const LiveSchedule = () => {
  const { selectedDivision } = useOutletContext();
  const [which, setWhich] = useState("today");
  const [todayView, setTodayView] = useState("open");
  const [rows, setRows] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [runCuts, setRunCuts] = useState([]);
  const [osrAdvanceDays, setOsrAdvanceDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const { begin, isCurrent } = useLatestRequest();
  const routesRequest = useLatestRequest();
  const operatorsRequest = useLatestRequest();
  const vehiclesRequest = useLatestRequest();
  const runCutsRequest = useLatestRequest();

  const [showAddExtra, setShowAddExtra] = useState(false);
  const [newExtra, setNewExtra] = useState(emptyExtra);
  const [addExtraError, setAddExtraError] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);
  const [useNewRouteNumber, setUseNewRouteNumber] = useState(false);
  const [standbyOperatorIds, setStandbyOperatorIds] = useState(() => new Set());
  const standbyOperatorsRequest = useLatestRequest();

  const today = todayInTimezone(selectedDivision?.timezone);
  const targetDate = which === "today" ? today : addDays(today, 1);
  const dateStr = toISODate(targetDate);

  const load = () => {
    if (!selectedDivision) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    apiGet(`/api/run-cut-days?division=${selectedDivision._id}&from=${dateStr}&to=${dateStr}`)
      .then((data) => {
        if (isCurrent(requestId)) setRows(data.runCutDays);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [selectedDivision, dateStr]);

  useEffect(() => {
    apiGet("/api/settings")
      .then((data) => setOsrAdvanceDays(data.settings?.osrAdvanceDays ?? 7))
      .catch(() => {});
  }, []);

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

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = runCutsRequest.begin();
    apiGet(`/api/run-cuts?division=${selectedDivision._id}`)
      .then((data) => {
        if (runCutsRequest.isCurrent(requestId)) setRunCuts(data.runCuts);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision]);

  // What Master Run Cuts already has on file for a route — suggested when
  // adding an extra route, instead of making dispatch look everything up
  // and re-enter it. Whichever of these fields are different for the extra
  // shift (a different vehicle, a different time) can still be edited.
  const assignmentForRouteId = (routeId) =>
    runCuts.find((runCut) => runCut.route?._id === routeId) || null;

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = routesRequest.begin();
    apiGet(`/api/routes?division=${selectedDivision._id}`)
      .then((data) => {
        if (routesRequest.isCurrent(requestId)) setRoutes(data.routes);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision]);

  // Who's on standby today/tomorrow, so the extra-route driver picker can put
  // them ahead of everyone else already scheduled elsewhere in the division.
  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = standbyOperatorsRequest.begin();
    apiGet(`/api/run-cut-days?division=${selectedDivision._id}&from=${dateStr}&to=${dateStr}&includeStandby=1`)
      .then((data) => {
        if (!standbyOperatorsRequest.isCurrent(requestId)) return;
        const ids = (data.runCutDays || [])
          .filter((runCutDay) => runCutDay.route?.type === "standby" && runCutDay.operator?._id)
          .map((runCutDay) => runCutDay.operator._id);
        setStandbyOperatorIds(new Set(ids));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, dateStr]);

  const sortedRows = [...rows].sort((a, b) =>
    String(a.route?.code).localeCompare(String(b.route?.code), undefined, { numeric: true })
  );
  const todayRows = splitRowsByDisposition(sortedRows);
  const visibleRows = which === "today" ? todayRows[todayView] : sortedRows;
  const scheduledRouteIds = new Set(rows.map((row) => row.route?._id).filter(Boolean));
  const availableExtraRoutes = routes.filter((route) => !scheduledRouteIds.has(route._id));

  // Standby drivers get first crack at picking up a one-off route; everyone
  // else in the division's active roster follows at lower priority.
  const activeExtraOperators = operators.filter((operator) => operator.active !== false);
  const priorityExtraOperators = activeExtraOperators.filter((operator) => standbyOperatorIds.has(operator._id));
  const otherExtraOperators = activeExtraOperators.filter((operator) => !standbyOperatorIds.has(operator._id));

  const handlePatch = async (runCutDay, patch) => {
    setSavingId(runCutDay._id);
    try {
      const data = await apiPatch(`/api/run-cut-days/${runCutDay._id}`, patch);
      setRows((prev) => prev.map((r) => (r._id === runCutDay._id ? data.runCutDay : r)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddExtra = async (e) => {
    e.preventDefault();
    if (useNewRouteNumber ? !newExtra.routeCode.trim() : !newExtra.routeId) return;
    if (!selectedDivision) return;
    setAddingExtra(true);
    setAddExtraError("");
    try {
      await apiPost("/api/run-cut-days", {
        division: selectedDivision._id,
        date: dateStr,
        ...(useNewRouteNumber ? { routeCode: newExtra.routeCode } : { routeId: newExtra.routeId }),
        operatorId: newExtra.operatorId,
        vehicleId: newExtra.vehicleId,
        startTime: newExtra.startTime || null,
        endTime: newExtra.endTime || null,
        notes: newExtra.notes,
      });
      setNewExtra(emptyExtra);
      setShowAddExtra(false);
      load();
    } catch (err) {
      setAddExtraError(err.message);
    } finally {
      setAddingExtra(false);
    }
  };

  const handleRemoveExtra = async (runCutDay) => {
    try {
      await apiDelete(`/api/run-cut-days/${runCutDay._id}`);
      setRows((prev) => prev.filter((r) => r._id !== runCutDay._id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <OsrPlanner
        selectedDivision={selectedDivision}
        advanceDays={osrAdvanceDays}
        operators={operators}
        vehicles={vehicles}
        onProcessed={(serviceDate) => {
          if (serviceDate === dateStr) load();
        }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { key: "today", label: "Today", date: today },
          { key: "tomorrow", label: "Tomorrow", date: addDays(today, 1) },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setWhich(opt.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              which === opt.key ? "bg-brand-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {opt.label} <span className="opacity-70">({toISODate(opt.date)})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAddExtra((v) => !v)}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          {showAddExtra ? "Cancel" : "+ Add Revenue Route"}
        </button>
      </div>

      {showAddExtra && (
        <form onSubmit={handleAddExtra} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          {addExtraError && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{addExtraError}</p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-600">
              Revenue route
              {useNewRouteNumber ? (
                <input
                  value={newExtra.routeCode}
                  onChange={(e) => setNewExtra({ ...newExtra, routeCode: e.target.value })}
                  placeholder="Route number"
                  required
                  className="mt-1 block w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              ) : (
                <select
                  value={newExtra.routeId}
                  onChange={(event) => {
                    const routeId = event.target.value;
                    const assignment = assignmentForRouteId(routeId);
                    setNewExtra({
                      ...emptyExtra,
                      routeId,
                      operatorId: assignment?.operator?._id || "",
                      vehicleId: assignment?.vehicle?._id || "",
                      startTime: assignment?.startTime || "",
                      endTime: assignment?.endTime || "",
                    });
                  }}
                  required
                  className="mt-1 block min-w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Select from division pool</option>
                  {availableExtraRoutes.map((route) => (
                    <option key={route._id} value={route._id}>{route.code}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => {
                  setUseNewRouteNumber((v) => !v);
                  setNewExtra(emptyExtra);
                }}
                className="mt-1 block text-xs font-medium text-brand-600 hover:underline"
              >
                {useNewRouteNumber ? "Choose from division pool instead" : "Make up a route number for today"}
              </button>
            </label>
            <label className="text-sm text-slate-600">
              Driver
              <select
                value={newExtra.operatorId}
                onChange={(e) => setNewExtra({ ...newExtra, operatorId: e.target.value })}
                className="mt-1 block w-48 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Unassigned</option>
                {priorityExtraOperators.length > 0 && (
                  <optgroup label="Standby (priority)">
                    {priorityExtraOperators.map((operator) => (
                      <option key={operator._id} value={operator._id}>{operator.name}</option>
                    ))}
                  </optgroup>
                )}
                {otherExtraOperators.length > 0 && (
                  <optgroup label={priorityExtraOperators.length > 0 ? "Other drivers" : "Drivers"}>
                    {otherExtraOperators.map((operator) => (
                      <option key={operator._id} value={operator._id}>{operator.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Vehicle
              <select
                value={newExtra.vehicleId}
                onChange={(e) => setNewExtra({ ...newExtra, vehicleId: e.target.value })}
                className="mt-1 block w-36 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Unassigned</option>
                {vehicles.filter((vehicle) => vehicle.active !== false).map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>{vehicle.code}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Pullout address
              <input
                value={operators.find((operator) => operator._id === newExtra.operatorId)?.pulloutAddress || ""}
                readOnly
                placeholder="Set by driver"
                className="mt-1 block w-56 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-600"
              />
            </label>
            <label className="text-sm text-slate-600">
              Start
              <input
                type="time"
                value={newExtra.startTime}
                onChange={(e) => setNewExtra({ ...newExtra, startTime: e.target.value })}
                className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              End
              <input
                type="time"
                value={newExtra.endTime}
                onChange={(e) => setNewExtra({ ...newExtra, endTime: e.target.value })}
                className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Notes
              <input
                value={newExtra.notes}
                onChange={(e) => setNewExtra({ ...newExtra, notes: e.target.value })}
                placeholder="Why this extra route"
                required
                className="mt-1 block w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={addingExtra}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {addingExtra ? "Adding…" : "Add revenue route"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {which === "today" && !loading && (
        <div className="mb-3 flex gap-1" role="tablist" aria-label="Today's route status">
          {[
            { key: "open", label: "Open", count: todayRows.open.length },
            { key: "closed", label: "Closed", count: todayRows.closed.length },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={todayView === option.key}
              onClick={() => setTodayView(option.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                todayView === option.key
                  ? "bg-slate-800 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <RunCutDayTable
          rows={visibleRows}
          savingId={savingId}
          onPatch={handlePatch}
          onRemoveExtra={handleRemoveExtra}
          showDisposition={which === "today"}
          editableDailyAssignment
          operators={operators}
          vehicles={vehicles}
          emptyMessage={
            which === "today"
              ? `No ${todayView} routes scheduled for today.`
              : "No routes scheduled for tomorrow."
          }
        />
      )}

      <p className="mt-3 text-xs text-slate-400">
        Operator, vehicle, pullout address, times, status, disruption, client notes, and disposition set here apply to this
        daily schedule only. Master Run Cuts remains unchanged.
      </p>

      {selectedDivision && (
        <StandbyPanel
          selectedDivision={selectedDivision}
          targetDate={targetDate}
          which={which}
          coverableRoutes={rows}
          onCoverageChanged={load}
        />
      )}
    </div>
  );
};

export default LiveSchedule;
