import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../api/client";
import { toISODate, todayInTimezone, addDays } from "../../utils/dates";
import RunCutDayTable from "../../components/RunCutDayTable";
import { useLatestRequest } from "../../hooks/useLatestRequest";

const StandbyPanel = ({ selectedDivision, targetDate, which, coverableRoutes }) => {
  const [standbyDays, setStandbyDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { begin, isCurrent } = useLatestRequest();
  const dateStr = toISODate(targetDate);

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = begin();
    setLoading(true);
    apiGet(`/api/run-cut-days?division=${selectedDivision._id}&from=${dateStr}&to=${dateStr}&includeStandby=1`)
      .then((data) => {
        if (isCurrent(requestId)) setStandbyDays(data.runCutDays.filter((rcd) => rcd.route?.type === "standby"));
      })
      .catch(() => {})
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
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading || standbyDays.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
      <h3 className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
        Standby — {which === "today" ? "Today" : "Tomorrow"}
      </h3>
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
          {standbyDays.map((rcd) => (
            <tr key={rcd._id}>
              <td className="px-4 py-2 font-medium text-slate-900">{rcd.route?.code}</td>
              <td className="px-4 py-2 text-slate-600">{rcd.operator?.name || "—"}</td>
              <td className="px-4 py-2 text-slate-600">{rcd.status}</td>
              <td className="px-4 py-2">{rcd.deployed ? "Yes" : "No"}</td>
              <td className="px-4 py-2">
                <select
                  value={rcd.coveringRoute?._id || ""}
                  onChange={(e) => setCoveringRoute(rcd, e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="">— Not deployed —</option>
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

const emptyExtra = {
  routeCode: "",
  operatorName: "",
  vehicleCode: "",
  pulloutAddress: "",
  startTime: "",
  endTime: "",
  notes: "",
};

const LiveSchedule = () => {
  const { selectedDivision } = useOutletContext();
  const [which, setWhich] = useState("today");
  const [rows, setRows] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [runCuts, setRunCuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const { begin, isCurrent } = useLatestRequest();
  const routesRequest = useLatestRequest();
  const vehiclesRequest = useLatestRequest();
  const runCutsRequest = useLatestRequest();

  const [showAddExtra, setShowAddExtra] = useState(false);
  const [newExtra, setNewExtra] = useState(emptyExtra);
  const [addExtraError, setAddExtraError] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);

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
    apiGet("/api/operators")
      .then((data) => setOperators(data.operators))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = vehiclesRequest.begin();
    apiGet(`/api/vehicles?division=${selectedDivision._id}`)
      .then((data) => {
        if (vehiclesRequest.isCurrent(requestId)) setVehicles(data.vehicles);
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
  const assignmentForRouteCode = (code) => {
    const route = routes.find((r) => r.code.toLowerCase() === code.trim().toLowerCase());
    if (!route) return null;
    return runCuts.find((rc) => rc.route?._id === route._id) || null;
  };

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

  const sortedRows = [...rows].sort((a, b) =>
    String(a.route?.code).localeCompare(String(b.route?.code), undefined, { numeric: true })
  );

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
    if (!newExtra.routeCode.trim() || !selectedDivision) return;
    setAddingExtra(true);
    setAddExtraError("");
    try {
      await apiPost("/api/run-cut-days", {
        division: selectedDivision._id,
        date: dateStr,
        routeCode: newExtra.routeCode.trim(),
        operatorName: newExtra.operatorName,
        vehicleCode: newExtra.vehicleCode,
        pulloutAddress: newExtra.pulloutAddress,
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
      <datalist id="dep-routes">
        {routes.map((r) => (
          <option key={r._id} value={r.code} />
        ))}
      </datalist>
      <datalist id="dep-operators">
        {operators.map((o) => (
          <option key={o._id} value={o.name} />
        ))}
      </datalist>
      <datalist id="dep-vehicles">
        {vehicles.map((v) => (
          <option key={v._id} value={v.code} />
        ))}
      </datalist>

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
          {showAddExtra ? "Cancel" : "+ Add Extra Route"}
        </button>
      </div>

      {showAddExtra && (
        <form onSubmit={handleAddExtra} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          {addExtraError && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{addExtraError}</p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-600">
              Route
              <input
                list="dep-routes"
                value={newExtra.routeCode}
                onChange={(e) => setNewExtra({ ...newExtra, routeCode: e.target.value })}
                onBlur={(e) => {
                  const assignment = assignmentForRouteCode(e.target.value);
                  if (!assignment) return;
                  setNewExtra((f) => ({
                    ...f,
                    operatorName: f.operatorName || assignment.operator?.name || "",
                    vehicleCode: f.vehicleCode || assignment.vehicle?.code || "",
                    pulloutAddress: f.pulloutAddress || assignment.pulloutAddress || "",
                    startTime: f.startTime || assignment.startTime || "",
                    endTime: f.endTime || assignment.endTime || "",
                  }));
                }}
                placeholder="Route code"
                required
                className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Operator
              <input
                list="dep-operators"
                value={newExtra.operatorName}
                onChange={(e) => setNewExtra({ ...newExtra, operatorName: e.target.value })}
                placeholder="Type a name…"
                className="mt-1 block w-44 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Vehicle
              <input
                list="dep-vehicles"
                value={newExtra.vehicleCode}
                onChange={(e) => setNewExtra({ ...newExtra, vehicleCode: e.target.value })}
                placeholder="Type a code…"
                className="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Pullout address
              <input
                value={newExtra.pulloutAddress}
                onChange={(e) => setNewExtra({ ...newExtra, pulloutAddress: e.target.value })}
                className="mt-1 block w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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
              {addingExtra ? "Adding…" : "Add extra route"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <RunCutDayTable
          rows={sortedRows}
          savingId={savingId}
          onPatch={handlePatch}
          onRemoveExtra={handleRemoveExtra}
          emptyMessage={`No routes scheduled for ${which}.`}
        />
      )}

      <p className="mt-3 text-xs text-slate-400">
        Operator, vehicle, and schedule come from Master Run Cuts. Status, disruption, and client notes set here
        apply to {which === "today" ? "today" : "tomorrow"} only and don't change the ongoing schedule.
      </p>

      {selectedDivision && (
        <StandbyPanel
          selectedDivision={selectedDivision}
          targetDate={targetDate}
          which={which}
          coverableRoutes={rows}
        />
      )}
    </div>
  );
};

export default LiveSchedule;
