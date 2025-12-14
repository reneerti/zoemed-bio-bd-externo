import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, Key, Cpu, Eye, EyeOff, Save, RefreshCw, 
  Zap, Server, Activity, AlertCircle, CheckCircle2
} from "lucide-react";

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

const ApiConfiguration = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConfigs();
    fetchUsageStats();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("api_configurations")
        .select("*")
        .order("config_key");

      if (error) throw error;
      setConfigs(data || []);
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

      // Aggregate stats
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

  const updateConfig = (id: string, field: keyof ApiConfig, value: any) => {
    setConfigs(prev => 
      prev.map(c => c.id === id ? { ...c, [field]: value } : c)
    );
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
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
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving configs:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getConfigsByCategory = () => {
    const database = configs.filter(c => 
      c.config_key.includes("database") || c.config_key.includes("supabase")
    );
    const ocr = configs.filter(c => c.config_key.includes("ocr"));
    const ai = configs.filter(c => 
      c.config_key.includes("ai_") || c.config_key.includes("google_vision")
    );
    return { database, ocr, ai };
  };

  const { database, ocr, ai } = getConfigsByCategory();

  const formatConfigLabel = (key: string) => {
    const labels: Record<string, string> = {
      database_url: "URL do Banco de Dados",
      supabase_anon_key: "Chave Anônima Supabase",
      ocr_primary: "OCR Primário",
      ocr_fallback_1: "OCR Fallback 1",
      ai_primary: "IA Primária",
      ai_fallback_1: "IA Fallback 1",
      ai_fallback_2: "IA Fallback 2",
      google_vision_api_key: "Google Vision API Key",
    };
    return labels[key] || key;
  };

  const isSecretField = (key: string) => {
    return key.includes("key") || key.includes("url") && !key.includes("ocr");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Database Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Configuração do Banco de Dados</CardTitle>
          </div>
          <CardDescription>
            Configure o apontamento para o banco de dados. Altere para migrar de serviço.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {database.map((config) => (
            <div key={config.id} className="space-y-2">
              <Label className="text-sm font-medium">
                {formatConfigLabel(config.config_key)}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showSecrets[config.config_key] ? "text" : "password"}
                    value={config.config_value || ""}
                    onChange={(e) => updateConfig(config.id, "config_value", e.target.value)}
                    placeholder={`Digite ${formatConfigLabel(config.config_key).toLowerCase()}`}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleShowSecret(config.config_key)}
                  >
                    {showSecrets[config.config_key] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
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
            </div>
          ))}
        </CardContent>
      </Card>

      {/* OCR Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg">Configuração de OCR</CardTitle>
          </div>
          <CardDescription>
            Configure os provedores de OCR e ordem de fallback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ocr.map((config) => (
            <div key={config.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  {formatConfigLabel(config.config_key)}
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

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-lg">Configuração de IA</CardTitle>
          </div>
          <CardDescription>
            Configure os modelos de IA e chaves de API para processamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ai.map((config) => (
            <div key={config.id} className="space-y-2">
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <Label className="text-sm font-medium">
                    {formatConfigLabel(config.config_key)}
                  </Label>
                  {isSecretField(config.config_key) ? (
                    <div className="relative mt-1">
                      <Input
                        type={showSecrets[config.config_key] ? "text" : "password"}
                        value={config.config_value || ""}
                        onChange={(e) => updateConfig(config.id, "config_value", e.target.value)}
                        placeholder="Digite a chave da API"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleShowSecret(config.config_key)}
                      >
                        {showSecrets[config.config_key] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
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
                        <SelectItem value="template_only">Apenas Template (Gratuito)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {!isSecretField(config.config_key) && (
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
                )}
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
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            <CardTitle className="text-lg">Estatísticas de Uso</CardTitle>
          </div>
          <CardDescription>
            Monitoramento de uso e custos das APIs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum uso registrado ainda</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {usageStats.map((stat, idx) => (
                <div key={idx} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{stat.provider}</span>
                    <Badge variant="outline">{stat.operation_type}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requisições:</span>
                      <span>{stat.total_requests}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custo estimado:</span>
                      <span>$ {stat.total_cost.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Taxa de sucesso:</span>
                      <span className="flex items-center gap-1">
                        {stat.success_rate >= 90 ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
                        )}
                        {stat.success_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfigs} disabled={saving} className="gap-2">
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default ApiConfiguration;
