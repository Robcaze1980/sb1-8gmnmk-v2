-- Add trade_in_comment column to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS trade_in_comment text;