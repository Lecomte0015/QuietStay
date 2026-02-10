-- Add time tracking columns for hourly-paid cleanings
ALTER TABLE public.cleanings ADD COLUMN started_at TIMESTAMPTZ;
ALTER TABLE public.cleanings ADD COLUMN finished_at TIMESTAMPTZ;
