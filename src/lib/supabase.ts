import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'salesperson' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface SaleEntry {
  id: string;
  user_id: string;
  stock_number: string;
  customer_name: string;
  sale_type: 'New' | 'Used' | 'Trade-In';
  sale_price: number;
  accessories_price?: number;
  warranty_price?: number;
  warranty_cost?: number;
  maintenance_price?: number;
  maintenance_cost?: number;
  shared_with_email?: string;
  shared_with_id?: string;
  shared_status?: 'pending' | 'accepted' | 'rejected';
  commission_split?: number;
  date: string;
}

export interface SpiffEntry {
  id: string;
  user_id: string;
  amount: number;
  note?: string;
  image_url?: string;
  date: string;
}

export interface TradeInEntry {
  id: string;
  user_id: string;
  amount: number;
  comment: string;
  date: string;
}

export interface NotificationEntry {
  id: string;
  user_id: string;
  sale_id: string;
  type: 'shared_sale_pending' | 'shared_sale_accepted' | 'shared_sale_rejected';
  read: boolean;
  created_at: string;
  sales?: SaleEntry;
}

export async function fetchSalesData(userId: string, startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        users (
          email
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSalesData:', error);
    throw error;
  }
}

export async function fetchSpiffsData(userId: string, startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('spiffs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching spiffs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSpiffsData:', error);
    throw error;
  }
}

export async function fetchTradeInsData(userId: string, startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('trade_ins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching trade-ins:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchTradeInsData:', error);
    throw error;
  }
}

export async function fetchAllSalesData(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_sales_with_users', {
        start_date: startDate,
        end_date: endDate
      });

    if (error) {
      console.error('Error fetching all sales:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchAllSalesData:', error);
    throw error;
  }
}

export async function fetchAllTeamMembers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'salesperson')
      .order('email');

    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchAllTeamMembers:', error);
    throw error;
  }
}

export async function getSharedSaleNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        sales (
          id,
          stock_number,
          customer_name,
          sale_type,
          sale_price,
          commission_split,
          date
        )
      `)
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function respondToSharedSale(saleId: string, response: 'accepted' | 'rejected') {
  try {
    const { error } = await supabase
      .from('sales')
      .update({ shared_status: response })
      .eq('id', saleId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error responding to shared sale:', error);
    throw error;
  }
}

export async function getUserIdFromEmail(email: string): Promise<string | null> {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) {
      const { data: authData, error: authError } = await supabase.rpc('get_user_id_from_email', {
        email_address: email
      });

      if (authError) throw authError;
      return authData || null;
    }

    return userData?.id || null;
  } catch (error) {
    console.error('Error getting user ID from email:', error);
    return null;
  }
}

export function calculateCommissions(sale: SaleEntry) {
  let carCommission = 0;
  let accessoriesCommission = 0;
  let warrantyCommission = 0;
  let maintenanceCommission = 0;

  // Car commission based on sale price
  if (sale.sale_price < 10000) {
    carCommission = 200;
  } else if (sale.sale_price < 20000) {
    carCommission = 300;
  } else if (sale.sale_price < 30000) {
    carCommission = 400;
  } else {
    carCommission = 500;
  }

  // Apply commission split if sale is shared and accepted
  const splitMultiplier = sale.shared_status === 'accepted' ? 
    (sale.commission_split || 50) / 100 : 1;

  // Apply split to all commissions
  carCommission *= splitMultiplier;

  // Accessories commission
  if (sale.accessories_price) {
    const threshold = sale.sale_type === 'New' ? 988 : 488;
    const eligibleAmount = sale.accessories_price - threshold;
    if (eligibleAmount > 800) {
      accessoriesCommission = 100 * splitMultiplier;
    }
  }

  // Warranty commission
  if (sale.warranty_price && sale.warranty_cost) {
    const profit = sale.warranty_price - sale.warranty_cost;
    warrantyCommission = Math.floor(profit / 1000) * 100 * splitMultiplier;
  }

  // Maintenance commission
  if (sale.maintenance_price && sale.maintenance_price > 800) {
    maintenanceCommission = 100 * splitMultiplier;
  }

  const totalCommission = carCommission + accessoriesCommission + warrantyCommission + maintenanceCommission;

  return {
    carCommission,
    accessoriesCommission,
    warrantyCommission,
    maintenanceCommission,
    totalCommission,
  };
}