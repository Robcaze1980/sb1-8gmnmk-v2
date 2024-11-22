-- First drop all dependent triggers and policies
DROP TRIGGER IF EXISTS on_shared_sale_created ON public.sales;
DROP TRIGGER IF EXISTS trg_shared_sale_created ON public.sales;
DROP TRIGGER IF EXISTS on_shared_sale_status_change ON public.sales;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own sales and sales shared with them" ON public.sales;
DROP POLICY IF EXISTS "Users can view their own sales and shared sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

-- Now we can safely drop constraints and modify columns
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_shared_with_fkey,
DROP CONSTRAINT IF EXISTS shared_status_check;

-- Update sales table structure
ALTER TABLE public.sales
DROP COLUMN IF EXISTS shared_with CASCADE,
ADD COLUMN IF NOT EXISTS shared_with_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS shared_with_email text,
ADD COLUMN IF NOT EXISTS trade_in_commission numeric(10,2) DEFAULT 0 CHECK (trade_in_commission >= 0),
ALTER COLUMN sale_price SET NOT NULL,
ALTER COLUMN sale_price SET DEFAULT 0,
ALTER COLUMN accessories_price SET DEFAULT 0,
ALTER COLUMN warranty_price SET DEFAULT 0,
ALTER COLUMN warranty_cost SET DEFAULT 0,
ALTER COLUMN maintenance_price SET DEFAULT 0,
ALTER COLUMN maintenance_cost SET DEFAULT 0;

-- Add new constraint for shared sales
ALTER TABLE public.sales 
ADD CONSTRAINT shared_status_check CHECK (
  (shared_with_id IS NULL AND shared_with_email IS NULL AND shared_status IS NULL) OR
  (shared_with_id IS NOT NULL AND shared_with_email IS NOT NULL AND shared_status IS NOT NULL)
);

-- Create or replace function to get user ID from email
CREATE OR REPLACE FUNCTION get_user_id_from_email(email_address text)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id 
    FROM auth.users 
    WHERE email = email_address 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function for shared sale notifications
CREATE OR REPLACE FUNCTION create_shared_sale_notification()
RETURNS trigger AS $$
BEGIN
  IF NEW.shared_with_email IS NOT NULL AND NEW.shared_status = 'pending' THEN
    -- Get the user_id for the shared email
    NEW.shared_with_id := get_user_id_from_email(NEW.shared_with_email);
    
    -- Create notification
    INSERT INTO public.notifications (user_id, sale_id, type)
    VALUES (NEW.shared_with_id, NEW.id, 'shared_sale_pending');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace function for handling shared sale status changes
CREATE OR REPLACE FUNCTION handle_shared_sale_status_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.shared_status IN ('accepted', 'rejected') AND 
     (OLD.shared_status IS NULL OR NEW.shared_status != OLD.shared_status) THEN
    INSERT INTO public.notifications (user_id, sale_id, type)
    VALUES (
      NEW.user_id,
      NEW.id,
      'shared_sale_' || NEW.shared_status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new triggers for shared sales
CREATE TRIGGER on_shared_sale_created
  BEFORE INSERT OR UPDATE OF shared_with_email
  ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION create_shared_sale_notification();

CREATE TRIGGER on_shared_sale_status_change
  AFTER UPDATE OF shared_status
  ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION handle_shared_sale_status_change();

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_sales_shared_with_id ON public.sales(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_sales_shared_with_email ON public.sales(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_sales_shared_status ON public.sales(shared_status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);

-- Create new RLS policies
CREATE POLICY "Users can view their own sales and sales shared with them"
  ON public.sales FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = shared_with_id
  );

CREATE POLICY "Users can update their own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON public.sales FOR DELETE
  USING (auth.uid() = user_id);

-- Ensure notifications table has correct structure
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('shared_sale_pending', 'shared_sale_accepted', 'shared_sale_rejected')) NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Update notification policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);