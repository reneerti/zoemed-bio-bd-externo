import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { referenceValues, evaluateMetric, getStatusLabel } from "@/lib/referenceValues";

interface BioimpedanceRecord {
  id: string;
  measurement_date: string;
  week_number: number | null;
  weight: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  fat_mass: number | null;
  lean_mass: number | null;
  muscle_mass: number | null;
  muscle_rate_percent: number | null;
  visceral_fat: number | null;
  bmr: number | null;
  metabolic_age: number | null;
  bone_mass: number | null;
  body_water_percent: number | null;
  protein_percent: number | null;
  subcutaneous_fat_percent: number | null;
  skeletal_muscle_percent: number | null;
  whr: number | null;
}

interface ReportGeneratorProps {
  records: BioimpedanceRecord[];
  personName: string;
  isMale: boolean;
}

const ReportGenerator = ({ records, personName, isMale }: ReportGeneratorProps) => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    if (records.length === 0) {
      toast.error("Nenhum dado disponível para gerar relatório");
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF();
      const latest = records[records.length - 1];
      const first = records[0];
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Colors
      const primaryColor = isMale ? [59, 130, 246] : [236, 72, 153]; // blue / pink
      const headerBg = [30, 41, 59]; // slate-800
      
      // Header
      doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Bioimpedância", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(personName, pageWidth / 2, 30, { align: "center" });
      
      // Date
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, 50, { align: "center" });
      
      // Summary section
      let yPos = 65;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("📊 Resumo da Evolução", 20, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const weightChange = Number(latest.weight) - Number(first.weight);
      const fatChange = Number(latest.body_fat_percent) - Number(first.body_fat_percent);
      const muscleChange = Number(latest.muscle_rate_percent) - Number(first.muscle_rate_percent);
      
      const summaryData = [
        ["Período", `${records.length} medições`],
        ["Variação de Peso", `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`],
        ["Variação de Gordura", `${fatChange > 0 ? '+' : ''}${fatChange.toFixed(1)}%`],
        ["Variação de Músculo", `${muscleChange > 0 ? '+' : ''}${muscleChange.toFixed(1)}%`],
      ];
      
      summaryData.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 25, yPos);
        yPos += 6;
      });
      
      // Current metrics section
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("📈 Métricas Atuais vs Referência", 20, yPos);
      
      yPos += 8;
      
      // Table header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(20, yPos, pageWidth - 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Parâmetro", 25, yPos + 5.5);
      doc.text("Atual", 80, yPos + 5.5);
      doc.text("Referência", 110, yPos + 5.5);
      doc.text("Status", 160, yPos + 5.5);
      
      yPos += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      const metricsData = [
        {
          name: "IMC",
          value: latest.bmi,
          unit: "",
          ref: "18.5 - 24.9",
          status: evaluateMetric(latest.bmi, referenceValues.bmi, true)
        },
        {
          name: "Gordura Corporal",
          value: latest.body_fat_percent,
          unit: "%",
          ref: isMale ? "10 - 20%" : "15 - 25%",
          status: evaluateMetric(
            latest.body_fat_percent,
            isMale ? referenceValues.bodyFatPercent.male : referenceValues.bodyFatPercent.female,
            true
          )
        },
        {
          name: "Massa Muscular",
          value: latest.muscle_rate_percent,
          unit: "%",
          ref: isMale ? "35 - 40%" : "25 - 35%",
          status: evaluateMetric(
            latest.muscle_rate_percent,
            isMale ? referenceValues.musclePercent.male : referenceValues.musclePercent.female,
            false
          )
        },
        {
          name: "Gordura Visceral",
          value: latest.visceral_fat,
          unit: "",
          ref: "< 10 (ideal)",
          status: evaluateMetric(latest.visceral_fat, referenceValues.visceralFat, true)
        },
        {
          name: "TMB",
          value: latest.bmr,
          unit: " kcal",
          ref: "> 1500 kcal",
          status: evaluateMetric(latest.bmr, referenceValues.bmr, false)
        },
        {
          name: "Água Corporal",
          value: latest.body_water_percent,
          unit: "%",
          ref: "50 - 65%",
          status: evaluateMetric(latest.body_water_percent, referenceValues.bodyWaterPercent, false)
        },
        {
          name: "Proteína",
          value: latest.protein_percent,
          unit: "%",
          ref: "15 - 18%",
          status: evaluateMetric(latest.protein_percent, referenceValues.proteinPercent, false)
        },
        {
          name: "Gordura Subcutânea",
          value: latest.subcutaneous_fat_percent,
          unit: "%",
          ref: "< 20%",
          status: evaluateMetric(latest.subcutaneous_fat_percent, referenceValues.subcutaneousFat, true)
        }
      ];
      
      metricsData.forEach((metric, index) => {
        const bgColor = index % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(20, yPos, pageWidth - 40, 7, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.text(metric.name, 25, yPos + 5);
        doc.text(`${metric.value?.toFixed(1) || '—'}${metric.unit}`, 80, yPos + 5);
        doc.text(metric.ref, 110, yPos + 5);
        
        // Status color
        const statusColors = {
          ideal: [34, 197, 94],
          alert: [245, 158, 11],
          risk: [239, 68, 68]
        };
        const statusColor = statusColors[metric.status];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(getStatusLabel(metric.status), 160, yPos + 5);
        
        yPos += 7;
      });
      
      // Evolution table
      yPos += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("📋 Histórico de Medições", 20, yPos);
      
      yPos += 8;
      
      // Table header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(20, yPos, pageWidth - 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("Semana", 25, yPos + 5.5);
      doc.text("Peso", 50, yPos + 5.5);
      doc.text("IMC", 70, yPos + 5.5);
      doc.text("Gordura", 90, yPos + 5.5);
      doc.text("Músculo", 115, yPos + 5.5);
      doc.text("G.Visceral", 140, yPos + 5.5);
      doc.text("TMB", 165, yPos + 5.5);
      
      yPos += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      // Last 10 records
      const recentRecords = records.slice(-10);
      recentRecords.forEach((record, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const bgColor = index % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(20, yPos, pageWidth - 40, 6, 'F');
        
        doc.setFontSize(7);
        doc.text(`S${record.week_number || index + 1}`, 25, yPos + 4);
        doc.text(`${record.weight?.toFixed(1) || '—'} kg`, 50, yPos + 4);
        doc.text(`${record.bmi?.toFixed(1) || '—'}`, 70, yPos + 4);
        doc.text(`${record.body_fat_percent?.toFixed(1) || '—'}%`, 90, yPos + 4);
        doc.text(`${record.muscle_rate_percent?.toFixed(1) || '—'}%`, 115, yPos + 4);
        doc.text(`${record.visceral_fat?.toFixed(0) || '—'}`, 140, yPos + 4);
        doc.text(`${record.bmr || '—'}`, 165, yPos + 4);
        
        yPos += 6;
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Resumo Health - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
      
      // Save
      const fileName = `relatorio_${personName.toLowerCase().replace(' ', '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="gap-2"
      onClick={generatePDF}
      disabled={generating || records.length === 0}
    >
      {generating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Relatório PDF
        </>
      )}
    </Button>
  );
};

export default ReportGenerator;
