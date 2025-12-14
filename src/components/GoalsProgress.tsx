import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Target, Edit, TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { referenceValues, evaluateMetric, getStatusColor, getStatusLabel } from "@/lib/referenceValues";

interface UserGoal {
  id: string;
  user_person: string;
  target_weight: number | null;
  target_body_fat: number | null;
  target_muscle: number | null;
  target_visceral_fat: number | null;
  target_bmi: number | null;
  notes: string | null;
}

interface CurrentMetrics {
  weight: number | null;
  body_fat_percent: number | null;
  muscle_rate_percent: number | null;
  visceral_fat: number | null;
  bmi: number | null;
}

interface GoalsProgressProps {
  patientId?: string;
  userPerson: string;
  currentMetrics: CurrentMetrics;
  initialMetrics: CurrentMetrics;
  isAdmin?: boolean;
  isMale?: boolean;
}

const GoalsProgress = ({ patientId, userPerson, currentMetrics, initialMetrics, isAdmin = false, isMale = true }: GoalsProgressProps) => {
  const [goals, setGoals] = useState<UserGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    target_weight: "",
    target_body_fat: "",
    target_muscle: "",
    target_visceral_fat: "",
    target_bmi: "",
    notes: ""
  });

  useEffect(() => {
    loadGoals();
  }, [patientId, userPerson]);

  const loadGoals = async () => {
    try {
      // Prefer patient_id, fallback to user_person for backward compatibility
      const query = patientId 
        ? supabase.from("user_goals").select("*").eq("patient_id", patientId).maybeSingle()
        : supabase.from("user_goals").select("*").eq("user_person", userPerson).maybeSingle();
      
      const { data, error } = await query;

      if (error) throw error;
      setGoals(data);
      
      if (data) {
        setFormData({
          target_weight: data.target_weight?.toString() || "",
          target_body_fat: data.target_body_fat?.toString() || "",
          target_muscle: data.target_muscle?.toString() || "",
          target_visceral_fat: data.target_visceral_fat?.toString() || "",
          target_bmi: data.target_bmi?.toString() || "",
          notes: data.notes || ""
        });
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = async () => {
    try {
      const dataToSave = {
        patient_id: patientId || null,
        user_person: userPerson,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
        target_body_fat: formData.target_body_fat ? parseFloat(formData.target_body_fat) : null,
        target_muscle: formData.target_muscle ? parseFloat(formData.target_muscle) : null,
        target_visceral_fat: formData.target_visceral_fat ? parseFloat(formData.target_visceral_fat) : null,
        target_bmi: formData.target_bmi ? parseFloat(formData.target_bmi) : null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (goals) {
        const { error } = await supabase
          .from("user_goals")
          .update(dataToSave)
          .eq("id", goals.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_goals")
          .insert(dataToSave);
        if (error) throw error;
      }

      toast.success("Metas salvas com sucesso!");
      setEditOpen(false);
      loadGoals();
    } catch (error) {
      console.error("Error saving goals:", error);
      toast.error("Erro ao salvar metas");
    }
  };

  const calculateProgress = (current: number | null, initial: number | null, target: number | null, lowerIsBetter: boolean = true) => {
    if (current === null || initial === null || target === null) return null;
    
    const totalChange = Math.abs(target - initial);
    if (totalChange === 0) return 100;
    
    const currentChange = lowerIsBetter 
      ? initial - current 
      : current - initial;
    
    const progress = (currentChange / totalChange) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getProgressColor = (progress: number | null, achieved: boolean) => {
    if (achieved) return "bg-emerald-500";
    if (progress === null) return "bg-muted";
    if (progress >= 75) return "bg-emerald-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-amber-500";
    return "bg-rose-500";
  };

  if (loading) {
    return (
      <Card className="card-elevated border-0">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse">Carregando metas...</div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Peso",
      current: currentMetrics.weight,
      initial: initialMetrics.weight,
      target: goals?.target_weight,
      unit: "kg",
      lowerIsBetter: true,
      icon: TrendingDown,
      evaluation: evaluateMetric(currentMetrics.bmi, referenceValues.bmi, true)
    },
    {
      label: "Gordura Corporal",
      current: currentMetrics.body_fat_percent,
      initial: initialMetrics.body_fat_percent,
      target: goals?.target_body_fat,
      unit: "%",
      lowerIsBetter: true,
      icon: TrendingDown,
      evaluation: evaluateMetric(
        currentMetrics.body_fat_percent, 
        isMale ? referenceValues.bodyFatPercent.male : referenceValues.bodyFatPercent.female,
        true
      )
    },
    {
      label: "Massa Muscular",
      current: currentMetrics.muscle_rate_percent,
      initial: initialMetrics.muscle_rate_percent,
      target: goals?.target_muscle,
      unit: "%",
      lowerIsBetter: false,
      icon: TrendingUp,
      evaluation: evaluateMetric(
        currentMetrics.muscle_rate_percent,
        isMale ? referenceValues.musclePercent.male : referenceValues.musclePercent.female,
        false
      )
    },
    {
      label: "Gordura Visceral",
      current: currentMetrics.visceral_fat,
      initial: initialMetrics.visceral_fat,
      target: goals?.target_visceral_fat,
      unit: "",
      lowerIsBetter: true,
      icon: TrendingDown,
      evaluation: evaluateMetric(currentMetrics.visceral_fat, referenceValues.visceralFat, true)
    }
  ];

  return (
    <Card className="card-elevated border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Metas Personalizadas
          </CardTitle>
          {isAdmin && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Edit className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Metas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Peso Alvo (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.target_weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_weight: e.target.value }))}
                        placeholder="75.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gordura Corporal (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.target_body_fat}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_body_fat: e.target.value }))}
                        placeholder="18.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Massa Muscular (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.target_muscle}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_muscle: e.target.value }))}
                        placeholder="38.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gordura Visceral</Label>
                      <Input
                        type="number"
                        step="1"
                        value={formData.target_visceral_fat}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_visceral_fat: e.target.value }))}
                        placeholder="8"
                      />
                    </div>
                  </div>
                  <Button onClick={saveGoals} className="w-full">
                    Salvar Metas
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => {
          const progress = calculateProgress(metric.current, metric.initial, metric.target, metric.lowerIsBetter);
          const achieved = metric.target !== null && metric.current !== null && (
            metric.lowerIsBetter 
              ? metric.current <= metric.target 
              : metric.current >= metric.target
          );
          const Icon = achieved ? CheckCircle2 : metric.icon;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", achieved ? "text-emerald-500" : "text-muted-foreground")} />
                  <span className="font-medium">{metric.label}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", 
                    metric.evaluation === 'ideal' ? "bg-emerald-500/20 text-emerald-400" :
                    metric.evaluation === 'alert' ? "bg-amber-500/20 text-amber-400" :
                    "bg-rose-500/20 text-rose-400"
                  )}>
                    {getStatusLabel(metric.evaluation)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {metric.current?.toFixed(1) || "—"}{metric.unit}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className={cn(achieved ? "text-emerald-500 font-medium" : "text-foreground")}>
                    {metric.target?.toFixed(1) || "—"}{metric.unit}
                  </span>
                </div>
              </div>
              <div className="relative">
                <Progress 
                  value={progress || 0} 
                  className="h-2"
                />
                <div 
                  className={cn(
                    "absolute top-0 left-0 h-2 rounded-full transition-all",
                    getProgressColor(progress, achieved)
                  )}
                  style={{ width: `${progress || 0}%` }}
                />
              </div>
              {progress !== null && (
                <p className="text-[10px] text-muted-foreground text-right">
                  {achieved ? "✓ Meta atingida!" : `${progress.toFixed(0)}% do caminho`}
                </p>
              )}
            </div>
          );
        })}

        {!goals && isAdmin && (
          <div className="text-center py-4">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditOpen(true)}>
              Definir Metas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalsProgress;
