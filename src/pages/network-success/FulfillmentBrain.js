import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiGet } from "../../api/client";
import MetricCard from "../../components/MetricCard";

const ALL_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const FulfillmentBrain = () => {
  const { selectedDivision } = useOutletContext();
  const [days, setDays] = useState(["MON", "TUE", "WED", "THU", "FRI"]);
  const [targetPct, setTargetPct] = useState(95);
  const [activateCount, setActivateCount] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDivision) return;
    setLoading(true);
    setError("");
    apiGet(
      `/api/network-success/fulfillment?division=${selectedDivision._id}&days=${days.join(",")}&targetPct=${targetPct / 100}`
    )
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDivision, days, targetPct]);

  const toggleDay = (day) => {
    setDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      return ALL_DAYS.filter((d) => next.includes(d));
    });
  };

  const candidates = data?.inactiveCandidates || [];
  const toActivate = candidates.slice(0, activateCount);
  const projectedAddedHours = toActivate.reduce((s, c) => s + c.addedHours, 0);
  const projectedAddedDuties = toActivate.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex gap-1">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                days.includes(day) ? "bg-brand-500 text-white" : "bg-white text-slate-500 hover:bg-slate-100"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Target fulfillment %
          <input
            type="number"
            value={targetPct}
            onChange={(e) => setTargetPct(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Scheduled Duties" value={data.summary.totalScheduledDuties} />
            <MetricCard label="Covered Duties" value={data.summary.totalCoveredDuties} />
            <MetricCard
              label="Duty Fulfillment"
              value={pct(data.summary.dutyFulfillmentPct)}
              tone={data.summary.dutyFulfillmentPct == null ? "neutral" : data.summary.dutyFulfillmentPct >= targetPct / 100 ? "good" : "bad"}
            />
            <MetricCard
              label="Core Hour Fulfillment"
              value={pct(data.summary.hourFulfillmentPct)}
              tone={data.summary.hourFulfillmentPct == null ? "neutral" : data.summary.hourFulfillmentPct >= targetPct / 100 ? "good" : "bad"}
            />
          </div>

          <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Day", "Scheduled Duties", "Covered Duties", "Scheduled Hrs", "Covered Hrs"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((day) => (
                  <tr key={day}>
                    <td className="px-3 py-2 font-medium text-slate-900">{day}</td>
                    <td className="px-3 py-2 text-slate-600">{data.byDay[day]?.scheduledDuties}</td>
                    <td className="px-3 py-2 text-slate-600">{data.byDay[day]?.coveredDuties}</td>
                    <td className="px-3 py-2 text-slate-600">{data.byDay[day]?.scheduledHours}</td>
                    <td className="px-3 py-2 text-slate-600">{data.byDay[day]?.coveredHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Operator Coverage Scenario</h3>
            <p className="mb-4 text-xs text-slate-500">
              {candidates.length} inactive, route-assigned operator(s) available to activate. Remaining duties to
              target: {data.summary.remainingDutiesToTarget}.
            </p>
            <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
              # inactive operators to activate
              <input
                type="number"
                min={0}
                max={candidates.length}
                value={activateCount}
                onChange={(e) => setActivateCount(Number(e.target.value))}
                className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            {toActivate.length > 0 && (
              <>
                <p className="mb-3 text-sm text-slate-700">
                  Activating these {toActivate.length} operator(s) adds ~{Math.round(projectedAddedHours * 100) / 100}{" "}
                  core hours across {projectedAddedDuties} duties.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr>
                        {["Operator", "Route", "Day", "Added Hours"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {toActivate.map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-900">{c.operatorName}</td>
                          <td className="px-3 py-2 text-slate-600">{c.route}</td>
                          <td className="px-3 py-2 text-slate-600">{c.dayOfWeek}</td>
                          <td className="px-3 py-2 text-slate-600">{c.addedHours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FulfillmentBrain;
