-- Add shared_with_id column
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS shared_with_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS shared_with_email text;

-- Update existing shared sales
UPDATE public.sales
SET shared_with_email = shared_with,
    shared_with_id = (
      SELECT id 
      FROM auth.users 
      WHERE email = sales.shared_with
    )
WHERE shared_with IS NOT NULL;

-- Drop old shared_with column
ALTER TABLE public.sales
DROP COLUMN IF EXISTS shared_with;