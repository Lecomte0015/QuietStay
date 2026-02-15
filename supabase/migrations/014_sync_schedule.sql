-- ============================================================
-- QuietStay Ops — Calendar sources auto-sync fields
-- ============================================================

ALTER TABLE public.calendar_sources
  ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_interval_hours INT DEFAULT 6,
  ADD COLUMN IF NOT EXISTS last_error TEXT;
