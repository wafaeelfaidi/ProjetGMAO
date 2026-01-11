'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Badge } from '@kit/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Clock, DollarSign } from 'lucide-react';
import { cn } from '@kit/ui/utils';

interface ForecastItem {
  machine: string;
  predicted_date: string;
  window_start: string;
  window_end: string;
  probability: number;
  failure_type_probabilities: Record<string, number>;
  expected_downtime_hours: number;
  expected_material_cost: number;
}

interface UpcomingListProps {
  forecasts: ForecastItem[];
  onSelectForecast?: (forecast: ForecastItem) => void;
  className?: string;
}

export function UpcomingList({ 
  forecasts, 
  onSelectForecast,
  className 
}: UpcomingListProps) {
  const getProbabilityBadge = (probability: number) => {
    if (probability >= 0.7) {
      return <Badge variant="destructive">Haute ({(probability * 100).toFixed(0)}%)</Badge>;
    }
    if (probability >= 0.4) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Moyenne ({(probability * 100).toFixed(0)}%)</Badge>;
    }
    return <Badge variant="secondary">Faible ({(probability * 100).toFixed(0)}%)</Badge>;
  };

  const getTopFailureType = (probabilities: Record<string, number>) => {
    const entries = Object.entries(probabilities);
    if (entries.length === 0) return 'N/A';
    
    const [type] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    return type;
  };

  const sortedForecasts = [...forecasts].sort((a, b) => 
    new Date(a.predicted_date).getTime() - new Date(b.predicted_date).getTime()
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Maintenances à venir</CardTitle>
        <CardDescription>
          Interventions prévues triées par date
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedForecasts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune maintenance prévue</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Date prévue</TableHead>
                  <TableHead>Fenêtre</TableHead>
                  <TableHead>Confiance</TableHead>
                  <TableHead>Type principal</TableHead>
                  <TableHead className="text-right">Durée (h)</TableHead>
                  <TableHead className="text-right">Coût (€)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedForecasts.map((forecast) => (
                  <TableRow 
                    key={`${forecast.machine}-${forecast.predicted_date}`}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50 transition-colors',
                      onSelectForecast && 'cursor-pointer'
                    )}
                    onClick={() => onSelectForecast?.(forecast)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                        {forecast.machine}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(forecast.predicted_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(forecast.window_start), 'dd/MM', { locale: fr })} - {format(new Date(forecast.window_end), 'dd/MM', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {getProbabilityBadge(forecast.probability)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getTopFailureType(forecast.failure_type_probabilities)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {forecast.expected_downtime_hours.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        {forecast.expected_material_cost.toFixed(0)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
