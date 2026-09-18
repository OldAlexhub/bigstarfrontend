import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiDelete, apiGet, apiPatch, apiPut } from "../api/client";
import { TIMEZONES } from "../utils/dates";

const inputClasses =
  "w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const thisMonth = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 7);
};

const OperationsKpiSettings = ({ divisions }) => {
  const [definitions, setDefinitions] = useState([]);
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [divisionId, setDivisionId] = useState(divisions[0]?._id || "");
  const [effectiveMonth, setEffectiveMonth] = useState(thisMonth());
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [config, people] = await Promise.all([apiGet("/api/settings/operations-kpis"), apiGet("/api/users")]);
      setDefinitions(config.definitions || []);
      setHistory(config.settings || []);
      setUsers(people.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!divisions.some((division) => division._id === divisionId)) {
      setDivisionId(divisions[0]?._id || "");
    }
  }, [divisionId, divisions]);
  useEffect(() => {
    if (!divisionId || !definitions.length) return;
    const next = {};
    definitions.forEach((definition) => {
      const applicable = history
        .filter((setting) => String(setting.division?._id || setting.division) === String(divisionId) && setting.kpiKey === definition.key && setting.effectiveMonth <= effectiveMonth)
        .sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))
        .at(-1);
      next[definition.key] = applicable ? {
        enabled: applicable.enabled,
        direction: applicable.direction,
        target: definition.format === "percent" ? applicable.target * 100 : applicable.target,
        redCutoff: definition.format === "percent" ? applicable.redCutoff * 100 : applicable.redCutoff,
        assignedManager: applicable.assignedManager?._id || applicable.assignedManager || "",
      } : { enabled: false, direction: "higher", target: "", redCutoff: "", assignedManager: "" };
    });
    setDrafts(next);
  }, [divisionId, effectiveMonth, definitions, history]);

  const managers = users.filter((person) => person.active !== false && (
    person.role === "ELT" || (
      person.sections?.includes("operations_reporting")
      && (person.divisionAccess || []).some((division) => String(division._id || division) === String(divisionId))
    )
  ));
  const change = (key, field, value) => setDrafts((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));

  const save = async (definition) => {
    const draft = drafts[definition.key];
    setSavingKey(definition.key); setError(""); setMessage("");
    try {
      await apiPut("/api/settings/operations-kpis", {
        division: divisionId,
        kpiKey: definition.key,
        effectiveMonth,
        enabled: draft.enabled,
        direction: draft.direction,
        target: definition.format === "percent" ? Number(draft.target) / 100 : Number(draft.target),
        redCutoff: definition.format === "percent" ? Number(draft.redCutoff) / 100 : Number(draft.redCutoff),
        assignedManager: draft.assignedManager || null,
      });
      setMessage(`${definition.label} saved for ${effectiveMonth}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-sm font-semibold text-slate-900">Operations KPI targets and CAP routing</h2><p className="mt-1 text-xs text-slate-500">Changes apply from the selected effective month forward. Percentage fields use whole percentages, such as 97 for 97%.</p></div>
        <div className="flex flex-wrap gap-3"><label className="text-xs font-medium text-slate-600">Division<select value={divisionId} onChange={(event) => setDivisionId(event.target.value)} className="mt-1 block min-w-52 rounded-md border border-slate-300 px-3 py-2 text-sm">{divisions.map((division) => <option key={division._id} value={division._id}>{division.code} — {division.name}</option>)}</select></label><label className="text-xs font-medium text-slate-600">Effective month<input type="month" value={effectiveMonth} onChange={(event) => setEffectiveMonth(event.target.value)} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm" /></label></div>
      </div>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {loading ? <p className="mt-6 text-sm text-slate-500">Loading KPI settings…</p> : <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">KPI</th><th className="px-3 py-2">Enabled</th><th className="px-3 py-2">Direction</th><th className="px-3 py-2">Green target</th><th className="px-3 py-2">Red cutoff</th><th className="px-3 py-2">Assigned manager</th><th className="px-3 py-2" /></tr></thead>
        <tbody className="divide-y divide-slate-100">{definitions.map((definition) => { const draft = drafts[definition.key] || {}; return <tr key={definition.key}><td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">{definition.label}</td><td className="px-3 py-3"><input type="checkbox" checked={Boolean(draft.enabled)} onChange={(event) => change(definition.key, "enabled", event.target.checked)} /></td><td className="px-3 py-3"><select value={draft.direction || "higher"} onChange={(event) => change(definition.key, "direction", event.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5"><option value="higher">Higher is better</option><option value="lower">Lower is better</option></select></td><td className="px-3 py-3"><input type="number" step="any" value={draft.target ?? ""} onChange={(event) => change(definition.key, "target", event.target.value)} className={inputClasses} /></td><td className="px-3 py-3"><input type="number" step="any" value={draft.redCutoff ?? ""} onChange={(event) => change(definition.key, "redCutoff", event.target.value)} className={inputClasses} /></td><td className="px-3 py-3"><select value={draft.assignedManager || ""} onChange={(event) => change(definition.key, "assignedManager", event.target.value)} className="min-w-48 rounded-md border border-slate-300 px-2 py-1.5"><option value="">Unassigned</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} — {manager.role}</option>)}</select></td><td className="px-3 py-3"><button type="button" onClick={() => save(definition)} disabled={savingKey === definition.key || !divisionId} className="text-xs font-medium text-brand-600 disabled:opacity-50">{savingKey === definition.key ? "Saving…" : "Save"}</button></td></tr>; })}</tbody>
      </table></div>}
    </div>
  );
};

const SettingsPage = () => {
  const { user } = useAuth();
  const isELT = user?.role === "ELT";

  const [settings, setSettings] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [lifecycleBusyId, setLifecycleBusyId] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = () => {
    const divisionsPath = isELT ? "/api/divisions?includeInactive=1" : "/api/divisions";
    Promise.all([apiGet("/api/settings"), apiGet(divisionsPath)])
      .then(([settingsData, divisionsData]) => {
        setSettings(settingsData.settings);
        setDivisions(divisionsData.divisions);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const flashSaved = () => {
    setSavedMessage("Saved");
    setTimeout(() => setSavedMessage(""), 1500);
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    try {
      const data = await apiPut("/api/settings", {
        breakMinutes: Number(settings.breakMinutes),
        revenueRatio: Number(settings.revenueRatio),
        osrAdvanceDays: Number(settings.osrAdvanceDays ?? 7),
        scheduleHistoryLookbackWeeks: Number(settings.scheduleHistoryLookbackWeeks ?? 6),
        operationsReportingStartMonth: settings.operationsReportingStartMonth,
      });
      setSettings(data.settings);
      flashSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDivisionThresholdChange = (id, field, value) => {
    setDivisions((prev) =>
      prev.map((d) =>
        d._id === id ? { ...d, thresholds: { ...d.thresholds, [field]: value } } : d
      )
    );
  };

  const handleDivisionTimezoneChange = (id, value) => {
    setDivisions((prev) => prev.map((d) => (d._id === id ? { ...d, timezone: value } : d)));
  };

  const handleDivisionNameChange = (id, value) => {
    setDivisions((prev) => prev.map((d) => (d._id === id ? { ...d, name: value } : d)));
  };

  const handleDivisionSave = async (division) => {
    if (isELT && !division.name.trim()) {
      setError("Division name is required.");
      return;
    }
    try {
      const data = await apiPatch(`/api/divisions/${division._id}`, {
        ...(isELT ? { name: division.name.trim() } : {}),
        thresholds: {
          breakMinutes:
            division.thresholds.breakMinutes === "" || division.thresholds.breakMinutes === null
              ? null
              : Number(division.thresholds.breakMinutes),
          revenueRatio:
            division.thresholds.revenueRatio === "" || division.thresholds.revenueRatio === null
              ? null
              : Number(division.thresholds.revenueRatio),
        },
        timezone: division.timezone,
      });
      setDivisions((prev) => prev.map((d) => (d._id === division._id ? data.division : d)));
      flashSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDivisionLifecycleChange = async (division) => {
    const restoring = division.active === false;
    if (!restoring) {
      setConfirmation({ type: "retire", division });
      return;
    }

    await changeDivisionLifecycle(division, true);
  };

  const changeDivisionLifecycle = async (division, restoring) => {
    setLifecycleBusyId(division._id);
    setError("");
    try {
      const data = await apiPatch(`/api/divisions/${division._id}`, { active: restoring });
      setDivisions((current) =>
        current.map((item) => (item._id === division._id ? data.division : item))
      );
      setSavedMessage(restoring ? "Division restored" : "Division retired; historical data was preserved");
      setTimeout(() => setSavedMessage(""), 2500);
      setConfirmation(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLifecycleBusyId("");
    }
  };

  const requestDivisionDelete = (division) => {
    setDeleteConfirmation("");
    setConfirmation({ type: "delete", division });
  };

  const handleDivisionDelete = async () => {
    const division = confirmation?.division;
    if (!division || confirmation.type !== "delete" || deleteConfirmation !== division.code) return;

    setLifecycleBusyId(division._id);
    setError("");
    try {
      await apiDelete(`/api/divisions/${division._id}`, { confirmationCode: deleteConfirmation });
      setDivisions((current) => current.filter((item) => item._id !== division._id));
      setSavedMessage(`${division.name || division.code} was permanently deleted`);
      setTimeout(() => setSavedMessage(""), 2500);
      setConfirmation(null);
      setDeleteConfirmation("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLifecycleBusyId("");
    }
  };

  const activeDivisions = divisions.filter((division) => division.active !== false);
  const displayedDivisions = [...divisions].sort((a, b) => {
    if ((a.active !== false) !== (b.active !== false)) return a.active === false ? 1 : -1;
    return String(a.code).localeCompare(String(b.code), undefined, { numeric: true });
  });

  if (!settings) {
    return error ? (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
    ) : (
      <p className="text-sm text-slate-500">Loading settings…</p>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage run-cut calculations, the OSR planning policy, division timezones, and effective-dated Operations KPI targets.
        </p>
        {isELT && (
          <p className="mt-2 text-sm">
            <Link to="/settings/users" className="text-brand-600 hover:underline">
              Manage Users →
            </Link>
          </p>
        )}
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {savedMessage && <p className="mb-4 text-sm text-green-600">{savedMessage}</p>}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Company-wide defaults</h2>
        <form onSubmit={handleSettingsSave}>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-600">
              Break minutes
              <input
                type="number"
                disabled={!isELT}
                value={settings.breakMinutes}
                onChange={(e) => setSettings({ ...settings, breakMinutes: e.target.value })}
                className={`${inputClasses} mt-1 block`}
              />
            </label>
            <label className="text-sm text-slate-600">
              Revenue ratio
              <input
                type="number"
                step="0.01"
                disabled={!isELT}
                value={settings.revenueRatio}
                onChange={(e) => setSettings({ ...settings, revenueRatio: e.target.value })}
                className={`${inputClasses} mt-1 block`}
              />
            </label>
            <label className="text-sm text-slate-600">
              OSR advance days
              <input
                type="number"
                min="0"
                max="7"
                step="1"
                disabled={!isELT}
                value={settings.osrAdvanceDays ?? 7}
                onChange={(e) => setSettings({ ...settings, osrAdvanceDays: e.target.value })}
                className={`${inputClasses} mt-1 block`}
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">
                How far ahead Deployment can process an OSR (maximum 7 days).
              </span>
            </label>
            <label className="text-sm text-slate-600">
              Schedule History lookback weeks
              <input
                type="number"
                min="1"
                max="12"
                step="1"
                disabled={!isELT}
                value={settings.scheduleHistoryLookbackWeeks ?? 6}
                onChange={(e) => setSettings({ ...settings, scheduleHistoryLookbackWeeks: e.target.value })}
                className={`${inputClasses} mt-1 block`}
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">
                How far back Deployment's Schedule History date picker can go (1-12 weeks).
              </span>
            </label>
            <label className="text-sm text-slate-600">
              CAP activation month
              <input
                type="month"
                disabled={!isELT}
                value={settings.operationsReportingStartMonth || ""}
                onChange={(e) => setSettings({ ...settings, operationsReportingStartMonth: e.target.value })}
                className="mt-1 block w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">
                Completed months before this are never eligible to open a CAP, even if Red or Critical.
              </span>
            </label>
          </div>
          {isELT && (
            <button
              type="submit"
              className="mt-6 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Save defaults
            </button>
          )}
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Division settings and lifecycle</h2>
        <p className="mb-4 text-xs text-slate-400">
          Leave overrides blank to use company defaults. Retiring preserves history; permanent deletion removes the division and all of its records.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Division</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Break minutes</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Revenue ratio</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Timezone</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedDivisions.map((d) => (
                <tr key={d._id} className={d.active === false ? "bg-slate-50 opacity-75" : ""}>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    <span className="block text-xs text-slate-400">{d.code}</span>
                    {isELT ? (
                      <input
                        aria-label={`Division name for ${d.code}`}
                        value={d.name}
                        disabled={d.active === false}
                        onChange={(event) => handleDivisionNameChange(d._id, event.target.value)}
                        className="mt-1 block min-w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-900 disabled:bg-slate-100"
                      />
                    ) : (
                      <span className="mt-1 block text-sm font-medium text-slate-900">{d.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      disabled={d.active === false}
                      value={d.thresholds?.breakMinutes ?? ""}
                      onChange={(e) => handleDivisionThresholdChange(d._id, "breakMinutes", e.target.value)}
                      className={inputClasses}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      disabled={d.active === false}
                      value={d.thresholds?.revenueRatio ?? ""}
                      onChange={(e) => handleDivisionThresholdChange(d._id, "revenueRatio", e.target.value)}
                      className={inputClasses}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={d.timezone || TIMEZONES[0]}
                      disabled={!isELT || d.active === false}
                      onChange={(e) => handleDivisionTimezoneChange(d._id, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.active === false ? "bg-slate-200 text-slate-600" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {d.active === false ? "Retired" : "Active"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDivisionSave(d)}
                        disabled={d.active === false}
                        className="text-xs font-medium text-brand-600 hover:underline disabled:text-slate-300 disabled:no-underline"
                      >
                        Save
                      </button>
                      {isELT && <>
                          <button
                            type="button"
                            onClick={() => handleDivisionLifecycleChange(d)}
                            disabled={lifecycleBusyId === d._id}
                            className={`text-xs font-medium hover:underline disabled:opacity-50 ${
                              d.active === false ? "text-emerald-600" : "text-amber-700"
                            }`}
                          >
                            {lifecycleBusyId === d._id ? "Saving…" : d.active === false ? "Restore" : "Retire"}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDivisionDelete(d)}
                            disabled={lifecycleBusyId === d._id}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isELT && <OperationsKpiSettings divisions={activeDivisions} />}

      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !lifecycleBusyId) setConfirmation(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="division-confirmation-title"
            aria-describedby="division-confirmation-description"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 p-6">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                confirmation.type === "delete" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
              }`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
                  {confirmation.type === "delete" ? (
                    <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M12 9v4m0 4h.01M10.3 4.2 2.8 17.1A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.9L13.7 4.2a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="division-confirmation-title" className="text-lg font-semibold text-slate-900">
                  {confirmation.type === "delete" ? "Permanently delete division?" : "Retire this division?"}
                </h2>
                <p id="division-confirmation-description" className="mt-1 text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-900">{confirmation.division.name}</span>
                  {` (${confirmation.division.code})`}
                  {confirmation.type === "delete"
                    ? " and every associated operational and historical record will be permanently deleted. This cannot be undone."
                    : " will disappear from operational areas and future automated processing will stop. All historical data will remain available."}
                </p>
                {confirmation.type === "delete" && (
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    Type <span className="font-mono font-semibold text-slate-900">{confirmation.division.code}</span> to confirm
                    <input
                      autoFocus
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={Boolean(lifecycleBusyId)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmation.type === "delete"
                  ? handleDivisionDelete()
                  : changeDivisionLifecycle(confirmation.division, false)}
                disabled={Boolean(lifecycleBusyId) || (
                  confirmation.type === "delete" && deleteConfirmation !== confirmation.division.code
                )}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  confirmation.type === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {lifecycleBusyId
                  ? confirmation.type === "delete" ? "Deleting…" : "Retiring…"
                  : confirmation.type === "delete" ? "Permanently delete" : "Retire division"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
