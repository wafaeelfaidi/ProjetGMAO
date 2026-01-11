'use client';

import React, { useMemo, useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@kit/ui/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, X, Clock, DollarSign, Wrench } from 'lucide-react';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@kit/ui/dialog';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  probability_band: 'low' | 'medium' | 'high' | 'past';
  machine: string;
  event_type: 'prediction' | 'historical';
  meta: {
    // For predictions
    window_start?: string;
    window_end?: string;
    probability?: number;
    failure_type_probabilities?: Record<string, number>;
    expected_downtime_hours?: number;
    expected_material_cost?: number;
    // For historical
    failure_type?: string;
    downtime_hours?: number;
    material_cost?: number;
    cause?: string;
    intervention_summary?: string;
  };
}

interface MaintenanceCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  className?: string;
}

export function MaintenanceCalendar({ 
  events, 
  onSelectEvent,
  className 
}: MaintenanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date('2025-03-29'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dateKey = format(new Date(event.date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });
    return grouped;
  }, [events]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const getProbabilityBadgeColor = (band: 'low' | 'medium' | 'high' | 'past', eventType: 'prediction' | 'historical') => {
    if (eventType === 'historical') {
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
    
    switch (band) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'low':
        return 'bg-gray-400/20 text-gray-500 border-gray-400/50';
      case 'past':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handleDayClick = (day: Date, dayEvents: CalendarEvent[]) => {
    if (dayEvents.length > 0) {
      setSelectedDate(day);
      setIsDialogOpen(true);
    }
  };

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [selectedDate, eventsByDate]);

  return (
    <>
      <Card className={cn('bg-white border-gray-300', className)}>
        <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-gray-700 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(new Date('2025-03-29'))}
              className="text-gray-600 hover:text-gray-800 text-xs"
            >
              Aujourd'hui
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="text-gray-600 hover:text-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Haute probabilité</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-600">Moyenne</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-gray-600">Faible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-600">Intervention passée</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div 
              key={day} 
              className="text-center text-xs font-semibold text-gray-600 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day, dayEvents)}
                className={cn(
                  'min-h-[100px] p-2 rounded-lg border transition-all',
                  isCurrentMonth 
                    ? 'bg-gray-50 border-gray-400' 
                    : 'bg-gray-100/30 border-gray-200',
                  isCurrentDay && 'ring-2 ring-gray-500/50',
                  dayEvents.length > 0 
                    ? 'hover:bg-gray-100 cursor-pointer hover:border-gray-400' 
                    : 'cursor-default'
                )}
              >
                <div className={cn(
                  'text-sm font-medium mb-1',
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                  isCurrentDay && 'text-gray-700'
                )}>
                  {format(day, 'd')}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent?.(event);
                      }}
                      className={cn(
                        'text-xs px-2 py-1 rounded border cursor-pointer',
                        'transition-all hover:scale-105',
                        getProbabilityBadgeColor(event.probability_band, event.event_type)
                      )}
                    >
                      <div className="flex items-center gap-1 truncate">
                        {event.event_type === 'prediction' && event.probability_band === 'high' && (
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span className="truncate">{event.machine}</span>
                      </div>
                      <div className="text-[10px] opacity-75">
                        {event.event_type === 'prediction' 
                          ? `${(event.meta.probability! * 100).toFixed(0)}%`
                          : event.meta.failure_type || 'Intervention'
                        }
                      </div>
                    </div>
                  ))}
                  
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-500 text-center py-1">
                      +{dayEvents.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* No events message */}
        {events.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune maintenance prévue pour cette période</p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Day Events Dialog */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-50 border-gray-400">
        <DialogHeader>
          <DialogTitle className="text-gray-700 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {selectedDateEvents.length} événement(s) prévu(s) pour cette journée
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {selectedDateEvents.map((event) => (
            <Card key={event.id} className="bg-gray-50 border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        className={cn(
                          'border',
                          getProbabilityBadgeColor(event.probability_band, event.event_type)
                        )}
                      >
                        {event.event_type === 'prediction' ? 'Prévision' : 'Historique'}
                      </Badge>
                      <span className="text-sm font-semibold text-white">
                        {event.machine}
                      </span>
                    </div>

                    <h4 className="text-base font-medium text-gray-200 mb-2">
                      {event.title}
                    </h4>

                    {/* Event-specific details */}
                    {event.event_type === 'prediction' ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>
                            Probabilité: <span className="text-white font-medium">
                              {(event.meta.probability! * 100).toFixed(0)}%
                            </span>
                          </span>
                        </div>
                        
                        {event.meta.expected_downtime_hours && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              Temps d'arrêt estimé: <span className="text-white font-medium">
                                {event.meta.expected_downtime_hours.toFixed(1)}h
                              </span>
                            </span>
                          </div>
                        )}
                        
                        {event.meta.expected_material_cost !== undefined && event.meta.expected_material_cost > 0 && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              Coût estimé: <span className="text-white font-medium">
                                €{event.meta.expected_material_cost.toFixed(2)}
                              </span>
                            </span>
                          </div>
                        )}

                        {event.meta.failure_type_probabilities && Object.keys(event.meta.failure_type_probabilities).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-neutral-700">
                            <p className="text-xs text-gray-500 mb-2">Types de panne probables:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(event.meta.failure_type_probabilities)
                                .sort(([, a], [, b]) => b - a)
                                .map(([type, prob]) => (
                                  <Badge 
                                    key={type}
                                    variant="outline"
                                    className="text-xs bg-gray-50 border-gray-400"
                                  >
                                    {type}: {(prob * 100).toFixed(0)}%
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        {event.meta.failure_type && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Wrench className="w-4 h-4" />
                            <span>
                              Type: <span className="text-white font-medium">
                                {event.meta.failure_type}
                              </span>
                            </span>
                          </div>
                        )}
                        
                        {event.meta.downtime_hours && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>
                              Temps d'arrêt: <span className="text-white font-medium">
                                {event.meta.downtime_hours.toFixed(2)}h
                              </span>
                            </span>
                          </div>
                        )}
                        
                        {event.meta.material_cost !== undefined && event.meta.material_cost > 0 && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              Coût matériel: <span className="text-white font-medium">
                                €{event.meta.material_cost.toFixed(2)}
                              </span>
                            </span>
                          </div>
                        )}

                        {event.meta.cause && (
                          <div className="mt-2 pt-2 border-t border-neutral-700">
                            <p className="text-xs text-gray-500 mb-1">Cause:</p>
                            <p className="text-gray-300">{event.meta.cause}</p>
                          </div>
                        )}

                        {event.meta.intervention_summary && event.meta.intervention_summary !== 'N/A' && (
                          <div className="mt-2 pt-2 border-t border-neutral-700">
                            <p className="text-xs text-gray-500 mb-1">Résumé d'intervention:</p>
                            <p className="text-gray-300">{event.meta.intervention_summary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedDateEvents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun événement pour cette date</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
