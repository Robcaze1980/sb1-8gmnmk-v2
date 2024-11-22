import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { User } from '../../lib/supabase';
import Dashboard from '../../pages/Dashboard';
import LoadingScreen from '../LoadingScreen';

interface SalespersonOption {
  id: string;
  email: string;
}

export default function IndividualReports() {
  const [loading, setLoading] = useState(true);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalespeople();
  }, []);

  const fetchSalespeople = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('role', 'salesperson')
        .order('email');

      if (error) throw error;

      const salespeople = data.map(user => ({
        id: user.id,
        email: user.email.split('@')[0]
      }));

      setSalespeople(salespeople);
      if (salespeople.length > 0) {
        setSelectedUserId(salespeople[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching salespeople:', error);
      setError('Failed to fetch salespeople data');
      toast.error('Error loading salespeople data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchSalespeople}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (salespeople.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No salespeople found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Individual Sales Reports
        </h2>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {salespeople.map((person) => (
            <option key={person.id} value={person.id}>
              {person.email}
            </option>
          ))}
        </select>
      </div>

      {selectedUserId && (
        <div className="mt-6">
          <Dashboard userId={selectedUserId} isManagerView={true} />
        </div>
      )}
    </div>
  );
}