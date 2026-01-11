'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { FileSpreadsheet, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
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
  id?: string;
}

export default function CSVDashboardPage() {
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [csvData, setCSVData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rangeMin, setRangeMin] = useState<number>(0);
  const [rangeMax, setRangeMax] = useState<number>(0);

  // Load list of CSV files from IndexedDB on mount
  useEffect(() => {
    async function loadFiles() {
      try {
        const { indexedDBService } = await import('~/lib/DataManagement/indexeddb.service');
        await indexedDBService.initialize();
        const allFiles = await indexedDBService.listFiles();
        
        // Filter only CSV files
        const csvFiles = allFiles.filter((f) => 
          f.type.includes('csv') || f.name.toLowerCase().endsWith('.csv')
        );
        
        setFiles(csvFiles.map((f) => ({ name: f.name, id: f.id })));
      } catch (err) {
        setError('Error loading file list from IndexedDB');
        console.error(err);
      }
    }

    void loadFiles();
  }, []);

  // Load CSV data when file is selected from IndexedDB
  const loadCSVData = useCallback(async (filename: string) => {
    if (!filename) return;

    setLoading(true);
    setError(null);
    setCSVData(null);
    setSelectedColumn('');
    setSelectedValue('all');
    setSearchTerm('');
    setRangeMin(0);
    setRangeMax(0);

    try {
      const { indexedDBService } = await import('~/lib/DataManagement/indexeddb.service');
      await indexedDBService.initialize();
      
      // Find the file by name
      const file = files.find((f) => f.name === filename);
      if (!file?.id) {
        setError('File not found in IndexedDB');
        return;
      }

      // Load file content from IndexedDB
      const fileData = await indexedDBService.getFile(file.id!);
      if (!fileData) {
        setError('Failed to load file from IndexedDB');
        return;
      }

      // Parse CSV content with encoding detection
      // Try UTF-8 first, fallback to Windows-1252 (common for French CSVs)
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(fileData.data);
      } catch {
        // If UTF-8 fails, try Windows-1252 (Latin-1 extended)
        text = new TextDecoder('windows-1252').decode(fileData.data);
      }
      const lines = text.split('\n').filter((line) => line.trim());
      
      if (lines.length === 0) {
        setError('CSV file is empty');
        return;
      }

      // Detect separator (comma or semicolon)
      const firstLine = lines[0]!;
      const separator: ';' | ',' = firstLine.includes(';') ? ';' : ',';

      // Parse headers and rows
      const headers = firstLine.split(separator).map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(separator).map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      setCSVData({ headers, rows, separator, totalRows: rows.length });
    } catch (err) {
      setError('Error loading CSV data from IndexedDB');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [files]);

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

    // Calculate MTBF and MTTR only if filtering by a single machine
    let mtbf: number | null = null;
    let mttr: number | null = null;

    // Check if we're filtering by a specific machine
    const isMachineFilter =
      selectedColumn &&
      (selectedColumn.toLowerCase().includes('designation') ||
        selectedColumn.toLowerCase().includes('désignation') ||
        selectedColumn.toLowerCase().includes('machine')) &&
      selectedValue !== 'all';

    if (isMachineFilter) {
      // Find downtime duration column (Durée arrêt)
      const durationCol = csvData.headers.find(
        (h) =>
          h.toLowerCase().includes('durée') ||
          h.toLowerCase().includes('duree') ||
          h.toLowerCase().includes('arrêt') ||
          h.toLowerCase().includes('arret'),
      );

      // Find date column
      const dateCol = csvData.headers.find(
        (h) =>
          h.toLowerCase().includes('date') &&
          h.toLowerCase().includes('intervention'),
      );

      if (durationCol && dateCol) {
        // Calculate MTTR (Mean Time To Repair) - average downtime
        const durations = filteredData
          .map((row) => parseFrenchNumber(row[durationCol] || '0'))
          .filter((d) => d > 0);

        if (durations.length > 0) {
          mttr = durations.reduce((a, b) => a + b, 0) / durations.length;
        }

        // Calculate MTBF (Mean Time Between Failures)
        // Get dates and sort them
        const dates = filteredData
          .map((row) => {
            const dateStr = row[dateCol];
            return parseFrenchDate(dateStr || '');
          })
          .filter((d): d is Date => d !== null)
          .sort((a, b) => a.getTime() - b.getTime());

        if (dates.length > 1) {
          // Calculate time between failures in hours
          const intervals: number[] = [];
          for (let i = 1; i < dates.length; i++) {
            const diff =
              (dates[i]!.getTime() - dates[i - 1]!.getTime()) /
              (1000 * 60 * 60); // Convert to hours
            intervals.push(diff);
          }

          if (intervals.length > 0) {
            mtbf = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          }
        }
      }
    }

    return { numericSums, mtbf, mttr };
  }, [csvData, filteredData, columnTypes, selectedColumn, selectedValue]);



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
            Choose a file from the /data folder to load and visualize
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="file-select">Available Files</Label>
            <Select value={selectedFile} onValueChange={handleFileSelect}>
              <SelectTrigger id="file-select">
                <SelectValue placeholder="Choose a CSV file..." />
              </SelectTrigger>
              <SelectContent>
                {files.map((file) => (
                  <SelectItem key={file.name} value={file.name}>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      {file.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
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
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Show top 2 numeric column sums */}
            {Object.entries(kpis.numericSums)
              .slice(0, 2)
              .map(([column, sum]) => (
                <Card key={column}>
                  <CardHeader className="pb-2">
                    <CardDescription className="truncate" title={column}>
                      Total {column}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="font-heading text-2xl font-bold">
                      {sum.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              ))}

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
                    <span>
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
                    Filter by machine to calculate
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
                    <span>
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
                    Filter by machine to calculate
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

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

            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Data Preview</CardTitle>
                  <CardDescription>
                    Displaying first 50 rows of filtered data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={filteredData}
                    headers={csvData.headers}
                    maxRows={50}
                  />
                </CardContent>
              </Card>
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
