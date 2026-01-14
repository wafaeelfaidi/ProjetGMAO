'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, UserPlus, Calendar, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Badge } from '@kit/ui/badge';
import { useOperators, useCreateMaintenanceTask, type CreateTaskInput, type Operator } from '~/lib/maintenance-tasks-hooks';

interface ForecastEvent {
  id: string;
  machine: string;
  date: string;
  probability?: number;
  failure_type_probabilities?: Record<string, number>;
  expected_downtime_hours?: number;
  expected_material_cost?: number;
  title?: string;
}

interface TaskDelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  events: ForecastEvent[];
  preSelectedEvent?: ForecastEvent | null;
  onSuccess?: () => void;
}

export function TaskDelegationModal({
  isOpen,
  onClose,
  selectedDate,
  events,
  preSelectedEvent,
  onSuccess,
}: TaskDelegationModalProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(preSelectedEvent?.id || null);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');

  // Auto-select the pre-selected event when modal opens
  React.useEffect(() => {
    if (preSelectedEvent) {
      setSelectedEventId(preSelectedEvent.id);
    }
  }, [preSelectedEvent]);

  const { data: operators, isLoading: operatorsLoading } = useOperators();
  const operatorsList = (operators || []) as Operator[];
  const createTask = useCreateMaintenanceTask();

  // Filter high probability events (>= 50%)
  const highProbEvents = events.filter(e => (e.probability || 0) >= 0.5);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEventId || !selectedOperator) return;

    const event = selectedEvent;
    if (!event) return;

    // Get the primary failure type
    const failureTypes = event.failure_type_probabilities || {};
    const primaryFailureType = Object.entries(failureTypes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Non spécifié';

    const taskInput: CreateTaskInput = {
      title: `Maintenance préventive - ${event.machine}`,
      description: `Tâche créée à partir d'une prévision de maintenance pour ${event.machine}`,
      machine: event.machine,
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      probability: event.probability,
      failure_type: primaryFailureType,
      expected_downtime_hours: event.expected_downtime_hours,
      expected_material_cost: event.expected_material_cost,
      assigned_to: selectedOperator,
      admin_notes: adminNotes || undefined,
    };

    try {
      await createTask.mutateAsync(taskInput);
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleClose = () => {
    setSelectedEventId(null);
    setSelectedOperator('');
    setAdminNotes('');
    onClose();
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return 'text-red-500';
    if (prob >= 0.5) return 'text-orange-500';
    return 'text-yellow-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Déléguer une tâche de maintenance
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 mt-2">
            <Calendar className="h-4 w-4" />
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Machine/Event Selection or Display */}
          {preSelectedEvent ? (
            <div className="space-y-2">
              <Label>Machine sélectionnée</Label>
              <div className="p-3 border rounded-lg bg-primary/5 border-primary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${getProbabilityColor(preSelectedEvent.probability || 0)}`} />
                    <span className="font-medium">{preSelectedEvent.machine}</span>
                  </div>
                  <Badge variant={preSelectedEvent.probability && preSelectedEvent.probability >= 0.7 ? 'destructive' : 'secondary'}>
                    {((preSelectedEvent.probability || 0) * 100).toFixed(0)}% risque
                  </Badge>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  {preSelectedEvent.expected_downtime_hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {preSelectedEvent.expected_downtime_hours.toFixed(1)}h estimé
                    </span>
                  )}
                  {preSelectedEvent.expected_material_cost && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      €{preSelectedEvent.expected_material_cost.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Machine à risque</Label>
              {highProbEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                  Aucune machine à haute probabilité de panne pour cette date
                </div>
              ) : (
                <div className="grid gap-2">
                {highProbEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-all
                      ${selectedEventId === event.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'hover:border-gray-400'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${getProbabilityColor(event.probability || 0)}`} />
                        <span className="font-medium">{event.machine}</span>
                      </div>
                      <Badge variant={event.probability && event.probability >= 0.7 ? 'destructive' : 'secondary'}>
                        {((event.probability || 0) * 100).toFixed(0)}% risque
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {event.expected_downtime_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.expected_downtime_hours.toFixed(1)}h estimé
                        </span>
                      )}
                      {event.expected_material_cost && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          €{event.expected_material_cost.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>          )}
          {/* Operator Selection */}
          <div className="space-y-2">
            <Label htmlFor="operator">Assigner à un opérateur</Label>
            {operatorsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des opérateurs...
              </div>
            ) : operatorsList.length > 0 ? (
              <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                <SelectTrigger id="operator">
                  <SelectValue placeholder="Sélectionner un opérateur..." />
                </SelectTrigger>
                <SelectContent>
                  {operatorsList.map((operator) => (
                    <SelectItem key={operator.id} value={operator.id}>
                      {operator.name || operator.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                Aucun opérateur disponible
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes pour l'opérateur</Label>
            <Textarea
              id="notes"
              placeholder="Instructions ou informations supplémentaires..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedEventId || !selectedOperator || createTask.isPending}
            >
              {createTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Déléguer la tâche
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
