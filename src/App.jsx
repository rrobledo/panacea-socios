import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './components/auth/LoginPage';
import { OAuthCallback } from './components/auth/OAuthCallback';
import { VentasPage } from './pages/VentasPage';
import { RankingComprasPage, CumpleaniosPage } from './pages/ReportesPages';
import { SociosPorPreferenciaPage } from './pages/PreferenciasPage';
import { MaestroPuntosPage } from './pages/MaestroPuntosPage';
import { PageLoader } from './components/ui';
import { CampaniasPage } from './pages/whatsapp/CampaniasPage';
import { NuevaCampaniaPage } from './pages/whatsapp/NuevaCampaniaPage';
import { CampaniaDetallePage } from './pages/whatsapp/CampaniaDetallePage';
import { EnvioMasivoPage } from './pages/whatsapp/EnvioMasivoPage';
import { PlantillasPage } from './pages/whatsapp/PlantillasPage';
import { PlantillaEditorPage } from './pages/whatsapp/PlantillaEditorPage';
import { MensajesWhatsappPage } from './pages/whatsapp/MensajesWhatsappPage';
import { ReportesWhatsappPage } from './pages/whatsapp/ReportesWhatsappPage';
import { ConfiguracionWhatsappPage } from './pages/whatsapp/ConfiguracionWhatsappPage';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/*" element={
              <PrivateRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<VentasPage />} />
                    <Route path="/reportes/ranking-compras" element={<RankingComprasPage />} />
                    <Route path="/reportes/cumpleanios" element={<CumpleaniosPage />} />
                    <Route path="/reportes/preferencias" element={<SociosPorPreferenciaPage />} />
                    <Route path="/maestros/puntos" element={<MaestroPuntosPage />} />
                    <Route path="/whatsapp/campanias" element={<CampaniasPage />} />
                    <Route path="/whatsapp/campanias/nueva" element={<NuevaCampaniaPage />} />
                    <Route path="/whatsapp/campanias/:id" element={<CampaniaDetallePage />} />
                    <Route path="/whatsapp/envio-masivo" element={<EnvioMasivoPage />} />
                    <Route path="/whatsapp/plantillas" element={<PlantillasPage />} />
                    <Route path="/whatsapp/plantillas/:id" element={<PlantillaEditorPage />} />
                    <Route path="/whatsapp/mensajes" element={<MensajesWhatsappPage />} />
                    <Route path="/whatsapp/reportes" element={<ReportesWhatsappPage />} />
                    <Route path="/whatsapp/configuracion" element={<ConfiguracionWhatsappPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
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
