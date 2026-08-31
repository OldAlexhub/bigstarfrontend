import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../api/client";
import { toISODate, todayInTimezone } from "../../utils/dates";
import { DISRUPTION_TYPES } from "../../config/disruptionTypes";

const inputClasses =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const emptyForm = (timezone) => ({
  date: toISODate(todayInTimezone(timezone)),
  route: "",
  operator: "",
  disruptionType: DISRUPTION_TYPES[0],
  notes: "",
});

const IssueLog = () => {
  const { selectedDivision } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeCodeFilter = searchParams.get("routeCode") || "";
  const [routes, setRoutes] = useState([]);
  const [operators, setOperators] = useState([]);
  const [runCuts, setRunCuts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm(selectedDivision?.timezone));

  // Pre-fill the log form's route once the routes list (and a matching
  // ?routeCode= from a cross-section link) are both available.
  useEffect(() => {
    if (!routeCodeFilter || !routes.length) return;
    const match = routes.find((r) => r.code === routeCodeFilter);
    if (match) {
      setForm((f) => (f.route ? f : { ...f, route: match._id, operator: operatorForRoute(match._id) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCodeFilter, routes, runCuts]);

  // Who's currently assigned to a route, per Master Run Cuts' live
  // assignment — used to suggest the operator once a route is picked,
  // instead of making the NSM look it up and re-enter it.
  const operatorForRoute = (routeId) => runCuts.find((rc) => rc.route?._id === routeId)?.operator?._id || "";

  const handleRouteChange = (routeId) => {
    setForm((f) => ({ ...f, route: routeId, operator: operatorForRoute(routeId) }));
  };

  const load = () => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    Promise.all([
      apiGet(`/api/routes?division=${selectedDivision._id}`),
      apiGet("/api/operators"),
      apiGet(`/api/daily-issues?division=${selectedDivision._id}`),
      apiGet(`/api/run-cuts?division=${selectedDivision._id}`),
    ])
      .then(([routesData, operatorsData, issuesData, runCutsData]) => {
        setRoutes(routesData.routes);
        setOperators(operatorsData.operators);
        setIssues(issuesData.issues);
        setRunCuts(runCutsData.runCuts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedDivision]);

  const filteredIssues = routeCodeFilter
    ? issues.filter((i) => i.route?.code === routeCodeFilter)
    : issues;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDivision) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        date: form.date,
        route: form.route || null,
        operator: form.operator || null,
        disruptionType: form.disruptionType,
        notes: form.notes,
      };
      if (editingId) {
        await apiPatch(`/api/daily-issues/${editingId}`, payload);
        setEditingId(null);
        setForm(emptyForm(selectedDivision?.timezone));
      } else {
        await apiPost("/api/daily-issues", { ...payload, division: selectedDivision._id });
        setForm((f) => ({ ...f, route: "", operator: "", notes: "" }));
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (issue) => {
    setEditingId(issue._id);
    setForm({
      date: toISODate(issue.date),
      route: issue.route?._id || "",
      operator: issue.operator?._id || "",
      disruptionType: issue.disruptionType,
      notes: issue.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm(selectedDivision?.timezone));
  };

  const handleDelete = async (issue) => {
    setError("");
    try {
      await apiDelete(`/api/daily-issues/${issue._id}`);
      if (editingId === issue._id) handleCancelEdit();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          {editingId ? "Edit issue" : "Log an issue"} — {selectedDivision.name}
        </h2>
        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-slate-600">
            Date
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`${inputClasses} mt-1 block w-full`}
            />
          </label>
          <label className="text-sm text-slate-600">
            Route (optional)
            <select
              value={form.route}
              onChange={(e) => handleRouteChange(e.target.value)}
              className={`${inputClasses} mt-1 block w-full`}
            >
              <option value="">—</option>
              {routes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.code}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Operator (optional)
            <select
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
              className={`${inputClasses} mt-1 block w-full`}
            >
              <option value="">—</option>
              {operators.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 sm:col-span-2 lg:col-span-1">
            Disruption type
            <select
              required
              value={form.disruptionType}
              onChange={(e) => setForm({ ...form, disruptionType: e.target.value })}
              className={`${inputClasses} mt-1 block w-full`}
            >
              {DISRUPTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 sm:col-span-2">
            Notes
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="What happened"
              className={`${inputClasses} mt-1 block w-full`}
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? "Saving…" : editingId ? "Update issue" : "Log issue"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {routeCodeFilter && (
        <p className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          Filtered to route <span className="font-medium text-slate-900">{routeCodeFilter}</span>
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="text-brand-600 hover:underline"
          >
            Clear filter
          </button>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Date", "Route", "Operator", "Disruption", "Notes", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filteredIssues.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No issues logged yet.
                </td>
              </tr>
            )}
            {filteredIssues.map((issue) => (
              <tr key={issue._id}>
                <td className="px-3 py-2 text-slate-600">{toISODate(issue.date)}</td>
                <td className="px-3 py-2 text-slate-600">{issue.route?.code || "—"}</td>
                <td className="px-3 py-2 text-slate-600">{issue.operator?.name || "—"}</td>
                <td className="px-3 py-2 text-slate-900">{issue.disruptionType}</td>
                <td className="px-3 py-2 text-slate-600">{issue.notes || "—"}</td>
                <td className="px-3 py-2">
                  {issue.autoSyncTag ? (
                    <span className="text-xs text-slate-400" title="Auto-synced from the route's live status — change it from Deployment's Live Schedule instead.">
                      (auto)
                    </span>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(issue)}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(issue)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IssueLog;
