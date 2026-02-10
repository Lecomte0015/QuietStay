-- ============================================================
-- QuietStay Ops — Migration 003: Ajout coût ménage
-- ============================================================

ALTER TABLE public.cleanings ADD COLUMN cost DECIMAL(10,2) DEFAULT 80.00;
