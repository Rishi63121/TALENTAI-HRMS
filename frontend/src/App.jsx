import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import BrandLoader from './components/feedback/BrandLoader';
import { NotFoundPage } from './components/feedback/ErrorState';
import { HomeRedirect, PublicOnly, RequireAuth } from './components/auth/Guards';

// Every page is its own chunk: the first screen loads fast, the rest stream in on demand.
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const AdminAttendance = lazy(() => import('./pages/admin/Attendance'));
const AdminPayroll = lazy(() => import('./pages/admin/Payroll'));
const AdminPerformance = lazy(() => import('./pages/admin/Performance'));
const Recruiters = lazy(() => import('./pages/admin/Recruiters'));

// Shared by admins and recruiters
const Jobs = lazy(() => import('./pages/shared/Jobs'));
const Candidates = lazy(() => import('./pages/shared/Candidates'));
const Screening = lazy(() => import('./pages/shared/Screening'));
const Interview = lazy(() => import('./pages/shared/Interview'));
const Onboarding = lazy(() => import('./pages/shared/Onboarding'));

const RecruiterDashboard = lazy(() => import('./pages/recruiter/RecruiterDashboard'));

const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const EmployeeAttendance = lazy(() => import('./pages/employee/Attendance'));
const EmployeePayroll = lazy(() => import('./pages/employee/Payroll'));
const EmployeePerformance = lazy(() => import('./pages/employee/Performance'));
const Profile = lazy(() => import('./pages/employee/Profile'));

/** Routes that both staff roles share, mounted under each role's own prefix. */
const staffRoutes = (prefix) => [
  <Route key={`${prefix}-jobs`} path={`${prefix}/jobs`} element={<Jobs />} />,
  <Route key={`${prefix}-candidates`} path={`${prefix}/candidates`} element={<Candidates />} />,
  <Route key={`${prefix}-screening`} path={`${prefix}/screening`} element={<Screening />} />,
  <Route key={`${prefix}-interview`} path={`${prefix}/interview`} element={<Interview />} />,
  <Route key={`${prefix}-onboarding`} path={`${prefix}/onboarding`} element={<Onboarding />} />,
];

export default function App() {
  return (
    <Suspense fallback={<BrandLoader />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        {/* Admin */}
        <Route element={<RequireAuth roles={['admin']} />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/employees" element={<Employees />} />
            <Route path="/admin/attendance" element={<AdminAttendance />} />
            <Route path="/admin/payroll" element={<AdminPayroll />} />
            <Route path="/admin/performance" element={<AdminPerformance />} />
            <Route path="/admin/recruiters" element={<Recruiters />} />
            {staffRoutes('/admin')}
          </Route>
        </Route>

        {/* Recruiter */}
        <Route element={<RequireAuth roles={['recruiter']} />}>
          <Route element={<AppShell />}>
            <Route path="/recruiter" element={<Navigate to="/recruiter/dashboard" replace />} />
            <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
            {staffRoutes('/recruiter')}
          </Route>
        </Route>

        {/* Employee */}
        <Route element={<RequireAuth roles={['employee']} />}>
          <Route element={<AppShell />}>
            <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/attendance" element={<EmployeeAttendance />} />
            <Route path="/employee/payroll" element={<EmployeePayroll />} />
            <Route path="/employee/performance" element={<EmployeePerformance />} />
            <Route path="/employee/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
