import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPatch, apiPut } from "../api/client";
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
    if (!divisionId && divisions[0]) setDivisionId(divisions[0]._id);
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

  const load = () => {
    Promise.all([apiGet("/api/settings"), apiGet("/api/divisions")])
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

  const handleDivisionSave = async (division) => {
    try {
      const data = await apiPatch(`/api/divisions/${division._id}`, {
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
          Manage run-cut calculations, division timezones, and effective-dated Operations KPI targets.
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
        <form onSubmit={handleSettingsSave} className="flex flex-wrap items-end gap-6">
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
            CAP activation month
            <input
              type="month"
              disabled={!isELT}
              value={settings.operationsReportingStartMonth || ""}
              onChange={(e) => setSettings({ ...settings, operationsReportingStartMonth: e.target.value })}
              className="mt-1 block w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="mt-1 block max-w-xs text-xs font-normal text-slate-400">Completed months before this are never eligible to open a CAP, even if Red or Critical.</span>
          </label>
          {isELT && (
            <button type="submit" className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Save defaults
            </button>
          )}
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Per-division overrides</h2>
        <p className="mb-4 text-xs text-slate-400">Leave blank to fall back to the company-wide default.</p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Division</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Break minutes</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Revenue ratio</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Timezone</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {divisions.map((d) => (
                <tr key={d._id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{d.code}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={d.thresholds?.breakMinutes ?? ""}
                      onChange={(e) => handleDivisionThresholdChange(d._id, "breakMinutes", e.target.value)}
                      className={inputClasses}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={d.thresholds?.revenueRatio ?? ""}
                      onChange={(e) => handleDivisionThresholdChange(d._id, "revenueRatio", e.target.value)}
                      className={inputClasses}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={d.timezone || TIMEZONES[0]}
                      disabled={!isELT}
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
                    <button
                      onClick={() => handleDivisionSave(d)}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isELT && <OperationsKpiSettings divisions={divisions} />}
    </div>
  );
};

export default SettingsPage;
