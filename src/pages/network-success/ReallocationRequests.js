import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../api/client";
import {
  assignmentSummary,
  formatDateTime,
  formatEffectiveDate,
  formatRequestPerson,
  REALLOCATION_UPDATED_EVENT,
  ReallocationAuditTrail,
  requestRouteLabel,
  statusClasses,
  statusLabel,
} from "../reallocationUi";

const dateInTimezone = (timezone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const ReallocationRequests = () => {
  const [divisions, setDivisions] = useState([]);
  const [divisionId, setDivisionId] = useState("");
  const [runCuts, setRunCuts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    runCut: "",
    destinationRunCut: "",
    operatorName: "",
    vehicleCode: "",
    pulloutAddress: "",
    effectiveDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [acceptanceNotice, setAcceptanceNotice] = useState("");

  const receiveRequests = (nextRequests, currentDivisionId) => {
    setRequests(nextRequests);
    const newlyAccepted = nextRequests.filter((request) => request.networkUnread);
    if (newlyAccepted.length) {
      setAcceptanceNotice(
        `${newlyAccepted.length} reallocation request${newlyAccepted.length === 1 ? " has" : "s have"} been accepted by Deployment.`
      );
      apiPost("/api/reallocation-requests/acknowledge", { division: currentDivisionId })
        .then(() => window.dispatchEvent(new Event(REALLOCATION_UPDATED_EVENT)))
        .catch(() => {});
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet("/api/divisions"),
      apiGet("/api/operators"),
      apiGet("/api/reallocation-requests/notifications"),
    ])
      .then(([divisionData, operatorData, notificationData]) => {
        if (cancelled) return;
        const available = divisionData.divisions || [];
        setDivisions(available);
        setOperators(operatorData.operators || []);
        if (available.length) {
          const selected = available.find((division) => notificationData.byDivision?.[division._id]) || available[0];
          setDivisionId(selected._id);
          setForm((current) => ({
            ...current,
            effectiveDate: dateInTimezone(selected.timezone),
          }));
        }
      })
      .catch((err) => setError(err.message));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!divisionId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      apiGet(`/api/run-cuts?division=${divisionId}`),
      apiGet(`/api/vehicles?division=${divisionId}`),
      apiGet(`/api/reallocation-requests?division=${divisionId}`),
    ])
      .then(([runCutData, vehicleData, requestData]) => {
        if (cancelled) return;
        setRunCuts(runCutData.runCuts || []);
        setVehicles(vehicleData.vehicles || []);
        receiveRequests(requestData.requests || [], divisionId);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [divisionId]);

  useEffect(() => {
    if (!divisionId) return undefined;
    let cancelled = false;
    const refreshRequests = () => {
      apiGet(`/api/reallocation-requests?division=${divisionId}`)
        .then((data) => {
          if (!cancelled) receiveRequests(data.requests || [], divisionId);
        })
        .catch(() => {});
    };
    const interval = window.setInterval(refreshRequests, 30_000);
    window.addEventListener("focus", refreshRequests);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshRequests);
    };
  }, [divisionId]);

  const selectedDivision = divisions.find((division) => division._id === divisionId);
  const selectedRunCut = runCuts.find((runCut) => runCut._id === form.runCut);
  const divisionOperators = operators.filter(
    (operator) =>
      operator.active !== false &&
      String(operator.division?._id || operator.division || "") === String(divisionId)
  );
  const clearingCurrentAssignment = Boolean(
    form.runCut && !form.destinationRunCut && !form.operatorName.trim()
  );
  const sortedRunCuts = useMemo(
    () => [...runCuts].sort((a, b) => String(a.route?.code || "").localeCompare(String(b.route?.code || ""), undefined, { numeric: true })),
    [runCuts]
  );
  const unassignedDestinationRunCuts = useMemo(
    () => sortedRunCuts.filter(
      (runCut) => runCut._id !== form.runCut && runCut.status === "unassigned" && !runCut.operator
    ),
    [sortedRunCuts, form.runCut]
  );

  const selectDivision = (nextDivisionId) => {
    const division = divisions.find((item) => item._id === nextDivisionId);
    setDivisionId(nextDivisionId);
    setForm({
      runCut: "",
      destinationRunCut: "",
      operatorName: "",
      vehicleCode: "",
      pulloutAddress: "",
      effectiveDate: dateInTimezone(division?.timezone),
    });
    setSuccess("");
  };

  const selectRunCut = (runCutId) => {
    setForm((current) => ({
      ...current,
      runCut: runCutId,
      destinationRunCut: "",
      // A blank operator is intentional: this workflow normally starts when
      // the current operator leaves. Entering a name reallocates instead.
      operatorName: "",
      vehicleCode: "",
      pulloutAddress: "",
    }));
  };

  const changeOperator = (operatorName) => {
    const selectedOperator = divisionOperators.find((operator) => operator.name === operatorName);
    setForm((current) => {
      const wasClearing = !current.destinationRunCut && !current.operatorName.trim();
      const nowClearing = !current.destinationRunCut && !operatorName.trim();
      return {
        ...current,
        operatorName,
        vehicleCode: nowClearing
          ? ""
          : wasClearing
            ? selectedRunCut?.vehicle?.code || ""
            : current.vehicleCode,
        pulloutAddress: nowClearing ? "" : selectedOperator?.pulloutAddress || "",
      };
    });
  };

  const selectDestination = (destinationRunCut) => {
    setForm((current) => ({
      ...current,
      destinationRunCut,
      vehicleCode: destinationRunCut || current.operatorName.trim() ? selectedRunCut?.vehicle?.code || "" : "",
      pulloutAddress: destinationRunCut || current.operatorName.trim() ? selectedRunCut?.pulloutAddress || "" : "",
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiPost("/api/reallocation-requests", { division: divisionId, ...form });
      setRequests((current) => [data.request, ...current]);
      setForm({
        runCut: "",
        destinationRunCut: "",
        operatorName: "",
        vehicleCode: "",
        pulloutAddress: "",
        effectiveDate: dateInTimezone(selectedDivision?.timezone),
      });
      setSuccess("Request submitted to Deployment for approval.");
      window.dispatchEvent(new Event(REALLOCATION_UPDATED_EVENT));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Reallocation Request</h2>
        <p className="mt-1 text-sm text-slate-500">
          Submit a route assignment change to Deployment. Nothing changes in Master Run Cuts until Deployment accepts it.
        </p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      {acceptanceNotice && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <span>{acceptanceNotice}</span>
          <button type="button" onClick={() => setAcceptanceNotice("")} className="font-medium text-emerald-700 hover:text-emerald-900">Dismiss</button>
        </div>
      )}

      <form onSubmit={submit} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Division
            <select
              value={divisionId}
              onChange={(event) => selectDivision(event.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            >
              {divisions.map((division) => <option key={division._id} value={division._id}>{division.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Current route number
            <select
              value={form.runCut}
              onChange={(event) => selectRunCut(event.target.value)}
              required
              disabled={loading || !divisionId}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100"
            >
              <option value="">Choose a route…</option>
              {sortedRunCuts.map((runCut) => <option key={runCut._id} value={runCut._id}>{runCut.route?.code}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Effective date
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Assign to different route <span className="font-normal text-slate-400">(optional)</span>
            <select
              value={form.destinationRunCut}
              onChange={(event) => selectDestination(event.target.value)}
              disabled={!form.runCut}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100"
            >
              <option value="">Keep this route</option>
              {unassignedDestinationRunCuts.map((runCut) => <option key={runCut._id} value={runCut._id}>{runCut.route?.code}</option>)}
            </select>
            {form.runCut && unassignedDestinationRunCuts.length === 0 && (
              <span className="mt-1 block text-xs font-normal text-slate-400">No unassigned destination routes are available.</span>
            )}
          </label>
          <label className="text-sm font-medium text-slate-700">
            New operator <span className="font-normal text-slate-400">(optional)</span>
            <select
              value={form.operatorName}
              onChange={(event) => changeOperator(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
            >
              <option value="">{form.destinationRunCut ? "Move current operator" : "Leave unassigned"}</option>
              {divisionOperators.map((operator) => <option key={operator._id} value={operator.name}>{operator.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Vehicle associated
            <select
              value={form.vehicleCode}
              onChange={(event) => setForm({ ...form, vehicleCode: event.target.value })}
              disabled={clearingCurrentAssignment}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal disabled:bg-slate-100"
            >
              <option value="">Unassigned</option>
              {vehicles.filter((vehicle) => vehicle.active !== false).map((vehicle) => <option key={vehicle._id} value={vehicle.code}>{vehicle.code}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Pullout address
            <input
              value={form.pulloutAddress}
              readOnly
              disabled={clearingCurrentAssignment}
              placeholder={clearingCurrentAssignment ? "Cleared when route is unassigned" : "Set by driver"}
              className="mt-1 block w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-normal disabled:bg-slate-100"
            />
          </label>
        </div>
        {selectedRunCut && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-800">Current assignment:</span>{" "}
            {selectedRunCut.operator?.name || "Unassigned"} · {selectedRunCut.vehicle?.code || "Unassigned"} · {selectedRunCut.pulloutAddress || "No pullout address"}
          </div>
        )}
        {form.destinationRunCut && (
          <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
            On approval, route {selectedRunCut?.route?.code} will be cleared and marked Unassigned, and its assignment will move to {runCuts.find((item) => item._id === form.destinationRunCut)?.route?.code}. If New operator is blank, the current operator moves with it.
          </p>
        )}
        {form.runCut && !form.destinationRunCut && !form.operatorName.trim() && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            On approval, route {selectedRunCut?.route?.code} will be marked Unassigned. Its operator, vehicle, and pullout address will be cleared; its start and end times will remain.
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !form.runCut}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>

      <h3 className="mb-3 text-lg font-semibold text-slate-900">Request History</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Submitted', 'Route', 'Assignment change', 'Effective', 'Status', 'Submitted by', 'Accepted by'].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && requests.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No reallocation requests yet.</td></tr>}
            {requests.map((request) => (
              <tr key={request._id}>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDateTime(request.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">{requestRouteLabel(request)}</td>
                <td className="min-w-80 px-3 py-3 text-slate-600">
                  <div className="text-xs text-slate-400">{assignmentSummary(request, "original")}</div>
                  {request.destinationRouteCode && <div className="text-xs text-slate-400">{assignmentSummary(request, "destinationOriginal")}</div>}
                  <div className="mt-1">{assignmentSummary(request)}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatEffectiveDate(request.effectiveDate)}</td>
                <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(request.status)}`}>{statusLabel(request.status)}</span></td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatRequestPerson(request, "requested")}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatRequestPerson(request, "reviewed")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReallocationAuditTrail requests={requests.filter((request) => request.status !== "pending")} />
    </div>
  );
};

export default ReallocationRequests;
