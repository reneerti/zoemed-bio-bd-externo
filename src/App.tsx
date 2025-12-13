import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import SplashScreen from "@/components/SplashScreen";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SelectUser from "./pages/SelectUser";
import Dashboard from "./pages/Dashboard";
import AddMeasurement from "./pages/AddMeasurement";
import AddPatientMeasurement from "./pages/AddPatientMeasurement";
import Upload from "./pages/Upload";
import Install from "./pages/Install";
import MasterDashboard from "./pages/MasterDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if app is running as installed PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true ||
                  document.referrer.includes('android-app://');
    
    // Check if splash was already shown in this session
    const splashShown = sessionStorage.getItem('splashShown');
    
    if (isPWA && !splashShown) {
      setShowSplash(true);
    } else {
      setIsReady(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
    setIsReady(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
          {isReady && (
            <>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Login />} />
                  <Route path="/cadastro" element={<Signup />} />
                  <Route path="/instalar" element={<Install />} />
                  
                  {/* Protected routes - require authentication */}
                  <Route path="/selecionar" element={
                    <ProtectedRoute>
                      <SelectUser />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard/:person" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/adicionar" element={
                    <ProtectedRoute>
                      <AddMeasurement />
                    </ProtectedRoute>
                  } />
                  <Route path="/upload" element={
                    <ProtectedRoute>
                      <Upload />
                    </ProtectedRoute>
                  } />
                  <Route path="/paciente/:patientId" element={
                    <ProtectedRoute>
                      <PatientDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/adicionar-medida/:patientId" element={
                    <ProtectedRoute>
                      <AddPatientMeasurement />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin-only routes */}
                  <Route path="/master" element={
                    <ProtectedRoute requireAdmin>
                      <MasterDashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </>
          )}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
