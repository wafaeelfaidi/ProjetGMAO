'use client';

import { useMemo } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

interface DataTableProps {
  data: Record<string, string>[];
  headers: string[];
  maxRows?: number;
}

/**
 * Displays CSV data in a table format with pagination
 */
export function DataTable({ data, headers, maxRows = 50 }: DataTableProps) {
  const displayData = useMemo(() => {
    return data.slice(0, maxRows);
  }, [data, maxRows]);

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center">
        No data to display
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, idx) => (
              <TableHead key={idx} className="whitespace-nowrap">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {headers.map((header, cellIdx) => (
                <TableCell key={cellIdx} className="whitespace-nowrap">
                  {row[header] || '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > maxRows && (
        <div className="bg-muted/50 border-t p-3 text-center text-sm">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  );
}
