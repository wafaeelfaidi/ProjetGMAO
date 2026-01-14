'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

// Types
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string | null;
  machine: string;
  scheduled_date: string;
  probability: number | null;
  failure_type: string | null;
  expected_downtime_hours: number | null;
  expected_material_cost: number | null;
  assigned_to: string | null;
  assigned_by: string;
  assigned_at: string;
  status: TaskStatus;
  admin_notes: string | null;
  operator_notes: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_by_name?: string;
  assigned_by_email?: string;
}

export interface Operator {
  id: string;
  email: string | null;
  name: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  machine: string;
  scheduled_date: string;
  probability?: number;
  failure_type?: string;
  expected_downtime_hours?: number;
  expected_material_cost?: number;
  assigned_to: string;
  admin_notes?: string;
}

export interface UpdateTaskInput {
  id: string;
  status?: TaskStatus;
  operator_notes?: string;
  completion_notes?: string;
}

/**
 * Hook to get list of operators (for admin task assignment)
 * Note: Uses type assertion for accounts table since role column may not be in generated types
 */
export function useOperators() {
  const supabase = useSupabase();

  return useQuery<Operator[]>({
    queryKey: ['operators'],
    queryFn: async (): Promise<Operator[]> => {
      // Use type assertion since 'role' column may not be in the generated types yet
      const { data, error } = await (supabase as any)
        .from('accounts')
        .select('id, email, name')
        .eq('role', 'operator')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Operator[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get all maintenance tasks (admin view)
 * Note: Uses type assertion since maintenance_tasks table may not be in generated types
 */
export function useAllMaintenanceTasks(filters?: {
  status?: TaskStatus;
  machine?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = useSupabase();

  return useQuery<MaintenanceTask[]>({
    queryKey: ['maintenance-tasks', 'all', filters],
    queryFn: async (): Promise<MaintenanceTask[]> => {
      let query = (supabase as any)
        .from('maintenance_tasks')
        .select(`
          *,
          assigned_to_account:accounts!maintenance_tasks_assigned_to_fkey(id, email, name),
          assigned_by_account:accounts!maintenance_tasks_assigned_by_fkey(id, email, name)
        `)
        .order('scheduled_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.machine) {
        query = query.eq('machine', filters.machine);
      }
      if (filters?.startDate) {
        query = query.gte('scheduled_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('scheduled_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the joined data
      return (data || []).map((task: any) => ({
        ...task,
        assigned_to_name: task.assigned_to_account?.name,
        assigned_to_email: task.assigned_to_account?.email,
        assigned_by_name: task.assigned_by_account?.name,
        assigned_by_email: task.assigned_by_account?.email,
      })) as MaintenanceTask[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get tasks assigned to current user (operator view)
 */
export function useMyMaintenanceTasks(filters?: {
  status?: TaskStatus;
}) {
  const supabase = useSupabase();

  return useQuery<MaintenanceTask[]>({
    queryKey: ['maintenance-tasks', 'my', filters],
    queryFn: async (): Promise<MaintenanceTask[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = (supabase as any)
        .from('maintenance_tasks')
        .select(`
          *,
          assigned_by_account:accounts!maintenance_tasks_assigned_by_fkey(id, email, name)
        `)
        .eq('assigned_to', user.id)
        .order('scheduled_date', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((task: any) => ({
        ...task,
        assigned_by_name: task.assigned_by_account?.name,
        assigned_by_email: task.assigned_by_account?.email,
      })) as MaintenanceTask[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get tasks for a specific date (for calendar view)
 */
export function useTasksByDate(date: string) {
  const supabase = useSupabase();

  return useQuery<MaintenanceTask[]>({
    queryKey: ['maintenance-tasks', 'date', date],
    queryFn: async (): Promise<MaintenanceTask[]> => {
      const { data, error } = await (supabase as any)
        .from('maintenance_tasks')
        .select(`
          *,
          assigned_to_account:accounts!maintenance_tasks_assigned_to_fkey(id, email, name)
        `)
        .eq('scheduled_date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((task: any) => ({
        ...task,
        assigned_to_name: task.assigned_to_account?.name,
        assigned_to_email: task.assigned_to_account?.email,
      })) as MaintenanceTask[];
    },
    enabled: Boolean(date),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to create a new maintenance task (admin only)
 */
export function useCreateMaintenanceTask() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('maintenance_tasks')
        .insert({
          ...input,
          assigned_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MaintenanceTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
    },
  });
}

/**
 * Hook to update a maintenance task
 */
export function useUpdateMaintenanceTask() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, ...updates } = input;

      // If completing the task, set completed_at
      const updateData: any = { ...updates };
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await (supabase as any)
        .from('maintenance_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MaintenanceTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
    },
  });
}

/**
 * Hook to delete a maintenance task (admin only)
 */
export function useDeleteMaintenanceTask() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await (supabase as any)
        .from('maintenance_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
    },
  });
}

/**
 * Hook to get task statistics
 */
export function useTaskStats() {
  const supabase = useSupabase();

  return useQuery({
    queryKey: ['maintenance-tasks', 'stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('maintenance_tasks')
        .select('status');

      if (error) throw error;

      const stats = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        total: (data as any[])?.length || 0,
      };

      (data as any[] || []).forEach((task: any) => {
        if (task.status in stats) {
          stats[task.status as keyof typeof stats]++;
        }
      });

      return stats;
    },
    staleTime: 30 * 1000,
  });
}
