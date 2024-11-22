-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_sales_with_users(date, date);

-- Create or replace function to get sales data with user information
CREATE OR REPLACE FUNCTION get_sales_with_users(start_date date, end_date date)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  stock_number text,
  customer_name text,
  sale_type text,
  sale_price numeric,
  accessories_price numeric,
  warranty_price numeric,
  warranty_cost numeric,
  maintenance_price numeric,
  maintenance_cost numeric,
  shared_with_email text,
  shared_with_id uuid,
  shared_status text,
  commission_split integer,
  date date,
  user_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.stock_number,
    s.customer_name,
    s.sale_type,
    s.sale_price,
    s.accessories_price,
    s.warranty_price,
    s.warranty_cost,
    s.maintenance_price,
    s.maintenance_cost,
    s.shared_with_email,
    s.shared_with_id,
    s.shared_status,
    s.commission_split,
    s.date,
    u.email as user_email
  FROM sales s
  JOIN users u ON u.id = s.user_id
  WHERE s.date BETWEEN start_date AND end_date
  ORDER BY s.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;