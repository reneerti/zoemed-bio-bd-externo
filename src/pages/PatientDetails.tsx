import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, User, Activity, Brain, Target, Calendar, 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  FileText, Pill, Scale, Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import BioimpedanceTable from "@/components/BioimpedanceTable";
import { PatientScoreCard } from "@/components/PatientScoreCard";
import splashLogo from "@/assets/zoemedbio-splash-logo.png";

interface PatientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: string;
  avatar_url: string | null;
  created_at: string;
  birth_date: string | null;
  height: number | null;
  medical_notes: string | null;
}

interface BioimpedanceRecord {
  id: string;
  measurement_date: string;
  weight: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  muscle_mass: number | null;
  visceral_fat: number | null;
  muscle_rate_percent: number | null;
  bmr: number | null;
  metabolic_age: number | null;
  week_number: number | null;
  monjaro_dose: number | null;
  status: string | null;
  fat_mass: number | null;
  lean_mass: number | null;
  skeletal_muscle_percent: number | null;
  bone_mass: number | null;
  protein_mass: number | null;
  protein_percent: number | null;
  body_water_percent: number | null;
  moisture_content: number | null;
  subcutaneous_fat_percent: number | null;
  whr: number | null;
}

interface AIAnalysis {
  id: string;
  analysis_date: string;
  summary: string;
  full_analysis: string;
  weight_at_analysis: number | null;
  bmi_at_analysis: number | null;
}

interface PatientScore {
  score: number;
  criticality: string | null;
  weight_evolution: number | null;
  fat_evolution: number | null;
  muscle_evolution: number | null;
  rank_position: number | null;
}

const PatientDetails = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [bioimpedanceRecords, setBioimpedanceRecords] = useState<BioimpedanceRecord[]>([]);
  const [aiAnalyses, setAIAnalyses] = useState<AIAnalysis[]>([]);
  const [patientScore, setPatientScore] = useState<PatientScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Acesso negado");
      navigate("/selecionar");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin && patientId) {
      loadPatientData();
    }
  }, [isAdmin, patientId]);

  const loadPatientData = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Load patient info
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Load bioimpedance records
      const { data: bioData, error: bioError } = await supabase
        .from("bioimpedance")
        .select("*")
        .eq("patient_id", patientId)
        .order("measurement_date", { ascending: false });

      if (bioError) throw bioError;
      setBioimpedanceRecords(bioData || []);

      // Load AI analyses
      const { data: aiData, error: aiError } = await supabase
        .from("ai_analysis_history")
        .select("*")
        .eq("patient_id", patientId)
        .order("analysis_date", { ascending: false });

      if (aiError) throw aiError;
      setAIAnalyses(aiData || []);

      // Load patient score
      const { data: scoreData, error: scoreError } = await supabase
        .from("patient_scores")
        .select("*")
        .eq("patient_id", patientId)
        .single();

      if (!scoreError && scoreData) {
        setPatientScore(scoreData);
      }

    } catch (error) {
      console.error("Error loading patient data:", error);
      toast.error("Erro ao carregar dados do paciente");
    } finally {
      setLoading(false);
    }
  };

  const getCriticalityColor = (criticality: string | null) => {
    switch (criticality) {
      case "healthy": return "bg-green-500/10 border-green-500/30 text-green-600";
      case "normal": return "bg-blue-500/10 border-blue-500/30 text-blue-600";
      case "attention": return "bg-yellow-500/10 border-yellow-500/30 text-yellow-600";
      case "critical": return "bg-red-500/10 border-red-500/30 text-red-600";
      default: return "bg-muted border-border text-muted-foreground";
    }
  };

  const getCriticalityLabel = (criticality: string | null) => {
    switch (criticality) {
      case "healthy": return "Saudável";
      case "normal": return "Normal";
      case "attention": return "Atenção";
      case "critical": return "Crítico";
      default: return "Sem dados";
    }
  };

  const getCriticalityIcon = (criticality: string | null) => {
    switch (criticality) {
      case "healthy": return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "normal": return <Activity className="w-5 h-5 text-blue-600" />;
      case "attention": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "critical": return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const latestRecord = bioimpedanceRecords[0];

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-xl">Carregando...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-muted-foreground text-xl">Paciente não encontrado</div>
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
              <Button variant="ghost" size="icon" onClick={() => navigate("/master")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={splashLogo} alt="ZOEMEDBio" className="h-10 object-contain" />
            </div>
            <Badge className={getCriticalityColor(patientScore?.criticality)}>
              {getCriticalityIcon(patientScore?.criticality)}
              <span className="ml-1">{getCriticalityLabel(patientScore?.criticality)}</span>
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Patient Header Card */}
        <Card className="card-elevated overflow-hidden">
          <div className={`h-2 ${
            patientScore?.criticality === "healthy" ? "bg-green-500" :
            patientScore?.criticality === "normal" ? "bg-blue-500" :
            patientScore?.criticality === "attention" ? "bg-yellow-500" :
            patientScore?.criticality === "critical" ? "bg-red-500" :
            "bg-muted"
          }`} />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={patient.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                  {patient.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{patient.name}</h1>
                  <Badge variant={patient.status === "active" ? "default" : "secondary"}>
                    {patient.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Email:</span> {patient.email || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Telefone:</span> {patient.phone || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Idade:</span> {calculateAge(patient.birth_date) || "—"} anos
                  </div>
                  <div>
                    <span className="font-medium">Altura:</span> {patient.height ? `${patient.height} cm` : "—"}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-xl">
                  <Scale className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">{latestRecord?.weight?.toFixed(1) || "—"}</div>
                  <div className="text-xs text-muted-foreground">kg atual</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-xl">
                  <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">{latestRecord?.bmi?.toFixed(1) || "—"}</div>
                  <div className="text-xs text-muted-foreground">IMC</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-xl">
                  <Heart className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">{latestRecord?.body_fat_percent?.toFixed(1) || "—"}%</div>
                  <div className="text-xs text-muted-foreground">gordura</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score and Evolution Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          <PatientScoreCard patientId={patientId!} patientName={patient.name} />
          
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Evolução Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <div className={`text-2xl font-bold ${
                    (patientScore?.weight_evolution ?? 0) > 0 ? "text-green-600" : 
                    (patientScore?.weight_evolution ?? 0) < 0 ? "text-red-600" : ""
                  }`}>
                    {patientScore?.weight_evolution ? `${patientScore.weight_evolution.toFixed(1)}%` : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Peso</div>
                  {(patientScore?.weight_evolution ?? 0) > 0 && (
                    <TrendingDown className="w-4 h-4 mx-auto mt-1 text-green-600" />
                  )}
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <div className={`text-2xl font-bold ${
                    (patientScore?.fat_evolution ?? 0) > 0 ? "text-green-600" : 
                    (patientScore?.fat_evolution ?? 0) < 0 ? "text-red-600" : ""
                  }`}>
                    {patientScore?.fat_evolution ? `${patientScore.fat_evolution.toFixed(1)}%` : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Gordura</div>
                  {(patientScore?.fat_evolution ?? 0) > 0 && (
                    <TrendingDown className="w-4 h-4 mx-auto mt-1 text-green-600" />
                  )}
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <div className={`text-2xl font-bold ${
                    (patientScore?.muscle_evolution ?? 0) > 0 ? "text-green-600" : 
                    (patientScore?.muscle_evolution ?? 0) < 0 ? "text-red-600" : ""
                  }`}>
                    {patientScore?.muscle_evolution ? `${patientScore.muscle_evolution.toFixed(1)}%` : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Músculo</div>
                  {(patientScore?.muscle_evolution ?? 0) > 0 && (
                    <TrendingUp className="w-4 h-4 mx-auto mt-1 text-green-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical AI Insights */}
        {aiAnalyses.length > 0 && (
          <Card className="card-elevated border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Última Análise IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    {new Date(aiAnalyses[0].analysis_date).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-foreground">{aiAnalyses[0].summary}</p>
                </div>
                <div className="flex gap-2 text-sm">
                  {aiAnalyses[0].weight_at_analysis && (
                    <Badge variant="outline">{aiAnalyses[0].weight_at_analysis} kg</Badge>
                  )}
                  {aiAnalyses[0].bmi_at_analysis && (
                    <Badge variant="outline">IMC {aiAnalyses[0].bmi_at_analysis}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medical Notes */}
        {patient.medical_notes && (
          <Card className="card-elevated border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-600" />
                Observações Médicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{patient.medical_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Detailed Tabs */}
        <Tabs defaultValue="measurements" className="space-y-4">
          <TabsList className="bg-card border">
            <TabsTrigger value="measurements" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Medições
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Análises IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="measurements">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Medições</span>
                  <Badge variant="outline">{bioimpedanceRecords.length} registros</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bioimpedanceRecords.length > 0 ? (
                  <BioimpedanceTable 
                    records={bioimpedanceRecords} 
                    isMale={patient.gender === "male"} 
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma medição registrada</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Histórico de Análises IA</CardTitle>
              </CardHeader>
              <CardContent>
                {aiAnalyses.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {aiAnalyses.map((analysis) => (
                        <div key={analysis.id} className="p-4 bg-muted/30 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {new Date(analysis.analysis_date).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric"
                              })}
                            </span>
                            <div className="flex gap-2">
                              {analysis.weight_at_analysis && (
                                <Badge variant="outline" className="text-xs">
                                  {analysis.weight_at_analysis} kg
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-medium text-primary mb-2">{analysis.summary}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {analysis.full_analysis}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma análise IA disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PatientDetails;
