-- Drop existing function first
DROP FUNCTION IF EXISTS get_all_sales_data();

-- Create or replace function to get all sales data
CREATE OR REPLACE FUNCTION get_all_sales_data()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  stock_number text,
  customer_name text,
  sale_type text,
  sale_price numeric,
  date date,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    u.email as user_email,
    s.stock_number,
    s.customer_name,
    s.sale_type,
    s.sale_price,
    s.date,
    COALESCE(s.status, 'pending') as status
  FROM sales s
  JOIN users u ON u.id = s.user_id
  ORDER BY s.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add status column to sales table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'status') 
  THEN
    ALTER TABLE sales ADD COLUMN status text CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;