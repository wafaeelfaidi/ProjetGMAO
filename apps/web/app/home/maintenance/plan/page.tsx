'use client';

import React, { useState, useMemo } from 'react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Filter,
  TrendingUp,
  AlertCircle,
  Wrench,
  Loader2,
} from 'lucide-react';
import { 
  useMaintenanceForecast, 
  useMaintenanceCalendar,
  useAvailableMachines 
} from '~/lib/maintenance-hooks';
import { MaintenanceCalendar } from '~/components/maintenance/MaintenanceCalendar';
import { ProbabilityBreakdown } from '~/components/maintenance/ProbabilityBreakdown';
import { UpcomingList } from '~/components/maintenance/UpcomingList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';

export default function MaintenancePlanPage() {
  const [selectedMachine, setSelectedMachine] = useState<string | undefined>();
  const [horizonDays, setHorizonDays] = useState(60);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPredictions, setShowPredictions] = useState(true);
  const [showHistorical, setShowHistorical] = useState(true);

  // Calculate date range for calendar based on AMDEC data timeframe (March 2025)
  // Use the last date in the data as the starting point for predictions
  const dataReferenceDate = new Date('2025-03-29'); // Last intervention date in AMDEC
  const calendarStart = format(startOfMonth(dataReferenceDate), 'yyyy-MM-dd');
  const calendarEnd = format(endOfMonth(addDays(dataReferenceDate, horizonDays)), 'yyyy-MM-dd');

  // Fetch data
  const { data: machines, isLoading: machinesLoading } = useAvailableMachines();
  const { data: forecasts, isLoading: forecastsLoading, error: forecastsError } = 
    useMaintenanceForecast({ machine: selectedMachine, horizonDays });
  const { data: calendarEvents, isLoading: calendarLoading } = 
    useMaintenanceCalendar({ start: calendarStart, end: calendarEnd, machine: selectedMachine });

  // Filter events based on user selection
  const filteredCalendarEvents = useMemo(() => {
    if (!calendarEvents) return [];
    return calendarEvents.filter(event => {
      if (event.event_type === 'prediction' && !showPredictions) return false;
      if (event.event_type === 'historical' && !showHistorical) return false;
      return true;
    });
  }, [calendarEvents, showPredictions, showHistorical]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    if (!forecasts || forecasts.length === 0) {
      return {
        totalForecasts: 0,
        highProbability: 0,
        totalExpectedDowntime: 0,
        totalExpectedCost: 0,
      };
    }

    return {
      totalForecasts: forecasts.length,
      highProbability: forecasts.filter(f => f.probability >= 0.7).length,
      totalExpectedDowntime: forecasts.reduce((sum, f) => sum + f.expected_downtime_hours, 0),
      totalExpectedCost: forecasts.reduce((sum, f) => sum + f.expected_material_cost, 0),
    };
  }, [forecasts]);

  // Get combined failure type probabilities for selected machine/all
  const combinedFailureProbs = useMemo(() => {
    if (!forecasts || forecasts.length === 0) return {};
    
    const combined: Record<string, number> = {};
    let totalWeight = 0;

    forecasts.forEach(forecast => {
      const weight = forecast.probability;
      totalWeight += weight;
      
      Object.entries(forecast.failure_type_probabilities).forEach(([type, prob]) => {
        combined[type] = (combined[type] || 0) + prob * weight;
      });
    });

    // Normalize
    if (totalWeight > 0) {
      Object.keys(combined).forEach(key => {
        combined[key] /= totalWeight;
      });
    }

    return combined;
  }, [forecasts]);

  const isLoading = machinesLoading || forecastsLoading || calendarLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 bg-clip-text text-transparent">
                Planification de la Maintenance
              </h1>
              <p className="text-gray-400 mt-1">
                Prévisions basées sur l'analyse AMDEC et l'historique des interventions
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white border-gray-300">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filtres:</span>
                </div>
                
                <Select 
                  value={selectedMachine || 'all'} 
                  onValueChange={(value) => setSelectedMachine(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="w-[200px] bg-gray-50 border-gray-300">
                    <SelectValue placeholder="Toutes les machines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les machines</SelectItem>
                    {machines?.map(machine => (
                      <SelectItem key={machine} value={machine}>
                        {machine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={horizonDays.toString()} 
                  onValueChange={(value) => setHorizonDays(parseInt(value))}
                >
                  <SelectTrigger className="w-[180px] bg-gray-50 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="60">60 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPredictions}
                      onChange={(e) => setShowPredictions(e.target.checked)}
                      className="w-4 h-4 rounded bg-gray-50 border-gray-400 text-blue-500 focus:ring-blue-500 focus:ring-offset-white"
                    />
                    <span className="text-sm text-gray-700">Afficher les prévisions</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHistorical}
                      onChange={(e) => setShowHistorical(e.target.checked)}
                      className="w-4 h-4 rounded bg-gray-50 border-gray-400 text-gray-500 focus:ring-gray-500 focus:ring-offset-white"
                    />
                    <span className="text-sm text-gray-700">Afficher l'historique</span>
                  </label>
                </div>

                {selectedMachine && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedMachine(undefined)}
                    className="text-gray-700 hover:text-gray-900"
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error State */}
        {forecastsError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              Impossible de charger les prévisions de maintenance. Vérifiez que l'API est en cours d'exécution.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
          </div>
        )}

        {/* Main Content */}
        {!isLoading && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white border-gray-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Interventions prévues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-700">
                    {metrics.totalForecasts}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Sur {horizonDays} jours
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Haute probabilité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    {metrics.highProbability}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ≥ 70% de confiance
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Temps d'arrêt prévu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">
                    {metrics.totalExpectedDowntime.toFixed(1)}h
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total estimé
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Coût matériel prévu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-700">
                    €{metrics.totalExpectedCost.toFixed(0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total estimé
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="calendar" className="space-y-6">
              <TabsList className="bg-white border border-gray-300">
                <TabsTrigger value="calendar" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Calendrier
                </TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Liste
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {filteredCalendarEvents && filteredCalendarEvents.length > 0 ? (
                      <MaintenanceCalendar 
                        events={filteredCalendarEvents}
                        onSelectEvent={setSelectedEvent}
                      />
                    ) : (
                      <Card className="bg-white border-gray-300">
                        <CardContent className="pt-6">
                          <div className="text-center py-12">
                            <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">
                              Aucune maintenance prévue pour cette période
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="space-y-4">
                    <ProbabilityBreakdown 
                      failureTypeProbabilities={combinedFailureProbs}
                      className="bg-white border-gray-300"
                    />

                    {selectedEvent && (
                      <Card className="bg-white border-gray-300">
                        <CardHeader>
                          <CardTitle className="text-lg text-gray-700">
                            {selectedEvent.event_type === 'historical' ? 'Intervention passée' : 'Maintenance prévue'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-400">Machine</p>
                            <p className="text-sm font-medium text-white">{selectedEvent.machine}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Date</p>
                            <p className="text-sm font-medium text-white">
                              {format(new Date(selectedEvent.date), 'dd MMMM yyyy', { locale: fr })}
                            </p>
                          </div>
                          
                          {selectedEvent.event_type === 'prediction' ? (
                            <>
                              <div>
                                <p className="text-xs text-gray-400">Fenêtre de probabilité</p>
                                <p className="text-sm font-medium text-white">
                                  {format(new Date(selectedEvent.meta.window_start!), 'dd/MM', { locale: fr })} - {format(new Date(selectedEvent.meta.window_end!), 'dd/MM', { locale: fr })}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Confiance</p>
                                <Badge variant={selectedEvent.probability_band === 'high' ? 'destructive' : 'secondary'}>
                                  {(selectedEvent.meta.probability! * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Durée estimée</p>
                                <p className="text-sm font-medium text-white">
                                  {selectedEvent.meta.expected_downtime_hours!.toFixed(1)} heures
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Coût matériel estimé</p>
                                <p className="text-sm font-medium text-white">
                                  €{selectedEvent.meta.expected_material_cost!.toFixed(0)}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p className="text-xs text-gray-400">Type de panne</p>
                                <p className="text-sm font-medium text-white">{selectedEvent.meta.failure_type}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Cause</p>
                                <p className="text-sm font-medium text-white">{selectedEvent.meta.cause}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Durée d'arrêt</p>
                                <p className="text-sm font-medium text-white">
                                  {selectedEvent.meta.downtime_hours?.toFixed(1) || 0} heures
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Coût matériel</p>
                                <p className="text-sm font-medium text-white">
                                  €{selectedEvent.meta.material_cost?.toFixed(0) || 0}
                                </p>
                              </div>
                              {selectedEvent.meta.intervention_summary && (
                                <div>
                                  <p className="text-xs text-gray-400">Résumé</p>
                                  <p className="text-xs text-gray-300 leading-relaxed">
                                    {selectedEvent.meta.intervention_summary}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="list" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    {forecasts && forecasts.length > 0 ? (
                      <UpcomingList 
                        forecasts={forecasts}
                        onSelectForecast={setSelectedEvent}
                        className="bg-white border-gray-300"
                      />
                    ) : (
                      <Card className="bg-white border-gray-300">
                        <CardContent className="pt-6">
                          <div className="text-center py-12">
                            <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">
                              Aucune maintenance prévue
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div>
                    <ProbabilityBreakdown 
                      failureTypeProbabilities={combinedFailureProbs}
                      className="bg-white border-gray-300"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
