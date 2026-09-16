import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import MasterRunCutsLayout from "./pages/master-run-cuts/MasterRunCutsLayout";
import RunCutsTable from "./pages/master-run-cuts/RunCutsTable";
import TrackerDashboard from "./pages/master-run-cuts/TrackerDashboard";
import DriversRoster from "./pages/master-run-cuts/DriversRoster";
import VehiclesRoster from "./pages/master-run-cuts/VehiclesRoster";
import DeploymentLayout from "./pages/deployment/DeploymentLayout";
import LiveSchedule from "./pages/deployment/LiveSchedule";
import IssueLog from "./pages/deployment/IssueLog";
import ClientReport from "./pages/deployment/ClientReport";
import Reporting from "./pages/deployment/Reporting";
import ActivityLog from "./pages/deployment/ActivityLog";
import ScheduleHistory from "./pages/deployment/ScheduleHistory";
import StandbyUtilization from "./pages/deployment/StandbyUtilization";
import EltReporting from "./pages/EltReporting";
import EltReportingLayout from "./pages/elt-reporting/EltReportingLayout";
import Leaderboard from "./pages/Leaderboard";
import UserAdmin from "./pages/UserAdmin";
import NetworkSuccessLayout from "./pages/network-success/NetworkSuccessLayout";
import ExcelSubmissions from "./pages/network-success/ExcelSubmissions";
import NetworkPerformance from "./pages/network-success/NetworkPerformance";
import EmailTemplates from "./pages/network-success/EmailTemplates";
import LdHelper from "./pages/network-success/LdHelper";
import TuiHelper from "./pages/network-success/TuiHelper";
import ReallocationRequests from "./pages/network-success/ReallocationRequests";
import CustomerServiceLayout from "./pages/customer-service/CustomerServiceLayout";
import CustomerServiceEntries from "./pages/customer-service/CustomerServiceEntries";
import CustomerServiceAnalytics from "./pages/customer-service/CustomerServiceAnalytics";
import SafetyLayout from "./pages/safety/SafetyLayout";
import SafetyEntries from "./pages/safety/SafetyEntries";
import SafetyAnalytics from "./pages/safety/SafetyAnalytics";
import SafetyScores from "./pages/safety/SafetyScores";
import OperationsReportingLayout from "./pages/operations-reporting/OperationsReportingLayout";
import KpiTracker from "./pages/operations-reporting/KpiTracker";
import MonthlyDashboard from "./pages/operations-reporting/MonthlyDashboard";
import CapQueue from "./pages/operations-reporting/CapQueue";
import CapReporting from "./pages/operations-reporting/CapReporting";
import ReceivingRequests from "./pages/deployment/ReceivingRequests";
import DeploymentPosts from "./pages/deployment/Posts";
import NetworkSuccessPosts from "./pages/network-success/Posts";
import PageAccessRoute, { AccessDenied } from "./components/PageAccessRoute";
import { useAuth } from "./context/AuthContext";
import { firstAccessiblePath } from "./config/pageAccess";

const HomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={firstAccessiblePath(user)} replace />;
};

const allow = (permission, page) => (
  <PageAccessRoute permission={permission}>{page}</PageAccessRoute>
);

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard" element={allow("dashboard", <Dashboard />)} />
          <Route path="/master-run-cuts" element={<MasterRunCutsLayout />}>
            <Route index element={allow("master_run_cuts.run_cuts", <RunCutsTable />)} />
            <Route path="drivers" element={allow("master_run_cuts.drivers", <DriversRoster />)} />
            <Route path="vehicles" element={allow("master_run_cuts.vehicles", <VehiclesRoster />)} />
            <Route path="tracker" element={allow("master_run_cuts.tracker", <TrackerDashboard />)} />
          </Route>
          <Route path="/deployment" element={<DeploymentLayout />}>
            <Route index element={allow("deployment.live_schedule", <LiveSchedule />)} />
            <Route path="standby-utilization" element={allow("deployment.standby_utilization", <StandbyUtilization />)} />
            <Route path="issue-log" element={allow("deployment.issue_log", <IssueLog />)} />
            <Route path="client-report" element={allow("deployment.client_report", <ClientReport />)} />
            <Route path="reporting" element={allow("deployment.reporting", <Reporting />)} />
            <Route path="schedule-history" element={allow("deployment.schedule_history", <ScheduleHistory />)} />
            <Route path="receiving-requests" element={allow("deployment.receiving_requests", <ReceivingRequests />)} />
            <Route path="posts" element={allow("deployment.posts", <DeploymentPosts />)} />
            <Route path="tracker-log" element={allow("deployment.tracker_log", <ActivityLog />)} />
          </Route>
          <Route path="/elt-reporting" element={<EltReportingLayout />}>
            <Route index element={allow("elt_reporting.operations_report", <EltReporting />)} />
          </Route>
          <Route path="/leaderboard" element={allow("leaderboard", <Leaderboard />)} />
          <Route path="/network-success" element={<NetworkSuccessLayout />}>
            <Route index element={allow("network_success.excel_submissions", <ExcelSubmissions />)} />
            <Route path="performance" element={allow("network_success.performance", <NetworkPerformance />)} />
            <Route path="reallocation-requests" element={allow("network_success.reallocation_requests", <ReallocationRequests />)} />
            <Route path="posts" element={allow("network_success.posts", <NetworkSuccessPosts />)} />
            <Route path="email-templates" element={allow("network_success.email_templates", <EmailTemplates />)} />
            <Route path="ld-helper" element={allow("network_success.ld_helper", <LdHelper />)} />
            <Route path="tui-helper" element={allow("network_success.tui_helper", <TuiHelper />)} />
          </Route>
          <Route path="/customer-service" element={<CustomerServiceLayout />}>
            <Route index element={allow("customer_service.monthly_counts", <CustomerServiceEntries />)} />
            <Route path="analytics" element={allow("customer_service.analytics", <CustomerServiceAnalytics />)} />
          </Route>
          <Route path="/safety" element={<SafetyLayout />}>
            <Route index element={allow("safety.accidents", <SafetyEntries />)} />
            <Route path="scores" element={allow("safety.scores", <SafetyScores />)} />
            <Route path="analytics" element={allow("safety.analytics", <SafetyAnalytics />)} />
          </Route>
          <Route path="/operations-reporting" element={<OperationsReportingLayout />}>
            <Route index element={allow("operations_reporting.kpi_tracker", <KpiTracker />)} />
            <Route path="dashboard" element={allow("operations_reporting.monthly_dashboard", <MonthlyDashboard />)} />
            <Route path="cap" element={allow("operations_reporting.cap", <CapQueue />)} />
            <Route path="cap-reporting" element={allow("operations_reporting.cap_reporting", <CapReporting />)} />
          </Route>
          <Route path="/settings" element={allow("settings.general", <SettingsPage />)} />
          <Route path="/settings/users" element={<UserAdmin />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
