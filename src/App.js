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
import NetworkSuccessLayout from "./pages/network-success/NetworkSuccessLayout";
import DailyKpiUpload from "./pages/network-success/DailyKpiUpload";
import NetworkDashboard from "./pages/network-success/NetworkDashboard";
import FulfillmentBrain from "./pages/network-success/FulfillmentBrain";
import OperationalAnalysis from "./pages/network-success/OperationalAnalysis";
import EodBrief from "./pages/network-success/EodBrief";
import WeeklyReport from "./pages/network-success/WeeklyReport";
import ProviderCheckIn from "./pages/network-success/ProviderCheckIn";
import ProviderPerformanceReview from "./pages/network-success/ProviderPerformanceReview";
import WeeklyAnalytics from "./pages/network-success/WeeklyAnalytics";
import ProviderDiagnostics from "./pages/network-success/ProviderDiagnostics";
import MonthlyAnalytics from "./pages/network-success/MonthlyAnalytics";
import NsSettingsPage from "./pages/network-success/NsSettingsPage";
import EmailTemplates from "./pages/network-success/EmailTemplates";
import EltReporting from "./pages/EltReporting";
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
          <Route path="/network-success" element={<NetworkSuccessLayout />}>
            <Route index element={<DailyKpiUpload />} />
            <Route path="dashboard" element={<NetworkDashboard />} />
            <Route path="fulfillment" element={<FulfillmentBrain />} />
            <Route path="operational" element={<OperationalAnalysis />} />
            <Route path="reports/eod" element={<EodBrief />} />
            <Route path="reports/weekly" element={<WeeklyReport />} />
            <Route path="reports/provider-checkin" element={<ProviderCheckIn />} />
            <Route path="reports/provider-performance" element={<ProviderPerformanceReview />} />
            <Route path="analytics/weekly" element={<WeeklyAnalytics />} />
            <Route path="analytics/provider-diagnostics" element={<ProviderDiagnostics />} />
            <Route path="analytics/monthly" element={<MonthlyAnalytics />} />
            <Route path="settings" element={<NsSettingsPage />} />
            <Route path="email-templates" element={<EmailTemplates />} />
          </Route>
          <Route path="/elt-reporting" element={<EltReporting />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/users" element={<UserAdmin />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
