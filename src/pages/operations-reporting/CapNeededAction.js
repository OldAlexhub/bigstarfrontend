import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../../api/client";
import { formatKpi, monthLabel, statusClasses } from "./reportingUi";

const CapNeededAction = ({ capNeeded, format }) => {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  const open = async () => {
    setOpening(true);
    setError("");
    try {
      const data = await apiPost("/api/operations-reporting/caps", {
        division: capNeeded.division,
        kpiKey: capNeeded.kpiKey,
        triggerMonth: capNeeded.triggerMonth,
      });
      navigate("/operations-reporting/cap", { state: { openedCapId: data.cap.id } });
    } catch (err) {
      setError(err.message);
      setOpening(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses[capNeeded.status] || statusClasses.red}`}>CAP needed</span>
        <button type="button" onClick={open} disabled={opening} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
          {opening ? "Opening…" : "Open CAP"}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">{formatKpi(capNeeded.value, format)} vs {formatKpi(capNeeded.target, format)} target · {monthLabel(capNeeded.triggerMonth, true)}</p>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
};

export default CapNeededAction;
