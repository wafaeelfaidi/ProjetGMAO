'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { cn } from '@kit/ui/utils';

interface ProbabilityBreakdownProps {
  failureTypeProbabilities: Record<string, number>;
  className?: string;
}

export function ProbabilityBreakdown({ 
  failureTypeProbabilities,
  className 
}: ProbabilityBreakdownProps) {
  const sortedTypes = Object.entries(failureTypeProbabilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Show top 5

  const getBarColor = (probability: number) => {
    if (probability >= 0.3) return 'bg-red-500';
    if (probability >= 0.15) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Types de pannes probables</CardTitle>
        <CardDescription>
          Distribution des types de pannes basée sur l'historique
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-4">
            {sortedTypes.map(([type, probability]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {type}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {(probability * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      getBarColor(probability)
                    )}
                    style={{ width: `${probability * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
