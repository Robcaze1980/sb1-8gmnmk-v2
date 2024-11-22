-- Drop existing constraints and columns
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_shared_with_fkey,
DROP CONSTRAINT IF EXISTS shared_status_check;

-- Add new columns for shared sales
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS shared_with_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS shared_with_email text;

-- Migrate existing data
UPDATE public.sales
SET shared_with_email = shared_with,
    shared_with_id = (
      SELECT id 
      FROM auth.users 
      WHERE email = sales.shared_with
    )
WHERE shared_with IS NOT NULL;

-- Drop old column
ALTER TABLE public.sales
DROP COLUMN IF EXISTS shared_with;

-- Add new constraint
ALTER TABLE public.sales 
ADD CONSTRAINT shared_status_check CHECK (
  (shared_with_id IS NULL AND shared_with_email IS NULL AND shared_status IS NULL) OR
  (shared_with_id IS NOT NULL AND shared_with_email IS NOT NULL AND shared_status IS NOT NULL)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_shared_with_id ON public.sales(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_sales_shared_with_email ON public.sales(shared_with_email);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own sales and sales shared with them" ON public.sales;

CREATE POLICY "Users can view their own sales and sales shared with them"
  ON public.sales FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = shared_with_id
  );