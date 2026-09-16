import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccessPage } from "../../config/pageAccess";

const tabClasses = ({ isActive }) => `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
  isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
}`;

const EltReportingLayout = () => {
  const { user } = useAuth();
  return (
  <div>
    <div className="mb-6 flex gap-6 overflow-x-auto border-b border-slate-200 print:hidden">
      {canAccessPage(user, "elt_reporting.operations_report") && <NavLink to="/elt-reporting" end className={tabClasses}>Operations Report</NavLink>}
    </div>
    <Outlet />
  </div>
  );
};

export default EltReportingLayout;
