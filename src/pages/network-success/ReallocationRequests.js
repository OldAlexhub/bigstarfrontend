import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../api/client";
import { toISODate, todayInTimezone } from "../../utils/dates";
import {
  assignmentSummary,
  formatDateTime,
  formatEffectiveDate,
  formatRequestPerson,
  REALLOCATION_UPDATED_EVENT,
  ReallocationAuditTrail,
  requestDivisionLabel,
  requestRouteLabel,
  statusClasses,
  statusLabel,
} from "../reallocationUi";

const emptyForm = (timezone) => ({
  runCut: "",
  destinationRunCut: "",
  operatorName: "",
  vehicleCode: "",
  pulloutAddress: "",
  effectiveDate: toISODate(todayInTimezone(timezone)),
});

const ReallocationRequests = () => {
  const [divisions, setDivisions] = useState([]);
  const [divisionId, setDivisionId] = useState("");
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [runCuts, setRunCuts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(() => emptyForm());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet("/api/divisions"),
      apiGet("/api/reallocation-requests/notifications").catch(() => ({ byDivision: {} })),
    ])
      .then(([divisionData, notificationData]) => {
        if (cancelled) return;
        const availableDivisions = divisionData.divisions || [];
        setDivisions(availableDivisions);
        if (availableDivisions.length) {
          const divisionWithUpdate = availableDivisions.find(
            (division) => (notificationData.byDivision?.[division._id] || 0) > 0
          );
          setDivisionId((divisionWithUpdate || availableDivisions[0])._id);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedDivision = divisions.find((division) => division._id === divisionId);

  useEffect(() => {
    if (!divisionId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      apiGet(`/api/run-cuts?division=${divisionId}`),
      apiGet(`/api/operators?division=${divisionId}&active=1`),
      apiGet(`/api/vehicles?division=${divisionId}&active=1`),
      apiGet(`/api/reallocation-requests?division=${divisionId}`),
    ])
      .then(async ([runCutData, operatorData, vehicleData, requestData]) => {
        if (cancelled) return;
        const nextRequests = requestData.requests || [];
        setRunCuts(runCutData.runCuts || []);
        setOperators(operatorData.operators || []);
        setVehicles(vehicleData.vehicles || []);
        setRequests(nextRequests);
        setForm(emptyForm(selectedDivision?.timezone));

        if (nextRequests.some((request) => request.networkUnread)) {
          await apiPost("/api/reallocation-requests/acknowledge", { division: divisionId });
          if (!cancelled) {
            setRequests((current) => current.map((request) => (
              request.networkUnread ? { ...request, networkUnread: false } : request
            )));
          }
          window.dispatchEvent(new Event(REALLOCATION_UPDATED_EVENT));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [divisionId, selectedDivision?.timezone]);

  const divisionOperators = useMemo(
    () => operators.filter((operator) => operator.active !== false),
    [divisionId, operators]
  );
  const divisionVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.active !== false),
    [vehicles]
  );
  const selectedRunCut = runCuts.find((runCut) => runCut._id === form.runCut);
  const selectedDestination = runCuts.find((runCut) => runCut._id === form.destinationRunCut);
  const destinationOptions = runCuts.filter(
    (runCut) =>
      runCut._id !== form.runCut &&
      runCut.status === "unassigned" &&
      !runCut.operator
  );

  const chooseRunCut = (runCutId) => {
    setSuccess("");
    setForm((current) => ({
      ...current,
      runCut: runCutId,
      destinationRunCut: "",
      operatorName: "",
      vehicleCode: "",
      pulloutAddress: "",
    }));
  };

  const chooseDestination = (destinationRunCut) => {
    setForm((current) => ({
      ...current,
      destinationRunCut,
      operatorName: "",
      vehicleCode: destinationRunCut ? selectedRunCut?.vehicle?.code || "" : "",
      pulloutAddress: destinationRunCut ? selectedRunCut?.pulloutAddress || "" : "",
    }));
  };

  const setOperator = (operatorName) => {
    const matched = divisionOperators.find(
      (operator) => operator.name === operatorName
    );
    setForm((current) => ({
      ...current,
      destinationRunCut: "",
      operatorName: matched?.name || "",
      vehicleCode: matched
        ? current.vehicleCode || (
            divisionVehicles.some((vehicle) => vehicle.code === selectedRunCut?.vehicle?.code)
              ? selectedRunCut.vehicle.code
              : ""
          )
        : "",
      pulloutAddress: matched?.pulloutAddress || "",
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!divisionId || !form.runCut) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiPost("/api/reallocation-requests", {
        division: divisionId,
        runCut: form.runCut,
        destinationRunCut: form.destinationRunCut || null,
        operatorName: form.operatorName.trim(),
        vehicleCode: form.vehicleCode.trim(),
        pulloutAddress: form.pulloutAddress.trim(),
        effectiveDate: form.effectiveDate,
      });
      setRequests((current) => [data.request, ...current]);
      setSuccess(`Request submitted for route ${selectedRunCut?.route?.code || ""}.`);
      setForm(emptyForm(selectedDivision?.timezone));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const assignmentFieldsEnabled = Boolean(form.operatorName || form.destinationRunCut);
  const pending = requests.filter((request) => request.status === "pending");
  const completed = requests.filter((request) => request.status !== "pending");

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Reallocation Requests</h2>
          <p className="mt-1 text-sm text-slate-500">
            Send assignment changes to Deployment for approval without changing the Master Run Cut directly.
          </p>
        </div>
        <label className="text-sm text-slate-600">
          Division
          <select
            value={divisionId}
            onChange={(event) => setDivisionId(event.target.value)}
            className="mt-1 block min-w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {divisions.map((division) => (
              <option key={division._id} value={division._id}>{division.name}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Request an assignment change</h3>
        <p className="mt-1 text-xs text-slate-500">
          Leave the new operator blank to clear the current assignment, or choose an unassigned route to move the current assignment intact.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm text-slate-600">
            Current route number
            <select
              aria-label="Current route number"
              required
              value={form.runCut}
              onChange={(event) => chooseRunCut(event.target.value)}
              disabled={loading}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">Choose route</option>
              {runCuts.map((runCut) => (
                <option key={runCut._id} value={runCut._id}>{runCut.route?.code}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Assign to different route (optional)
            <select
              aria-label="Assign to different route (optional)"
              value={form.destinationRunCut}
              onChange={(event) => chooseDestination(event.target.value)}
              disabled={!selectedRunCut}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">Keep assignment on current route</option>
              {destinationOptions.map((runCut) => (
                <option key={runCut._id} value={runCut._id}>{runCut.route?.code}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Effective date
            <input
              type="date"
              required
              value={form.effectiveDate}
              onChange={(event) => setForm((current) => ({ ...current, effectiveDate: event.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-600">
            New operator (leave blank to unassign)
            <select
              aria-label="New operator (leave blank to unassign)"
              value={form.operatorName}
              onChange={(event) => setOperator(event.target.value)}
              disabled={!selectedRunCut || Boolean(form.destinationRunCut)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">Unassign current operator</option>
              {divisionOperators.map((operator) => <option key={operator._id} value={operator.name}>{operator.name}</option>)}
            </select>
            <span className="mt-1 block text-xs text-slate-400">Active drivers from this division's Master Run Cuts roster.</span>
          </label>

          <label className="text-sm text-slate-600">
            Vehicle associated
            <select
              aria-label="Vehicle associated"
              value={form.vehicleCode}
              onChange={(event) => setForm((current) => ({ ...current, vehicleCode: event.target.value }))}
              disabled={!assignmentFieldsEnabled}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="">No vehicle</option>
              {divisionVehicles.map((vehicle) => (
                <option key={vehicle._id} value={vehicle.code}>{vehicle.code}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Pullout address
            <input
              aria-label="Pullout address"
              value={form.pulloutAddress}
              readOnly
              disabled={!assignmentFieldsEnabled}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm disabled:bg-slate-100"
            />
            <span className="mt-1 block text-xs text-slate-400">Automatically supplied by the selected driver's roster record.</span>
          </label>
        </div>

        {selectedRunCut && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p>
              Current assignment: {selectedRunCut.operator?.name || "Unassigned"} · {selectedRunCut.vehicle?.code || "No vehicle"} · {selectedRunCut.pulloutAddress || "No pullout address"}
            </p>
            {selectedDestination ? (
              <p className="mt-1 font-medium text-slate-800">
                Route {selectedRunCut.route?.code} will be cleared and marked Unassigned, and its assignment will move to {selectedDestination.route?.code}.
              </p>
            ) : !form.operatorName ? (
              <p className="mt-1 font-medium text-slate-800">
                Route {selectedRunCut.route?.code} will be marked Unassigned. Its start and end times will remain unchanged.
              </p>
            ) : (
              <p className="mt-1 font-medium text-slate-800">
                Route {selectedRunCut.route?.code} will receive the replacement assignment shown above.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={!form.runCut || submitting}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Request history</h3>
          <p className="mt-0.5 text-xs text-slate-500">{pending.length} pending · {completed.length} accepted or applied</p>
        </div>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Requested", "Division", "Route", "Assignment change", "Effective date", "Requested by", "Status"].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && requests.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No reallocation requests for this division.</td></tr>
            )}
            {requests.map((request) => (
              <tr key={request._id}>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDateTime(request.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{request.division ? requestDivisionLabel(request) : selectedDivision?.name}</td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">{requestRouteLabel(request)}</td>
                <td className="min-w-72 px-3 py-3 text-slate-600">
                  <div className="text-xs text-slate-400">{assignmentSummary(request, "original")}</div>
                  <div className="mt-1">{assignmentSummary(request)}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatEffectiveDate(request.effectiveDate)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatRequestPerson(request, "requested")}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(request.status)}`}>{statusLabel(request.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReallocationAuditTrail requests={completed} />
    </div>
  );
};

export default ReallocationRequests;
