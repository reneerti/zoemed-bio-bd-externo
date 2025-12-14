import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Users, Activity, Settings, BarChart3, 
  ArrowLeft, LogOut, TrendingUp, TrendingDown, RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import PatientManagement from "@/components/master/PatientManagement";
import MasterReports from "@/components/master/MasterReports";
import CustomFieldsConfig from "@/components/master/CustomFieldsConfig";
import GamificationDashboard from "@/components/master/GamificationDashboard";
import PdfReportGenerator from "@/components/master/PdfReportGenerator";
import splashLogo from "@/assets/zoemedbio-splash-logo.png";

interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: string;
  avatar_url: string | null;
  created_at: string;
  latestWeight?: number;
  latestBmi?: number;
  weightChange?: number;
  score?: number;
  criticality?: string;
}

interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  totalMeasurements: number;
  avgWeightLoss: number;
}

const MasterDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    activePatients: 0,
    totalMeasurements: 0,
    avgWeightLoss: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/selecionar");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .order("name");

      if (patientsError) throw patientsError;

      const { data: bioData, error: bioError } = await supabase
        .from("bioimpedance")
        .select("patient_id, weight, bmi, measurement_date")
        .order("measurement_date", { ascending: false });

      if (bioError) throw bioError;

      // Load patient scores
      const { data: scoresData, error: scoresError } = await supabase
        .from("patient_scores")
        .select("patient_id, score, criticality");

      if (scoresError) console.error("Error loading scores:", scoresError);

      const patientsWithStats = (patientsData || []).map(patient => {
        const patientBio = bioData?.filter(b => b.patient_id === patient.id) || [];
        const latestWeight = patientBio[0]?.weight;
        const latestBmi = patientBio[0]?.bmi;
        
        let weightChange = 0;
        if (patientBio.length >= 2) {
          const firstWeight = patientBio[patientBio.length - 1]?.weight;
          if (firstWeight && latestWeight) {
            weightChange = latestWeight - firstWeight;
          }
        }

        // Add score data
        const scoreData = scoresData?.find(s => s.patient_id === patient.id);

        return {
          ...patient,
          latestWeight,
          latestBmi,
          weightChange,
          score: scoreData?.score,
          criticality: scoreData?.criticality
        };
      });

      setPatients(patientsWithStats);

      const activeCount = patientsData?.filter(p => p.status === "active").length || 0;
      const totalBio = bioData?.length || 0;
      
      const weightChanges = patientsWithStats
        .filter(p => p.weightChange !== undefined && p.weightChange !== 0)
        .map(p => p.weightChange || 0);
      const avgLoss = weightChanges.length > 0 
        ? weightChanges.reduce((a, b) => a + b, 0) / weightChanges.length 
        : 0;

      setStats({
        totalPatients: patientsData?.length || 0,
        activePatients: activeCount,
        totalMeasurements: totalBio,
        avgWeightLoss: avgLoss
      });

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleForceRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Clear any cached data in localStorage
      const keysToPreserve = ['sb-xrqtjblsglcdrfwzcbit-auth-token'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToPreserve.some(preserve => key.includes(preserve))) {
          // Keep auth tokens, clear other caches
          if (key.includes('cache') || key.includes('Cache')) {
            localStorage.removeItem(key);
          }
        }
      });

      // Clear session storage caches
      sessionStorage.clear();

      // Reload all data from database
      await loadData();

      toast.success("Dados atualizados com sucesso!", {
        description: "Cache limpo e dados recarregados do servidor",
      });
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Erro ao atualizar dados");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/selecionar")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img src={splashLogo} alt="ZOEMEDBio" className="h-12 object-contain" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
              </Button>
              <PdfReportGenerator patients={patients} />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pacientes</p>
                  <p className="text-2xl font-bold">{stats.totalPatients}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activePatients}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Medições</p>
                  <p className="text-2xl font-bold">{stats.totalMeasurements}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-elevated">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média Perda</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.avgWeightLoss < 0 ? "" : "+"}{stats.avgWeightLoss.toFixed(1)} kg
                  </p>
                </div>
                {stats.avgWeightLoss < 0 ? (
                  <TrendingDown className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingUp className="w-8 h-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="patients" className="space-y-4">
          <TabsList className="bg-card border">
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Pacientes
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Gamificação
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="patients">
            <PatientManagement 
              patients={filteredPatients} 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="gamification">
            <GamificationDashboard patients={patients} />
          </TabsContent>

          <TabsContent value="reports">
            <MasterReports patients={patients} />
          </TabsContent>

          <TabsContent value="settings">
            <CustomFieldsConfig />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MasterDashboard;