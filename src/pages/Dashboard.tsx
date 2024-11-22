import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase, SaleEntry, SpiffEntry, TradeInEntry } from '../lib/supabase';
import { LogOut, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import SalesGrid from '../components/SalesGrid';
import DashboardStats from '../components/DashboardStats';
import NewSaleModal from '../components/NewSaleModal';
import MonthFilter from '../components/MonthFilter';
import SharedSalesNotifications from '../components/SharedSalesNotifications';
import LoadingScreen from '../components/LoadingScreen';

interface DashboardProps {
  userId?: string;
  isManagerView?: boolean;
}

export default function Dashboard({ userId, isManagerView = false }: DashboardProps) {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [spiffs, setSpiffs] = useState<SpiffEntry[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeInEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userName, setUserName] = useState('');
  const [selectedItem, setSelectedItem] = useState<SaleEntry | SpiffEntry | TradeInEntry | null>(null);

  useEffect(() => {
    if (!session?.user?.id && !userId) {
      navigate('/login');
      return;
    }
    fetchUserName();
    fetchSales();
    fetchSpiffs();
    fetchTradeIns();
  }, [currentDate, session?.user?.id, userId, navigate]);

  const fetchUserName = async () => {
    try {
      const targetUserId = userId || session?.user?.id;
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;
      if (data?.email) {
        const name = data.email.split('@')[0];
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
      toast.error('Error fetching user information');
    }
  };

  const fetchSales = async () => {
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) return;

    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      console.error('Error fetching sales data:', error);
      toast.error('Error fetching sales data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpiffs = async () => {
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) return;

    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('spiffs')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setSpiffs(data || []);
    } catch (error: any) {
      console.error('Error fetching spiffs data:', error);
      toast.error('Error fetching spiffs data');
    }
  };

  const fetchTradeIns = async () => {
    const targetUserId = userId || session?.user?.id;
    if (!targetUserId) return;

    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('trade_ins')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setTradeIns(data || []);
    } catch (error: any) {
      console.error('Error fetching trade-ins data:', error);
      toast.error('Error fetching trade-ins data');
    }
  };

  const handleEdit = (item: SaleEntry | SpiffEntry | TradeInEntry) => {
    setSelectedItem(item);
    setIsNewSaleModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'sale' | 'spiff' | 'trade-in') => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      const table = type === 'sale' ? 'sales' : type === 'spiff' ? 'spiffs' : 'trade_ins';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
      
      if (type === 'sale') {
        await fetchSales();
      } else if (type === 'spiff') {
        await fetchSpiffs();
      } else {
        await fetchTradeIns();
      }
    } catch (error: any) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(`Error deleting ${type}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const handleNewSale = () => {
    setSelectedItem(null);
    setIsNewSaleModalOpen(true);
  };

  const handleModalClose = () => {
    setIsNewSaleModalOpen(false);
    setSelectedItem(null);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`min-h-screen bg-gray-100 ${isManagerView ? '' : 'pt-16'}`}>
      {!isManagerView && (
        <nav className="bg-[#000000] shadow-sm fixed top-0 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <img 
                  src="/images/mitsubishi-logo.png" 
                  alt="Mitsubishi Logo" 
                  className="h-8"
                />
                <div>
                  <h1 className="text-xl font-bold text-white">Daly City Mitsubishi</h1>
                  <p className="text-sm text-gray-300">Sales Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleNewSale}
                  className="bg-[#E60012] text-white px-4 py-2 rounded-md flex items-center hover:bg-[#cc0010] transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Sale
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <LogOut className="h-6 w-6" />
                </button>
                <SharedSalesNotifications onNotificationAction={() => {
                  fetchSales();
                  fetchSpiffs();
                  fetchTradeIns();
                }} />
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isManagerView ? '' : 'mt-8'}`}>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">
            {isManagerView ? `Sales Data for ${userName}` : `Welcome, ${userName}!`}
          </h2>
          <div className="flex items-center justify-between mt-4">
            <MonthFilter
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
          </div>
        </div>

        <DashboardStats sales={sales} spiffs={spiffs} />
        
        <div className="bg-white rounded-lg shadow-md">
          <SalesGrid 
            sales={sales}
            spiffs={spiffs}
            tradeIns={tradeIns}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </main>

      {!isManagerView && (
        <NewSaleModal
          isOpen={isNewSaleModalOpen}
          onClose={handleModalClose}
          onSaleAdded={async () => {
            await Promise.all([fetchSales(), fetchSpiffs(), fetchTradeIns()]);
          }}
          editItem={selectedItem}
        />
      )}
    </div>
  );
}