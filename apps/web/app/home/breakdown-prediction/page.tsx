'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function BreakdownPredictionPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMachine, setSelectedMachine] = useState<string>('Machine 1');

    useEffect(() => {
        fetch('/api/predictions')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error + (data.details ? `: ${data.details}` : ''));
                } else {
                    // Parse dates if needed, or keep as string
                    setData(data);
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Predictions</AlertTitle>
                    <AlertDescription>
                        {error}
                        <div className="mt-4 text-sm text-muted-foreground">
                            Please ensure the Python environment is set up correctly with pandas, tensorflow, and scikit-learn.
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Grouped captors by similar ranges/scales based on the data
    const captorGroups = [
        {
            title: 'Low Range Sensors (0-10)',
            description: 'Captors 2, 3, 4, 5, 6, 7',
            captors: [
                { num: 2, color: '#8884d8', name: 'Captor 2' },
                { num: 3, color: '#82ca9d', name: 'Captor 3' },
                { num: 4, color: '#ffc658', name: 'Captor 4' },
                { num: 5, color: '#ff7300', name: 'Captor 5' },
                { num: 6, color: '#0088fe', name: 'Captor 6' },
                { num: 7, color: '#00c49f', name: 'Captor 7' },
            ]
        },
        {
            title: 'Medium Range Sensors (30-80)',
            description: 'Captors 9, 10, 11, 12, 13, 14, 15, 16, 17, 18',
            captors: [
                { num: 9, color: '#8884d8', name: 'Captor 9' },
                { num: 10, color: '#82ca9d', name: 'Captor 10' },
                { num: 11, color: '#ffc658', name: 'Captor 11' },
                { num: 12, color: '#ff7300', name: 'Captor 12' },
                { num: 13, color: '#0088fe', name: 'Captor 13' },
                { num: 14, color: '#00c49f', name: 'Captor 14' },
                { num: 15, color: '#ffbb28', name: 'Captor 15' },
                { num: 16, color: '#ff8042', name: 'Captor 16' },
                { num: 17, color: '#a4de6c', name: 'Captor 17' },
                { num: 18, color: '#d0ed57', name: 'Captor 18' },
            ]
        },
        {
            title: 'High Range Sensors (0-1500)',
            description: 'Captors 1, 8 - Variable high-value sensors',
            captors: [
                { num: 1, color: '#8884d8', name: 'Captor 1' },
                { num: 8, color: '#ff7300', name: 'Captor 8' },
            ]
        }
    ];

    // Get risk level based on prediction value
    const getRiskColor = (value: number) => {
        if (value >= 0.7) return '#ef4444'; // High risk - red
        if (value >= 0.4) return '#f59e0b'; // Medium risk - orange
        return '#22c55e'; // Low risk - green
    };

    const getRiskLabel = (value: number) => {
        if (value >= 0.7) return 'High Risk';
        if (value >= 0.4) return 'Medium Risk';
        return 'Low Risk';
    };

    // Prepare bar chart data for predictions
    const predictionData = data.length > 0 ? data.map((item, idx) => ({
        time: item.Time,
        index: idx,
        prediction: item[`${selectedMachine}_Prediction`] || 0,
        actual: item[selectedMachine] || 0,
    })) : [];

    return (
        <div className="container mx-auto p-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Breakdown Predictions</h1>
                <p className="text-muted-foreground">
                    Real-time analysis and prediction of machine breakdowns based on sensor data.
                </p>
            </div>

            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Select Machine:</label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Machine 1">Machine 1</SelectItem>
                        <SelectItem value="Machine 2">Machine 2</SelectItem>
                        <SelectItem value="Machine 3">Machine 3</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{selectedMachine} - Breakdown Risk Predictions</CardTitle>
                    <div className="flex items-center gap-6 mt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                            <span className="text-sm text-muted-foreground">Low Risk (&lt; 0.4)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                            <span className="text-sm text-muted-foreground">Medium Risk (0.4-0.7)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                            <span className="text-sm text-muted-foreground">High Risk (≥ 0.7)</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={predictionData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                                dataKey="time" 
                                minTickGap={50}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis domain={[0, 1]} />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: 'hsl(var(--background))', 
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px',
                                    padding: '12px'
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const value = payload[0].value as number;
                                        const actual = payload[0].payload.actual;
                                        return (
                                            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                                <p className="font-semibold mb-1">{payload[0].payload.time}</p>
                                                <p className="text-sm">
                                                    Risk Level: <span className="font-semibold" style={{ color: getRiskColor(value) }}>
                                                        {getRiskLabel(value)}
                                                    </span>
                                                </p>
                                                <p className="text-sm">Prediction: {(value * 100).toFixed(1)}%</p>
                                                <p className="text-sm">Actual: {actual === 1 ? 'Breakdown' : 'Normal'}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="prediction" radius={[4, 4, 0, 0]}>
                                {predictionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getRiskColor(entry.prediction)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {captorGroups.map((group, idx) => (
                    <Card key={idx} className={idx === 1 ? 'lg:col-span-2' : ''}>
                        <CardHeader>
                            <CardTitle>{group.title}</CardTitle>
                            <CardDescription>{group.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="Time" minTickGap={50} tick={{ fontSize: 11 }} />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{ 
                                            backgroundColor: 'hsl(var(--background))', 
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                                    />
                                    <Legend />
                                    {group.captors.map((captor) => (
                                        <Line
                                            key={captor.num}
                                            type="monotone"
                                            dataKey={`Captor ${captor.num}`}
                                            stroke={captor.color}
                                            name={captor.name}
                                            dot={false}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
