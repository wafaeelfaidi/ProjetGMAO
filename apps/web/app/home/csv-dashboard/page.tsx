'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FileSpreadsheet, Loader2, ChevronDown, ChevronUp, Activity } from 'lucide-react';

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
  filterByDesignation,
  getNumericStats,
  getUniqueValues,
  isDateColumn,
  isNumericColumn,
  parseFrenchDate,
  parseFrenchNumber,
} from '~/lib/csv-utils';
import { parseCSVContent } from '~/lib/DataManagement/csv-parser';

import { DataTable } from './_components/data-table';
import { FilterControls } from './_components/filter-controls';
import {
  CategoryBarChart,
  CategoryPieChart,
  NumericByCategory,
  NumericStatsCard,
} from './_components/visualizations';

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
  separator: ';' | ',';
  totalRows: number;
}

interface CSVFile {
  name: string;
  path: string;
  publicUrl: string;
  updated_at?: string;
}

interface StreamingStatus {
  isConnected: boolean;
  isStreaming: boolean;
  currentRow: number;
  totalRows: number;
  progress: number;
  fileName: string;
}

export default function CSVDashboardPage() {
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rangeMin, setRangeMin] = useState<number>(0);
  const [rangeMax, setRangeMax] = useState<number>(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>({
    isConnected: false,
    isStreaming: false,
    currentRow: 0,
    totalRows: 0,
    progress: 0,
    fileName: '',
  });
  const [liveMode, setLiveMode] = useState<boolean>(true); // Live mode enabled by default
  const [isDataPreviewExpanded, setIsDataPreviewExpanded] = useState<boolean>(true); // Data preview expanded by default
  const [selectedMachine, setSelectedMachine] = useState<string>('all'); // Machine filter for KPIs

  // Load list of CSV files from Supabase Storage on mount
  useEffect(() => {
    async function loadFiles() {
      setLoadingFiles(true);
      setError(null);
      try {
        const response = await fetch('/api/csv-files');
        const result = await response.json();
        
        if (!result.success) {
          setError(result.error || 'Error loading file list from Supabase');
          console.error('Failed to load files:', result.error);
          return;
        }
        
        console.log('Files loaded:', result.files);
        setFiles(result.files || []);
        
        if (result.files.length === 0) {
          setError('No CSV files found. Please start the IoT streaming to generate data.');
        }
      } catch (err) {
        const errorMsg = 'Error loading file list from Supabase. Make sure the API is running.';
        setError(errorMsg);
        console.error(errorMsg, err);
      } finally {
        setLoadingFiles(false);
      }
    }

    void loadFiles();
  }, []);

  // Load CSV data when file is selected from Supabase Storage
  const loadCSVData = useCallback(async (filename: string, preserveFilters = false) => {
    if (!filename) return;

    // Only show loading indicator for initial load, not refreshes
    if (!preserveFilters) {
      setLoading(true);
    }
    setError(null);
    
    // Only reset filters if not preserving them
    if (!preserveFilters) {
      setCSVData(null);
      setSelectedColumn('');
      setSelectedValue('all');
      setSearchTerm('');
      setRangeMin(0);
      setRangeMax(0);
    }

    try {
      // Find the file by name
      const file = files.find((f) => f.name === filename);
      if (!file) {
        setError('File not found in Supabase Storage');
        return;
      }

      // Download file content from Supabase Storage
      const response = await fetch(`/api/csv-files/download?path=${encodeURIComponent(file.path)}`);
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Failed to load file from Supabase Storage');
        return;
      }

      const content = result.content;
      
      if (!content || content.trim().length === 0) {
        setError('CSV file is empty');
        return;
      }

      // Parse CSV content using the utility function
      const { headers, rows, separator } = parseCSVContent(content);

      setCSVData({ headers, rows, separator, totalRows: rows.length });
      setLastRefresh(new Date());
    } catch (err) {
      setError('Error loading CSV data from Supabase Storage');
      console.error(err);
    } finally {
      if (!preserveFilters) {
        setLoading(false);
      }
    }
  }, [files]);

  // Refresh current file data (preserves filters)
  const refreshData = useCallback(() => {
    if (selectedFile) {
      loadCSVData(selectedFile, true);
    }
  }, [selectedFile, loadCSVData]);

  // WebSocket connection for live updates
  useEffect(() => {
    if (!liveMode) {
      // Disconnect if live mode is disabled
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setStreamingStatus(prev => ({ ...prev, isConnected: false }));
      }
      return;
    }

    // Connect to WebSocket
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('ws://localhost:8001/ws');
        
        ws.onopen = () => {
          console.log('🔗 WebSocket connected');
          setStreamingStatus(prev => ({ ...prev, isConnected: true }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'connected') {
              setStreamingStatus(prev => ({
                ...prev,
                isStreaming: data.streaming_active,
                currentRow: data.current_row,
                totalRows: data.total_rows,
                fileName: data.file_name,
              }));
            } else if (data.type === 'data_update') {
              setStreamingStatus(prev => ({
                ...prev,
                isStreaming: true,
                currentRow: data.current_row,
                totalRows: data.total_rows,
                progress: data.progress,
                fileName: data.file_name,
              }));
              
              // Auto-refresh data if we're viewing the streaming file
              if (selectedFile && data.file_name === selectedFile) {
                loadCSVData(selectedFile, true);
              }
            } else if (data.type === 'streaming_complete') {
              setStreamingStatus(prev => ({
                ...prev,
                isStreaming: false,
                progress: 100,
              }));
              
              // Final refresh
              if (selectedFile && data.file_name === selectedFile) {
                loadCSVData(selectedFile, true);
              }
            } else if (data.type === 'ping') {
              ws.send('pong');
            }
          } catch (err) {
            console.error('WebSocket message parse error:', err);
          }
        };

        ws.onclose = (event) => {
          if (event.code !== 1000) {
            console.log('🔌 WebSocket disconnected (code:', event.code, ')');
          }
          setStreamingStatus(prev => ({ ...prev, isConnected: false }));
          
          // Reconnect after 3 seconds if live mode is still enabled
          if (liveMode) {
            setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          // WebSocket errors are typically connection failures
          // The onclose handler will manage reconnection
          // No need to log since this usually means the server is not running
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [liveMode, selectedFile, loadCSVData]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (filename: string) => {
      setSelectedFile(filename);
      loadCSVData(filename);
    },
    [loadCSVData],
  );

  // Set default column on data load
  useEffect(() => {
    if (csvData && csvData.headers.length > 0 && !selectedColumn) {
      // Try to find designation column, otherwise use first column
      const designationCol =
        csvData.headers.find((h) => h.toLowerCase().includes('désignation')) ||
        csvData.headers.find((h) => h.toLowerCase().includes('designation')) ||
        csvData.headers[0];
      setSelectedColumn(designationCol || '');
    }
  }, [csvData, selectedColumn]);

  // Get column type for selected column
  const selectedColumnType = useMemo(() => {
    if (!csvData || !selectedColumn || !csvData.rows.length)
      return 'categorical';
    if (isNumericColumn(csvData.rows, selectedColumn)) return 'numeric';
    if (isDateColumn(csvData.rows, selectedColumn)) return 'date';
    return 'categorical';
  }, [csvData, selectedColumn]);

  // Get unique values for selected column (for categorical)
  const uniqueValues = useMemo(() => {
    if (!csvData || !selectedColumn) return [];
    return getUniqueValues(csvData.rows, selectedColumn);
  }, [csvData, selectedColumn]);

  // Get min/max values for numeric/date columns
  const { minValue, maxValue } = useMemo(() => {
    if (!csvData || !selectedColumn || selectedColumnType === 'categorical') {
      return { minValue: 0, maxValue: 0 };
    }

    if (selectedColumnType === 'numeric') {
      const stats = getNumericStats(csvData.rows, selectedColumn);
      return { minValue: stats.min, maxValue: stats.max };
    }

    // For date columns, convert to timestamps
    const timestamps = csvData.rows
      .map((row) => {
        const date = parseFrenchDate(row[selectedColumn] || '');
        return date ? date.getTime() : null;
      })
      .filter((t): t is number => t !== null);

    if (timestamps.length === 0) return { minValue: 0, maxValue: 0 };

    return {
      minValue: Math.min(...timestamps),
      maxValue: Math.max(...timestamps),
    };
  }, [csvData, selectedColumn, selectedColumnType]);

  // Reset range when column changes or data loads
  useEffect(() => {
    if (minValue !== 0 || maxValue !== 0) {
      setRangeMin(minValue);
      setRangeMax(maxValue);
    }
  }, [minValue, maxValue]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    if (!csvData || !selectedColumn) return csvData?.rows || [];

    let filtered = csvData.rows;

    // Apply range filter for numeric/date columns
    if (
      selectedColumnType === 'numeric' ||
      selectedColumnType === 'date'
    ) {
      if (selectedColumnType === 'numeric') {
        filtered = filtered.filter((row) => {
          const value = parseFrenchNumber(row[selectedColumn] || '0');
          return value >= rangeMin && value <= rangeMax;
        });
      } else {
        // Date filtering
        filtered = filtered.filter((row) => {
          const date = parseFrenchDate(row[selectedColumn] || '');
          if (!date) return false;
          const timestamp = date.getTime();
          return timestamp >= rangeMin && timestamp <= rangeMax;
        });
      }
    } else {
      // Apply value dropdown filter for categorical
      if (selectedValue !== 'all') {
        filtered = filtered.filter(
          (row) => row[selectedColumn] === selectedValue,
        );
      }

      // Apply search term filter for categorical
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase().trim();
        filtered = filtered.filter((row) => {
          const value = row[selectedColumn] || '';
          return value.toLowerCase().includes(searchLower);
        });
      }
    }

    return filtered;
  }, [
    csvData,
    selectedColumn,
    selectedColumnType,
    selectedValue,
    searchTerm,
    rangeMin,
    rangeMax,
  ]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedValue('all');
    setSearchTerm('');
    setRangeMin(minValue);
    setRangeMax(maxValue);
  }, [minValue, maxValue]);

  // Handle range change
  const handleRangeChange = useCallback((min: number, max: number) => {
    setRangeMin(min);
    setRangeMax(max);
  }, []);

  // Detect column types for visualizations
  const columnTypes = useMemo(() => {
    if (!csvData || !filteredData.length) return {};

    const types: Record<string, 'numeric' | 'date' | 'categorical'> = {};

    for (const header of csvData.headers) {
      if (isNumericColumn(filteredData, header)) {
        types[header] = 'numeric';
      } else if (isDateColumn(filteredData, header)) {
        types[header] = 'date';
      } else {
        types[header] = 'categorical';
      }
    }

    return types;
  }, [csvData, filteredData]);

  // Detect captor columns
  const captorColumns = useMemo(() => {
    if (!csvData) return [];
    return csvData.headers.filter(
      (h) =>
        h.toLowerCase().startsWith('captor') ||
        h.toLowerCase().startsWith('capteur')
    );
  }, [csvData]);

  // Detect machine columns
  const machineColumns = useMemo(() => {
    if (!csvData) return [];
    return csvData.headers.filter((h) =>
      h.toLowerCase().startsWith('machine')
    );
  }, [csvData]);

  // Calculate captor statistics
  const captorStats = useMemo(() => {
    if (!csvData || !filteredData.length || !captorColumns.length) return [];
    return captorColumns.map((captor) => {
      const stats = getNumericStats(filteredData, captor);
      return {
        name: captor,
        ...stats,
      };
    });
  }, [csvData, filteredData, captorColumns]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!csvData || !filteredData.length) {
      return {
        numericSums: {} as Record<string, number>,
        mtbf: null as number | null,
        mttr: null as number | null,
      };
    }

    // Calculate sums for all numeric columns
    const numericSums: Record<string, number> = {};
    const numericColumns = Object.entries(columnTypes)
      .filter(([_, type]) => type === 'numeric')
      .map(([col]) => col);

    for (const col of numericColumns) {
      const stats = getNumericStats(filteredData, col);
      numericSums[col] = stats.sum;
    }

    // Calculate MTBF and MTTR when a specific machine is selected
    let mtbf: number | null = null;
    let mttr: number | null = null;

    // Check if we're filtering by a specific machine
    const isMachineSelected = selectedMachine !== 'all' && machineColumns.includes(selectedMachine);

    if (isMachineSelected) {
      // Filter data for the selected machine (records where machine = 1 means failure/breakdown)
      const machineData = filteredData.filter(
        (row) => row[selectedMachine] === '1' || row[selectedMachine] === '1.0' || parseFloat(row[selectedMachine] || '0') === 1
      );

      // Find time column
      const timeCol = csvData.headers.find(
        (h) =>
          h.toLowerCase() === 'time' ||
          h.toLowerCase().includes('date') ||
          h.toLowerCase().includes('timestamp'),
      );

      if (timeCol && machineData.length > 0) {
        // Get timestamps of failures and sort them
        const failureTimes = machineData
          .map((row) => {
            const timeStr = row[timeCol];
            if (!timeStr) return null;
            const date = new Date(timeStr);
            return isNaN(date.getTime()) ? parseFrenchDate(timeStr) : date;
          })
          .filter((d): d is Date => d !== null)
          .sort((a, b) => a.getTime() - b.getTime());

        if (failureTimes.length > 1) {
          // Calculate MTBF (Mean Time Between Failures) in hours
          const intervals: number[] = [];
          for (let i = 1; i < failureTimes.length; i++) {
            const diff =
              (failureTimes[i]!.getTime() - failureTimes[i - 1]!.getTime()) /
              (1000 * 60 * 60); // Convert to hours
            intervals.push(diff);
          }

          if (intervals.length > 0) {
            mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          }
        }

        // Calculate MTTR - estimate based on data interval (assuming 2-hour intervals as repair time)
        // In a real scenario, you'd have actual repair duration data
        const totalFailures = machineData.length;
        if (totalFailures > 0) {
          // Estimate MTTR as average time between consecutive data points (repair time)
          mttr = 2.0; // Default 2 hours based on data collection interval
        }
      }
    }

    // Calculate Disponibility and Reliability for selected machine
    let disponibility: number | null = null;
    let reliability: number | null = null;

    if (isMachineSelected) {
      const totalRecords = filteredData.length;
      const failureRecords = filteredData.filter(
        (row) => row[selectedMachine] === '1' || row[selectedMachine] === '1.0' || parseFloat(row[selectedMachine] || '0') === 1
      ).length;

      // Disponibility = (Total Time - Downtime) / Total Time * 100
      // Calculated as percentage of records without failure
      disponibility = totalRecords > 0 ? ((totalRecords - failureRecords) / totalRecords) * 100 : 0;

      // Reliability = MTBF / (MTBF + MTTR) * 100
      // If MTBF and MTTR are available, calculate reliability using the formula
      if (mtbf !== null && mttr !== null && (mtbf + mttr) > 0) {
        reliability = (mtbf / (mtbf + mttr)) * 100;
      } else {
        // Fallback: use the same calculation as disponibility
        reliability = disponibility;
      }
    }

    return { numericSums, mtbf, mttr, disponibility, reliability };
  }, [csvData, filteredData, columnTypes, selectedMachine, machineColumns]);



  return (
    <div className="flex flex-col space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold">CSV Data Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Select a CSV file to visualize and analyze data
        </p>
      </div>

      {/* File Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select CSV File</CardTitle>
          <CardDescription>
            Choose a file from Supabase Storage to load and visualize
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="file-select">Available Files</Label>
            {loadingFiles ? (
              <div className="flex items-center gap-2 p-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading files from Supabase...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-muted-foreground text-sm">
                  No CSV files found in storage.
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Start the IoT streaming server to generate data, or visit the{' '}
                  <a href="/home/iot-dashboard" className="text-primary hover:underline">
                    IoT Dashboard
                  </a>
                </p>
              </div>
            ) : (
              <Select value={selectedFile} onValueChange={handleFileSelect}>
                <SelectTrigger id="file-select">
                  <SelectValue placeholder="Choose a CSV file..." />
                </SelectTrigger>
                <SelectContent>
                  {files
                    .filter((file) => file.name && file.name.trim() !== '' && file.name.toLowerCase().endsWith('.csv'))
                    .map((file) => (
                      <SelectItem key={file.name} value={file.name}>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          {file.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Auto-refresh controls */}
          {selectedFile && (
            <div className="mt-4 space-y-3">
              {/* Live Mode Toggle */}
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="live-mode"
                    checked={liveMode}
                    onChange={(e) => setLiveMode(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="live-mode" className="text-sm font-medium">
                    🔴 Live Mode (Real-time updates)
                  </Label>
                </div>

                {liveMode && (
                  <>
                    <Badge variant={streamingStatus.isConnected ? "default" : "destructive"}>
                      {streamingStatus.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </Badge>
                    
                    {streamingStatus.isStreaming ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="animate-pulse">
                          Streaming: {streamingStatus.progress.toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({streamingStatus.currentRow}/{streamingStatus.totalRows} rows)
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              await fetch('http://localhost:8001/stream/stop', { method: 'POST' });
                            } catch (err) {
                              console.error('Failed to stop streaming:', err);
                            }
                          }}
                          className="ml-2 rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                        >
                          Stop
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            await fetch('http://localhost:8001/stream/start', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ chunk_size: 50, interval_seconds: 5 }),
                            });
                          } catch (err) {
                            console.error('Failed to start streaming:', err);
                          }
                        }}
                        className="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600"
                      >
                        ▶ Start Streaming
                      </button>
                    )}

                    {lastRefresh && (
                      <span className="text-muted-foreground text-xs ml-auto">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State - only show for initial load, not live updates */}
      {loading && !liveMode && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Loading CSV data...</p>
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

      {/* Data Display */}
      {csvData && filteredData && (
        <>
          {/* Machine Filter and KPIs */}
          {machineColumns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Machine KPIs
                </CardTitle>
                <CardDescription>
                  Select a machine to view MTBF and MTTR metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="machine-filter">Select Machine</Label>
                    <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                      <SelectTrigger id="machine-filter" className="w-full max-w-xs">
                        <SelectValue placeholder="Select a machine..." />
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

                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* MTBF */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          MTBF (Mean Time Between Failures)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="font-heading text-2xl font-bold">
                          {kpis.mtbf !== null ? (
                            <span className="text-green-600">
                              {kpis.mtbf.toFixed(2)}{' '}
                              <span className="text-muted-foreground text-base font-normal">
                                hrs
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </div>
                        {kpis.mtbf === null && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Select a specific machine to calculate
                          </p>
                        )}
                        {kpis.mtbf !== null && selectedMachine !== 'all' && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Average time between failures for {selectedMachine}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* MTTR */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          MTTR (Mean Time To Repair)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="font-heading text-2xl font-bold">
                          {kpis.mttr !== null ? (
                            <span className="text-blue-600">
                              {kpis.mttr.toFixed(2)}{' '}
                              <span className="text-muted-foreground text-base font-normal">
                                hrs
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </div>
                        {kpis.mttr === null && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Select a specific machine to calculate
                          </p>
                        )}
                        {kpis.mttr !== null && selectedMachine !== 'all' && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Estimated repair time for {selectedMachine}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Disponibility */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          Disponibility (Availability)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="font-heading text-2xl font-bold">
                          {kpis.disponibility !== null ? (
                            <span className="text-emerald-600">
                              {kpis.disponibility.toFixed(1)}
                              <span className="text-muted-foreground text-base font-normal">
                                %
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </div>
                        {kpis.disponibility === null && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Select a specific machine to calculate
                          </p>
                        )}
                        {kpis.disponibility !== null && selectedMachine !== 'all' && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Operational availability for {selectedMachine}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Reliability */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>
                          Reliability
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="font-heading text-2xl font-bold">
                          {kpis.reliability !== null ? (
                            <span className="text-purple-600">
                              {kpis.reliability.toFixed(1)}
                              <span className="text-muted-foreground text-base font-normal">
                                %
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </div>
                        {kpis.reliability === null && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Select a specific machine to calculate
                          </p>
                        )}
                        {kpis.reliability !== null && selectedMachine !== 'all' && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            MTBF / (MTBF + MTTR) for {selectedMachine}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters and Data Table */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <FilterControls
                columns={csvData.headers}
                selectedColumn={selectedColumn}
                onColumnChange={setSelectedColumn}
                columnType={selectedColumnType}
                uniqueValues={uniqueValues}
                selectedValue={selectedValue}
                onValueChange={setSelectedValue}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                minValue={minValue}
                maxValue={maxValue}
                rangeMin={rangeMin}
                rangeMax={rangeMax}
                onRangeChange={handleRangeChange}
                onClearFilters={handleClearFilters}
                totalRows={csvData.totalRows}
                filteredRows={filteredData.length}
              />
            </div>

            <div className="lg:col-span-3 space-y-6">
              {/* Data Preview with Collapse/Expand Button */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>Data Preview</CardTitle>
                    <CardDescription>
                      Displaying first 50 rows of filtered data
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDataPreviewExpanded(!isDataPreviewExpanded)}
                    className="flex items-center gap-1"
                  >
                    {isDataPreviewExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Minimize
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Expand
                      </>
                    )}
                  </Button>
                </CardHeader>
                {isDataPreviewExpanded && (
                  <CardContent>
                    <DataTable
                      data={filteredData}
                      headers={csvData.headers}
                      maxRows={50}
                    />
                  </CardContent>
                )}
              </Card>

              {/* Captor Statistics Section - Below Data Preview */}
              {captorStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Captor Statistics
                    </CardTitle>
                    <CardDescription>
                      Statistical summary for all sensor captors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {captorStats.map((captor) => (
                        <div
                          key={captor.name}
                          className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                        >
                          <h4 className="font-semibold text-sm truncate mb-3" title={captor.name}>
                            {captor.name}
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Avg:</span>
                              <span className="font-medium ml-1">{(captor.avg ?? 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sum:</span>
                              <span className="font-medium ml-1">{(captor.sum ?? 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Min:</span>
                              <span className="font-medium ml-1 text-blue-600">{(captor.min ?? 0).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max:</span>
                              <span className="font-medium ml-1 text-red-600">{(captor.max ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Std Dev:</span>
                              <span className="font-medium ml-1">{(captor.stdDev ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Count:</span>
                              <span className="font-medium ml-1">{captor.count ?? 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Visualizations */}
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold">
              Data Visualizations
            </h2>

            {/* Categorical Visualizations */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Object.entries(columnTypes)
                .filter(([_, type]) => type === 'categorical')
                .slice(0, 4)
                .map(([column]) => (
                  <CategoryBarChart
                    key={column}
                    data={filteredData}
                    columnName={column}
                    title={`Distribution by ${column}`}
                    description={`Top 10 ${column} values`}
                  />
                ))}
            </div>

            {/* Numeric Statistics */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Object.entries(columnTypes)
                .filter(([_, type]) => type === 'numeric')
                .slice(0, 4)
                .map(([column]) => (
                  <NumericStatsCard
                    key={column}
                    data={filteredData}
                    columnName={column}
                    title={`${column} Statistics`}
                    description={`Statistical summary of ${column}`}
                  />
                ))}
            </div>

            {/* Combined Visualizations */}
            {selectedColumn &&
              Object.entries(columnTypes)
                .filter(([_, type]) => type === 'numeric')
                .slice(0, 2)
                .map(([column]) => (
                  <NumericByCategory
                    key={column}
                    data={filteredData}
                    categoryColumn={selectedColumn}
                    numericColumn={column}
                    title={`${column} by ${selectedColumn}`}
                    description={`Total ${column} grouped by ${selectedColumn}`}
                  />
                ))}
          </div>
        </>
      )}
    </div>
  );
}
