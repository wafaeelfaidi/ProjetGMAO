'use client';

import { useMemo } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { ChartConfig, ChartContainer } from '@kit/ui/chart';

import {
  getNumericStats,
  getUniqueValues,
  parseFrenchNumber,
} from '~/lib/csv-utils';

interface DataRow {
  [key: string]: string;
}

interface VisualizationProps {
  data: DataRow[];
  columnName: string;
  title: string;
  description?: string;
}

/**
 * Displays a bar chart for categorical data showing count per category
 */
export function CategoryBarChart({
  data,
  columnName,
  title,
  description,
}: VisualizationProps) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const row of data) {
      const value = row[columnName] || 'N/A';
      counts[value] = (counts[value] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [data, columnName]);

  const chartConfig = {
    count: {
      label: 'Count',
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0]!.payload as {
                    fullName: string;
                    count: number;
                  };
                  return (
                    <div className="bg-background border-border rounded-lg border p-2 shadow-md">
                      <p className="font-semibold">{data.fullName}</p>
                      <p className="text-muted-foreground text-sm">
                        Count: {data.count}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="var(--color-count)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Displays a pie chart for categorical distribution
 */
export function CategoryPieChart({
  data,
  columnName,
  title,
  description,
}: VisualizationProps) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const row of data) {
      const value = row[columnName] || 'N/A';
      counts[value] = (counts[value] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8
  }, [data, columnName]);

  const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.name}: ${entry.value}`}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0]!.payload as {
                  fullName: string;
                  value: number;
                };
                return (
                  <div className="bg-background border-border rounded-lg border p-2 shadow-md">
                    <p className="font-semibold">{data.fullName}</p>
                    <p className="text-muted-foreground text-sm">
                      Count: {data.value}
                    </p>
                  </div>
                );
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Displays statistics for a numeric column
 */
export function NumericStatsCard({
  data,
  columnName,
  title,
  description,
}: VisualizationProps) {
  const stats = useMemo(() => {
    return getNumericStats(data, columnName);
  }, [data, columnName]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatItem label="Total" value={stats.sum.toFixed(2)} />
          <StatItem label="Count" value={stats.count.toString()} />
          <StatItem label="Average" value={stats.avg.toFixed(2)} />
          <StatItem label="Min" value={stats.min.toFixed(2)} />
          <StatItem label="Max" value={stats.max.toFixed(2)} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-heading text-xl font-semibold">{value}</span>
    </div>
  );
}

/**
 * Displays a bar chart for numeric data aggregated by category
 */
export function NumericByCategory({
  data,
  categoryColumn,
  numericColumn,
  title,
  description,
}: {
  data: DataRow[];
  categoryColumn: string;
  numericColumn: string;
  title: string;
  description?: string;
}) {
  const chartData = useMemo(() => {
    const aggregated: Record<string, { sum: number; count: number }> = {};

    for (const row of data) {
      const category = row[categoryColumn] || 'N/A';
      const value = parseFrenchNumber(row[numericColumn] || '0');

      if (!aggregated[category]) {
        aggregated[category] = { sum: 0, count: 0 };
      }

      aggregated[category]!.sum += value;
      aggregated[category]!.count += 1;
    }

    return Object.entries(aggregated)
      .map(([name, { sum }]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        value: sum,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data, categoryColumn, numericColumn]);

  const chartConfig = {
    value: {
      label: 'Total',
      color: 'var(--chart-2)',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0]!.payload as {
                    fullName: string;
                    value: number;
                  };
                  return (
                    <div className="bg-background border-border rounded-lg border p-2 shadow-md">
                      <p className="font-semibold">{data.fullName}</p>
                      <p className="text-muted-foreground text-sm">
                        Total: {data.value.toFixed(2)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill="var(--color-value)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
