-- Create a function to get sales data with user information
CREATE OR REPLACE FUNCTION get_sales_with_users(start_date date, end_date date)
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
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.stock_number,
    s.customer_name,
    s.sale_type,
    s.sale_price,
    s.date,
    u.email as user_email
  FROM sales s
  JOIN users u ON u.id = s.user_id
  WHERE s.date BETWEEN start_date AND end_date
  ORDER BY s.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;