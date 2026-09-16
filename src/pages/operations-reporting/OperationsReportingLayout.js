import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccessPage } from "../../config/pageAccess";

const tabClasses = ({ isActive }) => `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
  isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
}`;

const OperationsReportingLayout = () => {
  const { user } = useAuth();
  return (
  <div>
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Monthly performance management</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Operations Reporting</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">Review division KPIs, monitor monthly status, and complete corrective action plans for results below threshold.</p>
    </div>
    <div className="mb-7 flex gap-6 overflow-x-auto border-b border-slate-200">
      {canAccessPage(user, "operations_reporting.kpi_tracker") && <NavLink to="/operations-reporting" end className={tabClasses}>12 Month KPI Tracker</NavLink>}
      {canAccessPage(user, "operations_reporting.monthly_dashboard") && <NavLink to="/operations-reporting/dashboard" className={tabClasses}>Monthly KPI Snapshot</NavLink>}
      {canAccessPage(user, "operations_reporting.cap") && <NavLink to="/operations-reporting/cap" className={tabClasses}>CAP</NavLink>}
      {canAccessPage(user, "operations_reporting.cap_reporting") && <NavLink to="/operations-reporting/cap-reporting" className={tabClasses}>CAP Reporting</NavLink>}
    </div>
    <Outlet />
  </div>
  );
};

export default OperationsReportingLayout;
