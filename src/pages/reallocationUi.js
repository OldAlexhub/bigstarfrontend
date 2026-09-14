export const REALLOCATION_UPDATED_EVENT = "bigstar:reallocation-updated";

export const formatRequestPerson = (request, kind) => {
  const populated = request[`${kind}By`];
  const name = populated?.name || request[`${kind}ByName`] || "";
  const username = populated?.username || request[`${kind}ByUsername`] || "";
  if (name && username) return `${name} (${username})`;
  return name || username || "—";
};

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "—");

export const formatEffectiveDate = (value) => String(value || "").slice(0, 10) || "—";

export const assignmentSummary = (request, prefix = "requested") => {
  const title = {
    original: "Current",
    destinationOriginal: "Destination currently",
    requested: "Requested",
  }[prefix] || prefix;
  const operator =
    request[`${prefix}OperatorName`] ||
    (prefix === "requested" && request.destinationRouteCode ? request.originalOperatorName : "") ||
    "Unassigned";
  const vehicle = request[`${prefix}VehicleCode`] || "Unassigned";
  const address = request[`${prefix}PulloutAddress`] || "No pullout address";
  return `${title}: ${operator} · ${vehicle} · ${address}`;
};

export const statusLabel = (status) => ({
  pending: "Pending Deployment",
  approved: "Approved — Scheduled",
  applied: "Applied",
}[status] || status);

export const statusClasses = (status) => ({
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  applied: "bg-emerald-100 text-emerald-800",
}[status] || "bg-slate-100 text-slate-700");

export const requestRouteLabel = (request) =>
  request.destinationRouteCode
    ? `${request.routeCode} → ${request.destinationRouteCode}`
    : request.routeCode;

export const ReallocationAuditTrail = ({ requests }) => (
  <div className="mt-3 space-y-2">
    {requests.map((request) => (
      <div key={`${request._id}-audit`} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-900">Route {requestRouteLabel(request)}</span>: submitted by {formatRequestPerson(request, "requested")} on {formatDateTime(request.createdAt)}; accepted by {formatRequestPerson(request, "reviewed")} on {formatDateTime(request.reviewedAt)}{request.appliedAt ? `; applied ${formatDateTime(request.appliedAt)}` : `; scheduled for ${formatEffectiveDate(request.effectiveDate)}`}.
      </div>
    ))}
  </div>
);
