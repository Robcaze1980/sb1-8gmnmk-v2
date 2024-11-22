-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own sales and admins can view all" ON public.sales;
DROP POLICY IF EXISTS "Users can view their own spiffs and admins can view all" ON public.spiffs;
DROP POLICY IF EXISTS "Users can view their own trade-ins and admins can view all" ON public.trade_ins;

-- Update sales policy
CREATE POLICY "Users can view their own sales and admins can view all"
ON public.sales
FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() = shared_with_id
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Update spiffs policy
CREATE POLICY "Users can view their own spiffs and admins can view all"
ON public.spiffs
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Update trade_ins policy
CREATE POLICY "Users can view their own trade-ins and admins can view all"
ON public.trade_ins
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Create function to check admin access
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all sales data for admin/manager
CREATE OR REPLACE FUNCTION get_all_sales_data()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  stock_number text,
  customer_name text,
  sale_type text,
  sale_price numeric,
  date date,
  user_email text
) AS $$
BEGIN
  IF (SELECT is_admin() OR is_manager()) THEN
    RETURN QUERY
    SELECT 
      s.id,
      s.user_id,
      s.stock_number,
      s.customer_name,
      s.sale_type,
      s.sale_price,
      s.date,
      u.email
    FROM sales s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.date DESC;
  ELSE
    RETURN QUERY
    SELECT 
      s.id,
      s.user_id,
      s.stock_number,
      s.customer_name,
      s.sale_type,
      s.sale_price,
      s.date,
      u.email
    FROM sales s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id = auth.uid()
    ORDER BY s.date DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;