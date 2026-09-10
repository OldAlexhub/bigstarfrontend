import { NavLink, Outlet } from "react-router-dom";

const NetworkSuccessLayout = () => (
  <div>
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Operations intelligence</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Network Success</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Turn source-system workbooks into reviewed, Deployment-enriched network records.
      </p>
    </div>
    <div className="mb-7 flex gap-6 border-b border-slate-200">
      <NavLink
        to="/network-success"
        end
        className={({ isActive }) =>
          `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500"
          }`
        }
      >
        Excel Submissions
      </NavLink>
      <NavLink
        to="/network-success/performance"
        className={({ isActive }) =>
          `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
            isActive ? "border-brand-500 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`
        }
      >
        Performance
      </NavLink>
    </div>
    <Outlet />
  </div>
);

export default NetworkSuccessLayout;
