import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import { formatKpi, inputClasses, monthLabel, statusClasses, statusLabel } from "./reportingUi";

const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";

const dateLabel = (value) => value
  ? new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
  : "—";

const valueFormat = (value, key) => {
  if (!Number.isFinite(value)) return "—";
  if (["run_cut_fulfillment", "core_revenue_fulfillment", "otp", "go_link_otp", "standby_utilization"].includes(key)) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(2);
};

const draftFor = (cap) => ({
  rootCause: cap.rootCause || "",
  correctiveAction: cap.correctiveAction || "",
  ownerUser: cap.ownerUser?._id || cap.ownerUser?.id || "",
  ownerName: cap.ownerName || "",
  plannedRecoveryDate: dateInput(cap.plannedRecoveryDate),
  assignedManager: cap.assignedManager?._id || cap.assignedManager?.id || "",
});

const recoveryFor = (cap) => ({
  valueAtRecovery: cap.recoveryCandidate?.value ?? cap.valueAtRecovery ?? "",
  dateRecoveryMet: dateInput(cap.recoveryCandidate?.date || cap.dateRecoveryMet),
});

const fieldClasses = "w-full rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500";
const textAreaClasses = `${fieldClasses} min-h-[96px] resize-y`;
const fieldLabelClasses = "block text-xs font-semibold text-slate-600";

const CapQueue = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [divisions, setDivisions] = useState([]);
  const [people, setPeople] = useState([]);
  const [division, setDivision] = useState("");
  const [status, setStatus] = useState("active");
  const [mine, setMine] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [caps, setCaps] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [notes, setNotes] = useState({});
  const [recoveries, setRecoveries] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [neededItems, setNeededItems] = useState([]);
  const [neededLoading, setNeededLoading] = useState(true);
  const [openingKey, setOpeningKey] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [localHighlightId, setLocalHighlightId] = useState("");
  const highlightId = location.state?.openedCapId || localHighlightId;
  const highlightRef = useRef(null);

  const loadNeeded = async (filters = { division }) => {
    setNeededLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.division) query.set("division", filters.division);
      const data = await apiGet(`/api/operations-reporting/caps/needed?${query}`);
      setNeededItems(data.needed || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setNeededLoading(false);
    }
  };

  const hydrateRows = (rows) => {
    setDrafts(Object.fromEntries(rows.map((cap) => [cap.id, draftFor(cap)])));
    setRecoveries(Object.fromEntries(rows.map((cap) => [cap.id, recoveryFor(cap)])));
    setNotes({});
  };

  const load = async (filters = { division, status, mine, from, to }, adoptBounds = false) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const query = new URLSearchParams();
      if (filters.division) query.set("division", filters.division);
      if (filters.status) query.set("status", filters.status);
      if (filters.mine) query.set("mine", "1");
      if (filters.from) query.set("from", filters.from);
      if (filters.to) query.set("to", filters.to);
      const data = await apiGet(`/api/operations-reporting/caps?${query}`);
      const rows = data.caps || [];
      setCaps(rows);
      hydrateRows(rows);
      if (adoptBounds && data.filters) {
        setFrom(data.filters.from || "");
        setTo(data.filters.to || "");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([apiGet("/api/divisions"), apiGet("/api/operations-reporting/people")])
      .then(([divisionData, peopleData]) => {
        setDivisions(divisionData.divisions || []);
        setPeople(peopleData.users || []);
      })
      .catch((err) => setError(err.message));
    load({ division: "", status: "active", mine: false, from: "", to: "" }, true);
    loadNeeded({ division: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, highlightId]);

  const submit = (event) => {
    event.preventDefault();
    if (from && to && from > to) {
      setError("From month must be on or before To month.");
      return;
    }
    load({ division, status, mine, from, to });
    loadNeeded({ division });
  };

  const openNeeded = async (item) => {
    const key = `${item.division}|${item.kpiKey}`;
    setOpeningKey(key);
    setError("");
    setMessage("");
    try {
      const data = await apiPost("/api/operations-reporting/caps", {
        division: item.division,
        kpiKey: item.kpiKey,
        triggerMonth: item.triggerMonth,
      });
      setNeededItems((current) => current.filter((entry) => `${entry.division}|${entry.kpiKey}` !== key));
      setLocalHighlightId(data.cap.id);
      setMessage(`${item.divisionCode} – ${item.kpiLabel} opened.`);
      await load({ division, status, mine, from, to });
    } catch (err) {
      setError(err.message);
    } finally {
      setOpeningKey("");
    }
  };

  const updateDraft = (id, field, value) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const updateRecovery = (id, field, value) => {
    setRecoveries((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const replaceCap = (cap) => {
    setCaps((current) => current.map((item) => item.id === cap.id ? cap : item));
    setDrafts((current) => ({ ...current, [cap.id]: draftFor(cap) }));
    setRecoveries((current) => ({ ...current, [cap.id]: recoveryFor(cap) }));
  };

  const peopleFor = (cap) => people.filter((person) => person.role === "ELT" || (person.divisionAccess || []).some(
    (value) => String(value._id || value) === String(cap.division?._id || cap.division?.id)
  ));

  const persistRow = async (cap) => {
    let updated = cap;
    if (cap.canEdit) {
      const data = await apiPatch(`/api/operations-reporting/caps/${cap.id}`, drafts[cap.id] || draftFor(cap));
      updated = data.cap;
    }
    const pendingNote = String(notes[cap.id] || "").trim();
    if (pendingNote && cap.canAddNote) {
      const data = await apiPost(`/api/operations-reporting/caps/${cap.id}/notes`, { text: pendingNote });
      updated = data.cap;
      setNotes((current) => ({ ...current, [cap.id]: "" }));
    }
    replaceCap(updated);
    return updated;
  };

  const saveRow = async (cap) => {
    setSavingId(cap.id);
    setError("");
    setMessage("");
    try {
      await persistRow(cap);
      setMessage(`${cap.division?.code || "CAP"} – ${cap.kpiLabel} saved.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  };

  const confirmRecovery = async (cap) => {
    setSavingId(cap.id);
    setError("");
    setMessage("");
    try {
      await persistRow(cap);
      const recovery = recoveries[cap.id] || {};
      const payload = {};
      if (recovery.valueAtRecovery !== "" && recovery.valueAtRecovery !== undefined) {
        payload.valueAtRecovery = Number(recovery.valueAtRecovery);
      }
      if (recovery.dateRecoveryMet) payload.dateRecoveryMet = recovery.dateRecoveryMet;
      const data = await apiPost(`/api/operations-reporting/caps/${cap.id}/confirm-recovery`, payload);
      setMessage(`${cap.division?.code || "CAP"} – ${cap.kpiLabel} recovery confirmed.`);
      if (status === "active") await load({ division, status, mine, from, to });
      else replaceCap(data.cap);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId("");
    }
  };

  const requestCancel = (cap) => {
    setCancelTarget(cap);
    setCancelError("");
  };

  const cancelCap = async () => {
    if (!cancelTarget) return;
    setCanceling(true);
    setCancelError("");
    try {
      await apiDelete(`/api/operations-reporting/caps/${cancelTarget.id}`);
      setCaps((current) => current.filter((item) => item.id !== cancelTarget.id));
      setMessage(`${cancelTarget.division?.code || "CAP"} – ${cancelTarget.kpiLabel} canceled.`);
      setCancelTarget(null);
      await loadNeeded({ division });
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_auto_auto] lg:items-end">
          <label className="text-xs font-medium text-slate-600">Division<select value={division} onChange={(event) => setDivision(event.target.value)} className={inputClasses}><option value="">All accessible divisions</option>{divisions.map((item) => <option key={item._id} value={item._id}>{item.code} — {item.name}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">CAP status<select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClasses}><option value="active">Open and recovery ready</option><option value="open">Open only</option><option value="recovery_ready">Recovery ready</option><option value="recovered">Recovered</option><option value="all">All</option></select></label>
          <label className="text-xs font-medium text-slate-600">From<input type="month" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClasses} /></label>
          <label className="text-xs font-medium text-slate-600">To<input type="month" value={to} onChange={(event) => setTo(event.target.value)} className={inputClasses} /></label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600"><input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} />Assigned to me</label>
          <button disabled={loading} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">Apply filters</button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      {!neededLoading && neededItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Needs to be opened ({neededItems.length})</h2>
          <div className="space-y-3">
            {neededItems.map((item) => {
              const key = `${item.division}|${item.kpiKey}`;
              const opening = openingKey === key;
              return (
                <div key={key} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50/60 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">{item.divisionCode} — {item.divisionName}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.kpiLabel}</p>
                    <p className="mt-1 text-xs text-slate-600">{formatKpi(item.value, item.kpiFormat)} vs {formatKpi(item.target, item.kpiFormat)} target · {monthLabel(item.triggerMonth)} · {statusLabel(item.status)}</p>
                  </div>
                  <button type="button" onClick={() => openNeeded(item)} disabled={opening} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{opening ? "Opening…" : "Open CAP"}</button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{caps.length} CAP record{caps.length === 1 ? "" : "s"}.</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">Automatic KPI data</span>
          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">Manager input</span>
        </div>
      </div>

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">Loading CAP register…</p>
      ) : !caps.length ? (
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center">
          <p className="font-medium text-slate-700">No CAPs match these filters.</p>
          <p className="mt-2 text-sm leading-5 text-slate-500">{neededItems.length ? "Check “Needs to be opened” above, or adjust your filters." : "Nothing is currently below target for these filters. A completed month that turns Red or Critical will appear above as “Needs to be opened.”"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {caps.map((cap) => {
            const draft = drafts[cap.id] || draftFor(cap);
            const recovery = recoveries[cap.id] || recoveryFor(cap);
            const capPeople = peopleFor(cap);
            const saving = savingId === cap.id;
            const isHighlighted = cap.id === highlightId;
            return (
              <article
                key={cap.id}
                ref={isHighlighted ? highlightRef : null}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isHighlighted ? "border-brand-400 ring-2 ring-brand-200" : "border-slate-200"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cap.division?.code} — {cap.division?.name}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">{cap.kpiLabel}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cap.status === "recovery_ready" ? statusClasses.green : statusClasses[cap.latestKpiStatus] || statusClasses.no_data}`}>{cap.status.replace("_", " ")}</span>
                      <span className="text-xs text-slate-500">Trigger: {monthLabel(cap.triggerMonth)}</span>
                      <span className="text-xs text-slate-500">Latest: {monthLabel(cap.latestMonth)} · {statusLabel(cap.latestKpiStatus)}</span>
                      <span className="text-xs text-slate-500">Added {dateLabel(cap.firstEnteredAt)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-right">
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Value at CAP</p><p className="text-sm font-semibold text-slate-900">{valueFormat(cap.valueAtCapDate, cap.kpiKey)}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Target</p><p className="text-sm font-semibold text-slate-900">{valueFormat(cap.targetAtCap, cap.kpiKey)}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Variance</p><p className={`text-sm font-semibold ${cap.varianceAtCap < 0 ? "text-red-700" : "text-slate-800"}`}>{valueFormat(cap.varianceAtCap, cap.kpiKey)}</p></div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <label className={`${fieldLabelClasses} sm:col-span-2`}>
                    Root Cause
                    <textarea aria-label={`Root Cause ${cap.division?.code} ${cap.kpiLabel}`} disabled={!cap.canEdit} value={draft.rootCause} onChange={(event) => updateDraft(cap.id, "rootCause", event.target.value)} placeholder="Enter the reason this KPI missed target" className={`${textAreaClasses} mt-1`} />
                  </label>
                  <label className={`${fieldLabelClasses} sm:col-span-2`}>
                    Corrective Action
                    <textarea aria-label={`Corrective Action ${cap.division?.code} ${cap.kpiLabel}`} disabled={!cap.canEdit} value={draft.correctiveAction} onChange={(event) => updateDraft(cap.id, "correctiveAction", event.target.value)} placeholder="Enter the action that will correct the issue" className={`${textAreaClasses} mt-1`} />
                  </label>
                  <label className={fieldLabelClasses}>
                    Owner account
                    <select aria-label={`Owner account ${cap.division?.code} ${cap.kpiLabel}`} disabled={!cap.canEdit} value={draft.ownerUser} onChange={(event) => updateDraft(cap.id, "ownerUser", event.target.value)} className={`${fieldClasses} mt-1`}><option value="">No linked account</option>{capPeople.map((person) => <option key={person.id} value={person.id}>{person.name} — {person.role}</option>)}</select>
                  </label>
                  <label className={fieldLabelClasses}>
                    Or an external owner
                    <input aria-label={`Owner name ${cap.division?.code} ${cap.kpiLabel}`} disabled={!cap.canEdit} value={draft.ownerName} onChange={(event) => updateDraft(cap.id, "ownerName", event.target.value)} placeholder="Name of the person accountable" className={`${fieldClasses} mt-1`} />
                  </label>
                  <label className={fieldLabelClasses}>
                    Planned Recovery Date
                    <input aria-label={`Recovery Date ${cap.division?.code} ${cap.kpiLabel}`} disabled={!cap.canEdit} type="date" value={draft.plannedRecoveryDate} onChange={(event) => updateDraft(cap.id, "plannedRecoveryDate", event.target.value)} className={`${fieldClasses} mt-1`} />
                  </label>
                  {cap.status === "recovery_ready" && cap.canEdit ? (
                    <label className={fieldLabelClasses}>
                      Value At Recovery Date
                      <input aria-label={`Value At Recovery Date ${cap.division?.code} ${cap.kpiLabel}`} type="number" step="any" value={recovery.valueAtRecovery} onChange={(event) => updateRecovery(cap.id, "valueAtRecovery", event.target.value)} className={`${fieldClasses} mt-1`} />
                    </label>
                  ) : (
                    <div className={fieldLabelClasses}>
                      Value At Recovery Date
                      <p className="mt-2 text-sm font-semibold text-slate-800">{valueFormat(cap.valueAtRecovery, cap.kpiKey)}</p>
                      {cap.status === "open" && <p className="mt-1 text-xs text-slate-400">Filled when target is met</p>}
                    </div>
                  )}
                  {cap.status === "recovery_ready" && cap.canEdit ? (
                    <label className={fieldLabelClasses}>
                      Date Recovery Met
                      <input aria-label={`Date Recovery Met ${cap.division?.code} ${cap.kpiLabel}`} type="date" value={recovery.dateRecoveryMet} onChange={(event) => updateRecovery(cap.id, "dateRecoveryMet", event.target.value)} className={`${fieldClasses} mt-1`} />
                    </label>
                  ) : cap.dateRecoveryMet ? (
                    <div className={fieldLabelClasses}>
                      Date Recovery Met
                      <p className="mt-2 text-sm font-semibold text-slate-800">{dateLabel(cap.dateRecoveryMet)}</p>
                    </div>
                  ) : null}
                  {user?.role === "ELT" && (
                    <label className={fieldLabelClasses}>
                      CAP Manager
                      <select aria-label={`CAP Manager ${cap.division?.code} ${cap.kpiLabel}`} value={draft.assignedManager || ""} onChange={(event) => updateDraft(cap.id, "assignedManager", event.target.value)} className={`${fieldClasses} mt-1`}><option value="">Unassigned</option>{capPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>
                    </label>
                  )}
                  {user?.role !== "ELT" && (
                    <div className={fieldLabelClasses}>
                      CAP Manager
                      <p className="mt-2 text-sm text-slate-700">{cap.assignedManager?.name || "Unassigned"}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                  <p className={fieldLabelClasses}>Updates / Notes</p>
                  <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                    {cap.updates?.length ? cap.updates.map((update) => (
                      <div key={update._id} className="rounded border border-slate-200 bg-white px-2.5 py-2">
                        <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{update.text}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{update.author?.name || "User"} · {new Date(update.createdAt).toLocaleString()}</p>
                      </div>
                    )) : <p className="text-xs text-slate-400">No updates entered.</p>}
                  </div>
                  {cap.canAddNote && (
                    <textarea aria-label={`New Update or Note ${cap.division?.code} ${cap.kpiLabel}`} value={notes[cap.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [cap.id]: event.target.value }))} placeholder="Add a dated update or note" className={`${textAreaClasses} mt-3 min-h-[64px]`} />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
                  {!cap.canEdit && !cap.canAddNote && <p className="text-xs text-slate-500">Read only</p>}
                  {cap.status === "open" && cap.canEdit && <button type="button" onClick={() => requestCancel(cap)} disabled={saving} className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Cancel</button>}
                  {(cap.canEdit || cap.canAddNote) && <button type="button" onClick={() => saveRow(cap)} disabled={saving} className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>}
                  {cap.status === "recovery_ready" && cap.canEdit && <button type="button" onClick={() => confirmRecovery(cap)} disabled={saving} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50">Confirm recovery</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(cancelTarget)}
        title="Cancel this CAP?"
        context={cancelTarget ? `${cancelTarget.division?.code} — ${cancelTarget.kpiLabel}` : ""}
        description="This removes the CAP entirely, including any root cause, corrective action, or notes entered. If the KPI is still below target, it will reappear under “Needs to be opened.”"
        busy={canceling}
        error={cancelError}
        onCancel={() => {
          setCancelTarget(null);
          setCancelError("");
        }}
        onConfirm={cancelCap}
      />
    </div>
  );
};

export default CapQueue;
