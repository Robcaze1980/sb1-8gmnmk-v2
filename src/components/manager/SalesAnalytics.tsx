import React, { useState, useEffect } from 'react';
import { supabase, fetchAllSalesData } from '../../lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'react-hot-toast';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import MonthFilter from '../MonthFilter';
import LoadingScreen from '../LoadingScreen';

interface SalesData {
  currentMonth: {
    totalSales: number;
    totalRevenue: number;
    averagePrice: number;
    byType: {
      New: number;
      Used: number;
      'Trade-In': number;
    };
    salesByUser: Record<string, { count: number; revenue: number }>;
    dailySales: Array<{ date: string; count: number; revenue: number }>;
  };
  previousMonth: {
    totalSales: number;
    totalRevenue: number;
    averagePrice: number;
  };
}

const defaultSalesData: SalesData = {
  currentMonth: {
    totalSales: 0,
    totalRevenue: 0,
    averagePrice: 0,
    byType: {
      New: 0,
      Used: 0,
      'Trade-In': 0
    },
    salesByUser: {},
    dailySales: []
  },
  previousMonth: {
    totalSales: 0,
    totalRevenue: 0,
    averagePrice: 0
  }
};

export default function SalesAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SalesData>(defaultSalesData);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchSalesData();
  }, [currentDate, retryCount]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      const prevStartDate = format(startOfMonth(subMonths(currentDate, 1)), 'yyyy-MM-dd');
      const prevEndDate = format(endOfMonth(subMonths(currentDate, 1)), 'yyyy-MM-dd');

      // Fetch current month data
      const currentData = await fetchAllSalesData(startDate, endDate);
      const prevData = await fetchAllSalesData(prevStartDate, prevEndDate);

      // Process the data
      const processedData: SalesData = {
        currentMonth: {
          totalSales: currentData?.length || 0,
          totalRevenue: currentData?.reduce((sum, sale) => sum + Number(sale.sale_price), 0) || 0,
          averagePrice: currentData?.length 
            ? (currentData.reduce((sum, sale) => sum + Number(sale.sale_price), 0) / currentData.length)
            : 0,
          byType: {
            New: currentData?.filter(sale => sale.sale_type === 'New').length || 0,
            Used: currentData?.filter(sale => sale.sale_type === 'Used').length || 0,
            'Trade-In': currentData?.filter(sale => sale.sale_type === 'Trade-In').length || 0,
          },
          salesByUser: currentData?.reduce((acc, sale) => {
            const email = sale.user_email?.split('@')[0] || 'Unknown';
            if (!acc[email]) {
              acc[email] = { count: 0, revenue: 0 };
            }
            acc[email].count++;
            acc[email].revenue += Number(sale.sale_price);
            return acc;
          }, {} as Record<string, { count: number; revenue: number }>),
          dailySales: currentData?.reduce((acc, sale) => {
            const date = format(new Date(sale.date), 'MM/dd');
            const existing = acc.find(item => item.date === date);
            if (existing) {
              existing.count++;
              existing.revenue += Number(sale.sale_price);
            } else {
              acc.push({ date, count: 1, revenue: Number(sale.sale_price) });
            }
            return acc;
          }, [] as Array<{ date: string; count: number; revenue: number }>).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          ) || []
        },
        previousMonth: {
          totalSales: prevData?.length || 0,
          totalRevenue: prevData?.reduce((sum, sale) => sum + Number(sale.sale_price), 0) || 0,
          averagePrice: prevData?.length 
            ? (prevData.reduce((sum, sale) => sum + Number(sale.sale_price), 0) / prevData.length)
            : 0,
        }
      };

      setSalesData(processedData);
    } catch (error: any) {
      console.error('Error fetching sales data:', error);
      setError('Failed to fetch sales analytics. Please try again.');
      toast.error('Error loading sales analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, increase: true };
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { percentage, increase: diff >= 0 };
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Sales Analytics Dashboard
        </h2>
        <MonthFilter
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Sales',
            current: salesData.currentMonth.totalSales,
            previous: salesData.previousMonth.totalSales,
            format: false
          },
          {
            title: 'Total Revenue',
            current: salesData.currentMonth.totalRevenue,
            previous: salesData.previousMonth.totalRevenue,
            format: true
          },
          {
            title: 'Average Price',
            current: salesData.currentMonth.averagePrice,
            previous: salesData.previousMonth.averagePrice,
            format: true
          },
          {
            title: 'Sales Growth',
            current: salesData.currentMonth.totalRevenue,
            previous: salesData.previousMonth.totalRevenue,
            format: true,
            isPercentage: true
          }
        ].map((metric, index) => {
          const change = calculateChange(metric.current, metric.previous);
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-sm font-medium text-gray-500">{metric.title}</h3>
              <div className="mt-2 flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">
                  {metric.format ? `$${metric.current.toLocaleString()}` : metric.current}
                </p>
                <span className={`ml-2 flex items-center text-sm ${
                  change.increase ? 'text-green-600' : 'text-red-600'
                }`}>
                  {change.increase ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(change.percentage).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Sales Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData.currentMonth.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  name="Number of Sales"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  name="Revenue ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Type */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Type</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(salesData.currentMonth.byType).map(([type, count]) => ({
                type,
                count
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Number of Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Team Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salesperson
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Sale
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(salesData.currentMonth.salesByUser).map(([name, data]) => (
                <tr key={name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${data.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${(data.revenue / data.count).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}