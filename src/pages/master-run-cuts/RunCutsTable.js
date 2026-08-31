import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiPost, apiPatch } from "../../api/client";
import RunCutDayTable from "../../components/RunCutDayTable";
import { useLatestRequest } from "../../hooks/useLatestRequest";
import { DAYS_OF_WEEK } from "../../utils/dates";

const emptyNewRoute = {
  code: "",
  operatorName: "",
  vehicleCode: "",
  pulloutAddress: "",
  startTime: "",
  endTime: "",
  daysOfWeek: [],
};

const RunCutsTable = () => {
  const { selectedDivision, isAllDivisions } = useOutletContext();
  const [runCuts, setRunCuts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const { begin, isCurrent } = useLatestRequest();
  const vehiclesRequest = useLatestRequest();

  const [showAddRoute, setShowAddRoute] = useState(false);
  const [newRoute, setNewRoute] = useState(emptyNewRoute);
  const [addRouteError, setAddRouteError] = useState("");
  const [addingRoute, setAddingRoute] = useState(false);

  const load = () => {
    if (!selectedDivision) return;
    const requestId = begin();
    setLoading(true);
    setError("");
    const url = isAllDivisions
      ? "/api/run-cuts?includeStandby=1"
      : `/api/run-cuts?division=${selectedDivision._id}&includeStandby=1`;
    apiGet(url)
      .then((data) => {
        if (isCurrent(requestId)) setRunCuts(data.runCuts);
      })
      .catch((err) => {
        if (isCurrent(requestId)) setError(err.message);
      })
      .finally(() => {
        if (isCurrent(requestId)) setLoading(false);
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [selectedDivision, isAllDivisions]);

  useEffect(() => {
    apiGet("/api/operators")
      .then((data) => setOperators(data.operators))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDivision) return;
    const requestId = vehiclesRequest.begin();
    const url = isAllDivisions ? "/api/vehicles" : `/api/vehicles?division=${selectedDivision._id}`;
    apiGet(url)
      .then((data) => {
        if (vehiclesRequest.isCurrent(requestId)) setVehicles(data.vehicles);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, isAllDivisions]);

  const rows = [...runCuts].sort((a, b) => {
    if (isAllDivisions) {
      const divCompare = String(a.division?.code || a.division).localeCompare(
        String(b.division?.code || b.division)
      );
      if (divCompare !== 0) return divCompare;
    }
    return String(a.route?.code).localeCompare(String(b.route?.code), undefined, { numeric: true });
  });

  const handlePatch = async (runCut, patch) => {
    setSavingId(runCut._id);
    try {
      const data = await apiPatch(`/api/run-cuts/${runCut._id}`, patch);
      // Vehicle-conflict flags are computed across the whole division and
      // come back in the same response, so every row can be patched in
      // place — no full reload/re-render of the table on every edit.
      setRunCuts((prev) =>
        prev.map((r) => {
          const conflict = data.vehicleConflicts && r._id in data.vehicleConflicts ? data.vehicleConflicts[r._id] : undefined;
          if (r._id === runCut._id) return { ...r, ...data.runCut, ...(conflict !== undefined && { vehicleConflict: conflict }) };
          if (conflict !== undefined) return { ...r, vehicleConflict: conflict };
          return r;
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const toggleNewRouteDay = (day) => {
    setNewRoute((r) => ({
      ...r,
      daysOfWeek: r.daysOfWeek.includes(day)
        ? r.daysOfWeek.filter((d) => d !== day)
        : DAYS_OF_WEEK.filter((d) => [...r.daysOfWeek, day].includes(d)),
    }));
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!newRoute.code.trim() || !selectedDivision) return;
    setAddingRoute(true);
    setAddRouteError("");
    try {
      const routeData = await apiPost("/api/routes", {
        division: selectedDivision._id,
        code: newRoute.code.trim(),
      });
      await apiPost("/api/run-cuts", {
        division: selectedDivision._id,
        route: routeData.route._id,
        operatorName: newRoute.operatorName,
        vehicleCode: newRoute.vehicleCode,
        pulloutAddress: newRoute.pulloutAddress,
        startTime: newRoute.startTime || null,
        endTime: newRoute.endTime || null,
        daysOfWeek: newRoute.daysOfWeek,
        status: "active",
      });
      setNewRoute(emptyNewRoute);
      setShowAddRoute(false);
      load();
    } catch (err) {
      setAddRouteError(err.message);
    } finally {
      setAddingRoute(false);
    }
  };

  return (
    <div>
      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {isAllDivisions && (
        <p className="mb-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Showing routes across every division you have access to. Pick a specific division to add a new route.
        </p>
      )}

      {!isAllDivisions && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAddRoute((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {showAddRoute ? "Cancel" : "+ Add Route"}
          </button>
        </div>
      )}

      {!isAllDivisions && showAddRoute && (
        <form
          onSubmit={handleAddRoute}
          className="mb-4 rounded-xl border border-slate-200 bg-white p-4"
        >
          {addRouteError && (
            <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{addRouteError}</p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-600">
              Route code
              <input
                value={newRoute.code}
                onChange={(e) => setNewRoute({ ...newRoute, code: e.target.value })}
                required
                className="mt-1 block w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            <label className="text-sm text-slate-600">
              Operator
              <input
                list="rct-operators"
                value={newRoute.operatorName}
                onChange={(e) => setNewRoute({ ...newRoute, operatorName: e.target.value })}
                placeholder="Type a name…"
                className="mt-1 block w-44 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Vehicle
              <input
                list="rct-vehicles"
                value={newRoute.vehicleCode}
                onChange={(e) => setNewRoute({ ...newRoute, vehicleCode: e.target.value })}
                placeholder="Type a code…"
                className="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Pullout address
              <input
                value={newRoute.pulloutAddress}
                onChange={(e) => setNewRoute({ ...newRoute, pulloutAddress: e.target.value })}
                className="mt-1 block w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              Start
              <input
                type="time"
                value={newRoute.startTime}
                onChange={(e) => setNewRoute({ ...newRoute, startTime: e.target.value })}
                className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-sm text-slate-600">
              End
              <input
                type="time"
                value={newRoute.endTime}
                onChange={(e) => setNewRoute({ ...newRoute, endTime: e.target.value })}
                className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <div className="text-sm text-slate-600">
              Days
              <div className="mt-1 flex gap-0.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleNewRouteDay(day)}
                    title={day}
                    className={`h-7 w-7 rounded text-[10px] font-medium transition-colors ${
                      newRoute.daysOfWeek.includes(day)
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={addingRoute}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {addingRoute ? "Adding…" : "Add route"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <RunCutDayTable
          rows={rows}
          savingId={savingId}
          onPatch={handlePatch}
          emptyMessage="No routes set up for this division yet."
          showDisruptionAndNotes={false}
          editableAssignment
          operators={operators}
          vehicles={vehicles}
          showDivisionColumn={isAllDivisions}
        />
      )}
    </div>
  );
};

export default RunCutsTable;
