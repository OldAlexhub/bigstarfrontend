const pct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const STREAK_STYLES = {
  Elite: "bg-amber-100 text-amber-800",
  "Rising Star": "bg-blue-100 text-blue-700",
  Sustained: "bg-green-100 text-green-700",
  "Act Now": "bg-red-100 text-red-700",
  Improving: "bg-green-100 text-green-700",
  Worsening: "bg-red-100 text-red-700",
  Stagnant: "bg-amber-100 text-amber-800",
};

// A ranked-route card with a computed streak badge (consecutive weeks in
// the Top 5 / Bottom 5, from server/utils/kpi/streaks.js's computeStreaks) —
// used anywhere a route-rank entry needs the same at-a-glance treatment
// (Network Dashboard's Top 5/Bottom 5, Provider Check-In's repeat
// bottom-5 list).
const RankCard = ({ entry }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-slate-900">
        #{entry.rank} · {entry.route}
      </span>
      {entry.streakStatus && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STREAK_STYLES[entry.streakStatus] || "bg-slate-100 text-slate-600"}`}>
          {entry.streakStatus}
        </span>
      )}
    </div>
    <p className="mt-1 text-xs text-slate-500">{entry.provider}</p>
    <p className="mt-2 text-lg font-semibold text-slate-900">{pct(entry.composite)}</p>
  </div>
);

export default RankCard;
