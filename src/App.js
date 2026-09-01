import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import MasterRunCutsLayout from "./pages/master-run-cuts/MasterRunCutsLayout";
import RunCutsTable from "./pages/master-run-cuts/RunCutsTable";
import TrackerDashboard from "./pages/master-run-cuts/TrackerDashboard";
import DeploymentLayout from "./pages/deployment/DeploymentLayout";
import LiveSchedule from "./pages/deployment/LiveSchedule";
import IssueLog from "./pages/deployment/IssueLog";
import ClientReport from "./pages/deployment/ClientReport";
import Reporting from "./pages/deployment/Reporting";
import EltReporting from "./pages/EltReporting";
import Leaderboard from "./pages/Leaderboard";
import UserAdmin from "./pages/UserAdmin";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/master-run-cuts" element={<MasterRunCutsLayout />}>
            <Route index element={<RunCutsTable />} />
            <Route path="tracker" element={<TrackerDashboard />} />
          </Route>
          <Route path="/deployment" element={<DeploymentLayout />}>
            <Route index element={<LiveSchedule />} />
            <Route path="issue-log" element={<IssueLog />} />
            <Route path="client-report" element={<ClientReport />} />
            <Route path="reporting" element={<Reporting />} />
          </Route>
          <Route path="/elt-reporting" element={<EltReporting />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/users" element={<UserAdmin />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
