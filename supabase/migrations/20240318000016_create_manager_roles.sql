-- Add role enum type
CREATE TYPE user_role AS ENUM ('salesperson', 'manager', 'admin');

-- Add role column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'salesperson';

-- Create manager_settings table
CREATE TABLE IF NOT EXISTS public.manager_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_preferences jsonb DEFAULT '{"email": true, "push": true}',
  dashboard_layout jsonb DEFAULT '{"widgets": ["sales", "commissions", "spiffs", "trade_ins"]}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- Create sales_approvals table
CREATE TABLE IF NOT EXISTS public.sales_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create spiff_approvals table
CREATE TABLE IF NOT EXISTS public.spiff_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  spiff_id uuid REFERENCES public.spiffs(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.manager_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spiff_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for manager_settings
CREATE POLICY "Users can view their own settings"
  ON public.manager_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.manager_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for sales_approvals
CREATE POLICY "Managers can view all sales approvals"
  ON public.sales_approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  ));

CREATE POLICY "Managers can create and update sales approvals"
  ON public.sales_approvals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  ));

-- Create RLS policies for spiff_approvals
CREATE POLICY "Managers can view all spiff approvals"
  ON public.spiff_approvals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  ));

CREATE POLICY "Managers can create and update spiff approvals"
  ON public.spiff_approvals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  ));

-- Create indexes
CREATE INDEX idx_sales_approvals_sale_id ON public.sales_approvals(sale_id);
CREATE INDEX idx_sales_approvals_manager_id ON public.sales_approvals(manager_id);
CREATE INDEX idx_sales_approvals_status ON public.sales_approvals(status);

CREATE INDEX idx_spiff_approvals_spiff_id ON public.spiff_approvals(spiff_id);
CREATE INDEX idx_spiff_approvals_manager_id ON public.spiff_approvals(manager_id);
CREATE INDEX idx_spiff_approvals_status ON public.spiff_approvals(status);

-- Create function to check if user is manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all pending approvals
CREATE OR REPLACE FUNCTION get_pending_approvals(manager_id uuid)
RETURNS TABLE (
  id uuid,
  type text,
  item_id uuid,
  user_id uuid,
  user_email text,
  amount numeric,
  status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    'sale'::text as type,
    s.id as item_id,
    s.user_id,
    u.email as user_email,
    s.sale_price as amount,
    sa.status,
    sa.created_at
  FROM sales_approvals sa
  JOIN sales s ON s.id = sa.sale_id
  JOIN users u ON u.id = s.user_id
  WHERE sa.manager_id = get_pending_approvals.manager_id
  AND sa.status = 'pending'
  UNION ALL
  SELECT 
    spa.id,
    'spiff'::text as type,
    sp.id as item_id,
    sp.user_id,
    u.email as user_email,
    sp.amount,
    spa.status,
    spa.created_at
  FROM spiff_approvals spa
  JOIN spiffs sp ON sp.id = spa.spiff_id
  JOIN users u ON u.id = sp.user_id
  WHERE spa.manager_id = get_pending_approvals.manager_id
  AND spa.status = 'pending'
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;