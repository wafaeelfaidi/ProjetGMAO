/*
 * -------------------------------------------------------
 * Maintenance Tasks Migration
 * This migration adds:
 * - maintenance_tasks table for task delegation
 * - RLS policies for admin/operator access
 * - Functions for task management
 * -------------------------------------------------------
 */

-- =====================================================
-- SECTION 1: Maintenance Tasks Table
-- =====================================================

-- Create task status enum
DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    
    -- Task details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    machine VARCHAR(100) NOT NULL,
    scheduled_date DATE NOT NULL,
    
    -- Probability/prediction info (from forecasts)
    probability DECIMAL(5,4),
    failure_type VARCHAR(200),
    expected_downtime_hours DECIMAL(10,2),
    expected_material_cost DECIMAL(10,2),
    
    -- Assignment
    assigned_to UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    assigned_by UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status
    status public.task_status NOT NULL DEFAULT 'pending',
    
    -- Notes
    admin_notes TEXT,
    operator_notes TEXT,
    
    -- Completion info
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_assigned_to ON public.maintenance_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_assigned_by ON public.maintenance_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled_date ON public.maintenance_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON public.maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_machine ON public.maintenance_tasks(machine);

-- Comments on table and columns
COMMENT ON TABLE public.maintenance_tasks IS 'Stores delegated maintenance tasks from admin to operators';
COMMENT ON COLUMN public.maintenance_tasks.assigned_to IS 'The operator assigned to this task';
COMMENT ON COLUMN public.maintenance_tasks.assigned_by IS 'The admin who created/assigned this task';
COMMENT ON COLUMN public.maintenance_tasks.admin_notes IS 'Notes from admin when creating the task';
COMMENT ON COLUMN public.maintenance_tasks.operator_notes IS 'Notes from operator while working on task';

-- =====================================================
-- SECTION 2: Updated at trigger
-- =====================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_maintenance_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS maintenance_tasks_updated_at ON public.maintenance_tasks;
CREATE TRIGGER maintenance_tasks_updated_at
    BEFORE UPDATE ON public.maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_maintenance_tasks_updated_at();

-- =====================================================
-- SECTION 3: Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to maintenance_tasks"
    ON public.maintenance_tasks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.accounts
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.accounts
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Operators can view tasks assigned to them
CREATE POLICY "Operators can view assigned tasks"
    ON public.maintenance_tasks
    FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.accounts
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Operators can update their own tasks (status and operator_notes only)
CREATE POLICY "Operators can update assigned tasks"
    ON public.maintenance_tasks
    FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid())
    WITH CHECK (assigned_to = auth.uid());

-- =====================================================
-- SECTION 4: Helper Functions
-- =====================================================

-- Function to get operators list (for admin to assign tasks)
CREATE OR REPLACE FUNCTION public.get_operators()
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.email::TEXT,
        a.name::TEXT
    FROM public.accounts a
    WHERE a.role = 'operator'
    ORDER BY a.name, a.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get task counts by status for a user
CREATE OR REPLACE FUNCTION public.get_task_counts(user_id UUID DEFAULT NULL)
RETURNS TABLE (
    pending_count BIGINT,
    in_progress_count BIGINT,
    completed_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count
    FROM public.maintenance_tasks
    WHERE 
        CASE 
            WHEN user_id IS NOT NULL THEN assigned_to = user_id
            ELSE TRUE
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_operators() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_counts(UUID) TO authenticated;
