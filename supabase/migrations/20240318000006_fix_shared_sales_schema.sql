-- Drop existing constraints if they exist
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_shared_with_fkey,
DROP CONSTRAINT IF EXISTS shared_status_check;

-- Add shared_with_id and shared_with_email columns if they don't exist
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS shared_with_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS shared_with_email text;

-- Add new constraint for shared sales
ALTER TABLE public.sales 
ADD CONSTRAINT shared_status_check CHECK (
  (shared_with_id IS NULL AND shared_with_email IS NULL AND shared_status IS NULL) OR
  (shared_with_id IS NOT NULL AND shared_with_email IS NOT NULL AND shared_status IS NOT NULL)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_shared_with_id ON public.sales(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_sales_shared_with_email ON public.sales(shared_with_email);