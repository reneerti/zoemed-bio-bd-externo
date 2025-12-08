// Reference values for bioimpedance based on the standard table
// M = Male (Reneer), F = Female (Ana Paula)

export interface ReferenceRange {
  ideal: { min: number; max: number };
  alert: { min: number; max: number };
  risk: { min: number; max: number };
}

export interface ReferenceValues {
  bmi: ReferenceRange;
  bodyFatPercent: { male: ReferenceRange; female: ReferenceRange };
  musclePercent: { male: ReferenceRange; female: ReferenceRange };
  muscularMass: ReferenceRange;
  bodyWaterPercent: ReferenceRange;
  boneMass: { male: ReferenceRange; female: ReferenceRange };
  proteinPercent: ReferenceRange;
  subcutaneousFat: ReferenceRange;
  visceralFat: ReferenceRange;
  bmr: ReferenceRange;
  metabolicAge: { idealDiff: number; alertDiff: number; riskDiff: number };
  whr: { male: ReferenceRange; female: ReferenceRange };
  skeletalMuscle: ReferenceRange;
}

export const referenceValues: ReferenceValues = {
  // IMC: 18.5-24.9 (ideal), 25.0-29.9 (alert), <18.5 ou >30 (risk)
  bmi: {
    ideal: { min: 18.5, max: 24.9 },
    alert: { min: 25.0, max: 29.9 },
    risk: { min: 30, max: 100 }
  },
  
  // Gordura Corporal: M: 10-20% | F: 15-25% (ideal)
  bodyFatPercent: {
    male: {
      ideal: { min: 10, max: 20 },
      alert: { min: 21, max: 25 },
      risk: { min: 25, max: 100 }
    },
    female: {
      ideal: { min: 15, max: 25 },
      alert: { min: 26, max: 30 },
      risk: { min: 31, max: 100 }
    }
  },
  
  // Massa Muscular: M: 35-40% | F: 25-35% (ideal)
  musclePercent: {
    male: {
      ideal: { min: 35, max: 40 },
      alert: { min: 30, max: 34 },
      risk: { min: 0, max: 30 }
    },
    female: {
      ideal: { min: 25, max: 35 },
      alert: { min: 20, max: 24 },
      risk: { min: 0, max: 20 }
    }
  },
  
  // Taxa Muscular: >30 kg (ideal), 25-30 (alert), <25 (risk)
  muscularMass: {
    ideal: { min: 30, max: 100 },
    alert: { min: 25, max: 30 },
    risk: { min: 0, max: 25 }
  },
  
  // Água Corporal: 50-65% (ideal)
  bodyWaterPercent: {
    ideal: { min: 50, max: 65 },
    alert: { min: 45, max: 49 },
    risk: { min: 0, max: 45 }
  },
  
  // Massa Óssea: M: 3.2-3.7 | F: 2.5-3.0
  boneMass: {
    male: {
      ideal: { min: 3.2, max: 3.7 },
      alert: { min: 2.8, max: 3.1 },
      risk: { min: 0, max: 2.8 }
    },
    female: {
      ideal: { min: 2.5, max: 3.0 },
      alert: { min: 2.2, max: 2.4 },
      risk: { min: 0, max: 2.2 }
    }
  },
  
  // Proteína: 15-18% (ideal)
  proteinPercent: {
    ideal: { min: 15, max: 18 },
    alert: { min: 12, max: 14 },
    risk: { min: 0, max: 12 }
  },
  
  // Gordura Subcutânea: <20% (ideal)
  subcutaneousFat: {
    ideal: { min: 0, max: 20 },
    alert: { min: 20, max: 25 },
    risk: { min: 26, max: 100 }
  },
  
  // Gordura Visceral: <10 (ideal), 10-15 (moderado), >15 (alto risco)
  visceralFat: {
    ideal: { min: 0, max: 10 },
    alert: { min: 10, max: 15 },
    risk: { min: 15, max: 100 }
  },
  
  // TMB: >1500 (ideal), 1200-1500 (alert), <1200 (risk)
  bmr: {
    ideal: { min: 1500, max: 5000 },
    alert: { min: 1200, max: 1500 },
    risk: { min: 0, max: 1200 }
  },
  
  // Idade Metabólica
  metabolicAge: {
    idealDiff: 0,    // igual ou menor que idade real
    alertDiff: 5,    // 1-5 anos acima
    riskDiff: 5      // >5 anos acima
  },
  
  // WHR: M: 0.85-0.95 | F: 0.75-0.85
  whr: {
    male: {
      ideal: { min: 0.85, max: 0.95 },
      alert: { min: 0.96, max: 1.0 },
      risk: { min: 1.0, max: 2.0 }
    },
    female: {
      ideal: { min: 0.75, max: 0.85 },
      alert: { min: 0.86, max: 0.90 },
      risk: { min: 0.90, max: 2.0 }
    }
  },
  
  // Massa Esquelética: 34-40% (ideal)
  skeletalMuscle: {
    ideal: { min: 34, max: 40 },
    alert: { min: 30, max: 33 },
    risk: { min: 0, max: 30 }
  }
};

export type EvaluationStatus = 'ideal' | 'alert' | 'risk';

export function evaluateMetric(
  value: number | null,
  range: ReferenceRange,
  lowerIsBetter: boolean = false
): EvaluationStatus {
  if (value === null) return 'alert';
  
  if (lowerIsBetter) {
    if (value <= range.ideal.max) return 'ideal';
    if (value <= range.alert.max) return 'alert';
    return 'risk';
  } else {
    if (value >= range.ideal.min && value <= range.ideal.max) return 'ideal';
    if (value >= range.alert.min && value <= range.alert.max) return 'alert';
    return 'risk';
  }
}

export function getStatusColor(status: EvaluationStatus): string {
  switch (status) {
    case 'ideal': return 'text-emerald-500';
    case 'alert': return 'text-amber-500';
    case 'risk': return 'text-rose-500';
  }
}

export function getStatusBgColor(status: EvaluationStatus): string {
  switch (status) {
    case 'ideal': return 'bg-emerald-500';
    case 'alert': return 'bg-amber-500';
    case 'risk': return 'bg-rose-500';
  }
}

export function getStatusLabel(status: EvaluationStatus): string {
  switch (status) {
    case 'ideal': return 'Saudável';
    case 'alert': return 'Alerta';
    case 'risk': return 'Risco';
  }
}
