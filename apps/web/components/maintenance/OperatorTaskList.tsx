'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  MessageSquare,
  Play,
  Check,
  DollarSign,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Textarea } from '@kit/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';
import {
  useMyMaintenanceTasks,
  useUpdateMaintenanceTask,
  type MaintenanceTask,
  type TaskStatus,
} from '~/lib/maintenance-tasks-hooks';

interface TaskCardProps {
  task: MaintenanceTask;
  onUpdateStatus: (taskId: string, status: TaskStatus, notes?: string) => void;
  isUpdating: boolean;
}

function TaskCard({ task, onUpdateStatus, isUpdating }: TaskCardProps) {
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [operatorNotes, setOperatorNotes] = useState(task.operator_notes || '');
  const [completionNotes, setCompletionNotes] = useState('');

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">En cours</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annulé</Badge>;
    }
  };

  const handleStartTask = () => {
    onUpdateStatus(task.id, 'in_progress');
  };

  const handleCompleteTask = () => {
    setShowNotesDialog(true);
  };

  const handleSubmitCompletion = () => {
    onUpdateStatus(task.id, 'completed', completionNotes);
    setShowNotesDialog(false);
  };

  const handleSaveNotes = () => {
    onUpdateStatus(task.id, task.status, operatorNotes);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.scheduled_date), 'EEEE d MMMM yyyy', { locale: fr })}
              </CardDescription>
            </div>
            {getStatusBadge(task.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Machine and probability info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{task.machine}</span>
            </div>
            {task.probability && (
              <div className="flex items-center gap-1 text-muted-foreground">
                Risque: {(task.probability * 100).toFixed(0)}%
              </div>
            )}
            {task.expected_downtime_hours && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {task.expected_downtime_hours}h
              </div>
            )}
            {task.expected_material_cost && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                €{task.expected_material_cost}
              </div>
            )}
          </div>

          {/* Failure type */}
          {task.failure_type && (
            <div className="text-sm">
              <span className="text-muted-foreground">Type de panne: </span>
              <span>{task.failure_type}</span>
            </div>
          )}

          {/* Admin notes */}
          {task.admin_notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Notes de l'administrateur
              </div>
              <p className="text-sm">{task.admin_notes}</p>
            </div>
          )}

          {/* Operator notes */}
          {task.status !== 'completed' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mes notes</Label>
              <Textarea
                placeholder="Ajouter des notes..."
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                rows={2}
              />
              {operatorNotes !== (task.operator_notes || '') && (
                <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={isUpdating}>
                  Enregistrer les notes
                </Button>
              )}
            </div>
          )}

          {/* Completion notes (for completed tasks) */}
          {task.status === 'completed' && task.completion_notes && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Notes de complétion
              </div>
              <p className="text-sm">{task.completion_notes}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {task.status === 'pending' && (
              <Button onClick={handleStartTask} disabled={isUpdating} className="flex-1">
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Commencer
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button onClick={handleCompleteTask} disabled={isUpdating} className="flex-1 bg-green-600 hover:bg-green-700">
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Marquer comme terminé
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer la tâche</DialogTitle>
            <DialogDescription>
              Ajoutez des notes sur le travail effectué avant de marquer la tâche comme terminée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes de complétion</Label>
              <Textarea
                placeholder="Décrivez le travail effectué, les pièces remplacées, etc."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitCompletion} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OperatorTaskList() {
  const { data: tasks, isLoading, error } = useMyMaintenanceTasks();
  const updateTask = useUpdateMaintenanceTask();

  const handleUpdateStatus = (taskId: string, status: TaskStatus, notes?: string) => {
    const updates: any = { id: taskId, status };
    if (notes !== undefined) {
      if (status === 'completed') {
        updates.completion_notes = notes;
      } else {
        updates.operator_notes = notes;
      }
    }
    updateTask.mutate(updates);
  };

  // Group tasks by status
  const pendingTasks = tasks?.filter(t => t.status === 'pending') || [];
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Erreur lors du chargement des tâches
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune tâche assignée</h3>
            <p className="text-muted-foreground">
              Vous n'avez pas de tâches de maintenance en attente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="pending" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pending" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          En attente
          {pendingTasks.length > 0 && (
            <Badge variant="secondary" className="ml-1">{pendingTasks.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="in_progress" className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          En cours
          {inProgressTasks.length > 0 && (
            <Badge className="bg-blue-500 ml-1">{inProgressTasks.length}</Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Terminées
          {completedTasks.length > 0 && (
            <Badge className="bg-green-500 ml-1">{completedTasks.length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        {pendingTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune tâche en attente
            </CardContent>
          </Card>
        ) : (
          pendingTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateStatus={handleUpdateStatus}
              isUpdating={updateTask.isPending}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="in_progress" className="space-y-4">
        {inProgressTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune tâche en cours
            </CardContent>
          </Card>
        ) : (
          inProgressTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateStatus={handleUpdateStatus}
              isUpdating={updateTask.isPending}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="completed" className="space-y-4">
        {completedTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune tâche terminée
            </CardContent>
          </Card>
        ) : (
          completedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdateStatus={handleUpdateStatus}
              isUpdating={updateTask.isPending}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
