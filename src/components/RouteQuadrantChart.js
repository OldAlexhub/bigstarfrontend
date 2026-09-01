// A dependency-free inline-SVG scatter chart — no charting library,
// consistent with TrendChart.js. Plots each route by SHF (x) vs OTP (y),
// dot radius scaled by trip volume, colored by how many of the two axis
// targets it meets (both / one / neither), with crosshair lines at the
// configured thresholds so the four quadrants read at a glance.
const WIDTH = 640;
const HEIGHT = 360;
const PAD = 40;

const tierColor = (meetsOtp, meetsShf) => {
  if (meetsOtp && meetsShf) return "#16a34a"; // both targets met
  if (meetsOtp || meetsShf) return "#d97706"; // one target met
  return "#dc2626"; // neither met
};

const RouteQuadrantChart = ({ points, otpThresh, shfThresh }) => {
  const usable = points.filter((p) => p.otp != null && p.shf != null && Number.isFinite(p.otp) && Number.isFinite(p.shf));

  if (usable.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900">Route Quadrant</p>
        <p className="text-sm text-slate-400">Not enough data this week to chart OTP vs. SHF.</p>
      </div>
    );
  }

  const shfValues = usable.map((p) => p.shf);
  const otpValues = usable.map((p) => p.otp);
  const shfMin = Math.min(0, ...shfValues);
  const shfMax = Math.max(...shfValues, shfThresh || 0) * 1.05 || 1;
  const otpMin = Math.min(0, ...otpValues);
  const otpMax = Math.max(...otpValues, otpThresh || 0) * 1.05 || 1;

  const usableWidth = WIDTH - PAD * 2;
  const usableHeight = HEIGHT - PAD * 2;
  const xFor = (shf) => PAD + ((shf - shfMin) / (shfMax - shfMin || 1)) * usableWidth;
  const yFor = (otp) => PAD + usableHeight - ((otp - otpMin) / (otpMax - otpMin || 1)) * usableHeight;

  const maxTrips = Math.max(1, ...usable.map((p) => p.trips || 0));
  const radiusFor = (trips) => 4 + Math.sqrt(Math.max(0, trips || 0) / maxTrips) * 10;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-1 text-sm font-semibold text-slate-900">Route Quadrant</p>
      <p className="mb-2 text-xs text-slate-500">
        SHF (horizontal) vs. OTP (vertical) — dot size is trip volume. Green meets both targets, amber meets one, red meets neither.
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
        <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + usableHeight} stroke="#e2e8f0" />
        <line x1={PAD} y1={PAD + usableHeight} x2={WIDTH - PAD} y2={PAD + usableHeight} stroke="#e2e8f0" />
        {shfThresh != null && (
          <line
            x1={xFor(shfThresh)}
            y1={PAD}
            x2={xFor(shfThresh)}
            y2={PAD + usableHeight}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />
        )}
        {otpThresh != null && (
          <line
            x1={PAD}
            y1={yFor(otpThresh)}
            x2={WIDTH - PAD}
            y2={yFor(otpThresh)}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />
        )}
        {usable.map((p) => (
          <circle
            key={p.route}
            cx={xFor(p.shf)}
            cy={yFor(p.otp)}
            r={radiusFor(p.trips)}
            fill={tierColor(p.meetsOtp, p.meetsShf)}
            fillOpacity="0.75"
          >
            <title>
              {p.route} ({p.provider}) — OTP {Math.round(p.otp * 100)}%, SHF {Math.round(p.shf * 100)}%, {p.trips ?? 0} trips
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>SHF →</span>
        <span>↑ OTP</span>
      </div>
    </div>
  );
};

export default RouteQuadrantChart;
