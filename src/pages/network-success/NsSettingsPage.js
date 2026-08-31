import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiGet, apiPatch, apiPut } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const SCALAR_FIELDS = [
  ["otpThresh", "OTP Threshold"],
  ["shfThresh", "SHF Threshold"],
  ["tpshBench", "TPSH Benchmark"],
  ["routeClosureBench", "Route Closure Benchmark"],
  ["lateFirstBench", "Late to First Benchmark"],
  ["lateDeployBench", "Late Deploy Benchmark"],
  ["scoreCap", "Per-KPI Score Cap"],
  ["revenueHourDeduction", "Revenue Hour Deduction"],
  ["revenueHourMultiplier", "Revenue Hour Multiplier"],
];

const WEIGHT_FIELDS = [
  ["otp", "OTP Weight"],
  ["shf", "SHF Weight"],
  ["tpsh", "TPSH Weight"],
  ["routeClosure", "Route Closure Weight"],
  ["lateFirst", "Late to First Weight"],
  ["lateDeploy", "Late Deploy Weight"],
];

const inputClasses =
  "w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const weightSum = (weights) =>
  WEIGHT_FIELDS.reduce((sum, [key]) => sum + (Number(weights[key]) || 0), 0);

const SettingsForm = ({ scalars, weights, onScalarChange, onWeightChange, disabled, weightsOptional }) => (
  <div>
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {SCALAR_FIELDS.map(([key, label]) => (
        <label key={key} className="text-sm text-slate-600">
          {label}
          <input
            type="number"
            step="0.01"
            disabled={disabled}
            value={scalars[key] ?? ""}
            onChange={(e) => onScalarChange(key, e.target.value)}
            className={`${inputClasses} mt-1 block w-full`}
          />
        </label>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {WEIGHT_FIELDS.map(([key, label]) => (
        <label key={key} className="text-sm text-slate-600">
          {label}
          <input
            type="number"
            step="0.01"
            disabled={disabled}
            value={weights[key] ?? ""}
            onChange={(e) => onWeightChange(key, e.target.value)}
            className={`${inputClasses} mt-1 block w-full`}
          />
        </label>
      ))}
    </div>
    {(() => {
      const hasAnyWeight = WEIGHT_FIELDS.some(([key]) => weights[key] != null && weights[key] !== "");
      if (weightsOptional && !hasAnyWeight) {
        return <p className="mt-2 text-xs text-slate-400">No weight overrides set — using company defaults.</p>;
      }
      const offTarget = Math.abs(weightSum(weights) - 1) > 0.001;
      return (
        <p className={`mt-2 text-xs ${offTarget ? "text-red-600" : "text-slate-400"}`}>
          Weights total {Math.round(weightSum(weights) * 10000) / 100}% (must be 100%)
        </p>
      );
    })()}
  </div>
);

const NsSettingsPage = () => {
  const { selectedDivision } = useOutletContext();
  const { user } = useAuth();
  const isELT = user?.role === "ELT";

  const [settings, setSettings] = useState(null);
  const [divisionOverride, setDivisionOverride] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    apiGet("/api/network-success/settings").then((d) => setSettings(d.settings));
  }, []);

  useEffect(() => {
    if (selectedDivision) setDivisionOverride(selectedDivision.kpiSettings || {});
  }, [selectedDivision]);

  const flash = () => {
    setSaved("Saved");
    setTimeout(() => setSaved(""), 1500);
  };

  const handleSaveCompany = async () => {
    if (Math.abs(weightSum(settings.weights) - 1) > 0.001) {
      setError("Company weights must total 100%.");
      return;
    }
    try {
      const data = await apiPut("/api/network-success/settings", settings);
      setSettings(data.settings);
      setError("");
      flash();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveDivision = async () => {
    const weights = divisionOverride.weights || {};
    const hasAnyWeight = WEIGHT_FIELDS.some(([key]) => weights[key] != null && weights[key] !== "");
    if (hasAnyWeight && Math.abs(weightSum(weights) - 1) > 0.001) {
      setError("If overriding weights, they must total 100%.");
      return;
    }
    try {
      const data = await apiPatch(`/api/divisions/${selectedDivision._id}`, { kpiSettings: divisionOverride });
      setError("");
      flash();
      // reflect saved override back into the form
      setDivisionOverride(data.division.kpiSettings || {});
    } catch (err) {
      setError(err.message);
    }
  };

  if (!settings || !selectedDivision) return <p className="text-sm text-slate-500">Loading settings…</p>;

  return (
    <div>
      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {saved && <p className="mb-4 text-sm text-green-600">{saved}</p>}

      <p className="mb-4 text-sm">
        Looking for Master Run Cuts' break/revenue-ratio settings instead?{" "}
        <Link to="/settings" className="text-brand-600 hover:underline">
          Go to Settings →
        </Link>
      </p>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Company-wide KPI defaults</h2>
        <SettingsForm
          scalars={settings}
          weights={settings.weights}
          disabled={!isELT}
          onScalarChange={(key, value) => setSettings({ ...settings, [key]: value === "" ? null : Number(value) })}
          onWeightChange={(key, value) =>
            setSettings({ ...settings, weights: { ...settings.weights, [key]: value === "" ? null : Number(value) } })
          }
        />
        {isELT && (
          <button
            type="button"
            onClick={handleSaveCompany}
            className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Save company defaults
          </button>
        )}
      </div>

      {divisionOverride && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Per-division override — {selectedDivision.name}</h2>
            <span className="text-xs text-slate-400">Use the division picker above to switch</span>
          </div>
          <p className="mb-4 text-xs text-slate-400">Leave a field blank to fall back to the company-wide default.</p>
          <SettingsForm
            scalars={divisionOverride}
            weights={divisionOverride.weights || {}}
            weightsOptional
            onScalarChange={(key, value) =>
              setDivisionOverride({ ...divisionOverride, [key]: value === "" ? null : Number(value) })
            }
            onWeightChange={(key, value) =>
              setDivisionOverride({
                ...divisionOverride,
                weights: { ...(divisionOverride.weights || {}), [key]: value === "" ? null : Number(value) },
              })
            }
          />
          <button
            type="button"
            onClick={handleSaveDivision}
            className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Save division override
          </button>
        </div>
      )}
    </div>
  );
};

export default NsSettingsPage;
