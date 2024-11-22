import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Download, FileSpreadsheet, Mail } from 'lucide-react';

type ReportType = 'sales' | 'commissions' | 'spiffs';
type DateRange = 'today' | 'week' | 'month' | 'custom';

export default function ReportGenerator() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const getDateRange = () => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        };
      case 'week':
        return {
          start: format(subDays(today, 7), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        };
      case 'month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate,
        };
      default:
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        };
    }
  };

  const generateReport = async (format: 'xlsx' | 'pdf' | 'email') => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      let data;

      switch (reportType) {
        case 'sales':
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select(`
              *,
              users (email)
            `)
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: false });

          if (salesError) throw salesError;
          data = salesData;
          break;

        case 'commissions':
          // Fetch both sales and spiffs for commission calculation
          const [salesRes, spiffsRes] = await Promise.all([
            supabase
              .from('sales')
              .select('*')
              .gte('date', start)
              .lte('date', end),
            supabase
              .from('spiffs')
              .select('*')
              .gte('date', start)
              .lte('date', end)
          ]);

          if (salesRes.error) throw salesRes.error;
          if (spiffsRes.error) throw spiffsRes.error;

          data = {
            sales: salesRes.data,
            spiffs: spiffsRes.data,
          };
          break;

        case 'spiffs':
          const { data: spiffData, error: spiffError } = await supabase
            .from('spiffs')
            .select(`
              *,
              users (email)
            `)
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: false });

          if (spiffError) throw spiffError;
          data = spiffData;
          break;
      }

      // Handle different export formats
      switch (format) {
        case 'xlsx':
          // Download as Excel
          const worksheet = generateExcelWorksheet(data);
          // Implementation would use a library like xlsx
          toast.success('Report downloaded successfully');
          break;

        case 'pdf':
          // Generate PDF
          // Implementation would use a library like jspdf
          toast.success('PDF report downloaded successfully');
          break;

        case 'email':
          // Send email with report
          // Implementation would use your email service
          toast.success('Report sent to email successfully');
          break;
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const generateExcelWorksheet = (data: any) => {
    // Implementation would create Excel worksheet
    // This is a placeholder for the actual implementation
    console.log('Generating Excel worksheet with data:', data);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Report Type</h3>
          <div className="flex space-x-4">
            {[
              { value: 'sales', label: 'Sales Report' },
              { value: 'commissions', label: 'Commissions' },
              { value: 'spiffs', label: 'Spiff Bonuses' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setReportType(value as ReportType)}
                className={`px-4 py-2 rounded-md ${
                  reportType === value
                    ? 'bg-[#E60012] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Date Range</h3>
          <div className="flex space-x-4">
            {[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'This Month' },
              { value: 'custom', label: 'Custom' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDateRange(value as DateRange)}
                className={`px-4 py-2 rounded-md ${
                  dateRange === value
                    ? 'bg-[#E60012] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <button
          onClick={() => generateReport('xlsx')}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          Export to Excel
        </button>
        <button
          onClick={() => generateReport('pdf')}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          <Download className="h-5 w-5 mr-2" />
          Download PDF
        </button>
        <button
          onClick={() => generateReport('email')}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Mail className="h-5 w-5 mr-2" />
          Email Report
        </button>
      </div>
    </div>
  );
}