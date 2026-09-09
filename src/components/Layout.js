import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = () => (
  <div className="flex min-h-screen flex-col bg-slate-50">
    <Navbar />
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Outlet />
    </main>
    <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 print:hidden">
      &copy; {new Date().getFullYear()} Big Star Transit LLC
    </footer>
  </div>
);

export default Layout;
