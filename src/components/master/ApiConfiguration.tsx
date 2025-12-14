import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, Key, Cpu, Eye, EyeOff, Save, RefreshCw, 
  Zap, Server, Activity, AlertCircle, CheckCircle2, 
  Cloud, Plug, User, BarChart3, Users, TrendingUp, Calendar
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface ApiConfig {
  id: string;
  config_key: string;
  config_value: string | null;
  provider: string | null;
  is_active: boolean;
  priority: number;
}

interface UsageStats {
  provider: string;
  operation_type: string;
  total_requests: number;
  total_cost: number;
  success_rate: number;
}

interface PatientUsage {
  patient_id: string;
  patient_name: string;
  ocr_requests: number;
  ai_requests: number;
  total_cost: number;
}

interface DailyUsage {
  date: string;
  ocr: number;
  ai: number;
  cost: number;
}

interface ProviderUsage {
  name: string;
  value: number;
  color: string;
}

interface DatabaseConfig {
  type: "api" | "cloud";
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  supabaseUrl: string;
  supabaseKey: string;
}

interface ApiKeys {
  lovable_api_key: string;
  google_vision_key: string;
  openai_key: string;
}

const ApiConfiguration = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [patientUsage, setPatientUsage] = useState<PatientUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [providerUsage, setProviderUsage] = useState<ProviderUsage[]>([]);
  
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    type: "api",
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    supabaseUrl: "",
    supabaseKey: "",
  });

  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    lovable_api_key: "",
    google_vision_key: "",
    openai_key: "",
  });

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(142 76% 36%)", "hsl(217 91% 60%)", "hsl(45 93% 47%)", "hsl(0 84% 60%)"];

  useEffect(() => {
    fetchConfigs();
    fetchUsageStats();
    fetchPatientUsage();
    fetchDailyUsage();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("api_configurations")
        .select("*")
        .order("config_key");

      if (error) throw error;
      setConfigs(data || []);

      // Extract database and API key configs
      const dbUrlConfig = data?.find(c => c.config_key === "database_url");
      const dbHostConfig = data?.find(c => c.config_key === "database_host");
      const dbPortConfig = data?.find(c => c.config_key === "database_port");
      const dbNameConfig = data?.find(c => c.config_key === "database_name");
      const dbUserConfig = data?.find(c => c.config_key === "database_user");
      const dbPassConfig = data?.find(c => c.config_key === "database_password");
      const dbTypeConfig = data?.find(c => c.config_key === "database_type");
      const supabaseUrlConfig = data?.find(c => c.config_key === "supabase_url");
      const supabaseKeyConfig = data?.find(c => c.config_key === "supabase_anon_key");
      
      const lovableKeyConfig = data?.find(c => c.config_key === "lovable_api_key");
      const googleVisionKeyConfig = data?.find(c => c.config_key === "google_vision_api_key");
      const openaiKeyConfig = data?.find(c => c.config_key === "openai_api_key");

      setDbConfig({
        type: (dbTypeConfig?.config_value as "api" | "cloud") || "api",
        host: dbHostConfig?.config_value || "",
        port: dbPortConfig?.config_value || "5432",
        database: dbNameConfig?.config_value || "",
        username: dbUserConfig?.config_value || "",
        password: dbPassConfig?.config_value || "",
        supabaseUrl: supabaseUrlConfig?.config_value || dbUrlConfig?.config_value || "",
        supabaseKey: supabaseKeyConfig?.config_value || "",
      });

      setApiKeys({
        lovable_api_key: lovableKeyConfig?.config_value || "",
        google_vision_key: googleVisionKeyConfig?.config_value || "",
        openai_key: openaiKeyConfig?.config_value || "",
      });
    } catch (error) {
      console.error("Error fetching configs:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("provider, operation_type, success, estimated_cost");

      if (error) throw error;

      const statsMap = new Map<string, UsageStats>();
      
      (data || []).forEach((log) => {
        const key = `${log.provider}-${log.operation_type}`;
        const existing = statsMap.get(key) || {
          provider: log.provider,
          operation_type: log.operation_type,
          total_requests: 0,
          total_cost: 0,
          success_rate: 0,
        };
        existing.total_requests++;
        existing.total_cost += Number(log.estimated_cost) || 0;
        if (log.success) {
          existing.success_rate = ((existing.success_rate * (existing.total_requests - 1)) + 100) / existing.total_requests;
        } else {
          existing.success_rate = (existing.success_rate * (existing.total_requests - 1)) / existing.total_requests;
        }
        statsMap.set(key, existing);
      });

      setUsageStats(Array.from(statsMap.values()));
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    }
  };

  const fetchPatientUsage = async () => {
    try {
      const { data: logs, error: logsError } = await supabase
        .from("api_usage_logs")
        .select("patient_id, operation_type, estimated_cost");

      if (logsError) throw logsError;

      const { data: patients, error: patientsError } = await supabase
        .from("patients")
        .select("id, name");

      if (patientsError) throw patientsError;

      const patientMap = new Map<string, PatientUsage>();

      (logs || []).forEach((log) => {
        if (!log.patient_id) return;
        
        const patient = patients?.find(p => p.id === log.patient_id);
        const existing = patientMap.get(log.patient_id) || {
          patient_id: log.patient_id,
          patient_name: patient?.name || "Desconhecido",
          ocr_requests: 0,
          ai_requests: 0,
          total_cost: 0,
        };

        if (log.operation_type === "ocr") {
          existing.ocr_requests++;
        } else {
          existing.ai_requests++;
        }
        existing.total_cost += Number(log.estimated_cost) || 0;
        patientMap.set(log.patient_id, existing);
      });

      setPatientUsage(Array.from(patientMap.values()).sort((a, b) => b.total_cost - a.total_cost));
    } catch (error) {
      console.error("Error fetching patient usage:", error);
    }
  };

  const fetchDailyUsage = async () => {
    try {
      const { data: logs, error } = await supabase
        .from("api_usage_logs")
        .select("created_at, operation_type, estimated_cost, provider")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const dateMap = new Map<string, DailyUsage>();
      const providerMap = new Map<string, number>();
      
      (logs || []).forEach((log) => {
        const date = new Date(log.created_at).toLocaleDateString("pt-BR", { 
          day: "2-digit", 
          month: "short" 
        });
        
        const existing = dateMap.get(date) || { date, ocr: 0, ai: 0, cost: 0 };
        
        if (log.operation_type === "ocr") {
          existing.ocr++;
        } else {
          existing.ai++;
        }
        existing.cost += Number(log.estimated_cost) || 0;
        dateMap.set(date, existing);

        // Accumulate provider usage
        const providerName = log.provider || "Desconhecido";
        providerMap.set(providerName, (providerMap.get(providerName) || 0) + 1);
      });

      // Take last 14 days
      const sortedDays = Array.from(dateMap.values()).slice(-14);
      setDailyUsage(sortedDays);

      // Convert provider map to array
      const providerArray: ProviderUsage[] = Array.from(providerMap.entries()).map(([name, value], idx) => ({
        name,
        value,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      }));
      setProviderUsage(providerArray);
    } catch (error) {
      console.error("Error fetching daily usage:", error);
    }
  };

  const updateConfig = (id: string, field: keyof ApiConfig, value: any) => {
    setConfigs(prev => 
      prev.map(c => c.id === id ? { ...c, [field]: value } : c)
    );
  };

  const upsertConfig = async (key: string, value: string, provider: string = "system") => {
    const existing = configs.find(c => c.config_key === key);
    if (existing) {
      await supabase
        .from("api_configurations")
        .update({ config_value: value })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("api_configurations")
        .insert({ config_key: key, config_value: value, provider, is_active: true, priority: 1 });
    }
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
      // Save database configs
      await upsertConfig("database_type", dbConfig.type, "database");
      await upsertConfig("database_host", dbConfig.host, "database");
      await upsertConfig("database_port", dbConfig.port, "database");
      await upsertConfig("database_name", dbConfig.database, "database");
      await upsertConfig("database_user", dbConfig.username, "database");
      await upsertConfig("database_password", dbConfig.password, "database");
      await upsertConfig("supabase_url", dbConfig.supabaseUrl, "supabase");
      await upsertConfig("supabase_anon_key", dbConfig.supabaseKey, "supabase");

      // Save API keys
      await upsertConfig("lovable_api_key", apiKeys.lovable_api_key, "lovable");
      await upsertConfig("google_vision_api_key", apiKeys.google_vision_key, "google");
      await upsertConfig("openai_api_key", apiKeys.openai_key, "openai");

      // Save OCR and AI provider configs
      for (const config of configs) {
        const { error } = await supabase
          .from("api_configurations")
          .update({
            config_value: config.config_value,
            is_active: config.is_active,
            priority: config.priority,
          })
          .eq("id", config.id);

        if (error) throw error;
      }

      await fetchConfigs();
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving configs:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      if (dbConfig.type === "api") {
        // Test Supabase connection
        const testUrl = dbConfig.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${testUrl}/rest/v1/`, {
          headers: {
            apikey: dbConfig.supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        
        if (response.ok || response.status === 401) {
          toast.success("Conexão com Supabase estabelecida!", {
            description: "O serviço está acessível"
          });
        } else {
          throw new Error(`Status: ${response.status}`);
        }
      } else {
        // For cloud database, we'd need a backend endpoint to test
        toast.info("Teste de conexão para banco Cloud requer endpoint de backend");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      toast.error("Falha na conexão", {
        description: error instanceof Error ? error.message : "Verifique as credenciais"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getOcrConfigs = () => configs.filter(c => c.config_key.includes("ocr"));
  const getAiConfigs = () => configs.filter(c => c.config_key.startsWith("ai_"));

  const totalApiCost = usageStats.reduce((sum, s) => sum + s.total_cost, 0);
  const totalRequests = usageStats.reduce((sum, s) => sum + s.total_requests, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="database" className="gap-2">
            <Database className="w-4 h-4" />
            Banco de Dados
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="w-4 h-4" />
            Chaves de API
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Cpu className="w-4 h-4" />
            Provedores
          </TabsTrigger>
          <TabsTrigger value="statistics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        {/* Database Configuration Tab */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Configuração do Banco de Dados</CardTitle>
              </div>
              <CardDescription>
                Configure a conexão com o banco de dados. Escolha entre API (Supabase) ou Cloud (PostgreSQL direto).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Database Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipo de Conexão</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      dbConfig.type === "api" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setDbConfig(prev => ({ ...prev, type: "api" }))}
                  >
                    <div className="flex items-center gap-3">
                      <Server className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">API (Supabase)</p>
                        <p className="text-xs text-muted-foreground">Conexão via REST API</p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      dbConfig.type === "cloud" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setDbConfig(prev => ({ ...prev, type: "cloud" }))}
                  >
                    <div className="flex items-center gap-3">
                      <Cloud className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="font-medium">Cloud (PostgreSQL)</p>
                        <p className="text-xs text-muted-foreground">Conexão direta ao banco</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {dbConfig.type === "api" ? (
                /* Supabase API Configuration */
                <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Server className="w-4 h-4" />
                    Configuração Supabase
                  </div>
                  
                  <div className="space-y-2">
                    <Label>URL da Instância</Label>
                    <Input
                      value={dbConfig.supabaseUrl}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                      placeholder="https://seu-projeto.supabase.co"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Chave Anon/Pública</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets["supabaseKey"] ? "text" : "password"}
                        value={dbConfig.supabaseKey}
                        onChange={(e) => setDbConfig(prev => ({ ...prev, supabaseKey: e.target.value }))}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleShowSecret("supabaseKey")}
                      >
                        {showSecrets["supabaseKey"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Cloud PostgreSQL Configuration */
                <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-500">
                    <Cloud className="w-4 h-4" />
                    Configuração PostgreSQL Cloud
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Host / IP</Label>
                      <Input
                        value={dbConfig.host}
                        onChange={(e) => setDbConfig(prev => ({ ...prev, host: e.target.value }))}
                        placeholder="db.exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Porta</Label>
                      <Input
                        value={dbConfig.port}
                        onChange={(e) => setDbConfig(prev => ({ ...prev, port: e.target.value }))}
                        placeholder="5432"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome do Banco</Label>
                    <Input
                      value={dbConfig.database}
                      onChange={(e) => setDbConfig(prev => ({ ...prev, database: e.target.value }))}
                      placeholder="postgres"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Usuário</Label>
                      <Input
                        value={dbConfig.username}
                        onChange={(e) => setDbConfig(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="postgres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <div className="relative">
                        <Input
                          type={showSecrets["dbPassword"] ? "text" : "password"}
                          value={dbConfig.password}
                          onChange={(e) => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => toggleShowSecret("dbPassword")}
                        >
                          {showSecrets["dbPassword"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection Test Button */}
              <Button 
                onClick={testConnection} 
                variant="outline" 
                className="w-full gap-2"
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plug className="w-4 h-4" />
                )}
                Testar Conexão
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-500" />
                <CardTitle className="text-lg">Chaves de API</CardTitle>
              </div>
              <CardDescription>
                Configure as chaves de API para os serviços de OCR e IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lovable API Key */}
              <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <Label className="font-medium">Lovable Gateway API</Label>
                  </div>
                  <Badge variant="default">Recomendado</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Acesso ao Gemini Vision e modelos de IA via Lovable Gateway. Chave gerenciada automaticamente.
                </p>
                <div className="relative">
                  <Input
                    type={showSecrets["lovable_api_key"] ? "text" : "password"}
                    value={apiKeys.lovable_api_key}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, lovable_api_key: e.target.value }))}
                    placeholder="Deixe vazio para usar a chave padrão do sistema"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleShowSecret("lovable_api_key")}
                  >
                    {showSecrets["lovable_api_key"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Google Vision API Key */}
              <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-500" />
                    <Label className="font-medium">Google Vision API</Label>
                  </div>
                  <Badge variant="secondary">OCR Alternativo</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use como fallback de OCR. Obtenha em console.cloud.google.com
                </p>
                <div className="relative">
                  <Input
                    type={showSecrets["google_vision_key"] ? "text" : "password"}
                    value={apiKeys.google_vision_key}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, google_vision_key: e.target.value }))}
                    placeholder="AIzaSy..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleShowSecret("google_vision_key")}
                  >
                    {showSecrets["google_vision_key"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* OpenAI API Key */}
              <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    <Label className="font-medium">OpenAI API</Label>
                  </div>
                  <Badge variant="outline">Opcional</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para usar modelos GPT como alternativa. Obtenha em platform.openai.com
                </p>
                <div className="relative">
                  <Input
                    type={showSecrets["openai_key"] ? "text" : "password"}
                    value={apiKeys.openai_key}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai_key: e.target.value }))}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleShowSecret("openai_key")}
                  >
                    {showSecrets["openai_key"] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers">
          <div className="space-y-6">
            {/* OCR Providers */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-500" />
                  <CardTitle className="text-lg">Provedores de OCR</CardTitle>
                </div>
                <CardDescription>
                  Configure a ordem de prioridade e ative/desative provedores de OCR.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {getOcrConfigs().map((config) => (
                  <div key={config.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        {config.config_key === "ocr_primary" ? "OCR Primário" : 
                         config.config_key === "ocr_fallback_1" ? "OCR Fallback 1" : 
                         config.config_key}
                      </Label>
                      <Select
                        value={config.config_value || ""}
                        onValueChange={(v) => updateConfig(config.id, "config_value", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o provedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lovable_gateway">Lovable Gateway (Gemini Vision)</SelectItem>
                          <SelectItem value="google_vision">Google Vision API</SelectItem>
                          <SelectItem value="regex_only">Apenas Regex (Gratuito)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Prioridade</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.priority}
                        onChange={(e) => updateConfig(config.id, "priority", parseInt(e.target.value))}
                        className="w-16"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(v) => updateConfig(config.id, "is_active", v)}
                      />
                      <Badge variant={config.is_active ? "default" : "secondary"}>
                        {config.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Providers */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <CardTitle className="text-lg">Modelos de IA</CardTitle>
                </div>
                <CardDescription>
                  Configure a ordem de prioridade e ative/desative modelos de IA para análises.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {getAiConfigs().map((config) => (
                  <div key={config.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        {config.config_key === "ai_primary" ? "IA Primária" : 
                         config.config_key === "ai_fallback_1" ? "IA Fallback 1" : 
                         config.config_key === "ai_fallback_2" ? "IA Fallback 2" :
                         config.config_key}
                      </Label>
                      <Select
                        value={config.config_value || ""}
                        onValueChange={(v) => updateConfig(config.id, "config_value", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Rápido)</SelectItem>
                          <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Econômico)</SelectItem>
                          <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Avançado)</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini (OpenAI)</SelectItem>
                          <SelectItem value="template_only">Apenas Template (Gratuito)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Prioridade</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.priority}
                        onChange={(e) => updateConfig(config.id, "priority", parseInt(e.target.value))}
                        className="w-16"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(v) => updateConfig(config.id, "is_active", v)}
                      />
                      <Badge variant={config.is_active ? "default" : "secondary"}>
                        {config.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requisições</p>
                    <p className="text-2xl font-bold">{totalRequests}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Total</p>
                    <p className="text-2xl font-bold">$ {totalApiCost.toFixed(4)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pacientes</p>
                    <p className="text-2xl font-bold">{patientUsage.length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Daily Usage Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Evolução do Consumo (Últimos 14 dias)</CardTitle>
                </div>
                <CardDescription>
                  Visualização da quantidade de requisições OCR e IA ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyUsage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum dado de consumo registrado ainda</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyUsage}>
                        <defs>
                          <linearGradient id="colorOcr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="ocr" 
                          name="OCR"
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorOcr)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="ai" 
                          name="IA"
                          stroke="hsl(142 76% 36%)" 
                          fillOpacity={1} 
                          fill="url(#colorAi)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Evolution Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  <CardTitle className="text-lg">Evolução de Custos (USD)</CardTitle>
                </div>
                <CardDescription>
                  Custo acumulado por dia em dólares americanos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dailyUsage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum dado de custo registrado ainda</p>
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyUsage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v.toFixed(3)}`} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(value: number) => [`$${value.toFixed(4)}`, "Custo"]}
                        />
                        <Bar dataKey="cost" name="Custo" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider Distribution Pie Chart */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Distribuição por Provedor</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {providerUsage.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum uso registrado</p>
                    </div>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={providerUsage}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {providerUsage.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--background))", 
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Usage by Provider List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Detalhes por Provedor</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {usageStats.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum uso registrado ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto">
                      {usageStats.map((stat, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{stat.provider}</span>
                              <Badge variant="outline" className="text-xs">{stat.operation_type}</Badge>
                            </div>
                            <span className="text-sm font-medium">$ {stat.total_cost.toFixed(4)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{stat.total_requests} requisições</span>
                            <div className="flex items-center gap-1">
                              {stat.success_rate >= 90 ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-yellow-500" />
                              )}
                              <span>{stat.success_rate.toFixed(1)}%</span>
                            </div>
                          </div>
                          <Progress value={stat.success_rate} className="h-1 mt-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Usage by Patient */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <CardTitle className="text-lg">Consumo por Paciente</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {patientUsage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum consumo de paciente registrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientUsage.map((patient) => (
                      <div key={patient.patient_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.patient_name}</p>
                            <p className="text-xs text-muted-foreground">
                              OCR: {patient.ocr_requests} | IA: {patient.ai_requests}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">$ {patient.total_cost.toFixed(4)}</p>
                          <p className="text-xs text-muted-foreground">
                            {patient.ocr_requests + patient.ai_requests} requisições
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfigs} disabled={saving} className="gap-2">
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Todas as Configurações
        </Button>
      </div>
    </div>
  );
};

export default ApiConfiguration;
