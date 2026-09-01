// A stat card whose color communicates status at a glance (met target /
// close / missed / informational), instead of every number looking the
// same regardless of whether it's good or bad news. Tone is computed by the
// caller from data already available (meetsX booleans, threshold checks),
// not hardcoded here.
const TONE_STYLES = {
  good: "border-green-200 bg-green-50",
  warning: "border-amber-200 bg-amber-50",
  bad: "border-red-200 bg-red-50",
  info: "border-blue-200 bg-blue-50",
  neutral: "border-slate-200 bg-white",
};

const TONE_VALUE_STYLES = {
  good: "text-green-700",
  warning: "text-amber-700",
  bad: "text-red-700",
  info: "text-blue-700",
  neutral: "text-slate-900",
};

const MetricCard = ({ label, value, tone = "neutral", sub }) => (
  <div className={`rounded-lg border p-4 ${TONE_STYLES[tone] || TONE_STYLES.neutral}`}>
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-semibold ${TONE_VALUE_STYLES[tone] || TONE_VALUE_STYLES.neutral}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
  </div>
);

export default MetricCard;
