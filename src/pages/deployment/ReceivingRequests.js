import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet, apiPost } from "../../api/client";
import ConfirmActionDialog from "../../components/ConfirmActionDialog";
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

const ReceivingRequests = () => {
  const { selectedDivision } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState("");
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalError, setApprovalError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(`/api/reallocation-requests?division=${selectedDivision._id}`)
      .then((data) => setRequests(data.requests || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision]);

  useEffect(load, [load]);

  const pending = useMemo(() => requests.filter((request) => request.status === "pending"), [requests]);
  const history = useMemo(() => requests.filter((request) => request.status !== "pending"), [requests]);

  const accept = async () => {
    const request = approvalTarget;
    if (!request) return;
    setAcceptingId(request._id);
    setError("");
    setApprovalError("");
    setSuccess("");
    try {
      const data = await apiPost(`/api/reallocation-requests/${request._id}/accept`, {});
      setRequests((current) => current.map((item) => item._id === request._id ? data.request : item));
      setSuccess(data.message);
      setApprovalTarget(null);
      window.dispatchEvent(new Event(REALLOCATION_UPDATED_EVENT));
    } catch (err) {
      setApprovalError(err.message);
    } finally {
      setAcceptingId("");
    }
  };

  const RequestTable = ({ rows, pendingTable = false }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {['Requested', 'Division', 'Route', 'Assignment change', 'Effective date', 'Requested by', 'Status'].map((heading) => (
              <th key={heading} className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">{heading}</th>
            ))}
            {pendingTable && <th className="px-3 py-2 text-right font-medium text-slate-500">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr><td colSpan={pendingTable ? 8 : 7} className="px-3 py-6 text-center text-slate-400">{pendingTable ? "No requests waiting for approval." : "No accepted requests yet."}</td></tr>
          )}
          {rows.map((request) => (
            <tr key={request._id}>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDateTime(request.createdAt)}</td>
              <td className="whitespace-nowrap px-3 py-3">
                <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                  {request.division ? requestDivisionLabel(request) : selectedDivision.name}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">{requestRouteLabel(request)}</td>
              <td className="min-w-80 px-3 py-3 text-slate-600">
                <div className="text-xs text-slate-400">{assignmentSummary(request, "original")}</div>
                {request.destinationRouteCode && <div className="text-xs text-slate-400">{assignmentSummary(request, "destinationOriginal")}</div>}
                <div className="mt-1">{assignmentSummary(request)}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatEffectiveDate(request.effectiveDate)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                {formatRequestPerson(request, "requested")}
                <div className="mt-0.5 text-xs text-slate-400">{formatDateTime(request.createdAt)}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(request.status)}`}>{statusLabel(request.status)}</span>
                {request.applicationError && <p className="mt-2 max-w-64 whitespace-normal text-xs text-red-600">{request.applicationError}</p>}
              </td>
              {pendingTable && (
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalError("");
                      setApprovalTarget(request);
                    }}
                    disabled={acceptingId === request._id}
                    className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {acceptingId === request._id ? "Accepting…" : "Accept"}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Receiving Requests</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review Network Success reallocation requests for {selectedDivision.name}. Accepted changes apply on their effective date.
        </p>
      </div>
      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
      {loading ? <p className="text-sm text-slate-500">Loading requests…</p> : (
        <>
          <div className="mb-8">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
              Awaiting approval
              {pending.length > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">{pending.length}</span>}
            </h3>
            <RequestTable rows={pending} pendingTable />
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Transaction History</h3>
            <RequestTable rows={history} />
            <ReallocationAuditTrail requests={history} />
          </div>
        </>
      )}
      <ConfirmActionDialog
        open={Boolean(approvalTarget)}
        title="Accept reallocation request?"
        context={approvalTarget ? `Route ${requestRouteLabel(approvalTarget)} · Effective ${formatEffectiveDate(approvalTarget.effectiveDate)}` : ""}
        description="Acceptance authorizes this Master Run Cut change. It will apply now if the effective date has arrived, or be scheduled for that date."
        busy={Boolean(approvalTarget && acceptingId === approvalTarget._id)}
        error={approvalError}
        confirmLabel="Accept request"
        busyLabel="Accepting…"
        onCancel={() => {
          setApprovalTarget(null);
          setApprovalError("");
        }}
        onConfirm={accept}
      />
    </div>
  );
};

export default ReceivingRequests;
