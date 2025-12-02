import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

interface ComparisonData {
  reneer: {
    weight: number;
    fat: number;
    muscle: number;
    visceralFat: number;
    bmi: number;
    bmr: number;
    weightHistory: { week: number; weight: number }[];
    fatHistory: { week: number; fat: number }[];
  };
  anaPaula: {
    weight: number;
    fat: number;
    muscle: number;
    visceralFat: number;
    bmi: number;
    bmr: number;
    weightHistory: { week: number; weight: number }[];
    fatHistory: { week: number; fat: number }[];
  };
}

interface ComparativeChartsProps {
  data: ComparisonData;
}

const ComparativeCharts = ({ data }: ComparativeChartsProps) => {
  // Combine weight history data
  const combinedWeightData = data.reneer.weightHistory.map((r, i) => ({
    week: r.week,
    reneer: r.weight,
    anaPaula: data.anaPaula.weightHistory[i]?.weight || null,
  }));

  // Combine fat history data
  const combinedFatData = data.reneer.fatHistory.map((r, i) => ({
    week: r.week,
    reneer: r.fat,
    anaPaula: data.anaPaula.fatHistory[i]?.fat || null,
  }));

  // Bar comparison data
  const barData = [
    { metric: "Gordura %", reneer: data.reneer.fat, anaPaula: data.anaPaula.fat },
    { metric: "Músculo %", reneer: data.reneer.muscle, anaPaula: data.anaPaula.muscle },
    { metric: "G. Visceral", reneer: data.reneer.visceralFat, anaPaula: data.anaPaula.visceralFat },
    { metric: "IMC", reneer: data.reneer.bmi, anaPaula: data.anaPaula.bmi },
  ];

  // Radar data (normalized for comparison)
  const radarData = [
    { metric: "Peso", reneer: (data.reneer.weight / 120) * 100, anaPaula: (data.anaPaula.weight / 120) * 100, fullMark: 100 },
    { metric: "Gordura", reneer: data.reneer.fat, anaPaula: data.anaPaula.fat, fullMark: 50 },
    { metric: "Músculo", reneer: data.reneer.muscle, anaPaula: data.anaPaula.muscle, fullMark: 80 },
    { metric: "IMC", reneer: (data.reneer.bmi / 40) * 100, anaPaula: (data.anaPaula.bmi / 40) * 100, fullMark: 100 },
    { metric: "TMB", reneer: (data.reneer.bmr / 2000) * 100, anaPaula: (data.anaPaula.bmr / 2000) * 100, fullMark: 100 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-serif font-bold text-foreground">Comparativo</h2>
        <p className="text-muted-foreground">Reneer vs Ana Paula</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Weight Evolution Comparison */}
        <Card className="card-elevated border-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg">📈 Evolução do Peso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedWeightData}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)} kg`]}
                    labelFormatter={(label) => `Semana ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="reneer" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    name="Reneer"
                    dot={{ fill: '#3b82f6', r: 3 }}
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    dataKey="anaPaula" 
                    stroke="#FF6B6B" 
                    strokeWidth={2} 
                    name="Ana Paula"
                    dot={{ fill: '#FF6B6B', r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fat Evolution Comparison */}
        <Card className="card-elevated border-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg">📉 Evolução da Gordura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedFatData}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis domain={[25, 40]} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                    labelFormatter={(label) => `Semana ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="reneer" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    name="Reneer"
                    dot={{ fill: '#3b82f6', r: 3 }}
                    connectNulls
                  />
                  <Line 
                    type="monotone" 
                    dataKey="anaPaula" 
                    stroke="#FF6B6B" 
                    strokeWidth={2} 
                    name="Ana Paula"
                    dot={{ fill: '#FF6B6B', r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart Comparison */}
        <Card className="card-elevated border-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg">📊 Métricas Atuais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="metric" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reneer" fill="#3b82f6" name="Reneer" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="anaPaula" fill="#FF6B6B" name="Ana Paula" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="card-elevated border-0">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg">🎯 Perfil Corporal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar 
                    name="Reneer" 
                    dataKey="reneer" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                  <Radar 
                    name="Ana Paula" 
                    dataKey="anaPaula" 
                    stroke="#FF6B6B" 
                    fill="#FF6B6B" 
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-blue-500/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Reneer - Peso</p>
            <p className="text-xl font-bold text-blue-600">{data.reneer.weight.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-coral/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Ana Paula - Peso</p>
            <p className="text-xl font-bold text-coral">{data.anaPaula.weight.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-blue-500/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Reneer - Gordura</p>
            <p className="text-xl font-bold text-blue-600">{data.reneer.fat.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-coral/10">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Ana Paula - Gordura</p>
            <p className="text-xl font-bold text-coral">{data.anaPaula.fat.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComparativeCharts;
