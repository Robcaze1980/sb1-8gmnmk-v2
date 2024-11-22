import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'react-hot-toast';
import { User } from '../../lib/supabase';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface SalesPerformance {
  totalSales: number;
  totalRevenue: number;
  averagePrice: number;
  newCars: number;
  usedCars: number;
  tradeIns: number;
  spiffs: number;
  commissions: number;
}

interface UserPerformance extends User {
  performance: SalesPerformance;
}

export default function TeamPerformance() {
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<UserPerformance[]>([]);
  const [sortField, setSortField] = useState<keyof SalesPerformance>('totalSales');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchTeamData();
  }, [currentDate]);

  const fetchTeamData = async () => {
    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      // Fetch all salespersons
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'salesperson');

      if (usersError) throw usersError;

      // Fetch performance data for each user
      const performanceData = await Promise.all((users || []).map(async (user) => {
        // Fetch sales data
        const { data: sales } = await supabase
          .from('sales')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate);

        // Fetch spiffs data
        const { data: spiffs } = await supabase
          .from('spiffs')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const performance: SalesPerformance = {
          totalSales: sales?.length || 0,
          totalRevenue: sales?.reduce((sum, sale) => sum + sale.sale_price, 0) || 0,
          averagePrice: sales?.length 
            ? (sales.reduce((sum, sale) => sum + sale.sale_price, 0) / sales.length)
            : 0,
          newCars: sales?.filter(sale => sale.sale_type === 'New').length || 0,
          usedCars: sales?.filter(sale => sale.sale_type === 'Used').length || 0,
          tradeIns: sales?.filter(sale => sale.sale_type === 'Trade-In').length || 0,
          spiffs: spiffs?.length || 0,
          commissions: (sales?.reduce((sum, sale) => {
            const commission = sale.sale_type === 'New' ? 500 : 400;
            return sum + commission;
          }, 0) || 0) + (spiffs?.reduce((sum, spiff) => sum + spiff.amount, 0) || 0),
        };

        return {
          ...user,
          performance,
        };
      }));

      setTeamData(performanceData);
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to fetch team performance data');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (nextMonth <= new Date()) {
      setCurrentDate(nextMonth);
    }
  };

  const handleSort = (field: keyof SalesPerformance) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTeamData = [...teamData].sort((a, b) => {
    const aValue = a.performance[sortField];
    const bValue = b.performance[sortField];
    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E60012]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Team Performance
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-lg font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={new Date(currentDate).setMonth(currentDate.getMonth() + 1) > Date.now()}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salesperson
              </th>
              {[
                { key: 'totalSales', label: 'Total Sales' },
                { key: 'totalRevenue', label: 'Revenue', format: true },
                { key: 'averagePrice', label: 'Avg. Price', format: true },
                { key: 'newCars', label: 'New Cars' },
                { key: 'usedCars', label: 'Used Cars' },
                { key: 'tradeIns', label: 'Trade-Ins' },
                { key: 'spiffs', label: 'Spiffs' },
                { key: 'commissions', label: 'Commissions', format: true },
              ].map(({ key, label, format }) => (
                <th
                  key={key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(key as keyof SalesPerformance)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    {sortField === key && (
                      sortDirection === 'desc' ? 
                        <TrendingDown className="h-4 w-4" /> : 
                        <TrendingUp className="h-4 w-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTeamData.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.email.split('@')[0]}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.performance.totalSales}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${user.performance.totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${user.performance.averagePrice.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.performance.newCars}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.performance.usedCars}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.performance.tradeIns}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.performance.spiffs}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${user.performance.commissions.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}