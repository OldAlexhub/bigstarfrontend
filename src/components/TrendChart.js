// A small, dependency-free inline-SVG line chart — no charting library,
// consistent with the rest of the app (Tailwind only, zero UI deps).
const WIDTH = 640;
const HEIGHT = 160;
const PAD = 24;

const TrendChart = ({ title, points, valueKey, color = "#4f46e5", formatValue }) => {
  const values = points.map((p) => p[valueKey]).filter((v) => v != null && Number.isFinite(v));
  if (values.length < 2) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-400">Not enough data points in this range to chart a trend.</p>
      </div>
    );
  }

  const min = Math.min(...values, 0);
  const max = Math.max(...values, Math.max(...values) * 1.05 || 1);
  const range = max - min || 1;

  const usableWidth = WIDTH - PAD * 2;
  const usableHeight = HEIGHT - PAD * 2;
  const step = usableWidth / (points.length - 1);

  const coords = points.map((p, i) => {
    const v = p[valueKey];
    const x = PAD + i * step;
    const y = v == null ? null : PAD + usableHeight - ((v - min) / range) * usableHeight;
    return { x, y, raw: v, bucketStart: p.bucketStart };
  });

  const linePoints = coords
    .filter((c) => c.y != null)
    .map((c) => `${c.x},${c.y}`)
    .join(" ");

  const lastValid = [...coords].reverse().find((c) => c.y != null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {lastValid && (
          <p className="text-sm font-medium" style={{ color }}>
            {formatValue ? formatValue(lastValid.raw) : lastValid.raw}
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
        <line x1={PAD} y1={PAD + usableHeight} x2={WIDTH - PAD} y2={PAD + usableHeight} stroke="#e2e8f0" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + usableHeight} stroke="#e2e8f0" />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" />
        {coords
          .filter((c) => c.y != null)
          .map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r="2.5" fill={color} />
          ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{points[0]?.bucketStart}</span>
        <span>{points[points.length - 1]?.bucketStart}</span>
      </div>
    </div>
  );
};

export default TrendChart;
