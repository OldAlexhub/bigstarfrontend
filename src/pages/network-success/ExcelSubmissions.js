import { Fragment, useEffect, useMemo, useState } from "react";
import { apiDelete, apiFormPost, apiGet, apiPost } from "../../api/client";

const STEPS = ["Upload", "Match", "Review & Save"];
const sources = {
  vision: {
    label: "Vision",
    description: "Paratransit Operations report",
    files: [{ key: "vision", label: "Paratransit Operations", hint: "One .xls or .xlsx file" }],
  },
  ecolane: {
    label: "Ecolane",
    description: "Productivity plus driver performance",
    files: [
      { key: "productivity", label: "Daily Run Productivity", hint: "Required" },
      { key: "driverPerformance", label: "Driver Performance", hint: "Required" },
    ],
  },
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—");
const metric = (value, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : "—");
const severityStyle = {
  blocker: "bg-red-50 text-red-700 ring-red-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  clean: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};
const severityLabel = { blocker: "Needs action", warning: "Review", clean: "Matched" };

const Stepper = ({ current }) => (
  <ol aria-label="Submission progress" className="mb-7 grid grid-cols-3 gap-2">
    {STEPS.map((step, index) => {
      const number = index + 1;
      const active = number === current;
      const done = number < current;
      return (
        <li key={step} aria-current={active ? "step" : undefined} className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              active ? "bg-brand-500 text-white" : done ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {done ? "✓" : number}
          </span>
          <span className={`hidden text-sm font-medium sm:block ${active ? "text-slate-900" : "text-slate-500"}`}>{step}</span>
          {number < STEPS.length && <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);

const FilePicker = ({ definition, file, onChange }) => (
  <label className="group flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-brand-400 hover:bg-brand-50/40">
    <span className="min-w-0">
      <span className="block text-sm font-medium text-slate-800">{definition.label}</span>
      <span className={`block truncate text-xs ${file ? "text-brand-700" : "text-slate-500"}`}>
        {file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : definition.hint}
      </span>
    </span>
    <span className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 group-hover:border-brand-300">
      {file ? "Replace" : "Choose file"}
    </span>
    <input
      className="sr-only"
      type="file"
      accept=".xls,.xlsx"
      onChange={(event) => onChange(event.target.files?.[0] || null)}
    />
  </label>
);

const SummaryStrip = ({ items }) => (
  <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5">
    {items.map((item) => (
      <div key={item.label} className="bg-white px-4 py-3">
        <p className="text-xs font-medium text-slate-500">{item.label}</p>
        <p className={`mt-1 text-xl font-semibold ${item.tone || "text-slate-900"}`}>{item.value}</p>
      </div>
    ))}
  </div>
);

const RowDetails = ({ row }) => {
  const provenance = row.deployment?.provenance || {};
  return (
    <div className="grid gap-5 bg-slate-50 px-4 py-4 text-sm md:grid-cols-3">
      <div>
        <p className="font-medium text-slate-800">Uploaded metrics</p>
        <dl className="mt-2 space-y-1 text-slate-600">
          <div className="flex justify-between gap-4"><dt>Service hours</dt><dd>{metric(row.reportedServiceHours)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Revenue hours</dt><dd>{metric(row.reportedRevenueHours)}</dd></div>
          <div className="flex justify-between gap-4"><dt>TPSH</dt><dd>{metric(row.tpsh)}</dd></div>
          <div className="flex justify-between gap-4"><dt>OTP</dt><dd>{pct(row.otpPct)}</dd></div>
        </dl>
      </div>
      <div>
        <p className="font-medium text-slate-800">Deployment snapshot</p>
        <dl className="mt-2 space-y-1 text-slate-600">
          <div className="flex justify-between gap-4"><dt>Scheduled service</dt><dd>{metric(row.deployment?.scheduledServiceHours)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Scheduled revenue</dt><dd>{metric(row.deployment?.scheduledRevenueHours)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Late to First</dt><dd>{row.deployment?.lateToFirst ?? "—"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Late Deploy</dt><dd>{row.deployment?.lateDeploy ?? "—"}</dd></div>
          <div className="flex justify-between gap-4"><dt>Status</dt><dd>{row.deployment?.status || "—"}</dd></div>
        </dl>
      </div>
      <div>
        <p className="font-medium text-slate-800">Match & provenance</p>
        <p className="mt-2 text-slate-600">{row.matchReason}</p>
        <p className="mt-2 text-xs text-slate-500">
          Metrics: uploaded · Operator: {provenance.operator || "unavailable"} · Late events: {provenance.lateEvents || "unavailable"}
        </p>
        {row.sourceFields && (
          <p className="mt-1 text-xs text-slate-500">Source fields: {Object.values(row.sourceFields).join(" · ")}</p>
        )}
        {row.deployment?.warning && <p className="mt-2 text-xs font-medium text-amber-700">{row.deployment.warning}</p>}
        {row.deployment?.assignmentWarning && <p className="mt-2 text-xs text-slate-500">{row.deployment.assignmentWarning}</p>}
        {row.deploymentConflict && <p className="mt-2 text-xs font-medium text-red-700">Uploaded zero-trip activity conflicts with Deployment showing the route active.</p>}
      </div>
    </div>
  );
};

const MatchRow = ({ row, routes, resolution, setResolution, expanded, setExpanded, dateExcluded }) => {
  const selectedRoute = resolution?.routeId ?? row.matchedRouteId ?? "";
  const excluded = Boolean(resolution?.exclude || dateExcluded);
  return (
    <div className={`border-b border-slate-100 last:border-0 ${excluded ? "opacity-55" : ""}`}>
      <div className="grid items-center gap-3 px-4 py-3 text-sm lg:grid-cols-[100px_110px_minmax(90px,.8fr)_minmax(150px,1.25fr)_minmax(140px,1.2fr)_70px_minmax(140px,1.1fr)_36px]">
        <div>
          <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${severityStyle[row.severity]}`}>
            {severityLabel[row.severity]}
          </span>
        </div>
        <div className="text-slate-600">{formatDate(row.date)}</div>
        <div className="font-medium text-slate-900">{row.sourceRoute}</div>
        <div>
          <select
            aria-label={`Matched route for ${row.sourceRoute} on ${row.date}`}
            value={selectedRoute}
            disabled={dateExcluded}
            onChange={(event) => setResolution(row.id, { routeId: event.target.value, exclude: false })}
            className={`w-full rounded-md border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              selectedRoute ? "border-slate-300 bg-white" : "border-red-300 bg-red-50"
            }`}
          >
            <option value="">Choose route…</option>
            {row.suggestions?.length > 0 && (
              <optgroup label="Suggestions">
                {row.suggestions.map((route) => <option key={`suggested-${route.id}`} value={route.id}>{route.code}</option>)}
              </optgroup>
            )}
            <optgroup label="All division routes">
              {routes.map((route) => <option key={route.id} value={route.id}>{route.code}</option>)}
            </optgroup>
          </select>
          <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={excluded}
              disabled={dateExcluded}
              onChange={(event) => setResolution(row.id, { routeId: selectedRoute, exclude: event.target.checked })}
            />
            Exclude row
          </label>
        </div>
        <div className="min-w-0 text-slate-600">
          <p className="truncate">{row.operatorName || "Operator unavailable"}</p>
          <p className="truncate text-xs text-slate-400">{row.providerName || "Provider unavailable"}</p>
        </div>
        <div className="font-medium text-slate-800">{row.completedTrips}</div>
        <div className="text-slate-600">{row.operationalOutcome}</div>
        <button
          type="button"
          aria-label={`${expanded ? "Hide" : "Show"} details for ${row.sourceRoute} on ${row.date}`}
          aria-expanded={expanded}
          onClick={() => setExpanded(expanded ? null : row.id)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          {expanded ? "−" : "+"}
        </button>
      </div>
      {expanded && <RowDetails row={row} />}
    </div>
  );
};

const RemoveSubmissionDialog = ({ item, busy, error, onCancel, onConfirm }) => {
  if (!item) return null;
  const confirmed = item.status === "confirmed";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4" role="presentation" onMouseDown={() => { if (!busy) onCancel(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-submission-title"
        aria-describedby="remove-submission-description"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-lg font-semibold text-red-600">!</div>
        <h2 id="remove-submission-title" className="mt-4 text-lg font-semibold text-slate-900">Remove this submission?</h2>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium capitalize text-slate-700">{item.source}</span>
          {item.division ? ` · ${item.division.code} · ${item.division.name}` : " · Division not confirmed"}
        </p>
        <p id="remove-submission-description" className="mt-4 text-sm leading-6 text-slate-600">
          {confirmed
            ? "Its active Network Success records will also be removed from Performance and ELT Reporting. The audit will remain, and you can upload corrected files afterward."
            : "This unfinished submission will be discarded. You can upload the files again afterward."}
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus disabled={busy} onClick={onCancel} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {busy ? "Removing…" : "Remove submission"}
          </button>
        </div>
      </div>
    </div>
  );
};

const History = ({ submissions, onOpen, onRemove, openingId, removingId }) => (
  <section className="mt-8">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-900">Recent submissions</h2>
      <span className="text-xs text-slate-400">Latest 25</span>
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {submissions.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No submissions yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {submissions.map((item) => (
            <div key={item.id || item._id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[100px_1fr_180px_100px_auto] sm:items-center">
              <span className="font-medium capitalize text-slate-800">{item.source}</span>
              <span className="text-slate-600">{item.division ? `${item.division.code} · ${item.division.name}` : "Division not confirmed"}</span>
              <span className="text-slate-500">{new Date(item.confirmedAt || item.createdAt).toLocaleString()}</span>
              <span className={`justify-self-start rounded-full px-2 py-1 text-xs font-medium ${item.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {item.status}
              </span>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={Boolean(openingId || removingId)}
                  onClick={() => onOpen(item)}
                  className="text-xs font-medium text-brand-600 hover:underline disabled:opacity-50"
                >
                  {openingId === (item.id || item._id) ? "Opening…" : "Open"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(openingId || removingId)}
                  onClick={() => onRemove(item)}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                >
                  {removingId === (item.id || item._id) ? "Removing…" : "Remove"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

const ExcelSubmissions = () => {
  const [source, setSource] = useState("vision");
  const [files, setFiles] = useState({});
  const [step, setStep] = useState(1);
  const [submission, setSubmission] = useState(null);
  const [division, setDivision] = useState("");
  const [preview, setPreview] = useState(null);
  const [resolutions, setResolutions] = useState({});
  const [excludedDates, setExcludedDates] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState([]);
  const [success, setSuccess] = useState(null);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removalError, setRemovalError] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadHistory = () => apiGet("/api/network-success/submissions").then((data) => setHistory(data.submissions || [])).catch(() => {});
  useEffect(() => { loadHistory(); }, []);
  useEffect(() => {
    if (!pendingRemoval) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !removingId) setPendingRemoval(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [pendingRemoval, removingId]);

  const requiredFilesReady = sources[source].files.every((file) => files[file.key]);
  const setFile = (key, file) => {
    setError("");
    if (file && (!/\.xlsx?$/i.test(file.name) || file.size > 10 * 1024 * 1024)) {
      setError("Each file must be an .xls or .xlsx workbook no larger than 10 MB.");
      return;
    }
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const preprocess = async () => {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("source", source);
      for (const definition of sources[source].files) form.append(definition.key, files[definition.key]);
      const data = await apiFormPost("/api/network-success/submissions/preprocess", form);
      setSubmission(data.submission);
      setDivision(data.submission.divisionCandidates?.[0]?.division || "");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const match = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await apiPost(`/api/network-success/submissions/${submission.id}/preview`, { division });
      setSubmission(data.submission);
      setPreview(data);
      setResolutions({});
      setExcludedDates([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setResolution = (rowId, resolution) => setResolutions((current) => ({ ...current, [rowId]: resolution }));
  const toggleDateExclusion = (date) => setExcludedDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date]);
  const resolvedRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((row) => {
      if (excludedDates.includes(row.date) || resolutions[row.id]?.exclude) return false;
      return Boolean(resolutions[row.id]?.routeId || row.matchedRouteId);
    });
  }, [preview, resolutions, excludedDates]);
  const outstanding = useMemo(() => {
    if (!preview) return 0;
    return preview.rows.filter((row) => {
      if (excludedDates.includes(row.date) || resolutions[row.id]?.exclude) return false;
      return !(resolutions[row.id]?.routeId || row.matchedRouteId) || row.blockedDate;
    }).length;
  }, [preview, resolutions, excludedDates]);
  const attentionCount = useMemo(() => {
    if (!preview) return 0;
    return preview.rows.filter((row) => {
      if (excludedDates.includes(row.date) || resolutions[row.id]?.exclude) return false;
      return row.severity !== "clean";
    }).length;
  }, [preview, resolutions, excludedDates]);
  const finalCounts = useMemo(() => {
    if (!preview) return { created: 0, updated: 0, excluded: 0, zeroTrip: 0, incomplete: 0 };
    const keys = new Set(resolvedRows.map((row) => `${row.date}|${resolutions[row.id]?.routeId || row.matchedRouteId}`));
    const existing = new Set(preview.existingKeys || []);
    const updated = [...keys].filter((key) => existing.has(key)).length;
    return {
      created: keys.size - updated,
      updated,
      excluded: preview.rows.length - resolvedRows.length,
      zeroTrip: resolvedRows.filter((row) => row.zeroTrips).length,
      incomplete: new Set(resolvedRows.filter((row) => !row.deployment || row.deployment.warning || row.deployment.assignmentWarning).map((row) => `${row.date}|${resolutions[row.id]?.routeId || row.matchedRouteId}`)).size,
    };
  }, [preview, resolvedRows, resolutions]);
  const routeDayReview = useMemo(() => {
    const groups = new Map();
    for (const row of resolvedRows) {
      const routeId = resolutions[row.id]?.routeId || row.matchedRouteId;
      const route = preview?.routes.find((item) => item.id === routeId)?.code || row.matchedRoute || row.sourceRoute;
      const key = `${row.date}|${routeId}`;
      if (!groups.has(key)) groups.set(key, { date: row.date, route, rows: [] });
      groups.get(key).rows.push(row);
    }
    return [...groups.values()].map((group) => {
      const trips = group.rows.reduce((sum, row) => sum + row.completedTrips, 0);
      const positive = group.rows.filter((row) => row.completedTrips > 0);
      const zero = group.rows.filter((row) => row.zeroTrips);
      const weighted = (field) => {
        const available = positive.filter((row) => Number.isFinite(row[field]));
        const denominator = available.reduce((sum, row) => sum + row.completedTrips, 0);
        return denominator ? available.reduce((sum, row) => sum + row[field] * row.completedTrips, 0) / denominator : null;
      };
      return {
        ...group,
        trips,
        otpPct: weighted("otpPct"),
        outcome: zero.length === group.rows.length ? "Closed/cancelled" : zero.length ? "Partially closed" : "Operated",
      };
    }).sort((a, b) => a.date.localeCompare(b.date) || a.route.localeCompare(b.route));
  }, [resolvedRows, resolutions, preview]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = {
        excludedDates,
        resolutions: preview.rows.map((row) => ({ rowId: row.id, ...(resolutions[row.id] || {}) })),
      };
      const data = await apiPost(`/api/network-success/submissions/${submission.id}/confirm`, payload);
      setSuccess(data);
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1); setSubmission(null); setPreview(null); setResolutions({}); setExcludedDates([]); setFiles({}); setSuccess(null); setError(""); setNotice("");
  };

  const requestRemoval = (item) => {
    setError("");
    setNotice("");
    setRemovalError("");
    setPendingRemoval(item);
  };

  const openHistorySubmission = async (item) => {
    const submissionId = item.id || item._id;
    setOpeningId(submissionId);
    setError("");
    setNotice("");
    try {
      const data = await apiPost(`/api/network-success/submissions/${submissionId}/reopen`, {});
      const opened = data.submission;
      const divisionId = (typeof opened.division === "object"
        ? opened.division?._id
        : opened.division) || opened.divisionCandidates?.[0]?.division || "";
      setSource(opened.source);
      setFiles({});
      setSubmission(opened);
      setDivision(divisionId);
      setPreview(null);
      setResolutions({});
      setExcludedDates([]);
      setSuccess(null);
      setStep(2);
      if (divisionId) {
        const matchData = await apiPost(`/api/network-success/submissions/${opened.id}/preview`, { division: divisionId });
        setSubmission(matchData.submission);
        setPreview(matchData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setOpeningId(null);
    }
  };

  const removeHistorySubmission = async () => {
    const item = pendingRemoval;
    if (!item) return;
    const submissionId = item.id || item._id;
    setRemovingId(submissionId);
    setError("");
    setNotice("");
    setRemovalError("");
    try {
      const data = await apiDelete(`/api/network-success/submissions/${submissionId}`);
      setHistory((current) => current.filter((entry) => (entry.id || entry._id) !== submissionId));
      if (success?.submission?.id === submissionId) {
        setSuccess(null);
        setStep(1);
      }
      setNotice(data.message);
      setPendingRemoval(null);
      await loadHistory();
    } catch (err) {
      setRemovalError(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  if (success) {
    return (
      <Fragment>
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-5">
            <p className="text-sm font-semibold text-emerald-800">Submission saved</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">The network records are ready.</h2>
            <p className="mt-1 text-sm text-slate-600">Source metrics and the current dated Deployment context were stored together.</p>
          </div>
          <div className="p-6">
            <SummaryStrip items={[
              { label: "Created", value: success.counts.created },
              { label: "Updated", value: success.counts.updated },
              { label: "Excluded", value: success.counts.excluded },
              { label: "Zero-trip rows", value: success.counts.zeroTripRows },
              { label: "Incomplete enrichment", value: success.counts.incompleteEnrichment, tone: success.counts.incompleteEnrichment ? "text-amber-700" : undefined },
            ]} />
            <button type="button" onClick={reset} className="mt-5 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Start another submission
            </button>
          </div>
        </section>
        <History submissions={history} onOpen={openHistorySubmission} onRemove={requestRemoval} openingId={openingId} removingId={removingId} />
        <RemoveSubmissionDialog item={pendingRemoval} busy={Boolean(removingId)} error={removalError} onCancel={() => setPendingRemoval(null)} onConfirm={removeHistorySubmission} />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Stepper current={step} />
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        {step === 1 && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Choose the source system</h2>
              <p className="mt-1 text-sm text-slate-500">Files are parsed for review; workbook binaries are never retained.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(sources).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={source === key}
                  onClick={() => { setSource(key); setFiles({}); setError(""); }}
                  className={`rounded-xl border p-4 text-left transition ${source === key ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-slate-200 hover:border-slate-300"}`}
                >
                  <span className="block font-semibold text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-sm text-slate-500">{option.description}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
              {sources[source].files.map((definition) => (
                <FilePicker key={definition.key} definition={definition} file={files[definition.key]} onChange={(file) => setFile(definition.key, file)} />
              ))}
              <div className="flex items-center justify-between gap-4 pt-1">
                <p className="text-xs text-slate-500">.xls or .xlsx · 10 MB maximum per file</p>
                <button
                  type="button"
                  disabled={!requiredFilesReady || busy}
                  onClick={preprocess}
                  className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Reading workbooks…" : "Continue to matching"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Confirm the division, then review matches</h2>
                <p className="mt-1 text-sm text-slate-500">The suggestion uses cost center evidence and safe route overlap. You must confirm it.</p>
              </div>
              <div className="flex items-end gap-2">
                <label className="text-xs font-medium text-slate-600">
                  Division
                  <select value={division} onChange={(event) => { setDivision(event.target.value); setPreview(null); }} className="mt-1 block min-w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                    {(submission?.divisionCandidates || []).map((candidate, index) => (
                      <option key={candidate.division} value={candidate.division}>
                        {index === 0 ? "Suggested · " : ""}{candidate.code} — {candidate.name} ({candidate.matchedRoutes}/{candidate.totalRoutes})
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={match} disabled={!division || busy} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  {busy ? "Matching…" : preview ? "Rematch" : "Confirm & match"}
                </button>
              </div>
            </div>

            {!preview && (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">{submission.counts.sourceRows} source rows are ready to match.</p>
                <p className="mt-1 text-xs text-slate-500">No data will be saved until the final confirmation.</p>
              </div>
            )}

            {preview && (
              <Fragment>
                <div className="mt-6">
                  <SummaryStrip items={[
                    { label: "Dates", value: submission.reportDates.length },
                    { label: "Rows", value: preview.rows.length },
                    { label: "Automatic matches", value: submission.counts.automaticMatches },
                    { label: "Zero-trip rows", value: submission.counts.zeroTripRows, tone: submission.counts.zeroTripRows ? "text-amber-700" : undefined },
                    { label: "Needs attention", value: attentionCount, tone: outstanding ? "text-red-700" : attentionCount ? "text-amber-700" : "text-emerald-700" },
                  ]} />
                </div>

                {submission.blockedDates?.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {submission.blockedDates.map((blocked) => (
                      <div key={blocked.date} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-red-800">{formatDate(blocked.date)} is incomplete</p>
                          <p className="text-red-700">Missing Driver Performance: {blocked.missingOperators.join(", ")}</p>
                        </div>
                        <label className="flex items-center gap-2 font-medium text-red-800">
                          <input type="checkbox" checked={excludedDates.includes(blocked.date)} onChange={() => toggleDateExclusion(blocked.date)} />
                          Exclude entire date
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <div className="hidden gap-3 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[100px_110px_minmax(90px,.8fr)_minmax(150px,1.25fr)_minmax(140px,1.2fr)_70px_minmax(140px,1.1fr)_36px]">
                    <span>Status</span><span>Date</span><span>Source route</span><span>Matched route</span><span>Operator / provider</span><span>Trips</span><span>Outcome</span><span />
                  </div>
                  {preview.rows.map((row) => (
                    <MatchRow
                      key={row.id}
                      row={row}
                      routes={preview.routes}
                      resolution={resolutions[row.id]}
                      setResolution={setResolution}
                      expanded={expanded === row.id}
                      setExpanded={setExpanded}
                      dateExcluded={excludedDates.includes(row.date)}
                    />
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" onClick={() => { setStep(1); setPreview(null); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back</button>
                  <div className="text-right">
                    {outstanding > 0 && <p className="mb-1 text-xs font-medium text-red-700">Resolve or exclude {outstanding} remaining row{outstanding === 1 ? "" : "s"}.</p>}
                    <button type="button" disabled={outstanding > 0 || resolvedRows.length === 0} onClick={() => setStep(3)} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">Review final changes</button>
                  </div>
                </div>
              </Fragment>
            )}
          </div>
        )}

        {step === 3 && preview && (
          <div>
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-900">Review what will be saved</h2>
              <p className="mt-1 text-sm text-slate-500">Uploaded metrics remain unchanged. Deployment and directory values are stored as a dated snapshot.</p>
            </div>
            <div className="mt-6">
              <SummaryStrip items={[
                { label: "Created", value: finalCounts.created },
                { label: "Updated", value: finalCounts.updated },
                { label: "Excluded", value: finalCounts.excluded },
                { label: "Zero-trip rows", value: finalCounts.zeroTrip, tone: finalCounts.zeroTrip ? "text-amber-700" : undefined },
                { label: "Incomplete enrichment", value: finalCounts.incomplete, tone: finalCounts.incomplete ? "text-amber-700" : undefined },
              ]} />
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Replacement scope</p>
              <p className="mt-1">Current {source === "vision" ? "Vision" : "Ecolane"} records for {submission.reportDates.map(formatDate).join(", ")} in the confirmed division will be replaced. The before/after change audit remains attached to this submission.</p>
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 bg-white px-4 py-3">
                <p className="font-medium text-slate-800">Final route-day records</p>
                <p className="text-xs text-slate-500">Multiple source runs remain visible as components of one stored record.</p>
              </div>
              <div className="max-h-72 overflow-auto bg-white">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium text-slate-500"><tr><th className="px-4 py-2">Date</th><th className="px-3 py-2">Route</th><th className="px-3 py-2">Components</th><th className="px-3 py-2">Trips</th><th className="px-3 py-2">OTP</th><th className="px-3 py-2">Outcome</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {routeDayReview.map((item) => <tr key={`${item.date}|${item.route}`}><td className="px-4 py-2 text-slate-600">{formatDate(item.date)}</td><td className="px-3 py-2 font-medium text-slate-800">{item.route}</td><td className="px-3 py-2 text-slate-600">{item.rows.map((row) => row.sourceRoute).join(", ")}</td><td className="px-3 py-2 text-slate-600">{item.trips}</td><td className="px-3 py-2 text-slate-600">{pct(item.otpPct)}</td><td className="px-3 py-2 text-slate-600">{item.outcome}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            {finalCounts.incomplete > 0 && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{finalCounts.incomplete} record{finalCounts.incomplete === 1 ? " has" : "s have"} incomplete Deployment enrichment. Missing values will remain blank, not zero.</p>}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to matching</button>
              <button type="button" onClick={confirm} disabled={busy || outstanding > 0} className="rounded-md bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{busy ? "Saving…" : "Confirm and save"}</button>
            </div>
          </div>
        )}
      </section>
      {step === 1 && <History submissions={history} onOpen={openHistorySubmission} onRemove={requestRemoval} openingId={openingId} removingId={removingId} />}
      <RemoveSubmissionDialog item={pendingRemoval} busy={Boolean(removingId)} error={removalError} onCancel={() => setPendingRemoval(null)} onConfirm={removeHistorySubmission} />
    </Fragment>
  );
};

export default ExcelSubmissions;
