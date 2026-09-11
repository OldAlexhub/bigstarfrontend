import { NavLink, Outlet } from "react-router-dom";

const tabClasses = ({ isActive }) =>
  `inline-flex border-b-2 px-1 py-3 text-sm font-medium ${
    isActive
      ? "border-brand-500 text-brand-700"
      : "border-transparent text-slate-500 hover:text-slate-700"
  }`;

const CustomerServiceLayout = () => (
  <div>
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Customer experience</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Customer Service</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Record monthly feedback by division and measure complaints and compliments against completed trips.
      </p>
    </div>
    <div className="mb-7 flex gap-6 border-b border-slate-200">
      <NavLink to="/customer-service" end className={tabClasses}>
        Monthly Counts
      </NavLink>
      <NavLink to="/customer-service/analytics" className={tabClasses}>
        Analytics
      </NavLink>
    </div>
    <Outlet />
  </div>
);

export default CustomerServiceLayout;
