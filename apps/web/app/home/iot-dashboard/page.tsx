'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Activity,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  getNumericStats,
  isNumericColumn,
  parseFrenchNumber,
} from '~/lib/csv-utils';
import { parseCSVContent } from '~/lib/DataManagement/csv-parser';

import {
  CategoryBarChart,
  NumericByCategory,
  NumericStatsCard,
} from '../_components/visualizations';

interface StreamStatus {
  active: boolean;
  current_row: number;
  total_rows: number;
  file_name: string;
  started_at: string | null;
  paused: boolean;
  progress_percentage: number;
}

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
  separator: ';' | ',';
  totalRows: number;
}

export default function IoTDashboardPage() {
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch stream status
  const fetchStreamStatus = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8001/stream/status');
      const status: StreamStatus = await response.json();
      setStreamStatus(status);
    } catch (err) {
      console.error('Error fetching stream status:', err);
    }
  }, []);

  // Fetch latest CSV data
  const fetchLatestData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get list of CSV files from Supabase
      const response = await fetch('/api/csv-files');
      const result = await response.json();

      if (!result.success || result.files.length === 0) {
        setError('No CSV files found in Supabase Storage');
        setLoading(false);
        return;
      }

      // Get the latest file (first one, since they're sorted by updated_at desc)
      const latestFile = result.files[0];

      // Download file content
      const downloadResponse = await fetch(
        `/api/csv-files/download?path=${encodeURIComponent(latestFile.path)}`,
      );
      const downloadResult = await downloadResponse.json();

      if (!downloadResult.success) {
        setError('Failed to download CSV file');
        setLoading(false);
        return;
      }

      // Parse CSV content
      const { headers, rows, separator } = parseCSVContent(
        downloadResult.content,
      );

      setCSVData({ headers, rows, separator, totalRows: rows.length });
      setLastUpdate(new Date());
    } catch (err) {
      setError('Error loading data from Supabase');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start streaming
  const handleStartStream = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8001/stream/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_file_path: '../../DATA/Final copy.csv',
          chunk_size: 10,
          interval_seconds: 2.0,
        }),
      });

      if (response.ok) {
        await fetchStreamStatus();
        setAutoRefresh(true);
      }
    } catch (err) {
      setError('Error starting stream. Is the IoT streaming server running?');
      console.error(err);
    }
  }, [fetchStreamStatus]);

  // Stop streaming
  const handleStopStream = useCallback(async () => {
    try {
      await fetch('http://localhost:8001/stream/stop', { method: 'POST' });
      await fetchStreamStatus();
      setAutoRefresh(false);
    } catch (err) {
      console.error(err);
    }
  }, [fetchStreamStatus]);

  // Pause/Resume streaming
  const handleTogglePause = useCallback(async () => {
    try {
      const endpoint = streamStatus?.paused ? 'resume' : 'pause';
      await fetch(`http://localhost:8001/stream/${endpoint}`, {
        method: 'POST',
      });
      await fetchStreamStatus();
    } catch (err) {
      console.error(err);
    }
  }, [streamStatus, fetchStreamStatus]);

  // Auto-refresh data when streaming is active
  useEffect(() => {
    if (!autoRefresh || !streamStatus?.active) return;

    const interval = setInterval(() => {
      void fetchLatestData();
      void fetchStreamStatus();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, streamStatus, fetchLatestData, fetchStreamStatus]);

  // Initial data fetch
  useEffect(() => {
    void fetchLatestData();
    void fetchStreamStatus();
  }, []);

  // Get machine columns from the data
  const machineColumns = useMemo(() => {
    if (!csvData) return [];
    return csvData.headers.filter((h) =>
      h.toLowerCase().startsWith('machine'),
    );
  }, [csvData]);

  // Filter data by selected machine
  const filteredData = useMemo(() => {
    if (!csvData || selectedMachine === 'all') return csvData?.rows || [];

    // Filter rows where the selected machine column has value '1'
    return csvData.rows.filter((row) => row[selectedMachine] === '1');
  }, [csvData, selectedMachine]);

  // Get sensor columns (captors)
  const sensorColumns = useMemo(() => {
    if (!csvData) return [];
    return csvData.headers.filter(
      (h) =>
        h.toLowerCase().startsWith('captor') ||
        h.toLowerCase().startsWith('capteur'),
    );
  }, [csvData]);

  // Calculate statistics for sensors
  const sensorStats = useMemo(() => {
    if (!csvData || !filteredData.length) return [];

    return sensorColumns.map((sensor) => {
      const stats = getNumericStats(filteredData, sensor);
      return {
        name: sensor,
        ...stats,
      };
    });
  }, [csvData, filteredData, sensorColumns]);

  return (
    <div className="flex flex-col space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">
            IoT Sensor Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time sensor data monitoring and analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-muted-foreground text-sm">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchLatestData()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stream Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Stream Control
          </CardTitle>
          <CardDescription>
            Control the IoT data streaming simulation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Status Display */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge
                  variant={
                    streamStatus?.active
                      ? streamStatus.paused
                        ? 'secondary'
                        : 'default'
                      : 'outline'
                  }
                >
                  {streamStatus?.active
                    ? streamStatus.paused
                      ? 'Paused'
                      : 'Streaming'
                    : 'Stopped'}
                </Badge>
              </div>

              {streamStatus?.active && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Progress:</span>
                  <span className="text-sm">
                    {streamStatus.current_row} / {streamStatus.total_rows} rows
                    ({streamStatus.progress_percentage.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {streamStatus?.active && (
              <div className="bg-secondary h-2 w-full rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${streamStatus.progress_percentage}%` }}
                />
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {!streamStatus?.active ? (
                <Button onClick={handleStartStream}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Stream
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleTogglePause}
                  >
                    {streamStatus.paused ? (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    )}
                  </Button>
                  <Button variant="destructive" onClick={handleStopStream}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machine Filter */}
      {machineColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Machine Filter</CardTitle>
            <CardDescription>Filter data by machine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="machine-select">Select Machine</Label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger id="machine-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Machines</SelectItem>
                  {machineColumns.map((machine) => (
                    <SelectItem key={machine} value={machine}>
                      {machine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Loading sensor data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Visualization */}
      {csvData && filteredData.length > 0 && (
        <>
          {/* KPI Cards - Sensor Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sensorStats.slice(0, 4).map((sensor) => (
              <Card key={sensor.name}>
                <CardHeader className="pb-2">
                  <CardDescription className="truncate" title={sensor.name}>
                    {sensor.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="font-heading text-2xl font-bold">
                    {sensor.avg.toFixed(2)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Avg (Min: {sensor.min.toFixed(1)}, Max:{' '}
                    {sensor.max.toFixed(1)})
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sensor Visualizations */}
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold">
              Sensor Analysis
              {selectedMachine !== 'all' && ` - ${selectedMachine}`}
            </h2>

            {/* Numeric Statistics for Sensors */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {sensorColumns.slice(0, 6).map((sensor) => (
                <NumericStatsCard
                  key={sensor}
                  data={filteredData}
                  columnName={sensor}
                  title={`${sensor} Statistics`}
                  description={`Statistical summary for ${sensor}`}
                />
              ))}
            </div>

            {/* Machine Distribution if "All Machines" is selected */}
            {selectedMachine === 'all' && machineColumns.length > 0 && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {machineColumns.map((machine) => (
                  <CategoryBarChart
                    key={machine}
                    data={filteredData}
                    columnName={machine}
                    title={`${machine} Status Distribution`}
                    description={`Active status for ${machine}`}
                  />
                ))}
              </div>
            )}

            {/* Sensor values by machine */}
            {sensorColumns.slice(0, 3).map((sensor) =>
              machineColumns.slice(0, 1).map((machine) => (
                <NumericByCategory
                  key={`${sensor}-${machine}`}
                  data={filteredData}
                  categoryColumn={machine}
                  numericColumn={sensor}
                  title={`${sensor} by ${machine}`}
                  description={`Total ${sensor} grouped by ${machine}`}
                />
              )),
            )}
          </div>

          {/* Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Data Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-sm">Total Rows</p>
                  <p className="font-heading text-xl font-semibold">
                    {csvData.totalRows}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Filtered Rows</p>
                  <p className="font-heading text-xl font-semibold">
                    {filteredData.length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Sensors</p>
                  <p className="font-heading text-xl font-semibold">
                    {sensorColumns.length}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Machines</p>
                  <p className="font-heading text-xl font-semibold">
                    {machineColumns.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
