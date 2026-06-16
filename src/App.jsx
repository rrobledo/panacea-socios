import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './components/auth/LoginPage';
import { OAuthCallback } from './components/auth/OAuthCallback';
import { DashboardPage } from './pages/DashboardPage';
import { ChartsPage } from './pages/ChartsPage';
import { ProductsPage } from './pages/ProductsPage';
import { MasterDetailPage, ComplexFormPage } from './pages/FormPages';
import { PrintableReportPage } from './pages/PrintableReportPage';
import { PageLoader } from './components/ui';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  return children;
};

const Placeholder = ({ title }) => (
  <div>
    <div className="page-header"><div className="page-title">{title}</div></div>
    <div className="card">
      <div className="card-body" style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-600)' }}>{title}</div>
        <div style={{ marginTop: 8 }}>This page is ready to be implemented.</div>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/register" element={<LoginPage />} />
            <Route path="/*" element={
              <PrivateRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/"                    element={<DashboardPage />} />
                    <Route path="/charts"              element={<ChartsPage />} />
                    <Route path="/products"            element={<ProductsPage />} />
                    <Route path="/orders"              element={<Placeholder title="Orders" />} />
                    <Route path="/customers"           element={<Placeholder title="Customers" />} />
                    <Route path="/users"               element={<Placeholder title="Users" />} />
                    <Route path="/forms/master-detail" element={<MasterDetailPage />} />
                    <Route path="/forms/complex"       element={<ComplexFormPage />} />
                    <Route path="/reports/grid"        element={<Placeholder title="Report Grid" />} />
                    <Route path="/reports/builder"     element={<Placeholder title="Report Builder" />} />
                    <Route path="/reports/printable"   element={<PrintableReportPage />} />
                    <Route path="/settings"            element={<Placeholder title="Settings" />} />
                    <Route path="/settings/profile"    element={<ComplexFormPage />} />
                    <Route path="*"                    element={<Placeholder title="404 – Not Found" />} />
                  </Routes>
                </AppLayout>
              </PrivateRoute>
            } />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
