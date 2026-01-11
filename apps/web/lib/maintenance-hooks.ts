'use client';

import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ForecastResponse {
  machine: string;
  predicted_date: string;
  window_start: string;
  window_end: string;
  probability: number;
  failure_type_probabilities: Record<string, number>;
  expected_downtime_hours: number;
  expected_material_cost: number;
}

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

export function useMaintenanceForecast({ 
  machine, 
  horizonDays = 60 
}: { 
  machine?: string; 
  horizonDays?: number 
}) {
  return useQuery<ForecastResponse[]>({
    queryKey: ['maintenance', 'forecast', machine, horizonDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('horizon_days', horizonDays.toString());
      if (machine) {
        params.append('machine', machine);
      }
      
      const response = await fetch(`${API_BASE_URL}/maintenance/forecast?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance forecast');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMaintenanceCalendar({ 
  start, 
  end, 
  machine 
}: { 
  start: string; 
  end: string; 
  machine?: string 
}) {
  return useQuery<CalendarEvent[]>({
    queryKey: ['maintenance', 'calendar', start, end, machine],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('start', start);
      params.append('end', end);
      if (machine) {
        params.append('machine', machine);
      }
      
      const response = await fetch(`${API_BASE_URL}/maintenance/calendar?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch maintenance calendar');
      }
      return response.json();
    },
    enabled: Boolean(start && end),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAvailableMachines() {
  return useQuery<string[]>({
    queryKey: ['maintenance', 'machines'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/maintenance/machines`);
      if (!response.ok) {
        throw new Error('Failed to fetch available machines');
      }
      const data = await response.json();
      return data.machines || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
