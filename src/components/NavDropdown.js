import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

const triggerClasses = (active, open) =>
  `flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active || open
      ? "bg-brand-500 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const itemClasses = ({ isActive }) =>
  `block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-500 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const NavDropdown = ({ label, items, active }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={triggerClasses(active, open)}
      >
        {label}
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-48 space-y-0.5 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
          {items.map((item) => (
            <NavLink key={item.key} to={item.path} className={itemClasses} onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;
