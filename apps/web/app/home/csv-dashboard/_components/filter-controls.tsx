'use client';

import { Search, X } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

interface FilterControlsProps {
  columns: string[];
  selectedColumn: string;
  onColumnChange: (value: string) => void;
  columnType: 'numeric' | 'date' | 'categorical';
  uniqueValues: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  minValue: number;
  maxValue: number;
  rangeMin: number;
  rangeMax: number;
  onRangeChange: (min: number, max: number) => void;
  onClearFilters: () => void;
  totalRows: number;
  filteredRows: number;
}

/**
 * Filter controls for the CSV dashboard
 */
export function FilterControls({
  columns,
  selectedColumn,
  onColumnChange,
  columnType,
  uniqueValues,
  selectedValue,
  onValueChange,
  searchTerm,
  onSearchChange,
  minValue,
  maxValue,
  rangeMin,
  rangeMax,
  onRangeChange,
  onClearFilters,
  totalRows,
  filteredRows,
}: FilterControlsProps) {
  const hasFilters =
    selectedValue !== 'all' ||
    searchTerm !== '' ||
    rangeMin !== minValue ||
    rangeMax !== maxValue;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Filters</span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Showing {filteredRows} of {totalRows} records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="column-select">Select Column</Label>
          <Select value={selectedColumn} onValueChange={onColumnChange}>
            <SelectTrigger id="column-select">
              <SelectValue placeholder="Choose column..." />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Show different filter UI based on column type */}
        {columnType === 'date' ? (
          <div className="space-y-3">
            <Label>Filter by Date Range</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="date-min" className="text-xs">
                  From:
                </Label>
                <Input
                  id="date-min"
                  type="date"
                  value={
                    rangeMin
                      ? new Date(rangeMin).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    onRangeChange(date.getTime(), rangeMax);
                  }}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-max" className="text-xs">
                  To:
                </Label>
                <Input
                  id="date-max"
                  type="date"
                  value={
                    rangeMax
                      ? new Date(rangeMax).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    onRangeChange(rangeMin, date.getTime());
                  }}
                  className="w-full"
                />
              </div>
              <div className="text-muted-foreground text-xs">
                {minValue
                  ? `Available: ${new Date(minValue).toLocaleDateString()} - ${new Date(maxValue).toLocaleDateString()}`
                  : 'No date range available'}
              </div>
            </div>
          </div>
        ) : columnType === 'numeric' ? (
          <div className="space-y-3">
            <Label>Filter by Range</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="range-min" className="w-12 text-xs">
                  Min:
                </Label>
                <Input
                  id="range-min"
                  type="number"
                  value={rangeMin}
                  min={minValue}
                  max={maxValue}
                  onChange={(e) =>
                    onRangeChange(Number(e.target.value), rangeMax)
                  }
                  className="flex-1"
                  step="any"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="range-max" className="w-12 text-xs">
                  Max:
                </Label>
                <Input
                  id="range-max"
                  type="number"
                  value={rangeMax}
                  min={minValue}
                  max={maxValue}
                  onChange={(e) =>
                    onRangeChange(rangeMin, Number(e.target.value))
                  }
                  className="flex-1"
                  step="any"
                />
              </div>
              <div className="text-muted-foreground text-xs">
                Range: {minValue.toFixed(2)} - {maxValue.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="value-select">Filter by Value</Label>
              <Select value={selectedValue} onValueChange={onValueChange}>
                <SelectTrigger id="value-select">
                  <SelectValue placeholder="Select value..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Values</SelectItem>
                  {uniqueValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search-input">Search in Column</Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="search-input"
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSearchChange('')}
                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
