-- Add commission_split column to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS commission_split integer DEFAULT 50 CHECK (commission_split BETWEEN 0 AND 100);