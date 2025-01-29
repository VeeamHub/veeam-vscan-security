import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { DashboardStats } from '@/types/vscan';

interface SeverityDistributionProps {
  stats: DashboardStats;
}

export function SeverityDistribution({ stats }: SeverityDistributionProps) {
  const data = [
    { name: 'Critical', value: stats.criticalVulns, color: '#dc2626' },
    { name: 'High', value: stats.highVulns, color: '#ea580c' },
    { name: 'Medium', value: stats.mediumVulns, color: '#eab308' },
    { name: 'Low', value: stats.lowVulns, color: '#22c55e' }
  ].filter(item => item.value > 0);

  return (
    <Card className="col-span-4">
      <CardContent className="p-6">
        <CardHeader className="flex flex-row items-center justify-between p-0 mb-6">
          <CardTitle className="text-xl flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Severity Distribution
          </CardTitle>
        </CardHeader>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {data.map((entry) => (
                  <Cell 
                    key={`cell-${entry.name}`} 
                    fill={entry.color}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  padding: '0.5rem'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}