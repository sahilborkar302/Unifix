import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth, homePathFor } from './context/AuthContext';
import Home from './pages/Home';
import Labs from './pages/Labs';
import LabDetail from './pages/LabDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import { ForgotPassword, Contact, NotFound } from './pages/Static';
import StudentDashboard from './pages/student/StudentDashboard';
import ReportProblem from './pages/student/ReportProblem';
import MyReports from './pages/student/MyReports';
import Instructions from './pages/student/Instructions';
import Workboard from './pages/tech/Workboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Complaints from './pages/admin/Complaints';
import ManageLabs from './pages/admin/ManageLabs';
import Users from './pages/admin/Users';

// Logged-in staff land on their own dashboard instead of the public home page
function HomeGate() {
  const { user } = useAuth();
  return user && user.role !== 'student' ? <Navigate to={homePathFor(user.role)} replace /> : <Home />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomeGate />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/labs/:id" element={<LabDetail />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/dashboard" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute roles={['student']}><ReportProblem /></ProtectedRoute>} />
        <Route path="/my-reports" element={<ProtectedRoute roles={['student']}><MyReports /></ProtectedRoute>} />
        <Route path="/instructions" element={<ProtectedRoute roles={['student']}><Instructions /></ProtectedRoute>} />

        <Route path="/workboard" element={<ProtectedRoute roles={['technician']}><Workboard /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute roles={['admin']}><Complaints /></ProtectedRoute>} />
        <Route path="/admin/labs" element={<ProtectedRoute roles={['admin']}><ManageLabs /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />

        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
