'use client';

import { useEffect, useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
    Loader2, AlertTriangle, TrendingUp, Activity,
    Gauge, BarChart3, RefreshCw, Info, Cpu, Clock, Shield
} from 'lucide-react';

// Types
interface PredictionData {
    Time: string;
    id: number;
    [key: string]: any;
}

interface SummaryData {
    [machine: string]: {
        avg_risk: number;
        max_risk: number;
        high_risk_count: number;
        medium_risk_count: number;
        low_risk_count: number;
    };
}

interface BenchmarkResult {
    Model: string;
    Machine: string;
    Accuracy: number;
    Precision: number;
    Recall: number;
    'F1 Score': number;
    AUC: number;
}

interface ModelInfo {
    best_model_type: string;
    seq_length: number;
    machines: string[];
    feature_count: number;
}

// Helper functions
const getRiskLevel = (value: number): string => {
    if (value >= 0.7) return 'High';
    if (value >= 0.4) return 'Medium';
    return 'Low';
};

const getRiskColor = (value: number): string => {
    if (value >= 0.7) return '#ef4444';
    if (value >= 0.4) return '#f59e0b';
    return '#22c55e';
};

const getRiskBadgeVariant = (value: number): 'destructive' | 'secondary' | 'default' => {
    if (value >= 0.7) return 'destructive';
    if (value >= 0.4) return 'secondary';
    return 'default';
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                <p className="font-semibold mb-2 text-sm">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">{entry.name}:</span>
                        <span className="font-medium">
                            {typeof entry.value === 'number'
                                ? `${(entry.value * 100).toFixed(1)}%`
                                : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function BreakdownPredictionPage() {
    const [data, setData] = useState<PredictionData[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [benchmark, setBenchmark] = useState<BenchmarkResult[]>([]);
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMachine, setSelectedMachine] = useState<string>('Machine 1');
    const [refreshing, setRefreshing] = useState(false);

    const machines = ['Machine 1', 'Machine 2', 'Machine 3'];
    const machineColors: Record<string, string> = {
        'Machine 1': '#2563eb',
        'Machine 2': '#7c3aed',
        'Machine 3': '#059669'
    };

    // Fetch data function
    const fetchData = async () => {
        try {
            setRefreshing(true);
            
            // Fetch predictions with summary
            const predRes = await fetch('http://localhost:8000/predictions/latest?count=100');
            const predData = await predRes.json();
            
            if (predData.success) {
                setData(predData.data);
                setSummary(predData.summary);
            } else {
                throw new Error(predData.detail || 'Failed to fetch predictions');
            }

            // Fetch model info
            try {
                const modelRes = await fetch('http://localhost:8000/model-info');
                const modelData = await modelRes.json();
                setModelInfo(modelData);
            } catch (e) {
                console.warn('Could not fetch model info');
            }

            // Fetch benchmark results
            try {
                const benchRes = await fetch('http://localhost:8000/benchmark');
                const benchData = await benchRes.json();
                if (benchData.success) {
                    setBenchmark(benchData.results);
                }
            } catch (e) {
                console.warn('Could not fetch benchmark data');
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load predictions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Compute derived data
    const chartData = useMemo(() => {
        return data.map((item, idx) => ({
            time: new Date(item.Time).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            fullTime: item.Time,
            index: idx,
            'Machine 1': item['Machine 1_Prediction'] || 0,
            'Machine 2': item['Machine 2_Prediction'] || 0,
            'Machine 3': item['Machine 3_Prediction'] || 0,
            'Machine 1_Actual': item['Machine 1'] || 0,
            'Machine 2_Actual': item['Machine 2'] || 0,
            'Machine 3_Actual': item['Machine 3'] || 0,
        }));
    }, [data]);

    const currentRisks = useMemo(() => {
        if (data.length === 0) return null;
        const latest = data[data.length - 1];
        return machines.map(machine => ({
            machine,
            risk: latest[`${machine}_Prediction`] || 0,
            actual: latest[machine] || 0,
            riskLevel: getRiskLevel(latest[`${machine}_Prediction`] || 0)
        }));
    }, [data]);

    const riskDistribution = useMemo(() => {
        if (!summary) return [];
        return machines.map(machine => ({
            machine,
            high: summary[machine]?.high_risk_count || 0,
            medium: summary[machine]?.medium_risk_count || 0,
            low: summary[machine]?.low_risk_count || 0
        }));
    }, [summary]);

    // Benchmark data for selected machine
    const machineBenchmark = useMemo(() => {
        return benchmark.filter(b => b.Machine === selectedMachine);
    }, [benchmark, selectedMachine]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading prediction models...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Predictions</AlertTitle>
                    <AlertDescription>
                        {error}
                        <div className="mt-4">
                            <Button onClick={fetchData} variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Activity className="h-8 w-8 text-primary" />
                        Breakdown Predictions
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Real-time machine breakdown risk analysis using GRU time series models
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {modelInfo && (
                        <Badge variant="outline" className="text-sm px-3 py-1">
                            <Cpu className="h-3 w-3 mr-1" />
                            {modelInfo.best_model_type} Model
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Current Risk Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {currentRisks?.map((risk) => (
                    <Card key={risk.machine} className="relative overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                background: `linear-gradient(135deg, ${getRiskColor(risk.risk)} 0%, transparent 100%)`
                            }}
                        />
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center justify-between">
                                <span className="text-lg">{risk.machine}</span>
                                <Badge variant={getRiskBadgeVariant(risk.risk)}>
                                    {risk.riskLevel} Risk
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-4xl font-bold" style={{ color: getRiskColor(risk.risk) }}>
                                        {(risk.risk * 100).toFixed(1)}%
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Breakdown Probability
                                    </p>
                                </div>
                                <div className="text-right">
                                    <Gauge
                                        className="h-12 w-12"
                                        style={{ color: getRiskColor(risk.risk) }}
                                    />
                                </div>
                            </div>
                            {summary && (
                                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center text-xs">
                                    <div>
                                        <p className="font-semibold text-green-500">
                                            {summary[risk.machine]?.low_risk_count || 0}
                                        </p>
                                        <p className="text-muted-foreground">Low</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-orange-500">
                                            {summary[risk.machine]?.medium_risk_count || 0}
                                        </p>
                                        <p className="text-muted-foreground">Medium</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-red-500">
                                            {summary[risk.machine]?.high_risk_count || 0}
                                        </p>
                                        <p className="text-muted-foreground">High</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="predictions" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="predictions" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Predictions
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Comparison
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Analysis
                    </TabsTrigger>
                    <TabsTrigger value="benchmark" className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        Benchmark
                    </TabsTrigger>
                </TabsList>

                {/* Predictions Tab */}
                <TabsContent value="predictions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Risk Prediction Timeline</CardTitle>
                                    <CardDescription>
                                        Breakdown probability predictions over time for all machines
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-4">
                                    {machines.map(machine => (
                                        <div key={machine} className="flex items-center gap-2 text-sm">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: machineColors[machine] }}
                                            />
                                            <span>{machine}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        {machines.map(machine => (
                                            <linearGradient
                                                key={machine}
                                                id={`gradient-${machine.replace(' ', '')}`}
                                                x1="0" y1="0" x2="0" y2="1"
                                            >
                                                <stop
                                                    offset="5%"
                                                    stopColor={machineColors[machine]}
                                                    stopOpacity={0.3}
                                                />
                                                <stop
                                                    offset="95%"
                                                    stopColor={machineColors[machine]}
                                                    stopOpacity={0}
                                                />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                                    <YAxis
                                        domain={[0, 1]}
                                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    {machines.map(machine => (
                                        <Area
                                            key={machine}
                                            type="monotone"
                                            dataKey={machine}
                                            stroke={machineColors[machine]}
                                            fill={`url(#gradient-${machine.replace(' ', '')})`}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Risk Level Bar Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {machines.map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>Risk History</span>
                            </CardTitle>
                            <CardDescription>
                                Individual prediction values with risk level coloring
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                    <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey={selectedMachine} radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={getRiskColor(entry[selectedMachine] as number)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Comparison Tab */}
                <TabsContent value="comparison" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Risk Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Distribution</CardTitle>
                                <CardDescription>
                                    Distribution of risk events by machine
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={riskDistribution} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="machine" type="category" width={80} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low Risk" />
                                        <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium Risk" />
                                        <Bar dataKey="high" stackId="a" fill="#ef4444" name="High Risk" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Predictions vs Actual */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Predictions vs Actual</CardTitle>
                                <CardDescription>
                                    Compare predicted risk with actual breakdown events
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                        <YAxis domain={[0, 1]} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey={selectedMachine}
                                            stroke={machineColors[selectedMachine]}
                                            strokeWidth={2}
                                            dot={false}
                                            name={`${selectedMachine} Prediction`}
                                        />
                                        <Line
                                            type="stepAfter"
                                            dataKey={`${selectedMachine}_Actual`}
                                            stroke="#6b7280"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={false}
                                            name={`${selectedMachine} Actual`}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Radar Chart Comparison */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Machine Risk Profile Comparison</CardTitle>
                            <CardDescription>
                                Multi-dimensional comparison of machine risk metrics
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={[
                                    { metric: 'Avg Risk', ...Object.fromEntries(machines.map(m => [m, (summary?.[m]?.avg_risk || 0) * 100])) },
                                    { metric: 'Max Risk', ...Object.fromEntries(machines.map(m => [m, (summary?.[m]?.max_risk || 0) * 100])) },
                                    { metric: 'High Events', ...Object.fromEntries(machines.map(m => [m, summary?.[m]?.high_risk_count || 0])) },
                                    { metric: 'Medium Events', ...Object.fromEntries(machines.map(m => [m, summary?.[m]?.medium_risk_count || 0])) },
                                ]}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="metric" />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    {machines.map(machine => (
                                        <Radar
                                            key={machine}
                                            name={machine}
                                            dataKey={machine}
                                            stroke={machineColors[machine]}
                                            fill={machineColors[machine]}
                                            fillOpacity={0.2}
                                        />
                                    ))}
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Summary Statistics */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Risk Summary Statistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {machines.map(machine => (
                                        <div key={machine} className="p-4 rounded-lg bg-muted/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold">{machine}</h4>
                                                <Badge
                                                    variant={getRiskBadgeVariant(summary?.[machine]?.avg_risk || 0)}
                                                >
                                                    Avg: {((summary?.[machine]?.avg_risk || 0) * 100).toFixed(1)}%
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Max Risk</p>
                                                    <p className="font-medium">
                                                        {((summary?.[machine]?.max_risk || 0) * 100).toFixed(1)}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">High Risk Events</p>
                                                    <p className="font-medium text-red-500">
                                                        {summary?.[machine]?.high_risk_count || 0}
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Risk bar */}
                                            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full transition-all duration-500"
                                                    style={{
                                                        width: `${(summary?.[machine]?.avg_risk || 0) * 100}%`,
                                                        backgroundColor: getRiskColor(summary?.[machine]?.avg_risk || 0)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Model Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Model Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {modelInfo ? (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-lg bg-muted/50">
                                            <h4 className="font-semibold mb-2">Model Architecture</h4>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Model Type</p>
                                                    <p className="font-medium">{modelInfo.best_model_type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Sequence Length</p>
                                                    <p className="font-medium">{modelInfo.seq_length} steps</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Features Used</p>
                                                    <p className="font-medium">{modelInfo.feature_count}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Machines</p>
                                                    <p className="font-medium">{modelInfo.machines.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Alert>
                                            <Clock className="h-4 w-4" />
                                            <AlertTitle>Time Series Model</AlertTitle>
                                            <AlertDescription>
                                                This model uses the last {modelInfo.seq_length * 2} hours of data
                                                to predict breakdown risk. It considers temporal patterns and
                                                rolling statistics for more accurate predictions.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Model information not available</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Risk Level Legend */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Understanding Risk Levels</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <div className="w-4 h-4 rounded-full bg-green-500 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-green-700 dark:text-green-400">Low Risk (&lt; 40%)</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Machine operating normally. Continue standard monitoring.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                    <div className="w-4 h-4 rounded-full bg-orange-500 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-orange-700 dark:text-orange-400">Medium Risk (40-70%)</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Increased attention required. Schedule preventive maintenance.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <div className="w-4 h-4 rounded-full bg-red-500 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-red-700 dark:text-red-400">High Risk (≥ 70%)</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Immediate attention needed. Consider stopping machine for inspection.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Benchmark Tab */}
                <TabsContent value="benchmark" className="space-y-4">
                    {benchmark.length > 0 ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Model Benchmark Results</CardTitle>
                                    <CardDescription>
                                        Performance comparison of 4 time series models: LSTM, GRU, Random Forest, XGBoost
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={machineBenchmark}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="Model" />
                                            <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                                            <Tooltip
                                                formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                                            />
                                            <Legend />
                                            <Bar dataKey="Accuracy" fill="#2563eb" name="Accuracy" />
                                            <Bar dataKey="F1 Score" fill="#7c3aed" name="F1 Score" />
                                            <Bar dataKey="AUC" fill="#059669" name="AUC" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {['LSTM', 'GRU', 'RF', 'XGB'].map(modelType => {
                                    const modelData = benchmark.find(
                                        b => b.Model === modelType && b.Machine === selectedMachine
                                    );
                                    const isSelected = modelInfo?.best_model_type === modelType;
                                    
                                    return (
                                        <Card
                                            key={modelType}
                                            className={isSelected ? 'border-primary border-2' : ''}
                                        >
                                            <CardHeader className="pb-2">
                                                <CardTitle className="flex items-center justify-between">
                                                    <span>{modelType}</span>
                                                    {isSelected && (
                                                        <Badge variant="default">Selected</Badge>
                                                    )}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {modelData ? (
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Accuracy</span>
                                                            <span className="font-medium">
                                                                {(modelData.Accuracy * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">F1 Score</span>
                                                            <span className="font-medium">
                                                                {(modelData['F1 Score'] * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">AUC</span>
                                                            <span className="font-medium">
                                                                {(modelData.AUC * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Precision</span>
                                                            <span className="font-medium">
                                                                {(modelData.Precision * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">Recall</span>
                                                            <span className="font-medium">
                                                                {(modelData.Recall * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-muted-foreground">No data</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Model Selection Criteria</AlertTitle>
                                <AlertDescription>
                                    The {modelInfo?.best_model_type || 'GRU'} model was selected based on the highest
                                    average F1 Score across all machines. F1 Score provides the best balance between
                                    precision (avoiding false alarms) and recall (catching actual breakdowns).
                                </AlertDescription>
                            </Alert>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground">
                                    Benchmark data not available. Run the training notebook to generate benchmark results.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
