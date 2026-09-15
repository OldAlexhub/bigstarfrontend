import { NavLink, Outlet } from "react-router-dom";

const tabClasses = ({ isActive }) => `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
  isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
}`;

const EltReportingLayout = () => (
  <div>
    <div className="mb-6 flex gap-6 overflow-x-auto border-b border-slate-200 print:hidden">
      <NavLink to="/elt-reporting" end className={tabClasses}>Operations Report</NavLink>
      <NavLink to="/elt-reporting/outlook" className={tabClasses}>Company Outlook</NavLink>
    </div>
    <Outlet />
  </div>
);

export default EltReportingLayout;
