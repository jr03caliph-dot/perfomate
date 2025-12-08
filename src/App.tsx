import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClassesProvider } from './contexts/ClassesContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import MultipleEntry from './pages/MultipleEntry';
import AddStudents from './pages/AddStudents';
import Reports from './pages/Reports';
import MarkAttendance from './pages/MarkAttendance';
import AttendanceMultipleEntry from './pages/AttendanceMultipleEntry';
import AttendanceReports from './pages/AttendanceReports';
import ViewByPrayer from './pages/ViewByPrayer';
import MorningBlissScores from './pages/MorningBlissScores';
import MorningBlissReports from './pages/MorningBlissReports';
import AdminPanel from './pages/AdminPanel';
import ViewHistory from './pages/ViewHistory';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #16a34a',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" replace />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/classes"
        element={
          <PrivateRoute>
            <Layout>
              <Classes />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/view-history"
        element={
          <PrivateRoute>
            <Layout>
              <ViewHistory />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/multiple-entry"
        element={
          <PrivateRoute>
            <Layout>
              <MultipleEntry />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/add-students"
        element={
          <PrivateRoute>
            <Layout>
              <AddStudents />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Layout>
              <Reports />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance/mark"
        element={
          <PrivateRoute>
            <Layout>
              <MarkAttendance />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance/multiple-entry"
        element={
          <PrivateRoute>
            <Layout>
              <AttendanceMultipleEntry />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance/reports"
        element={
          <PrivateRoute>
            <Layout>
              <AttendanceReports />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance/view-by-prayer"
        element={
          <PrivateRoute>
            <Layout>
              <ViewByPrayer />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/morning-bliss/scores"
        element={
          <PrivateRoute>
            <Layout>
              <MorningBlissScores />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/morning-bliss/reports"
        element={
          <PrivateRoute>
            <Layout>
              <MorningBlissReports />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Layout>
              <AdminPanel />
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClassesProvider>
          <AppContent />
        </ClassesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
