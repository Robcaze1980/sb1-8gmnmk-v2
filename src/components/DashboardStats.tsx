// src/components/DashboardStats.tsx
import React from 'react';
import { SaleEntry, SpiffEntry, calculateCommissions } from '../lib/supabase';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface DashboardStatsProps {
  sales: SaleEntry[];
  spiffs: SpiffEntry[];
}

export default function DashboardStats({ sales, spiffs }: DashboardStatsProps) {
  const selectedDate = new Date(sales[0]?.date || new Date());
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const previousMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const previousYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const filterByMonth = (date: string, month: number, year: number) => {
    const d = new Date(date);
    return d.getMonth() === month && d.getFullYear() === year;
  };

  const currentMonthSales = sales.filter(sale => 
    filterByMonth(sale.date, selectedMonth, selectedYear)
  );

  const previousMonthSales = sales.filter(sale => 
    filterByMonth(sale.date, previousMonth, previousYear)
  );

  const currentMonthSpiffs = spiffs.filter(spiff => 
    filterByMonth(spiff.date, selectedMonth, selectedYear)
  );

  const previousMonthSpiffs = spiffs.filter(spiff => 
    filterByMonth(spiff.date, previousMonth, previousYear)
  );

  const calculateStats = (salesData: SaleEntry[], spiffsData: SpiffEntry[]) => ({
    totalSales: salesData.reduce((sum, sale) => sum + sale.sale_price, 0),
    usedCars: salesData.filter(sale => sale.sale_type === 'Used').length,
    newCars: salesData.filter(sale => sale.sale_type === 'New').length,
    sharedSales: salesData.filter(sale => sale.shared_with_email).length,
    totalCommissions: salesData.reduce((sum, sale) => {
      const commissions = calculateCommissions(sale);
      return sum + commissions.totalCommission;
    }, 0) + spiffsData.reduce((sum, spiff) => sum + spiff.amount, 0),
  });

  const currentStats = calculateStats(currentMonthSales, currentMonthSpiffs);
  const previousStats = calculateStats(previousMonthSales, previousMonthSpiffs);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      return { value: current, percentage: current === 0 ? 0 : 100, increase: current > 0 };
    }
    const diff = current - previous;
    const percentage = (diff / Math.abs(previous)) * 100;
    return { value: diff, percentage, increase: diff >= 0 };
  };

  const stats = [
    {
      title: 'Total Sales',
      current: currentStats.totalSales,
      previous: previousStats.totalSales,
      format: true,
    },
    {
      title: 'Total Commissions',
      current: currentStats.totalCommissions,
      previous: previousStats.totalCommissions,
      format: true,
    },
    {
      title: 'Used Cars',
      current: currentStats.usedCars,
      previous: previousStats.usedCars,
      subtitle: 'vehicles sold',
    },
    {
      title: 'New Cars',
      current: currentStats.newCars,
      previous: previousStats.newCars,
      subtitle: 'vehicles sold',
    },
    {
      title: 'Shared Sales',
      current: currentStats.sharedSales,
      previous: previousStats.sharedSales,
      subtitle: 'total shared',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {stats.map((stat, index) => {
        const change = calculateChange(stat.current, stat.previous);
        return (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900">
                {stat.format ? `$${stat.current.toLocaleString()}` : stat.current}
              </p>
              {stat.subtitle && (
                <p className="text-xs text-gray-500 -mt-1">{stat.subtitle}</p>
              )}
              <div className="flex items-center space-x-1">
                {change.increase ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    change.increase ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {change.increase ? '+' : '-'}
                  {stat.format 
                    ? `$${Math.abs(change.value).toLocaleString()}`
                    : Math.abs(change.value)}
                  {` (${Math.abs(change.percentage).toFixed(1)}%)`}
                </span>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


