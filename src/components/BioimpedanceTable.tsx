import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BioimpedanceRecord {
  id: string;
  measurement_date: string;
  week_number: number | null;
  monjaro_dose: number | null;
  status: string | null;
  weight: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  fat_mass: number | null;
  lean_mass: number | null;
  muscle_mass: number | null;
  muscle_rate_percent: number | null;
  skeletal_muscle_percent: number | null;
  bone_mass: number | null;
  protein_mass: number | null;
  protein_percent: number | null;
  body_water_percent: number | null;
  moisture_content: number | null;
  subcutaneous_fat_percent: number | null;
  visceral_fat: number | null;
  bmr: number | null;
  metabolic_age: number | null;
  whr: number | null;
}

interface Props {
  records: BioimpedanceRecord[];
  isReneer: boolean;
}

// Parâmetros de referência baseados no protocolo
const getParams = (isReneer: boolean) => ({
  weight: { ideal: isReneer ? 80 : 55, unit: "kg", lowerIsBetter: false },
  bmi: { ideal: 24.9, unit: "", lowerIsBetter: true },
  body_fat_percent: { ideal: isReneer ? 20 : 25, unit: "%", lowerIsBetter: true },
  fat_mass: { ideal: null, unit: "kg", lowerIsBetter: true },
  lean_mass: { ideal: null, unit: "kg", lowerIsBetter: false },
  muscle_mass: { ideal: isReneer ? 30 : 25, unit: "kg", lowerIsBetter: false },
  muscle_rate_percent: { ideal: isReneer ? 40 : 35, unit: "%", lowerIsBetter: false },
  bone_mass: { ideal: isReneer ? 3.5 : 2.8, unit: "kg", lowerIsBetter: false },
  protein_percent: { ideal: 18, unit: "%", lowerIsBetter: false },
  body_water_percent: { ideal: 60, unit: "%", lowerIsBetter: false },
  subcutaneous_fat_percent: { ideal: 20, unit: "%", lowerIsBetter: true },
  visceral_fat: { ideal: 10, unit: "", lowerIsBetter: true },
  bmr: { ideal: 1500, unit: "kcal", lowerIsBetter: false },
  metabolic_age: { ideal: isReneer ? 41 : 43, unit: "anos", lowerIsBetter: true },
  whr: { ideal: isReneer ? 0.90 : 0.80, unit: "", lowerIsBetter: true },
});

type ColumnKey = keyof ReturnType<typeof getParams>;

const columns: { key: ColumnKey; label: string; format: (v: number | null) => string }[] = [
  { key: "weight", label: "Peso", format: (v) => v?.toFixed(1) || "-" },
  { key: "bmi", label: "IMC", format: (v) => v?.toFixed(1) || "-" },
  { key: "body_fat_percent", label: "Gordura %", format: (v) => v ? `${v.toFixed(1)}%` : "-" },
  { key: "fat_mass", label: "M. Gorda", format: (v) => v?.toFixed(1) || "-" },
  { key: "lean_mass", label: "M. Livre", format: (v) => v?.toFixed(1) || "-" },
  { key: "muscle_mass", label: "M. Musc", format: (v) => v?.toFixed(1) || "-" },
  { key: "muscle_rate_percent", label: "Taxa Musc %", format: (v) => v ? `${v.toFixed(1)}%` : "-" },
  { key: "bone_mass", label: "M. Óssea", format: (v) => v?.toFixed(1) || "-" },
  { key: "protein_percent", label: "Proteína %", format: (v) => v ? `${v.toFixed(1)}%` : "-" },
  { key: "body_water_percent", label: "Água %", format: (v) => v ? `${v.toFixed(1)}%` : "-" },
  { key: "subcutaneous_fat_percent", label: "G. Subcut %", format: (v) => v ? `${v.toFixed(1)}%` : "-" },
  { key: "visceral_fat", label: "G. Visceral", format: (v) => v?.toFixed(0) || "-" },
  { key: "bmr", label: "TMB", format: (v) => v?.toFixed(0) || "-" },
  { key: "metabolic_age", label: "Id. Met.", format: (v) => v?.toFixed(0) || "-" },
  { key: "whr", label: "WHR", format: (v) => v?.toFixed(2) || "-" },
];

const BioimpedanceTable = ({ records, isReneer }: Props) => {
  const [expandedCols, setExpandedCols] = useState<Set<ColumnKey>>(new Set());
  const params = getParams(isReneer);

  const toggleColumn = (key: ColumnKey) => {
    setExpandedCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getTextColor = (current: number | null, previous: number | null, lowerIsBetter: boolean) => {
    if (current === null || previous === null) return "text-slate-300";
    const diff = current - previous;
    const threshold = Math.abs(previous * 0.005);
    
    if (Math.abs(diff) <= threshold) return "text-amber-400 font-semibold";
    if (lowerIsBetter) {
      return diff < 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"; 
    }
    return diff > 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold";
  };

  const getDiffToIdeal = (value: number | null, ideal: number | null, lowerIsBetter: boolean) => {
    if (value === null || ideal === null) return { diff: null, color: "text-slate-400" };
    const diff = value - ideal;
    const isGood = lowerIsBetter ? diff <= 0 : diff >= 0;
    return {
      diff: diff,
      color: isGood ? "text-emerald-400" : "text-red-400",
      label: diff > 0 ? `+${Math.abs(diff).toFixed(1)}` : `-${Math.abs(diff).toFixed(1)}`,
    };
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-border">
      <div className="flex">
        {/* Fixed columns: Semana, Monjaro, Status */}
        <div className="flex-shrink-0 z-10 bg-card shadow-md">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800 hover:bg-slate-800">
                <TableHead className="text-slate-100 font-bold w-20 text-center border-r border-slate-600">Semana</TableHead>
                <TableHead className="text-slate-100 font-bold w-24 text-center border-r border-slate-600">Monjaro</TableHead>
                <TableHead className="text-slate-100 font-bold w-28 text-center border-r border-slate-600">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Linha 0: Parâmetros */}
              <TableRow className="bg-violet-900/50 hover:bg-violet-900/50 border-b-2 border-violet-500">
                <TableCell className="font-bold text-center text-violet-200 border-r border-slate-600">IDEAL</TableCell>
                <TableCell className="text-center text-violet-200 border-r border-slate-600">-</TableCell>
                <TableCell className="text-center text-violet-200 border-r border-slate-600">Meta</TableCell>
              </TableRow>
              {records.map((record, i) => {
                const isHiato = record.status?.includes("HIATO");
                return (
                  <TableRow 
                    key={record.id} 
                    className={`${isHiato ? 'bg-amber-900/30' : i % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-700/50'} hover:bg-slate-600/50`}
                  >
                    <TableCell className="font-bold text-center text-slate-100 border-r border-slate-600">
                      {record.week_number} {isHiato && '⚠️'}
                    </TableCell>
                    <TableCell className="text-center text-slate-200 border-r border-slate-600">{record.monjaro_dose} mg</TableCell>
                    <TableCell className="text-center text-slate-200 border-r border-slate-600 text-xs">{record.status}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Scrollable columns */}
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800 hover:bg-slate-800">
                {columns.map((col) => (
                  <>
                    <TableHead 
                      key={col.key} 
                      className="text-slate-100 font-bold text-center min-w-[80px] cursor-pointer hover:bg-slate-700 transition-colors"
                      onClick={() => toggleColumn(col.key)}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{col.label}</span>
                        {expandedCols.has(col.key) ? (
                          <Minus className="w-3 h-3 text-violet-400" />
                        ) : (
                          <Plus className="w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                    </TableHead>
                    {expandedCols.has(col.key) && (
                      <TableHead 
                        key={`${col.key}-diff`} 
                        className="text-violet-300 font-semibold text-center min-w-[70px] bg-violet-900/40"
                      >
                        Δ Meta
                      </TableHead>
                    )}
                  </>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Linha 0: Parâmetros de referência */}
              <TableRow className="bg-violet-900/50 hover:bg-violet-900/50 border-b-2 border-violet-500">
                {columns.map((col) => {
                  const param = params[col.key];
                  return (
                    <>
                      <TableCell 
                        key={col.key} 
                        className="text-center text-violet-200 font-semibold"
                      >
                        {param.ideal !== null ? `${param.ideal}${param.unit ? ` ${param.unit}` : ''}` : '-'}
                      </TableCell>
                      {expandedCols.has(col.key) && (
                        <TableCell 
                          key={`${col.key}-diff`} 
                          className="text-center text-violet-300 bg-violet-900/40"
                        >
                          -
                        </TableCell>
                      )}
                    </>
                  );
                })}
              </TableRow>
              
              {/* Dados */}
              {records.map((record, i) => {
                const isHiato = record.status?.includes("HIATO");
                const prev = i > 0 ? records[i - 1] : null;
                
                return (
                  <TableRow 
                    key={record.id} 
                    className={`${isHiato ? 'bg-amber-900/30' : i % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-700/50'} hover:bg-slate-600/50`}
                  >
                    {columns.map((col) => {
                      const value = Number((record as any)[col.key]);
                      const prevValue = prev ? Number((prev as any)[col.key]) : null;
                      const param = params[col.key];
                      const diffInfo = getDiffToIdeal(value, param.ideal, param.lowerIsBetter);
                      
                      return (
                        <>
                          <TableCell 
                            key={col.key} 
                            className={`text-center ${getTextColor(value, prevValue, param.lowerIsBetter)}`}
                          >
                            {col.format(value)}
                          </TableCell>
                          {expandedCols.has(col.key) && (
                            <TableCell 
                              key={`${col.key}-diff`} 
                              className={`text-center bg-violet-900/30 text-sm ${diffInfo.color}`}
                            >
                              {diffInfo.diff !== null ? diffInfo.label : '-'}
                            </TableCell>
                          )}
                        </>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default BioimpedanceTable;
