import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiGet, apiPatch, apiPut } from "../api/client";
import { TIMEZONES } from "../utils/dates";

const inputClasses =
  "w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

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
          Break duration and revenue-hour ratio thresholds used to calculate run cut hours.
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
    </div>
  );
};

export default SettingsPage;
